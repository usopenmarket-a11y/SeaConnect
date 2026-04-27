"""Sprint 3 — add Availability, Booking, BookingEvent models.

ADR-001 — UUID PKs, NUMERIC(12,2) for money.
ADR-012 — BookingEvent is append-only; no updated_at field.
ADR-018 — Booking carries Region FK + currency CharField.
"""
import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0002_seed_egypt"),
        ("bookings", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # ------------------------------------------------------------------
        # Availability
        # ------------------------------------------------------------------
        migrations.CreateModel(
            name="Availability",
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
                    "date",
                    models.DateField(
                        help_text="Calendar date in the yacht's region timezone.",
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("open", "Open"),
                            ("blocked", "Blocked"),
                            ("booked", "Booked"),
                        ],
                        default="open",
                        help_text="open=bookable, blocked=owner unavailable, booked=reserved.",
                        max_length=10,
                    ),
                ),
                (
                    "price_override",
                    models.DecimalField(
                        blank=True,
                        decimal_places=2,
                        help_text="Overrides yacht.price_per_day for this date. NUMERIC(12,2).",
                        max_digits=12,
                        null=True,
                    ),
                ),
                (
                    "notes",
                    models.TextField(
                        blank=True,
                        help_text="Owner-visible notes (e.g. reason for block).",
                    ),
                ),
                (
                    "yacht",
                    models.ForeignKey(
                        help_text="Yacht this availability record applies to.",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="availability",
                        to="bookings.yacht",
                    ),
                ),
            ],
            options={
                "verbose_name": "Availability",
                "verbose_name_plural": "Availability",
                "db_table": "bookings_availability",
                "ordering": ["date"],
                "unique_together": {("yacht", "date")},
            },
        ),
        migrations.AddIndex(
            model_name="availability",
            index=models.Index(fields=["yacht", "date"], name="idx_avail_yacht_date"),
        ),
        migrations.AddIndex(
            model_name="availability",
            index=models.Index(fields=["yacht", "status"], name="idx_avail_yacht_status"),
        ),
        # ------------------------------------------------------------------
        # Booking
        # ------------------------------------------------------------------
        migrations.CreateModel(
            name="Booking",
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
                    "start_date",
                    models.DateField(help_text="First day of the charter (inclusive)."),
                ),
                (
                    "end_date",
                    models.DateField(help_text="Last day of the charter (exclusive)."),
                ),
                (
                    "num_passengers",
                    models.PositiveSmallIntegerField(
                        help_text="Number of passengers for this trip.",
                    ),
                ),
                (
                    "total_amount",
                    models.DecimalField(
                        decimal_places=2,
                        help_text="Total charter cost. NUMERIC(12,2) — never float.",
                        max_digits=12,
                    ),
                ),
                (
                    "currency",
                    models.CharField(
                        help_text="ISO 4217 code copied from yacht.currency at creation time.",
                        max_length=3,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending_owner", "Pending Owner Approval"),
                            ("confirmed", "Confirmed"),
                            ("declined", "Declined"),
                            ("cancelled", "Cancelled"),
                            ("completed", "Completed"),
                        ],
                        db_index=True,
                        default="pending_owner",
                        max_length=20,
                    ),
                ),
                (
                    "decline_reason",
                    models.TextField(
                        blank=True,
                        help_text="Owner-supplied reason when declining (optional).",
                    ),
                ),
                (
                    "customer",
                    models.ForeignKey(
                        help_text="The user who created this booking request.",
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="bookings",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "departure_port",
                    models.ForeignKey(
                        help_text="Port the trip departs from.",
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="bookings",
                        to="core.departureport",
                    ),
                ),
                (
                    "region",
                    models.ForeignKey(
                        help_text="Region at booking time — drives currency and timezone.",
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="bookings",
                        to="core.region",
                    ),
                ),
                (
                    "yacht",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="bookings",
                        to="bookings.yacht",
                    ),
                ),
            ],
            options={
                "verbose_name": "Booking",
                "verbose_name_plural": "Bookings",
                "db_table": "bookings_booking",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="booking",
            index=models.Index(
                fields=["customer", "status"], name="idx_booking_customer_status",
            ),
        ),
        migrations.AddIndex(
            model_name="booking",
            index=models.Index(
                fields=["yacht", "status"], name="idx_booking_yacht_status",
            ),
        ),
        migrations.AddIndex(
            model_name="booking",
            index=models.Index(fields=["status"], name="idx_booking_status"),
        ),
        migrations.AddIndex(
            model_name="booking",
            index=models.Index(
                fields=["start_date", "end_date"], name="idx_booking_dates",
            ),
        ),
        # ------------------------------------------------------------------
        # BookingEvent (append-only — no updated_at)
        # ------------------------------------------------------------------
        migrations.CreateModel(
            name="BookingEvent",
            fields=[
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
                    "event_type",
                    models.CharField(
                        choices=[
                            ("created", "Created"),
                            ("confirmed", "Confirmed"),
                            ("declined", "Declined"),
                            ("cancelled", "Cancelled"),
                            ("completed", "Completed"),
                            ("payment_received", "Payment Received"),
                        ],
                        max_length=30,
                    ),
                ),
                (
                    "notes",
                    models.TextField(
                        blank=True,
                        help_text="Human-readable note about this event.",
                    ),
                ),
                (
                    "metadata",
                    models.JSONField(
                        blank=True,
                        default=dict,
                        help_text="Structured snapshot at the time of the event.",
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, db_index=True),
                ),
                (
                    "actor",
                    models.ForeignKey(
                        blank=True,
                        help_text="User who triggered this event. Null for system events.",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="booking_events",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "booking",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="events",
                        to="bookings.booking",
                    ),
                ),
            ],
            options={
                "verbose_name": "Booking Event",
                "verbose_name_plural": "Booking Events",
                "db_table": "bookings_booking_event",
                "ordering": ["created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="bookingevent",
            index=models.Index(
                fields=["booking", "created_at"], name="idx_bookingevent_booking",
            ),
        ),
        migrations.AddIndex(
            model_name="bookingevent",
            index=models.Index(fields=["event_type"], name="idx_bookingevent_type"),
        ),
    ]
