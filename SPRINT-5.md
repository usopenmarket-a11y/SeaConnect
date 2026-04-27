# Sprint 5 — Marketplace + Weather + Fishing Seasons
**Dates:** 2026-05-12 to 2026-05-19
**Goal:** Gear marketplace working end-to-end, weather advisory widget live on yacht detail pages, and fishing season data integrated — all three features shippable to early users.
**Status:** PLANNED

**Primary agents:** django-model-agent, api-endpoint-agent, weather-fishing-agent, nextjs-page-agent, test-writer-agent

---

## Pre-Execution Checklist

Every agent must complete these steps before writing a single line of code:

1. Read `03-Technical-Product/10-ADR-Log.md` — all 20 binding decisions. ADR-001 (ORM, UUID PKs), ADR-013 (CursorPagination on all list endpoints), ADR-014 (RTL-first logical CSS), ADR-015 (i18n keys only), ADR-018 (Region FK, never hardcode currency) are all relevant in this sprint.
2. Read `HANDOFFS.md` — verify Sprint 4 deliverables are DONE. Specifically confirm: `GET /api/v1/ports/` is live (needed for vendor region dropdowns).
3. Read `AGENT-COSTS.md` — Sprint 5 is working with a compressed token budget (~68K remaining at the sprint level; monthly budget has more headroom). Be efficient. If a session will exceed 50,000 tokens, stop and report in HANDOFFS.md.
4. Read `backend/apps/marketplace/models.py` — empty stub from Sprint 1. This sprint owns it.
5. Read `backend/apps/weather/models.py` — empty stub from Sprint 1. This sprint owns it.
6. Read `backend/apps/core/models.py` — understand `Region` and `DeparturePort` (fishing seasons reference DeparturePort for port-specific fish data).

---

## Carry-overs from Sprint 4

| Task | Reason not completed | Priority |
|------|----------------------|----------|
| Owner yacht creation API endpoint | Intentionally deferred in Sprint 4 — form was built but POSTs to a non-existent endpoint | High (Sprint 6 owns this) |
| Owner yacht edit page | Not in Sprint 4 scope | Medium (Sprint 6) |
| Fawry sandbox merchant credentials | Must be configured in `.env.local` before any payment testing | High |

---

## Sprint 5 Tasks

---

### Phase A — Marketplace Backend: Models + API

This phase is split between two agents. The **django-model-agent** builds the models and migrations first. Once those are committed, the **api-endpoint-agent** builds the views and URLs. The two can run in separate sessions on different days.

---

#### Task A-1 — VendorProfile model
**Agent:** django-model-agent
**Depends on:** Nothing — `User` and `Region` models exist from Sprint 1.
**Files touched:**
- `backend/apps/marketplace/models.py` — replace empty stub with full model definitions
- `backend/apps/marketplace/migrations/` — generate migration
- `backend/apps/marketplace/admin.py` — register all marketplace models

**What to build:**

```python
"""Marketplace models — Sprint 5.

ADR-001: UUID PKs, ORM only.
ADR-018: Region FK on VendorProfile and Product; currency from region.
"""
import uuid
from django.db import models
from apps.core.models import Region, TimeStampedModel


class VendorProfile(TimeStampedModel):
    """Extended profile for users with role='vendor'.

    One-to-one with User. Vendors sell gear and equipment in the marketplace.
    A vendor must be manually verified (is_verified=True) by an admin before
    their products are visible to customers.

    ADR-018: region FK drives currency for all vendor products.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="vendor_profile",
        help_text="Must have role='vendor'.",
    )
    business_name = models.CharField(
        max_length=255,
        help_text="Business name in English.",
    )
    business_name_ar = models.CharField(
        max_length=255,
        help_text="Business name in Arabic (primary display).",
    )
    region = models.ForeignKey(
        Region,
        on_delete=models.PROTECT,
        related_name="vendor_profiles",
        help_text="Region the vendor operates in — drives currency.",
    )
    is_verified = models.BooleanField(
        default=False,
        help_text="Admin must verify vendor before products are publicly visible.",
    )
    description = models.TextField(
        blank=True,
        help_text="Short business description in English.",
    )
    description_ar = models.TextField(
        blank=True,
        help_text="Short business description in Arabic.",
    )

    class Meta:
        db_table = "marketplace_vendor_profile"
        ordering = ["-created_at"]
        verbose_name = "Vendor Profile"
        verbose_name_plural = "Vendor Profiles"

    def __str__(self) -> str:
        return f"{self.business_name_ar} / {self.business_name}"


class ProductCategory(TimeStampedModel):
    """Product category (e.g. fishing rods, safety equipment, clothing)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, help_text="Category name in English.")
    name_ar = models.CharField(max_length=100, help_text="Category name in Arabic.")
    slug = models.SlugField(max_length=100, unique=True, help_text="URL-safe identifier.")

    class Meta:
        db_table = "marketplace_product_category"
        ordering = ["name"]
        verbose_name = "Product Category"
        verbose_name_plural = "Product Categories"

    def __str__(self) -> str:
        return f"{self.name_ar} / {self.name}"


class ProductStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    ACTIVE = "active", "Active"
    OUT_OF_STOCK = "out_of_stock", "Out of Stock"
    DISCONTINUED = "discontinued", "Discontinued"


class Product(TimeStampedModel):
    """A physical product listed by a vendor.

    ADR-018: currency from vendor.region — never hardcoded.
    Stock at 0 with status='active' means listed but unavailable — use status='out_of_stock'
    when vendor manually marks it sold out.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.ForeignKey(
        VendorProfile,
        on_delete=models.CASCADE,
        related_name="products",
    )
    category = models.ForeignKey(
        ProductCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )
    name = models.CharField(max_length=255, help_text="Product name in English.")
    name_ar = models.CharField(max_length=255, help_text="Product name in Arabic.")
    description = models.TextField(blank=True, help_text="Description in English.")
    description_ar = models.TextField(blank=True, help_text="Description in Arabic.")
    price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Unit price. NUMERIC(12,2) — never float.",
    )
    currency = models.CharField(
        max_length=3,
        help_text="ISO 4217 from vendor.region at time of listing.",
    )
    stock = models.PositiveIntegerField(
        default=0,
        help_text="Available inventory count.",
    )
    status = models.CharField(
        max_length=20,
        choices=ProductStatus.choices,
        default=ProductStatus.DRAFT,
        db_index=True,
    )
    primary_image_url = models.URLField(
        max_length=1000,
        blank=True,
        help_text="Primary product image URL (MinIO / R2).",
    )

    class Meta:
        db_table = "marketplace_product"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["vendor", "status"], name="idx_product_vendor_status"),
            models.Index(fields=["category", "status"], name="idx_product_cat_status"),
            models.Index(fields=["status"], name="idx_product_status"),
        ]
        verbose_name = "Product"
        verbose_name_plural = "Products"

    def __str__(self) -> str:
        return f"{self.name_ar} / {self.name} ({self.get_status_display()})"


class Cart(TimeStampedModel):
    """Per-user shopping cart. One active cart per user at any time."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="cart",
    )

    class Meta:
        db_table = "marketplace_cart"
        verbose_name = "Cart"
        verbose_name_plural = "Carts"

    def __str__(self) -> str:
        return f"Cart for {self.user.email}"


class CartItem(TimeStampedModel):
    """An item in a user's cart."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="cart_items")
    quantity = models.PositiveSmallIntegerField(default=1)

    class Meta:
        db_table = "marketplace_cart_item"
        unique_together = [("cart", "product")]
        verbose_name = "Cart Item"
        verbose_name_plural = "Cart Items"

    def __str__(self) -> str:
        return f"{self.cart.user.email} — {self.product.name} x {self.quantity}"


class OrderStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    CONFIRMED = "confirmed", "Confirmed"
    SHIPPED = "shipped", "Shipped"
    DELIVERED = "delivered", "Delivered"
    CANCELLED = "cancelled", "Cancelled"


class Order(TimeStampedModel):
    """A placed order from the marketplace."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(
        "accounts.User",
        on_delete=models.PROTECT,
        related_name="orders",
    )
    region = models.ForeignKey(
        Region,
        on_delete=models.PROTECT,
        related_name="orders",
        help_text="Region at time of order.",
    )
    status = models.CharField(
        max_length=20,
        choices=OrderStatus.choices,
        default=OrderStatus.PENDING,
        db_index=True,
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Total order value. NUMERIC(12,2).",
    )
    currency = models.CharField(max_length=3, help_text="ISO 4217 from region.")
    delivery_address = models.TextField(
        blank=True,
        help_text="Delivery address as free text (full address in customer's language).",
    )

    class Meta:
        db_table = "marketplace_order"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["customer", "status"], name="idx_order_customer_status"),
        ]
        verbose_name = "Order"
        verbose_name_plural = "Orders"

    def __str__(self) -> str:
        return f"Order {self.id} — {self.customer.email} ({self.get_status_display()})"


class OrderItem(TimeStampedModel):
    """A line item within an Order. Snapshot of price at time of order."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.PROTECT, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="order_items")
    quantity = models.PositiveSmallIntegerField()
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Price at time of order — snapshot, not a live FK.",
    )
    currency = models.CharField(max_length=3)

    class Meta:
        db_table = "marketplace_order_item"
        verbose_name = "Order Item"
        verbose_name_plural = "Order Items"

    def __str__(self) -> str:
        return f"{self.order_id} — {self.product.name} x {self.quantity}"
```

Admin registration:
```python
from django.contrib import admin
from .models import VendorProfile, ProductCategory, Product, Cart, CartItem, Order, OrderItem


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 0


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ["product", "quantity", "unit_price", "currency"]


@admin.register(VendorProfile)
class VendorProfileAdmin(admin.ModelAdmin):
    list_display = ["business_name_ar", "business_name", "region", "is_verified"]
    list_filter = ["is_verified", "region"]
    actions = ["verify_vendors"]

    def verify_vendors(self, request, queryset):
        queryset.update(is_verified=True)
    verify_vendors.short_description = "Mark selected vendors as verified"


@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ["name_ar", "name", "slug"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["name_ar", "name", "vendor", "category", "price", "currency", "stock", "status"]
    list_filter = ["status", "category"]


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ["user"]
    inlines = [CartItemInline]


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ["id", "customer", "status", "total_amount", "currency", "created_at"]
    list_filter = ["status"]
    inlines = [OrderItemInline]
    readonly_fields = ["id", "customer", "region", "total_amount", "currency", "created_at"]
```

**Definition of done:**
- `python manage.py makemigrations marketplace` generates a clean migration.
- `python manage.py migrate` applies without errors.
- All 7 models visible in Django admin.
- `python manage.py check` passes.
- `unique_together` on `CartItem(cart, product)` prevents duplicate cart line items.

---

#### Task A-2 — Marketplace API endpoints
**Agent:** api-endpoint-agent
**Depends on:** Task A-1 (all marketplace models must exist)
**Files touched:**
- `backend/apps/marketplace/serializers.py` — create serializers
- `backend/apps/marketplace/views.py` — create views
- `backend/apps/marketplace/urls.py` — create URL patterns
- `backend/config/urls.py` — include marketplace URLs

**What to build:**

Create `backend/apps/marketplace/serializers.py`:

```python
from rest_framework import serializers
from .models import Cart, CartItem, Order, OrderItem, Product, ProductCategory, VendorProfile


class ProductCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCategory
        fields = ["id", "name", "name_ar", "slug"]


class ProductListSerializer(serializers.ModelSerializer):
    category = ProductCategorySerializer(read_only=True)
    vendor_name = serializers.CharField(source="vendor.business_name", read_only=True)
    vendor_name_ar = serializers.CharField(source="vendor.business_name_ar", read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "name", "name_ar", "category", "vendor_name", "vendor_name_ar",
            "price", "currency", "stock", "status", "primary_image_url", "created_at",
        ]


class ProductDetailSerializer(ProductListSerializer):
    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + ["description", "description_ar"]


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    product_id = serializers.UUIDField(write_only=True)
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ["id", "product", "product_id", "quantity", "line_total"]

    def get_line_total(self, obj: CartItem):
        return str(obj.product.price * obj.quantity)


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ["id", "items", "item_count"]

    def get_item_count(self, obj: Cart) -> int:
        return obj.items.count()


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_name_ar = serializers.CharField(source="product.name_ar", read_only=True)

    class Meta:
        model = OrderItem
        fields = ["id", "product_name", "product_name_ar", "quantity", "unit_price", "currency"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ["id", "status", "total_amount", "currency", "delivery_address", "items", "created_at"]
        read_only_fields = ["id", "status", "total_amount", "currency", "created_at"]
```

Create `backend/apps/marketplace/views.py`:

```python
"""Marketplace views.

Endpoints:
  GET  /api/v1/marketplace/products/          — public product list (active only, verified vendors)
  GET  /api/v1/marketplace/products/{id}/     — public product detail
  GET  /api/v1/marketplace/categories/        — public category list
  GET  /api/v1/marketplace/cart/              — authenticated: get own cart
  POST /api/v1/marketplace/cart/items/        — add item to cart
  PATCH /api/v1/marketplace/cart/items/{id}/  — update quantity
  DELETE /api/v1/marketplace/cart/items/{id}/ — remove item
  POST /api/v1/marketplace/orders/            — checkout: create order from cart
  GET  /api/v1/marketplace/orders/            — list own orders
  GET  /api/v1/marketplace/orders/{id}/       — order detail

ADR-013: CursorPagination on all list endpoints.
ADR-018: currency populated from vendor.region.currency — never hardcoded.
"""
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.pagination import StandardCursorPagination
from .models import Cart, CartItem, Order, OrderItem, Product, ProductCategory
from .serializers import (
    CartItemSerializer,
    CartSerializer,
    OrderSerializer,
    ProductCategorySerializer,
    ProductDetailSerializer,
    ProductListSerializer,
)


class ProductListView(generics.ListAPIView):
    """GET /api/v1/marketplace/products/ — public, active products from verified vendors."""
    permission_classes = [AllowAny]
    serializer_class = ProductListSerializer
    pagination_class = StandardCursorPagination

    def get_queryset(self):
        qs = (
            Product.objects.filter(status="active", vendor__is_verified=True)
            .select_related("vendor", "category")
            .order_by("-created_at")
        )
        category_slug = self.request.query_params.get("category")
        if category_slug:
            qs = qs.filter(category__slug=category_slug)
        return qs


class ProductDetailView(generics.RetrieveAPIView):
    """GET /api/v1/marketplace/products/{id}/"""
    permission_classes = [AllowAny]
    serializer_class = ProductDetailSerializer
    lookup_field = "id"
    queryset = Product.objects.filter(status="active", vendor__is_verified=True).select_related("vendor", "category")


class CategoryListView(generics.ListAPIView):
    """GET /api/v1/marketplace/categories/"""
    permission_classes = [AllowAny]
    serializer_class = ProductCategorySerializer
    queryset = ProductCategory.objects.all().order_by("name")


class CartView(APIView):
    """GET /api/v1/marketplace/cart/ — get authenticated user's cart."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        return Response(CartSerializer(cart).data)


class CartItemView(APIView):
    """POST /api/v1/marketplace/cart/items/ — add or update item in cart."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        product_id = request.data.get("product_id")
        quantity = int(request.data.get("quantity", 1))
        product = get_object_or_404(Product, id=product_id, status="active")
        cart, _ = Cart.objects.get_or_create(user=request.user)
        item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            defaults={"quantity": quantity},
        )
        if not created:
            item.quantity = quantity
            item.save(update_fields=["quantity", "updated_at"])
        return Response(CartItemSerializer(item).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class CartItemDetailView(APIView):
    """PATCH / DELETE /api/v1/marketplace/cart/items/{id}/"""
    permission_classes = [IsAuthenticated]

    def patch(self, request, id):
        item = get_object_or_404(CartItem, id=id, cart__user=request.user)
        quantity = request.data.get("quantity")
        if quantity:
            item.quantity = int(quantity)
            item.save(update_fields=["quantity", "updated_at"])
        return Response(CartItemSerializer(item).data)

    def delete(self, request, id):
        item = get_object_or_404(CartItem, id=id, cart__user=request.user)
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class OrderListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/marketplace/orders/ — list own orders
    POST /api/v1/marketplace/orders/ — checkout: create order from current cart
    ADR-013: CursorPagination.
    """
    permission_classes = [IsAuthenticated]
    pagination_class = StandardCursorPagination

    def get_serializer_class(self):
        return OrderSerializer

    def get_queryset(self):
        return Order.objects.filter(customer=self.request.user).prefetch_related("items__product").order_by("-created_at")

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        cart = get_object_or_404(Cart, user=request.user)
        items = cart.items.select_related("product__vendor__region").all()
        if not items.exists():
            return Response(
                {"error": {"code": "EMPTY_CART", "message": "Your cart is empty."}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        delivery_address = request.data.get("delivery_address", "")
        # Use the first product's region for the order currency
        first_item = items.first()
        region = first_item.product.vendor.region
        total = sum(item.product.price * item.quantity for item in items)

        order = Order.objects.create(
            customer=request.user,
            region=region,
            status="pending",
            total_amount=total,
            currency=region.currency,
            delivery_address=delivery_address,
        )
        for item in items:
            OrderItem.objects.create(
                order=order,
                product=item.product,
                quantity=item.quantity,
                unit_price=item.product.price,
                currency=item.product.currency,
            )
        cart.items.all().delete()  # Clear the cart after successful checkout
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderDetailView(generics.RetrieveAPIView):
    """GET /api/v1/marketplace/orders/{id}/"""
    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer
    lookup_field = "id"

    def get_queryset(self):
        return Order.objects.filter(customer=self.request.user).prefetch_related("items__product")
```

Create `backend/apps/marketplace/urls.py`:
```python
from django.urls import path
from . import views

app_name = "marketplace"

urlpatterns = [
    path("marketplace/products/", views.ProductListView.as_view(), name="product-list"),
    path("marketplace/products/<uuid:id>/", views.ProductDetailView.as_view(), name="product-detail"),
    path("marketplace/categories/", views.CategoryListView.as_view(), name="category-list"),
    path("marketplace/cart/", views.CartView.as_view(), name="cart-get"),
    path("marketplace/cart/items/", views.CartItemView.as_view(), name="cart-item-add"),
    path("marketplace/cart/items/<uuid:id>/", views.CartItemDetailView.as_view(), name="cart-item-detail"),
    path("marketplace/orders/", views.OrderListCreateView.as_view(), name="order-list-create"),
    path("marketplace/orders/<uuid:id>/", views.OrderDetailView.as_view(), name="order-detail"),
]
```

Add to `backend/config/urls.py`:
```python
path("api/v1/", include("apps.marketplace.urls")),
```

**Definition of done:**
- `GET /api/v1/marketplace/products/` returns cursor-paginated active products from verified vendors.
- `GET /api/v1/marketplace/products/?category=fishing` filters by category slug.
- `GET /api/v1/marketplace/cart/` returns 401 without auth, 200 with auth (creates cart if not exists).
- `POST /api/v1/marketplace/cart/items/` adds an item; second POST with same product_id updates quantity.
- `POST /api/v1/marketplace/orders/` creates an order from the cart, clears the cart, and returns the order.
- `POST /api/v1/marketplace/orders/` with empty cart returns 400 with `EMPTY_CART` error code.
- Order `currency` is derived from `vendor.region.currency` — not hardcoded.
- `python manage.py check` passes.

---

#### Task A-3 — Seed marketplace fixtures
**Agent:** api-endpoint-agent
**Depends on:** Task A-2
**Files touched:**
- `backend/apps/marketplace/management/commands/seed_marketplace.py` — create management command

**What to build:**

Idempotent seed command that creates:
- 3 `ProductCategory` records: fishing gear (`slug='fishing-gear'`), safety equipment (`slug='safety'`), clothing (`slug='clothing'`).
- 1 `VendorProfile` linked to a user with `role='vendor'` (create the user if not exists via `get_or_create`), `is_verified=True`.
- 5 `Product` records spanning the 3 categories, all `status='active'`.

Run with: `python manage.py seed_marketplace`

**Definition of done:**
- Running the command twice creates no duplicates.
- `GET /api/v1/marketplace/products/` returns 5 products after seeding.

---

### Phase B — Weather + Fishing Backend

**Agent:** weather-fishing-agent
**Can start:** Immediately — this phase is fully independent of Phase A.
**Blocks:** Phase C (web integration needs weather API live).

---

#### Task B-1 — Weather and fishing models
**Agent:** weather-fishing-agent
**Depends on:** Nothing — `DeparturePort` and `Region` models exist.
**Files touched:**
- `backend/apps/weather/models.py` — replace stub with full model definitions
- `backend/apps/weather/migrations/` — generate migration
- `backend/apps/weather/admin.py` — register models
- `backend/apps/weather/management/commands/seed_fishing_seasons.py` — create seed command

**What to build:**

```python
"""Weather and fishing season models — Sprint 5.

WeatherCache: denormalized cache of Open-Meteo data per port.
FishingSpecies: a fish species available in Egyptian waters.
FishingSeason: which months a species is in season at a given port.

ADR-001: UUID PKs, ORM only.
"""
import uuid
from django.db import models
from apps.core.models import DeparturePort, TimeStampedModel


class WeatherCache(TimeStampedModel):
    """
    Cached weather data fetched from Open-Meteo API.

    One record per departure port. Overwritten on each fetch (not append-only).
    The API layer caches the HTTP response in Redis for 6 hours to reduce
    Open-Meteo calls. This DB record serves as a fallback when Redis is cold.

    Fields map directly to Open-Meteo `current` response fields.
    See: https://open-meteo.com/en/docs
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    port = models.OneToOneField(
        DeparturePort,
        on_delete=models.CASCADE,
        related_name="weather_cache",
    )
    # Wind
    wind_speed_kmh = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    wind_direction_deg = models.SmallIntegerField(null=True, blank=True)
    # Waves (Open-Meteo Marine API)
    wave_height_m = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    wave_period_s = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    # Temperature and conditions
    temperature_c = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    weather_code = models.SmallIntegerField(
        null=True,
        blank=True,
        help_text="WMO weather code from Open-Meteo.",
    )
    # Advisory
    advisory_level = models.CharField(
        max_length=10,
        choices=[("safe", "Safe"), ("caution", "Caution"), ("danger", "Danger")],
        default="safe",
        help_text="Computed advisory level based on wave height and wind.",
    )
    fetched_at = models.DateTimeField(
        help_text="UTC timestamp when this data was fetched from Open-Meteo.",
    )

    class Meta:
        db_table = "weather_cache"
        verbose_name = "Weather Cache"
        verbose_name_plural = "Weather Cache"

    def __str__(self) -> str:
        return f"Weather @ {self.port.name_en} — {self.advisory_level}"


class FishingSpecies(TimeStampedModel):
    """A fish species found in Egyptian waters."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, help_text="Common name in English.")
    name_ar = models.CharField(max_length=100, help_text="Common name in Arabic.")
    scientific_name = models.CharField(max_length=150, blank=True)
    image_url = models.URLField(max_length=500, blank=True)

    class Meta:
        db_table = "weather_fishing_species"
        ordering = ["name"]
        verbose_name = "Fishing Species"
        verbose_name_plural = "Fishing Species"

    def __str__(self) -> str:
        return f"{self.name_ar} / {self.name}"


class FishingSeason(TimeStampedModel):
    """
    Records which months a species is in season at a specific departure port.

    month is 1–12 (January = 1, December = 12).
    One record per (species, port, month) combination.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    species = models.ForeignKey(
        FishingSpecies,
        on_delete=models.CASCADE,
        related_name="seasons",
    )
    port = models.ForeignKey(
        DeparturePort,
        on_delete=models.CASCADE,
        related_name="fishing_seasons",
    )
    month = models.SmallIntegerField(
        help_text="Month number 1–12.",
        choices=[(i, i) for i in range(1, 13)],
    )
    is_peak = models.BooleanField(
        default=False,
        help_text="True if this is peak season for the species at this port.",
    )

    class Meta:
        db_table = "weather_fishing_season"
        unique_together = [("species", "port", "month")]
        ordering = ["species", "port", "month"]
        verbose_name = "Fishing Season"
        verbose_name_plural = "Fishing Seasons"

    def __str__(self) -> str:
        return f"{self.species.name} @ {self.port.name_en} — month {self.month}"
```

Admin registration:
```python
from django.contrib import admin
from .models import FishingSeason, FishingSpecies, WeatherCache

@admin.register(WeatherCache)
class WeatherCacheAdmin(admin.ModelAdmin):
    list_display = ["port", "advisory_level", "wave_height_m", "wind_speed_kmh", "fetched_at"]
    readonly_fields = ["id", "fetched_at", "created_at", "updated_at"]

@admin.register(FishingSpecies)
class FishingSpeciesAdmin(admin.ModelAdmin):
    list_display = ["name_ar", "name", "scientific_name"]

@admin.register(FishingSeason)
class FishingSeasonAdmin(admin.ModelAdmin):
    list_display = ["species", "port", "month", "is_peak"]
    list_filter = ["port", "is_peak"]
```

Seed command `backend/apps/weather/management/commands/seed_fishing_seasons.py`:

This command must seed Egypt-specific data:
- 8 `FishingSpecies`: Mahi-Mahi / ماهي ماهي, Yellowfin Tuna / تونة صفراء الزعنفة, Red Snapper / لوت أحمر, Kingfish / سمك الراعي, Grouper / هامور, Barracuda / برقودة, Dorado / دورادو, Wahoo / واهو.
- 7 ports: Hurghada, Sharm el-Sheikh, Marsa Alam, Ain Sokhna, Dahab, Nuweiba, El Gouna (use `DeparturePort.objects.filter(region__code='sa-egy')` or however the Egypt region is coded in seed data — check `core/migrations/0002_seed_egypt.py` first).
- Seasons per species × port matrix (approximate real data — the command embeds a static JSON fixture that maps species to their in-season months at each port).

Seed only runs if `FishingSpecies.objects.count() == 0` to be idempotent.

**Definition of done:**
- `python manage.py makemigrations weather` generates a clean migration.
- `python manage.py migrate` applies without errors.
- `python manage.py seed_fishing_seasons` creates 8 species and fills the season matrix.
- Re-running creates no duplicates (idempotency check).
- `python manage.py check` passes.

---

#### Task B-2 — Weather and fishing API endpoints
**Agent:** weather-fishing-agent
**Depends on:** Task B-1 (models must exist)
**Files touched:**
- `backend/apps/weather/serializers.py` — create serializers
- `backend/apps/weather/views.py` — create views with Redis caching
- `backend/apps/weather/urls.py` — create URL patterns
- `backend/config/urls.py` — include weather URLs

**What to build:**

Create `backend/apps/weather/serializers.py`:
```python
from rest_framework import serializers
from .models import FishingSeason, FishingSpecies, WeatherCache


class WeatherSerializer(serializers.ModelSerializer):
    port_name_en = serializers.CharField(source="port.name_en", read_only=True)
    port_name_ar = serializers.CharField(source="port.name_ar", read_only=True)

    class Meta:
        model = WeatherCache
        fields = [
            "port_name_en", "port_name_ar",
            "wind_speed_kmh", "wind_direction_deg",
            "wave_height_m", "wave_period_s",
            "temperature_c", "weather_code",
            "advisory_level", "fetched_at",
        ]


class FishingSpeciesSerializer(serializers.ModelSerializer):
    class Meta:
        model = FishingSpecies
        fields = ["id", "name", "name_ar", "scientific_name", "image_url"]


class FishingSeasonSerializer(serializers.ModelSerializer):
    species = FishingSpeciesSerializer(read_only=True)

    class Meta:
        model = FishingSeason
        fields = ["species", "month", "is_peak"]
```

Create `backend/apps/weather/views.py`:

```python
"""Weather and fishing views.

GET /api/v1/weather/?port_id={uuid}    — current weather for a port (6h Redis cache)
GET /api/v1/fishing/whats-biting/?port_id={uuid} — species in season this month at port
GET /api/v1/fishing/seasons/?port_id={uuid}       — full annual season data for port

Open-Meteo is free (no auth required). Docs: https://open-meteo.com/en/docs
Marine API: https://marine-api.open-meteo.com/v1/marine
"""
import datetime
import logging

import requests
from django.core.cache import cache
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import DeparturePort
from .models import FishingSeason, FishingSpecies, WeatherCache
from .serializers import FishingSeasonSerializer, WeatherSerializer

logger = logging.getLogger(__name__)

WEATHER_CACHE_TTL = 6 * 60 * 60  # 6 hours in seconds


def _compute_advisory(wave_height_m, wind_speed_kmh) -> str:
    """Compute a simple advisory level from wave height and wind speed."""
    wave = float(wave_height_m or 0)
    wind = float(wind_speed_kmh or 0)
    if wave >= 2.0 or wind >= 40:
        return "danger"
    if wave >= 1.0 or wind >= 25:
        return "caution"
    return "safe"


def _fetch_open_meteo(latitude: float, longitude: float) -> dict:
    """Fetch current marine and atmospheric data from Open-Meteo."""
    # Marine API for wave data
    marine_url = "https://marine-api.open-meteo.com/v1/marine"
    marine_params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "wave_height,wave_period",
    }
    marine_resp = requests.get(marine_url, params=marine_params, timeout=10)
    marine_resp.raise_for_status()
    marine_data = marine_resp.json().get("current", {})

    # Forecast API for wind and temperature
    forecast_url = "https://api.open-meteo.com/v1/forecast"
    forecast_params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,wind_speed_10m,wind_direction_10m,weather_code",
    }
    forecast_resp = requests.get(forecast_url, params=forecast_params, timeout=10)
    forecast_resp.raise_for_status()
    forecast_data = forecast_resp.json().get("current", {})

    return {
        "wave_height_m": marine_data.get("wave_height"),
        "wave_period_s": marine_data.get("wave_period"),
        "wind_speed_kmh": forecast_data.get("wind_speed_10m"),
        "wind_direction_deg": forecast_data.get("wind_direction_10m"),
        "temperature_c": forecast_data.get("temperature_2m"),
        "weather_code": forecast_data.get("weather_code"),
    }


class WeatherView(APIView):
    """GET /api/v1/weather/?port_id={uuid}"""
    permission_classes = [AllowAny]

    def get(self, request):
        port_id = request.query_params.get("port_id")
        if not port_id:
            return Response(
                {"error": {"code": "MISSING_PARAM", "message": "port_id is required."}},
                status=400,
            )
        port = get_object_or_404(DeparturePort, id=port_id, is_active=True)
        cache_key = f"sc:weather:{port_id}:v1"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        try:
            data = _fetch_open_meteo(float(port.latitude), float(port.longitude))
        except Exception as exc:
            logger.error("Open-Meteo fetch failed for port %s: %s", port_id, exc)
            # Fall back to DB cache if available
            try:
                db_cache = port.weather_cache
                return Response(WeatherSerializer(db_cache).data)
            except WeatherCache.DoesNotExist:
                return Response(
                    {"error": {"code": "WEATHER_UNAVAILABLE", "message": "Weather data temporarily unavailable."}},
                    status=503,
                )

        advisory = _compute_advisory(data.get("wave_height_m"), data.get("wind_speed_kmh"))
        weather_obj, _ = WeatherCache.objects.update_or_create(
            port=port,
            defaults={**data, "advisory_level": advisory, "fetched_at": timezone.now()},
        )
        serialized = WeatherSerializer(weather_obj).data
        cache.set(cache_key, serialized, WEATHER_CACHE_TTL)
        return Response(serialized)


class WhatsBitingView(APIView):
    """GET /api/v1/fishing/whats-biting/?port_id={uuid} — species in season this month."""
    permission_classes = [AllowAny]

    def get(self, request):
        port_id = request.query_params.get("port_id")
        if not port_id:
            return Response(
                {"error": {"code": "MISSING_PARAM", "message": "port_id is required."}},
                status=400,
            )
        port = get_object_or_404(DeparturePort, id=port_id)
        current_month = datetime.date.today().month
        seasons = (
            FishingSeason.objects.filter(port=port, month=current_month)
            .select_related("species")
            .order_by("-is_peak", "species__name")
        )
        return Response(FishingSeasonSerializer(seasons, many=True).data)


class FishingSeasonsView(APIView):
    """GET /api/v1/fishing/seasons/?port_id={uuid} — full annual data for a port."""
    permission_classes = [AllowAny]

    def get(self, request):
        port_id = request.query_params.get("port_id")
        if not port_id:
            return Response(
                {"error": {"code": "MISSING_PARAM", "message": "port_id is required."}},
                status=400,
            )
        port = get_object_or_404(DeparturePort, id=port_id)
        seasons = (
            FishingSeason.objects.filter(port=port)
            .select_related("species")
            .order_by("month", "species__name")
        )
        return Response(FishingSeasonSerializer(seasons, many=True).data)
```

Create `backend/apps/weather/urls.py`:
```python
from django.urls import path
from . import views

app_name = "weather"

urlpatterns = [
    path("weather/", views.WeatherView.as_view(), name="weather"),
    path("fishing/whats-biting/", views.WhatsBitingView.as_view(), name="whats-biting"),
    path("fishing/seasons/", views.FishingSeasonsView.as_view(), name="fishing-seasons"),
]
```

Add to `backend/config/urls.py`:
```python
path("api/v1/", include("apps.weather.urls")),
```

**Definition of done:**
- `GET /api/v1/weather/?port_id={uuid}` returns JSON with `wave_height_m`, `wind_speed_kmh`, `advisory_level`.
- A second call within 6 hours uses the Redis cache (verifiable by checking cache hit in logs).
- `GET /api/v1/fishing/whats-biting/?port_id={uuid}` returns species in season for the current month.
- `GET /api/v1/fishing/seasons/?port_id={uuid}` returns all 12 months of data.
- If Open-Meteo is unreachable, the endpoint returns the last known `WeatherCache` record (fallback).
- `python manage.py check` passes.

---

### Phase C — Web Integration

**Agent:** nextjs-page-agent
**Can start:** After Phase B endpoints are live (B-2) and Phase A endpoints are live (A-2). Can start marketplace pages as soon as A-2 is done, without waiting for Phase B.
**Depends on:** Task A-2 (marketplace endpoints), Task B-2 (weather/fishing endpoints).

---

#### Task C-1 — Weather widget on yacht detail page
**Agent:** nextjs-page-agent
**Depends on:** Task B-2 (`GET /api/v1/weather/` endpoint live)
**Files touched:**
- `web/components/weather/WeatherWidget.tsx` — create Client Component
- `web/app/[locale]/yachts/[id]/page.tsx` — import and render the widget
- `web/messages/ar.json` — add `weather.*` keys
- `web/messages/en.json` — add `weather.*` keys

**What to build:**

Create `web/components/weather/WeatherWidget.tsx`:
- Client Component (`'use client'`).
- Receives `portId: string` as prop.
- Uses SWR to fetch `GET /api/v1/weather/?port_id={portId}`.
- Renders: wave height, wind speed, temperature, and an advisory badge.
- Advisory badge colors: `safe` → green, `caution` → yellow/amber, `danger` → red.
- Shows a skeleton/spinner while loading.
- If the API returns 503 (weather unavailable), shows a "Weather data temporarily unavailable" message using the i18n key.

Required i18n keys:
```
weather.title, weather.waveHeight, weather.windSpeed, weather.temperature,
weather.advisory.safe, weather.advisory.caution, weather.advisory.danger,
weather.unavailable, weather.meters, weather.kmh, weather.celsius
```

Update `web/app/[locale]/yachts/[id]/page.tsx`:
- Import `WeatherWidget` and render it below the yacht specs, passing the yacht's `departure_port.id` as `portId`.
- `departure_port.id` is available in the `YachtDetailSerializer` response from Sprint 2 (check the actual response shape — `DeparturePortNestedSerializer` includes `id`).

RTL: the widget layout must use logical CSS. Advisory badge uses `ps-` for padding.

**Definition of done:**
- Yacht detail pages at `/ar/yachts/{id}` and `/en/yachts/{id}` show the weather widget.
- Advisory badge color changes based on `advisory_level` from the API.
- The widget gracefully handles API failure (503 or network error).
- `npx tsc --noEmit` passes.

---

#### Task C-2 — "What's biting" section on yacht detail page
**Agent:** nextjs-page-agent
**Depends on:** Task C-1 (page is already updated — append to same page)
**Files touched:**
- `web/components/weather/WhatsBiting.tsx` — create Client Component
- `web/app/[locale]/yachts/[id]/page.tsx` — import and render the section
- `web/messages/ar.json` — add `fishing.*` keys
- `web/messages/en.json` — add `fishing.*` keys

**What to build:**

Create `web/components/weather/WhatsBiting.tsx`:
- Client Component receiving `portId: string`.
- Uses SWR to fetch `GET /api/v1/fishing/whats-biting/?port_id={portId}`.
- Renders a grid of fish species cards showing: name (locale-aware), peak season indicator.
- Empty state: "No fishing data available for this port this month."

Required i18n keys:
```
fishing.whatsBiting, fishing.peakSeason, fishing.noData
```

**Definition of done:**
- "What's biting" section renders below the weather widget on the yacht detail page.
- Shows species names in Arabic on `/ar` pages and English on `/en` pages.
- Peak season indicator is visually distinct (bold or a badge).
- `npx tsc --noEmit` passes.

---

#### Task C-3 — Marketplace product listing page (SSR)
**Agent:** nextjs-page-agent
**Depends on:** Task A-2 (marketplace product endpoint)
**Files touched:**
- `web/app/[locale]/marketplace/page.tsx` — create Server Component (SSR)
- `web/app/[locale]/marketplace/loading.tsx` — create loading skeleton
- `web/components/marketplace/ProductCard.tsx` — create product card component
- `web/messages/ar.json` — add `marketplace.*` keys
- `web/messages/en.json` — add `marketplace.*` keys

**What to build:**

`web/app/[locale]/marketplace/page.tsx` must be a Server Component (no `'use client'`) for SSR and SEO.

- Fetches `GET /api/v1/marketplace/products/` at request time (`cache: 'no-store'`).
- Renders a 3-column product grid using `ProductCard`.
- Category filter: reads `searchParams.category` and appends `?category={slug}` to the API call.
- Category navigation is a list of links (one per category fetched from `GET /api/v1/marketplace/categories/`).

`ProductCard.tsx`:
- Shows primary_image_url (with fallback placeholder), name (locale-aware), vendor_name (locale-aware), price + currency, category name.
- Links to the product detail page `/${locale}/marketplace/${product.id}`.

Required i18n keys:
```
marketplace.title, marketplace.allCategories, marketplace.empty,
marketplace.price, marketplace.vendor, marketplace.viewProduct
```

**Definition of done:**
- `/ar/marketplace` and `/en/marketplace` render SSR with real product data.
- Category filter links update the product grid.
- The page is a Server Component — `'use client'` must NOT appear in `marketplace/page.tsx`.
- `npx tsc --noEmit` passes.

---

#### Task C-4 — Marketplace product detail page (SSR)
**Agent:** nextjs-page-agent
**Depends on:** Task C-3
**Files touched:**
- `web/app/[locale]/marketplace/[id]/page.tsx` — create Server Component
- `web/app/[locale]/marketplace/[id]/loading.tsx` — create loading skeleton
- `web/messages/ar.json` — add `marketplace.detail.*` keys
- `web/messages/en.json` — add `marketplace.detail.*` keys

**What to build:**

Server Component. Fetches `GET /api/v1/marketplace/products/{id}/` server-side.

Renders:
- Product hero image, name (locale-aware), description (locale-aware), price, stock status.
- Vendor name (locale-aware) and category.
- "Add to Cart" button — this triggers a Client Component island (`AddToCartButton.tsx`).

`AddToCartButton.tsx` (Client Component, nested inside the Server Component):
- Receives `productId: string`.
- Calls `POST /api/v1/marketplace/cart/items/` with `{product_id, quantity: 1}`.
- Shows loading state during the API call.
- On success: shows a toast/confirmation message.
- Requires authentication: if not logged in, redirect to login.

Required i18n keys:
```
marketplace.detail.addToCart, marketplace.detail.adding,
marketplace.detail.addedToCart, marketplace.detail.outOfStock,
marketplace.detail.loginToAdd
```

**Definition of done:**
- `/ar/marketplace/{id}` and `/en/marketplace/{id}` render with SSR product data.
- "Add to Cart" button calls the correct endpoint.
- `notFound()` is called when the API returns 404.
- `npx tsc --noEmit` passes.

---

### Phase D — Tests

**Agent:** test-writer-agent
**Can start:** After Phase A and Phase B are both complete.
**Depends on:** Task A-2, Task B-2.

---

#### Task D-1 — Weather API tests (mocked Open-Meteo)
**Agent:** test-writer-agent
**Depends on:** Task B-2
**Files touched:**
- `backend/apps/weather/tests/__init__.py` — create
- `backend/apps/weather/tests/test_weather.py` — create

**What to build:**

All Open-Meteo HTTP calls must be mocked — never make real network calls in tests.

Tests to include:
- `test_weather_returns_advisory_level` — mock Open-Meteo responses, call `GET /api/v1/weather/?port_id={uuid}`, assert response contains `advisory_level` in `['safe', 'caution', 'danger']`.
- `test_weather_caches_in_redis` — call the endpoint twice; assert Open-Meteo is called exactly once (second call hits cache).
- `test_weather_missing_port_id_returns_400` — call without `port_id`, assert 400.
- `test_weather_inactive_port_returns_404` — use a port with `is_active=False`, assert 404.
- `test_weather_open_meteo_failure_falls_back_to_db` — mock Open-Meteo to raise `requests.ConnectionError`, assert the endpoint returns 200 using the pre-seeded `WeatherCache` record (or 503 if no cache exists).
- `test_advisory_safe_when_low_waves_and_wind` — unit test `_compute_advisory(wave_height_m=0.5, wind_speed_kmh=10)` returns `'safe'`.
- `test_advisory_danger_when_high_waves` — unit test `_compute_advisory(wave_height_m=2.5, wind_speed_kmh=10)` returns `'danger'`.

Fishing tests:
- `test_whats_biting_returns_current_month_species` — seed a `FishingSeason` for the current month at a port, assert the species appears in the response.
- `test_whats_biting_missing_port_id_returns_400` — assert 400.
- `test_fishing_seasons_returns_all_months` — seed seasons for 3 months, assert all 3 appear in the full season response.

**Definition of done:**
- `pytest backend/apps/weather/tests/ -v` all tests pass.
- No test makes a real HTTP request (all `requests.get` calls are mocked).
- Cache tests use Django's `TEST_CACHE` configuration (locmem by default in test settings — verify in `backend/config/settings/test.py` if it exists, otherwise add a comment that `CACHES['default']` in test uses `django.core.cache.backends.locmem.LocMemCache`).

---

#### Task D-2 — Marketplace CRUD tests
**Agent:** test-writer-agent
**Depends on:** Task A-2
**Files touched:**
- `backend/apps/marketplace/tests/__init__.py` — create
- `backend/apps/marketplace/tests/test_marketplace.py` — create

**What to build:**

Tests to include:

Product listing:
- `test_product_list_returns_active_only` — create one active and one draft product from a verified vendor, assert list returns only the active one.
- `test_product_list_excludes_unverified_vendors` — create product from an unverified vendor, assert it does not appear in the list.
- `test_product_list_filter_by_category` — create products in two categories, filter by slug, assert correct results.
- `test_product_detail_not_found_for_draft` — create a draft product, assert GET detail returns 404.
- `test_product_list_no_auth_required` — assert GET returns 200 without auth token.

Cart:
- `test_add_to_cart_requires_auth` — assert POST to cart/items/ without auth returns 401.
- `test_add_to_cart_creates_item` — authenticated POST, assert CartItem exists.
- `test_add_same_product_updates_quantity` — add the same product twice with different quantities, assert one CartItem with the second quantity.
- `test_remove_cart_item` — DELETE cart item, assert 204, assert item no longer in cart.

Checkout:
- `test_checkout_creates_order_from_cart` — add two items to cart, POST to orders/, assert 201, assert Order has two OrderItems, assert cart is empty after.
- `test_checkout_empty_cart_returns_400` — POST to orders/ with empty cart, assert 400 with `EMPTY_CART` error code.
- `test_order_currency_from_vendor_region` — assert created order currency matches `vendor.region.currency`, not a hardcoded value.
- `test_order_unit_price_is_snapshot` — create order, then change product.price, assert order item still has original price (snapshot semantics).

**Definition of done:**
- `pytest backend/apps/marketplace/tests/ -v` all tests pass.
- `test_order_currency_from_vendor_region` explicitly asserts that the currency field is not hardcoded — it reads from the `Region` object.
- No test uses `seed_marketplace` — all fixtures created in the test itself.

---

## Agent Coordination Notes

### Dependency order

```
Week 1 — Days 1-5 (2026-05-12 to 2026-05-16):
  Day 1:   Task A-1 (django-model-agent) — marketplace models + migrations
            Task B-1 (weather-fishing-agent) — weather/fishing models + migrations (parallel)
  Day 2:   Task A-2 (api-endpoint-agent) — marketplace views + URLs (needs A-1 done)
            Task B-2 (weather-fishing-agent) — weather/fishing views + URLs (needs B-1 done)
            Task A-3 — seed marketplace command (can run after A-2)
  Day 3:   Task B-1 seed command for fishing seasons (if not done on Day 1)
  Day 3-4: Phase C — nextjs-page-agent starts as soon as A-2 and B-2 are confirmed live

Week 2 — Days 6-8 (2026-05-16 to 2026-05-19):
  Day 5-6: Phase D (test-writer-agent) — weather tests + marketplace tests
  Day 7:   Fix any test failures. RTL audit of new pages.
  Day 8:   Integration smoke test (full end-to-end). HANDOFFS.md and AGENT-COSTS.md updates.
```

### File conflict zones

| File | Agents writing | Resolution |
|------|---------------|------------|
| `backend/apps/marketplace/models.py` | django-model-agent (A-1) | Sole owner — was empty stub |
| `backend/apps/marketplace/views.py` | api-endpoint-agent (A-2) | Sole owner — was empty stub |
| `backend/apps/weather/models.py` | weather-fishing-agent (B-1) | Sole owner — was empty stub |
| `backend/apps/weather/views.py` | weather-fishing-agent (B-2) | Sole owner — was empty stub |
| `web/app/[locale]/yachts/[id]/page.tsx` | nextjs-page-agent (C-1, C-2) | Sequential — C-2 adds WhatsBiting below the WeatherWidget added by C-1 |
| `web/messages/ar.json` | nextjs-page-agent (C-1, C-2, C-3, C-4) | Sequential — each task adds a separate top-level key namespace |
| `backend/config/urls.py` | api-endpoint-agent (A-2), weather-fishing-agent (B-2) | Both append an `include()` line — no conflict if done sequentially |

### Critical implementation notes

1. The `WeatherCache` model uses `update_or_create` — there is always at most one row per port. This is intentional: weather data is ephemeral and the DB record is a fallback, not the primary cache (Redis is).
2. Redis cache key pattern for weather: `sc:weather:{port_id}:v1`. The TTL is 6 hours (21,600 seconds). Always set explicit TTLs — ADR code of conduct.
3. Open-Meteo is free and requires no API key. Do not add any API key configuration for it. Both the Marine and Forecast endpoints are called in sequence — if either fails, log the error and fall back to `WeatherCache`.
4. The `OrderItem.unit_price` field must be populated from `product.price` at the time of checkout — not via FK. This is a price snapshot and is critical for audit correctness. Never read the price back from the product after the order is created.
5. The marketplace product listing page is a Server Component for SEO (customers search for "fishing rods Egypt" etc.). The "Add to Cart" button is a Client Component island nested inside — this is the correct Next.js Islands architecture pattern.
6. `FishingSeason.month` is an integer 1–12. The `whats-biting` endpoint computes `datetime.date.today().month` server-side — this is UTC-based. For Egypt (UTC+2), this is acceptable for MVP; timezone-aware month computation is post-MVP.
7. Check `backend/apps/core/migrations/0002_seed_egypt.py` to find the exact `region.code` value used for Egypt before writing the `seed_fishing_seasons` command. Do not assume `'EG'` — it may be `'sa-egy'` or another code.

---

## Token Budget

| Agent | Phase | Estimated tokens | Purpose |
|-------|-------|-----------------|---------|
| django-model-agent | A-1 | 20,000 | 7 marketplace models + migrations + admin |
| api-endpoint-agent | A-2, A-3 | 22,000 | Marketplace views, serializers, URLs, seed command |
| weather-fishing-agent | B-1, B-2 | 20,000 | Weather/fishing models + views + seed command |
| nextjs-page-agent | C | 35,000 | Weather widget, what's biting, marketplace list + detail pages |
| test-writer-agent | D | 18,000 | Weather tests (mocked HTTP) + marketplace CRUD tests |
| **Total** | | **115,000** | |
| **Sprint 1–4 cumulative estimate** | | ~432,000 | |
| **Sprint 5 estimate** | | ~115,000 | |
| **Cumulative estimate** | | ~547,000 | Over 500K sprint budget — within 2M monthly budget |
| **Monthly budget remaining** | | ~1,453,000 | Monthly resets — not a hard stop |

Note: Sprint 5 pushes the cumulative total over the 500K sprint estimate. This does NOT trigger a hard stop (that is the 2M/month monthly budget). However, the sprint coordinator must log this in the next HANDOFFS.md and re-calibrate estimates for Sprints 6+.

---

## Risk Flags

- Open-Meteo's Marine API (`marine-api.open-meteo.com`) uses a different base URL from the main forecast API. Both must be called. If the Marine endpoint times out, the weather endpoint should still return forecast data (wind, temperature) with `wave_height_m=null`. Handle this gracefully in `_fetch_open_meteo`.
- The Egypt seed data in `core/migrations/0002_seed_egypt.py` may not include all 7 ports required for fishing season data (Hurghada, Sharm, Marsa Alam, Ain Sokhna, Dahab, Nuweiba, El Gouna). The `seed_fishing_seasons` command must check for existing ports first and skip species-port combinations where the port does not yet exist. The missing ports should be added via a new core migration (`0003_add_egypt_ports.py`) if necessary.
- Token budget exceeds the sprint-level 500K estimate. All agents must check `AGENT-COSTS.md` before starting and stop at 50K tokens per session. Monthly budget (2M) is the binding hard stop.
- The `AddToCartButton.tsx` Client Component is nested inside a Server Component page — this is valid Next.js App Router architecture (Server Components can have Client Component children). The agent must NOT add `'use client'` to the page itself, only to the button component.
- Cart order checkout uses the `vendor.region.currency` from the first cart item to set the order currency. If items from different regions/currencies are in the cart, this is a known limitation for MVP. A multi-currency cart is post-MVP. Add a comment in the code acknowledging this.

---

## Definition of Sprint Done

- [ ] `VendorProfile`, `ProductCategory`, `Product`, `Cart`, `CartItem`, `Order`, `OrderItem` models migrated and in admin.
- [ ] `GET /api/v1/marketplace/products/` returns active products from verified vendors with cursor pagination.
- [ ] `GET /api/v1/marketplace/products/?category={slug}` filters correctly.
- [ ] `GET /api/v1/marketplace/cart/` returns authenticated user's cart (creates if not exists).
- [ ] `POST /api/v1/marketplace/cart/items/` adds or updates cart item.
- [ ] `POST /api/v1/marketplace/orders/` creates an order, clears the cart, returns order with line items.
- [ ] `POST /api/v1/marketplace/orders/` returns 400 `EMPTY_CART` when cart is empty.
- [ ] Order currency derived from `vendor.region.currency` — not hardcoded.
- [ ] `python manage.py seed_marketplace` idempotently creates 3 categories and 5 products.
- [ ] `WeatherCache`, `FishingSpecies`, `FishingSeason` models migrated and in admin.
- [ ] `GET /api/v1/weather/?port_id={uuid}` returns current weather with `advisory_level`.
- [ ] Weather response is cached in Redis for 6 hours (`sc:weather:{port_id}:v1`).
- [ ] `GET /api/v1/fishing/whats-biting/?port_id={uuid}` returns current-month species.
- [ ] `GET /api/v1/fishing/seasons/?port_id={uuid}` returns full annual data.
- [ ] `python manage.py seed_fishing_seasons` creates 8 species and a season matrix for Egypt ports.
- [ ] Weather widget renders on yacht detail page with advisory badge.
- [ ] "What's biting" section renders on yacht detail page with locale-aware species names.
- [ ] `/[locale]/marketplace/` SSR page renders with product grid and category filter.
- [ ] `/[locale]/marketplace/[id]` SSR page renders with "Add to Cart" Client Component button.
- [ ] All weather API tests pass with mocked Open-Meteo HTTP.
- [ ] All marketplace CRUD tests pass including snapshot price test.
- [ ] `python manage.py check` passes.
- [ ] `npx tsc --noEmit` passes in `web/`.
- [ ] `HANDOFFS.md` updated with Sprint 5 → Sprint 6 handoff entry (note token budget overage).
- [ ] `AGENT-COSTS.md` updated with Sprint 5 actual token row and cumulative total.
