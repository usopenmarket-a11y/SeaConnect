"""Initial migration for the core app.

Creates: Region, DeparturePort, FeatureFlag tables.

Zero-downtime notes:
  - All new tables; no existing data to migrate.
  - UUID PKs use gen_random_uuid() at DB level via Django default.
"""
import uuid

import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies: list[tuple[str, str]] = []

    operations = [
        migrations.CreateModel(
            name="Region",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("code", models.CharField(help_text="Short region identifier, e.g. 'sa-egy', 'sa-uae'.", max_length=10, unique=True)),
                ("name_ar", models.CharField(help_text="Arabic display name.", max_length=100)),
                ("name_en", models.CharField(help_text="English display name.", max_length=100)),
                ("currency", models.CharField(help_text="ISO 4217 currency code, e.g. 'EGP', 'AED', 'SAR'.", max_length=3)),
                ("timezone", models.CharField(help_text="IANA timezone string, e.g. 'Africa/Cairo', 'Asia/Dubai'.", max_length=50)),
                ("is_active", models.BooleanField(default=False, help_text="Only active regions are visible to end users.")),
                ("launched_at", models.DateTimeField(blank=True, help_text="UTC timestamp when this region went live.", null=True)),
            ],
            options={
                "verbose_name": "Region",
                "verbose_name_plural": "Regions",
                "db_table": "core_region",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="DeparturePort",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("region", models.ForeignKey(
                    help_text="Region this port belongs to.",
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name="departure_ports",
                    to="core.region",
                )),
                ("name_en", models.CharField(help_text="English port name.", max_length=255)),
                ("name_ar", models.CharField(help_text="Arabic port name (primary).", max_length=255)),
                ("city_en", models.CharField(help_text="City in English.", max_length=100)),
                ("city_ar", models.CharField(help_text="City in Arabic.", max_length=100)),
                ("latitude", models.DecimalField(decimal_places=6, help_text="WGS-84 latitude, e.g. 31.200092.", max_digits=9)),
                ("longitude", models.DecimalField(decimal_places=6, help_text="WGS-84 longitude, e.g. 29.918739.", max_digits=9)),
                ("is_active", models.BooleanField(default=True, help_text="Inactive ports are hidden from booking flow.")),
            ],
            options={
                "verbose_name": "Departure Port",
                "verbose_name_plural": "Departure Ports",
                "db_table": "core_departure_port",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="FeatureFlag",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("key", models.CharField(help_text="Unique feature key, e.g. 'competitions.enabled'.", max_length=100, unique=True)),
                ("is_enabled", models.BooleanField(default=False, help_text="Master toggle — if False the feature is off regardless of region.")),
                ("description", models.TextField(blank=True, help_text="Human-readable description of what this flag controls.")),
                ("region", models.ForeignKey(
                    blank=True,
                    help_text="If set, this flag applies only to the specified region.",
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="feature_flags",
                    to="core.region",
                )),
            ],
            options={
                "verbose_name": "Feature Flag",
                "verbose_name_plural": "Feature Flags",
                "db_table": "core_feature_flag",
                "ordering": ["-created_at"],
            },
        ),
    ]
