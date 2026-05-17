# Generated for Sprint 12F — ProductImage model

import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("marketplace", "0002_add_product_average_rating"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProductImage",
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
                    "product",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="images",
                        to="marketplace.product",
                    ),
                ),
                ("image_url", models.CharField(max_length=500)),
                ("is_primary", models.BooleanField(default=False)),
            ],
            options={
                "db_table": "marketplace_product_image",
                "ordering": ["-is_primary", "-created_at"],
            },
        ),
    ]
