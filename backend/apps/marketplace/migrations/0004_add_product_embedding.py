# Generated for Sprint 14A — pgvector embedding field on Product (ADR-019).
# null=True so the migration is zero-downtime (no backfill required before deployment).

from django.db import migrations
import pgvector.django


class Migration(migrations.Migration):

    dependencies = [
        ("marketplace", "0003_add_product_image"),
    ]

    operations = [
        migrations.AddField(
            model_name="product",
            name="embedding",
            field=pgvector.django.VectorField(
                blank=True,
                dimensions=768,
                help_text="768-dim sentence embedding for semantic search (ADR-019).",
                null=True,
            ),
        ),
    ]
