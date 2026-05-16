"""Seed command for yacht/boat data — matches Design/data.jsx BOATS array.

Idempotent: skips if Yacht rows already exist.

Usage:
    python manage.py seed_yachts
"""
from django.core.management.base import BaseCommand

from apps.accounts.models import User, UserRole
from apps.bookings.models import Yacht, YachtMedia, YachtType
from apps.core.models import DeparturePort, Region

YACHTS = [
    {
        "name": "Al Bahr Al Ahmar",
        "name_ar": "البحر الأحمر",
        "description": "Premium fishing yacht in the heart of the Red Sea. Captain Mahmoud Seif, certified for 12 years, specialist in tuna and barracuda.",
        "description_ar": "يخت صيد فاخر في قلب البحر الأحمر. الربان محمود سيف معتمد منذ ١٢ سنة، متخصص في صيد التونة والباراكودا.",
        "yacht_type": YachtType.FISHING,
        "capacity": 8,
        "price_per_day": "3800.00",
        "port_name": "Hurghada Marina",
        "img": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1400&q=80",
    },
    {
        "name": "Nour Al Shati",
        "name_ar": "نور الشاطئ",
        "description": "Mid-size fishing boat in Alexandria waters. Suitable for families and friend groups.",
        "description_ar": "قارب صيد متوسط الحجم في مياه الإسكندرية. مناسب للعائلات ومجموعات الأصدقاء.",
        "yacht_type": YachtType.FISHING,
        "capacity": 6,
        "price_per_day": "1800.00",
        "port_name": "Alexandria Marina",
        "img": "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?auto=format&fit=crop&w=1400&q=80",
    },
    {
        "name": "Reeh Al Bahr",
        "name_ar": "ريح البحر",
        "description": "Luxury family yacht in Sharm El Sheikh. Spacious areas, two cabins, and a full kitchen.",
        "description_ar": "يخت عائلي فاخر في شرم الشيخ. مساحات واسعة، كابينتان، ومطبخ متكامل.",
        "yacht_type": YachtType.MOTORBOAT,
        "capacity": 12,
        "price_per_day": "4400.00",
        "port_name": "Sharm El Sheikh Marina",
        "img": "https://images.unsplash.com/photo-1566024287286-457247b70310?auto=format&fit=crop&w=1400&q=80",
    },
    {
        "name": "Atlantis",
        "name_ar": "أطلانتس",
        "description": "The largest luxury yacht in Hurghada. 56 feet of luxury with a professional crew of 5.",
        "description_ar": "يخت الرفاهية الأكبر في الغردقة. ٥٦ قدماً من الفخامة مع طاقم محترف من ٥ أفراد.",
        "yacht_type": YachtType.MOTORBOAT,
        "capacity": 16,
        "price_per_day": "8900.00",
        "port_name": "Hurghada Marina",
        "img": "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?auto=format&fit=crop&w=1400&q=80",
    },
    {
        "name": "Felucca Al Nil",
        "name_ar": "فلوكة النيل",
        "description": "Authentic traditional Nile felucca in Luxor. Fishing experience on the Nile.",
        "description_ar": "فلوكة نيلية تقليدية أصيلة في الأقصر. تجربة صيد على النيل.",
        "yacht_type": YachtType.SAILBOAT,
        "capacity": 10,
        "price_per_day": "950.00",
        "port_name": "Luxor Nile Port",
        "img": "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?auto=format&fit=crop&w=1400&q=80",
    },
    {
        "name": "Sayyad Al Sobh",
        "name_ar": "صياد الصبح",
        "description": "Small fishing boat in Dahab's crystal-clear waters. Ideal for coastal fishing.",
        "description_ar": "قارب صيد صغير في مياه دهب الصافية. مثالي للصيد الساحلي والغطس.",
        "yacht_type": YachtType.FISHING,
        "capacity": 4,
        "price_per_day": "1200.00",
        "port_name": "Dahab Marina",
        "img": "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1400&q=80",
    },
]


class Command(BaseCommand):
    help = "Seed demo yacht data matching the Design prototype."

    def handle(self, *args, **options):
        if Yacht.objects.exists():
            self.stdout.write(self.style.WARNING("Yachts already seeded — skipping."))
            return

        region = Region.objects.filter(is_active=True).first()
        if not region:
            self.stdout.write(self.style.ERROR("No active region found. Run migrations first."))
            return

        # Get or create a demo owner user
        owner, created = User.objects.get_or_create(
            email="owner@seaconnect.local",
            defaults={
                "first_name": "Demo",
                "last_name": "Owner",
                "role": UserRole.OWNER,
                "region": region,
                "is_active": True,
                "is_verified": True,
            },
        )
        if created:
            owner.set_password("admin123")
            owner.save()
            self.stdout.write(f"  Created owner: owner@seaconnect.local / admin123")

        ports = {p.name_en: p for p in DeparturePort.objects.all()}

        created_count = 0
        for data in YACHTS:
            port_name = data.pop("port_name")
            img = data.pop("img")

            # Find closest matching port
            port = ports.get(port_name) or DeparturePort.objects.first()

            yacht = Yacht.objects.create(
                owner=owner,
                region=region,
                departure_port=port,
                currency=region.currency,
                status="active",
                **data,
            )

            YachtMedia.objects.create(
                yacht=yacht,
                url=img,
                media_type="image",
                is_primary=True,
                order=0,
            )
            created_count += 1
            self.stdout.write(f"  Created: {yacht.name}")

        self.stdout.write(self.style.SUCCESS(f"\nSeeded {created_count} yachts successfully."))
