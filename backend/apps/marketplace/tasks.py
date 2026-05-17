"""Celery tasks for the marketplace app — Sprint 14A.

Idempotency contract: every task re-reads the product from the DB and checks
its current state before acting.  Re-running on retry never duplicates a side
effect.

ADR compliance:
  ADR-001 — ORM only; no raw SQL.
  ADR-011 — Celery tasks are idempotent; use bind=True + max_retries.
  ADR-019 — pgvector 768-dim embeddings via Ollama (dev) / OpenAI (UAT/prod).
"""
from __future__ import annotations

import logging

from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Sprint 14A — pgvector semantic search embedding generation (ADR-019)
# ---------------------------------------------------------------------------


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_product_embedding(self, product_id: str) -> None:
    """Generate and store a 768-dim embedding for a marketplace product (ADR-019).

    Idempotent — safe to re-run on existing products.  Called via
    ``transaction.on_commit`` after every product create or update so the
    embedding always reflects the latest description text.

    Steps:
      1. Load the Product (early-exit if not found — stale task from deleted row).
      2. Concatenate Arabic + English name/description for maximum recall
         (Arabic first per ADR-014).
      3. Call Ollama (dev) / OpenAI (prod) via the shared ``_get_embedding``
         helper from the bookings app.
      4. Persist with ``Product.objects.filter(...).update(...)`` — avoids
         triggering extra signals and is safe to retry.
    """
    # Local import to avoid circular imports at module load.
    from .models import Product

    # Reuse the shared _get_embedding helper already defined in bookings.tasks.
    # Both apps share the same Ollama endpoint and model (ADR-019).
    from apps.bookings.tasks import _get_embedding

    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        logger.info(
            "generate_product_embedding: product %s not found — skipping", product_id
        )
        return

    # Build the text corpus to embed (Arabic first per ADR-014).
    text = " ".join(
        filter(
            None,
            [
                product.name_ar,
                product.name,
                product.description_ar,
                product.description,
            ],
        )
    )

    if not text.strip():
        logger.info(
            "generate_product_embedding: product %s has no text — skipping", product_id
        )
        return

    try:
        embedding = _get_embedding(text)
    except Exception as exc:
        logger.warning(
            "generate_product_embedding: embedding failed for product %s: %s",
            product_id,
            exc,
        )
        raise self.retry(exc=exc) from exc

    # Use .update() to avoid triggering signals / touching updated_at unnecessarily.
    Product.objects.filter(id=product_id).update(embedding=embedding)
    logger.info(
        "generate_product_embedding: stored embedding for product %s", product_id
    )
