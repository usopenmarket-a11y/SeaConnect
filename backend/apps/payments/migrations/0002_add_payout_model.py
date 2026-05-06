"""Sprint 9B — Payout model migration.

ADR-001 — UUID PK, NUMERIC(12,2) for money.
ADR-018 — currency field stores ISO 4217 code from owner's region; never hardcoded.
"""
import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Payout",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "amount",
                    models.DecimalField(
                        decimal_places=2,
                        help_text="Payout amount. NUMERIC(12,2) — never float.",
                        max_digits=12,
                    ),
                ),
                (
                    "currency",
                    models.CharField(
                        help_text="ISO 4217 currency code. Sourced from the owner's region at cycle time.",
                        max_length=3,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("scheduled", "Scheduled"),
                            ("processing", "Processing"),
                            ("paid", "Paid"),
                            ("failed", "Failed"),
                        ],
                        db_index=True,
                        default="scheduled",
                        max_length=20,
                    ),
                ),
                (
                    "reference",
                    models.CharField(
                        help_text="Internal payout cycle reference (e.g. PAYOUT-2026-05-001).",
                        max_length=50,
                        unique=True,
                    ),
                ),
                (
                    "payment_method",
                    models.CharField(
                        blank=True,
                        help_text="Bank transfer, Instapay, etc.",
                        max_length=100,
                    ),
                ),
                (
                    "scheduled_date",
                    models.DateField(
                        db_index=True,
                        help_text="Date this payout is scheduled to be transferred.",
                    ),
                ),
                (
                    "paid_at",
                    models.DateTimeField(
                        blank=True,
                        help_text="Timestamp when the transfer was confirmed. Null until paid.",
                        null=True,
                    ),
                ),
                (
                    "escrow_booking_ids",
                    models.JSONField(
                        default=list,
                        help_text="UUIDs of completed bookings included in this payout cycle.",
                    ),
                ),
                (
                    "owner",
                    models.ForeignKey(
                        help_text="The owner user receiving this payout.",
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="payouts",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Payout",
                "verbose_name_plural": "Payouts",
                "db_table": "payments_payout",
                "ordering": ["-scheduled_date"],
            },
        ),
        migrations.AddIndex(
            model_name="payout",
            index=models.Index(fields=["owner", "status"], name="idx_payout_owner_status"),
        ),
        migrations.AddIndex(
            model_name="payout",
            index=models.Index(fields=["scheduled_date"], name="idx_payout_scheduled_date"),
        ),
    ]
