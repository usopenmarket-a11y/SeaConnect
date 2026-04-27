"""Sprint 4 — Payment model initial migration.

ADR-001 — UUID PK, NUMERIC(12,2) for money.
ADR-007 — provider stores a string key matching PROVIDER_REGISTRY.
"""
import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("bookings", "0002_availability_booking_bookingevent"),
    ]

    operations = [
        migrations.CreateModel(
            name="Payment",
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
                    "provider",
                    models.CharField(
                        choices=[
                            ("fawry", "Fawry"),
                            ("telr", "Telr"),
                            ("stripe", "Stripe"),
                            ("mada", "Mada"),
                        ],
                        help_text="Gateway key — must match a key in PROVIDER_REGISTRY.",
                        max_length=20,
                    ),
                ),
                (
                    "provider_ref",
                    models.CharField(
                        blank=True,
                        db_index=True,
                        help_text="Provider-assigned transaction reference (e.g. Fawry referenceNumber).",
                        max_length=255,
                    ),
                ),
                (
                    "amount",
                    models.DecimalField(
                        decimal_places=2,
                        help_text="Amount charged. NUMERIC(12,2) — never float.",
                        max_digits=12,
                    ),
                ),
                (
                    "currency",
                    models.CharField(
                        help_text="ISO 4217 currency code inherited from booking.currency.",
                        max_length=3,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("captured", "Captured"),
                            ("failed", "Failed"),
                            ("refunded", "Refunded"),
                        ],
                        db_index=True,
                        default="pending",
                        max_length=20,
                    ),
                ),
                (
                    "checkout_url",
                    models.URLField(
                        blank=True,
                        help_text="The provider URL the customer was redirected to.",
                        max_length=1000,
                    ),
                ),
                (
                    "metadata",
                    models.JSONField(
                        blank=True,
                        default=dict,
                        help_text="Full provider request/response payloads, for audit + debugging.",
                    ),
                ),
                (
                    "booking",
                    models.ForeignKey(
                        help_text="The booking this payment is paying for.",
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="payments",
                        to="bookings.booking",
                    ),
                ),
            ],
            options={
                "verbose_name": "Payment",
                "verbose_name_plural": "Payments",
                "db_table": "payments_payment",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="payment",
            index=models.Index(fields=["booking", "status"], name="idx_payment_booking_status"),
        ),
        migrations.AddIndex(
            model_name="payment",
            index=models.Index(fields=["provider_ref"], name="idx_payment_provider_ref"),
        ),
        migrations.AddIndex(
            model_name="payment",
            index=models.Index(fields=["status"], name="idx_payment_status"),
        ),
    ]
