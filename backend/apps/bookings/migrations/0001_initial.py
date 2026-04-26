import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("core", "0002_seed_egypt"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Yacht",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(help_text="Yacht name in English.", max_length=200)),
                ("name_ar", models.CharField(help_text="Yacht name in Arabic (primary display language).", max_length=200)),
                ("description", models.TextField(blank=True, help_text="Full description in English.")),
                ("description_ar", models.TextField(blank=True, help_text="Full description in Arabic (primary display language).")),
                ("capacity", models.PositiveSmallIntegerField(help_text="Maximum number of passengers (excluding crew).")),
                ("price_per_day", models.DecimalField(decimal_places=2, help_text="Daily charter price.  NUMERIC(12,2) — never float.", max_digits=12)),
                ("currency", models.CharField(help_text="ISO 4217 currency code copied from region at creation.", max_length=3)),
                ("yacht_type", models.CharField(choices=[("motorboat", "Motorboat"), ("sailboat", "Sailboat"), ("catamaran", "Catamaran"), ("fishing", "Fishing Boat"), ("speedboat", "Speedboat")], help_text="Vessel category.", max_length=20)),
                ("status", models.CharField(choices=[("draft", "Draft"), ("active", "Active"), ("inactive", "Inactive")], default="draft", help_text="Only 'active' yachts appear in customer-facing queries.", max_length=20)),
                ("is_deleted", models.BooleanField(default=False, help_text="Soft-delete flag.")),
                ("departure_port", models.ForeignKey(help_text="Primary home port for this yacht.", on_delete=django.db.models.deletion.PROTECT, related_name="yachts", to="core.departureport")),
                ("owner", models.ForeignKey(help_text="Boat owner — must have role='owner'.", on_delete=django.db.models.deletion.PROTECT, related_name="yachts", to=settings.AUTH_USER_MODEL)),
                ("region", models.ForeignKey(help_text="Region this yacht operates in (drives currency).", on_delete=django.db.models.deletion.PROTECT, related_name="yachts", to="core.region")),
            ],
            options={
                "verbose_name": "Yacht",
                "verbose_name_plural": "Yachts",
                "db_table": "bookings_yacht",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="YachtMedia",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("url", models.URLField(help_text="Absolute URL to the media asset (MinIO / R2).", max_length=500)),
                ("media_type", models.CharField(choices=[("image", "Image"), ("video", "Video")], default="image", max_length=10)),
                ("is_primary", models.BooleanField(default=False, help_text="True for the hero image shown on listing cards.")),
                ("order", models.PositiveSmallIntegerField(default=0, help_text="Ascending display order within the yacht's gallery.")),
                ("yacht", models.ForeignKey(help_text="Yacht this media belongs to.", on_delete=django.db.models.deletion.CASCADE, related_name="media", to="bookings.yacht")),
            ],
            options={
                "verbose_name": "Yacht Media",
                "verbose_name_plural": "Yacht Media",
                "db_table": "bookings_yachtmedia",
                "ordering": ["order"],
            },
        ),
        migrations.AddIndex(
            model_name="yacht",
            index=models.Index(fields=["status"], name="idx_yacht_status"),
        ),
        migrations.AddIndex(
            model_name="yacht",
            index=models.Index(fields=["owner"], name="idx_yacht_owner"),
        ),
        migrations.AddIndex(
            model_name="yacht",
            index=models.Index(fields=["region"], name="idx_yacht_region"),
        ),
        migrations.AddIndex(
            model_name="yacht",
            index=models.Index(fields=["departure_port"], name="idx_yacht_departure_port"),
        ),
        migrations.AddIndex(
            model_name="yacht",
            index=models.Index(fields=["yacht_type"], name="idx_yacht_type"),
        ),
        migrations.AddIndex(
            model_name="yacht",
            index=models.Index(fields=["is_deleted"], name="idx_yacht_is_deleted"),
        ),
        migrations.AddIndex(
            model_name="yachtmedia",
            index=models.Index(fields=["yacht", "is_primary"], name="idx_yachtmedia_primary"),
        ),
        migrations.AddIndex(
            model_name="yachtmedia",
            index=models.Index(fields=["yacht", "order"], name="idx_yachtmedia_order"),
        ),
    ]
