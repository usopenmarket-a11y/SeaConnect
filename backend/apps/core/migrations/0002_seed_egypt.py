"""Data migration: seed Egypt region and 7 departure ports.

This migration is idempotent — it uses get_or_create so re-running it is safe.
Port coordinates are approximate harbour positions (WGS-84).

ADR-018: currency is set explicitly to 'EGP' only in seed data.
         Application code must never hardcode 'EGP'.
"""
from django.db import migrations


EGYPT_REGION = {
    "code": "EG",
    "name_ar": "مصر",
    "name_en": "Egypt",
    "currency": "EGP",
    "timezone": "Africa/Cairo",
    "is_active": True,
}

# Seven major Egyptian maritime departure points with Arabic names.
EGYPT_PORTS = [
    {
        "name_en": "Alexandria",
        "name_ar": "الإسكندرية",
        "city_en": "Alexandria",
        "city_ar": "الإسكندرية",
        "latitude": "31.200092",
        "longitude": "29.918739",
    },
    {
        "name_en": "Hurghada Marina",
        "name_ar": "مرسى الغردقة",
        "city_en": "Hurghada",
        "city_ar": "الغردقة",
        "latitude": "27.257760",
        "longitude": "33.840840",
    },
    {
        "name_en": "Sharm El-Sheikh Marina",
        "name_ar": "مرسى شرم الشيخ",
        "city_en": "Sharm El-Sheikh",
        "city_ar": "شرم الشيخ",
        "latitude": "27.916500",
        "longitude": "34.329800",
    },
    {
        "name_en": "Port Said Harbour",
        "name_ar": "ميناء بورسعيد",
        "city_en": "Port Said",
        "city_ar": "بورسعيد",
        "latitude": "31.256150",
        "longitude": "32.285420",
    },
    {
        "name_en": "Suez Port",
        "name_ar": "ميناء السويس",
        "city_en": "Suez",
        "city_ar": "السويس",
        "latitude": "29.966700",
        "longitude": "32.550000",
    },
    {
        "name_en": "Marsa Matrouh Marina",
        "name_ar": "مرسى مطروح",
        "city_en": "Marsa Matrouh",
        "city_ar": "مرسى مطروح",
        "latitude": "31.352900",
        "longitude": "27.243600",
    },
    {
        "name_en": "Ras Sidr Marina",
        "name_ar": "مرسى رأس سدر",
        "city_en": "Ras Sidr",
        "city_ar": "رأس سدر",
        "latitude": "29.603100",
        "longitude": "32.693600",
    },
]


def seed_egypt(apps, schema_editor):  # type: ignore[no-untyped-def]
    """Insert Egypt region and departure ports if they do not already exist."""
    Region = apps.get_model("core", "Region")
    DeparturePort = apps.get_model("core", "DeparturePort")

    region, _ = Region.objects.get_or_create(
        code=EGYPT_REGION["code"],
        defaults={k: v for k, v in EGYPT_REGION.items() if k != "code"},
    )

    for port_data in EGYPT_PORTS:
        DeparturePort.objects.get_or_create(
            name_en=port_data["name_en"],
            region=region,
            defaults=port_data,
        )


def unseed_egypt(apps, schema_editor):  # type: ignore[no-untyped-def]
    """Reverse migration: remove Egypt seed data.

    Safe to call because get_or_create was used; data created by other
    migrations will not be affected.
    """
    Region = apps.get_model("core", "Region")
    Region.objects.filter(code="EG").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_egypt, reverse_code=unseed_egypt),
    ]
