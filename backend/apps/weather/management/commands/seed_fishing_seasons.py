"""Management command: seed fishing species and seasonal data for Egyptian ports.

Idempotent — safe to run multiple times (uses get_or_create throughout).
Skips entirely if FishingSpecies table already has rows.

Port name_en values are matched against those seeded in core migration 0002_seed_egypt:
  Alexandria, Hurghada Marina, Sharm El-Sheikh Marina,
  Port Said Harbour, Suez Port, Marsa Matrouh Marina, Ras Sidr Marina

Season data is based on Egyptian maritime knowledge for Red Sea and Mediterranean.
"""
from django.core.management.base import BaseCommand

from apps.core.models import DeparturePort
from apps.weather.models import FishingSeason, FishingSpecies

# ---------------------------------------------------------------------------
# Species catalogue — 8 target species for Egyptian waters.
# Arabic name listed first per ADR-015 convention.
# ---------------------------------------------------------------------------
SPECIES_DATA = [
    {
        "name": "Mahi-Mahi",
        "name_ar": "ماهي ماهي",
        "scientific_name": "Coryphaena hippurus",
    },
    {
        "name": "Yellowfin Tuna",
        "name_ar": "تونة صفراء الزعنفة",
        "scientific_name": "Thunnus albacares",
    },
    {
        "name": "Red Snapper",
        "name_ar": "لوت أحمر",
        "scientific_name": "Lutjanus campechanus",
    },
    {
        "name": "Kingfish",
        "name_ar": "سمك الراعي",
        "scientific_name": "Scomberomorus commerson",
    },
    {
        "name": "Grouper",
        "name_ar": "هامور",
        "scientific_name": "Epinephelus coioides",
    },
    {
        "name": "Barracuda",
        "name_ar": "برقودة",
        "scientific_name": "Sphyraena barracuda",
    },
    {
        "name": "Dorado",
        "name_ar": "دورادو",
        "scientific_name": "Coryphaena equiselis",
    },
    {
        "name": "Wahoo",
        "name_ar": "واهو",
        "scientific_name": "Acanthocybium solandri",
    },
]

# ---------------------------------------------------------------------------
# Season definitions per species.
# Keys are species name (English). Values: peak months and good months.
# All other months are considered off-season (no record created).
# ---------------------------------------------------------------------------
SPECIES_SEASONS = {
    "Yellowfin Tuna": {
        "peak": [5, 6, 7, 8, 9],
        "good": [4, 10, 11],
    },
    "Mahi-Mahi": {
        "peak": [4, 5, 6, 7, 8],
        "good": [3, 9, 10],
    },
    "Kingfish": {
        "peak": [10, 11, 12, 1, 2, 3],
        "good": [4, 9],
    },
    "Grouper": {
        "peak": [3, 4, 5, 10, 11],
        "good": [1, 2, 6, 7, 8, 9, 12],
    },
    "Barracuda": {
        "peak": [11, 12, 1, 2],
        "good": [10, 3, 4],
    },
    "Red Snapper": {
        "peak": [1, 2, 3, 4, 10, 11, 12],
        "good": [5, 9],
    },
    "Dorado": {
        "peak": [5, 6, 7, 8, 9],
        "good": [4, 10],
    },
    "Wahoo": {
        "peak": [6, 7, 8, 9, 10],
        "good": [5, 11],
    },
}

# ---------------------------------------------------------------------------
# Port groups: which species are active at each port type.
# Red Sea ports carry all 8 species.
# Mediterranean ports carry species that are also present there.
# ---------------------------------------------------------------------------
RED_SEA_PORT_NAMES = {
    "Hurghada Marina",
    "Sharm El-Sheikh Marina",
    "Suez Port",
    "Ras Sidr Marina",
}

MEDITERRANEAN_PORT_NAMES = {
    "Alexandria",
    "Port Said Harbour",
    "Marsa Matrouh Marina",
}

# Mediterranean species subset — tuna and barracuda are present but mahi-mahi
# and wahoo are rarer; grouper, kingfish, snapper, and dorado still apply.
MEDITERRANEAN_SPECIES = {
    "Yellowfin Tuna",
    "Red Snapper",
    "Kingfish",
    "Grouper",
    "Barracuda",
    "Dorado",
}

RED_SEA_SPECIES = {s["name"] for s in SPECIES_DATA}  # all 8


class Command(BaseCommand):
    help = "Seed fishing species and seasonal data for Egyptian ports."

    def handle(self, *args, **kwargs):  # type: ignore[override]
        if FishingSpecies.objects.exists():
            self.stdout.write(self.style.WARNING(
                "FishingSpecies table already has data — skipping seed (idempotent)."
            ))
            return

        # --- Create species ---------------------------------------------------
        self.stdout.write("Creating fishing species...")
        species_map: dict[str, FishingSpecies] = {}
        for data in SPECIES_DATA:
            obj, created = FishingSpecies.objects.get_or_create(
                name=data["name"],
                defaults={
                    "name_ar": data["name_ar"],
                    "scientific_name": data["scientific_name"],
                },
            )
            species_map[obj.name] = obj
            action = "created" if created else "exists"
            self.stdout.write(f"  {obj.name_ar} / {obj.name} — {action}")

        # --- Query active ports -----------------------------------------------
        ports = list(DeparturePort.objects.filter(is_active=True))
        if not ports:
            self.stdout.write(self.style.ERROR(
                "No active DeparturePort records found. "
                "Run core migrations first (python manage.py migrate)."
            ))
            return

        port_map: dict[str, DeparturePort] = {p.name_en: p for p in ports}
        self.stdout.write(f"Found {len(ports)} active port(s): {list(port_map.keys())}")

        # --- Create season records --------------------------------------------
        season_count = 0
        skip_count = 0

        for port_name, port in port_map.items():
            if port_name in RED_SEA_PORT_NAMES:
                active_species = RED_SEA_SPECIES
            elif port_name in MEDITERRANEAN_PORT_NAMES:
                active_species = MEDITERRANEAN_SPECIES
            else:
                # Unknown port — seed all species as a safe default.
                self.stdout.write(
                    self.style.WARNING(f"  Port '{port_name}' not in known groups — using all species.")
                )
                active_species = RED_SEA_SPECIES

            for species_name, season_def in SPECIES_SEASONS.items():
                if species_name not in active_species:
                    continue
                species_obj = species_map[species_name]

                for month in season_def["peak"]:
                    _, created = FishingSeason.objects.get_or_create(
                        species=species_obj,
                        port=port,
                        month=month,
                        defaults={"is_peak": True},
                    )
                    if created:
                        season_count += 1
                    else:
                        skip_count += 1

                for month in season_def["good"]:
                    _, created = FishingSeason.objects.get_or_create(
                        species=species_obj,
                        port=port,
                        month=month,
                        defaults={"is_peak": False},
                    )
                    if created:
                        season_count += 1
                    else:
                        skip_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"Done. Created {season_count} season records, skipped {skip_count} existing."
        ))
