"""Seed command for marketplace data — Sprint 5.

Idempotent: safe to run multiple times. Skips all creation if
ProductCategory rows already exist.

Usage:
    python manage.py seed_marketplace
"""
from django.core.management.base import BaseCommand

from apps.accounts.models import User, UserRole
from apps.core.models import Region
from apps.marketplace.models import Product, ProductCategory, ProductStatus, VendorProfile


CATEGORIES = [
    {"name": "Fishing Gear", "name_ar": "معدات الصيد", "slug": "fishing-gear"},
    {"name": "Safety Equipment", "name_ar": "معدات السلامة", "slug": "safety"},
    {"name": "Clothing & Apparel", "name_ar": "ملابس وأزياء", "slug": "clothing"},
]

PRODUCTS = [
    {
        "name": "Professional Fishing Rod",
        "name_ar": "سنارة صيد احترافية",
        "description": "High-quality carbon fibre fishing rod, 2.4m, suitable for sea fishing.",
        "description_ar": "سنارة صيد من ألياف الكربون عالية الجودة، 2.4 متر، مناسبة لصيد البحر.",
        "price": "450.00",
        "stock": 50,
        "category_slug": "fishing-gear",
        "primary_image_url": "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800",
    },
    {
        "name": "Fishing Tackle Box",
        "name_ar": "صندوق أدوات الصيد",
        "description": "Waterproof tackle box with 24 compartments for lures and hooks.",
        "description_ar": "صندوق أدوات مقاوم للماء بـ 24 حجرة للطعم والصنارات.",
        "price": "180.00",
        "stock": 120,
        "category_slug": "fishing-gear",
        "primary_image_url": "https://images.unsplash.com/photo-1595503240812-7286dafaddc1?w=800",
    },
    {
        "name": "Adult Life Jacket",
        "name_ar": "سترة نجاة للبالغين",
        "description": "CE-approved foam life jacket, 150N buoyancy, adjustable straps.",
        "description_ar": "سترة نجاة رغوية معتمدة CE، قوة طفو 150N، أحزمة قابلة للتعديل.",
        "price": "320.00",
        "stock": 80,
        "category_slug": "safety",
        "primary_image_url": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
    },
    {
        "name": "Marine First Aid Kit",
        "name_ar": "حقيبة إسعافات أولية بحرية",
        "description": "Comprehensive waterproof first aid kit for marine environments, 64 pieces.",
        "description_ar": "حقيبة إسعافات أولية مقاومة للماء شاملة للبيئات البحرية، 64 قطعة.",
        "price": "250.00",
        "stock": 60,
        "category_slug": "safety",
        "primary_image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800",
    },
    {
        "name": "UV Protection Fishing Shirt",
        "name_ar": "قميص صيد بحماية من الأشعة فوق البنفسجية",
        "description": "Long-sleeve UPF 50+ fishing shirt, moisture-wicking, quick-dry fabric.",
        "description_ar": "قميص صيد بأكمام طويلة وحماية UPF 50+، قماش سريع الجفاف.",
        "price": "195.00",
        "stock": 200,
        "category_slug": "clothing",
        "primary_image_url": "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800",
    },
]


class Command(BaseCommand):
    help = "Seed marketplace categories, a vendor, and sample products. Idempotent."

    def handle(self, *args, **options):
        # Idempotency guard — skip everything if categories already exist.
        if ProductCategory.objects.count() > 0:
            self.stdout.write(self.style.WARNING(
                "Marketplace data already seeded. Skipping."
            ))
            return

        self.stdout.write("Seeding marketplace data...")

        # 1. Categories
        category_map = {}
        for cat_data in CATEGORIES:
            cat = ProductCategory.objects.create(**cat_data)
            category_map[cat.slug] = cat
            self.stdout.write(f"  Created category: {cat.name_ar} / {cat.name}")

        # 2. Vendor user
        vendor_user, created = User.objects.get_or_create(
            email="vendor@seaconnect.local",
            defaults={
                "first_name": "بائع",
                "last_name": "تجريبي",
                "role": UserRole.VENDOR,
                "is_active": True,
            },
        )
        if created:
            vendor_user.set_password("vendorpass123!")
            vendor_user.save(update_fields=["password"])
            self.stdout.write(f"  Created vendor user: {vendor_user.email}")
        else:
            self.stdout.write(f"  Using existing vendor user: {vendor_user.email}")

        # 3. Region — prefer active Egypt region, fall back to any active region
        region = (
            Region.objects.filter(is_active=True, code="sa-egy").first()
            or Region.objects.filter(is_active=True).first()
        )
        if region is None:
            self.stdout.write(self.style.ERROR(
                "No active Region found. Run core migrations/seed first."
            ))
            return
        self.stdout.write(f"  Using region: {region.name_en} (currency={region.currency})")

        # 4. VendorProfile
        vendor_profile, _ = VendorProfile.objects.get_or_create(
            user=vendor_user,
            defaults={
                "business_name": "SeaConnect Demo Store",
                "business_name_ar": "متجر سي كونكت التجريبي",
                "region": region,
                "is_verified": True,
                "description": "Demo vendor for marketplace testing.",
                "description_ar": "بائع تجريبي لاختبار المتجر.",
            },
        )
        self.stdout.write(f"  Vendor profile: {vendor_profile.business_name_ar}")

        # 5. Products
        for product_data in PRODUCTS:
            category = category_map[product_data.pop("category_slug")]
            Product.objects.create(
                vendor=vendor_profile,
                category=category,
                currency=region.currency,
                status=ProductStatus.ACTIVE,
                **product_data,
            )
            self.stdout.write(f"  Created product: {product_data['name_ar']}")

        self.stdout.write(self.style.SUCCESS(
            f"Done. {len(CATEGORIES)} categories, 1 vendor, {len(PRODUCTS)} products created."
        ))
