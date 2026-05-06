"""Sprint 9C — add BlockedDate model.

Owner-authored maintenance / personal blocks distinct from the Availability
table which the booking system also writes to.

ADR-001 — UUID PK, ORM only.
"""
import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0002_availability_booking_bookingevent"),
    ]

    operations = [
        migrations.CreateModel(
            name="BlockedDate",
            fields=[
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True),
                ),
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
                    "date",
                    models.DateField(
                        help_text="The calendar date being blocked (owner's region timezone).",
                    ),
                ),
                (
                    "reason",
                    models.CharField(
                        blank=True,
                        help_text="Optional human-readable reason (maintenance, personal, etc.).",
                        max_length=200,
                    ),
                ),
                (
                    "yacht",
                    models.ForeignKey(
                        help_text="Yacht whose calendar this block applies to.",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="blocked_dates",
                        to="bookings.yacht",
                    ),
                ),
            ],
            options={
                "verbose_name": "Blocked Date",
                "verbose_name_plural": "Blocked Dates",
                "db_table": "bookings_blocked_date",
                "ordering": ["date"],
            },
        ),
        migrations.AddConstraint(
            model_name="blockeddate",
            constraint=models.UniqueConstraint(
                fields=["yacht", "date"],
                name="unique_blockeddate_yacht_date",
            ),
        ),
        migrations.AddIndex(
            model_name="blockeddate",
            index=models.Index(
                fields=["yacht", "date"],
                name="idx_blockeddate_yacht_date",
            ),
        ),
    ]
