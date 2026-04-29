"""Marketplace models — Sprint 5."""
import uuid
from django.db import models
from apps.core.models import Region, TimeStampedModel


class VendorProfile(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="vendor_profile",
        help_text="Must have role='vendor'.",
    )
    business_name = models.CharField(max_length=255)
    business_name_ar = models.CharField(max_length=255)
    region = models.ForeignKey(
        Region,
        on_delete=models.PROTECT,
        related_name="vendor_profiles",
        help_text="Region the vendor operates in — drives currency.",
    )
    is_verified = models.BooleanField(default=False)
    description = models.TextField(blank=True)
    description_ar = models.TextField(blank=True)

    class Meta:
        db_table = "marketplace_vendor_profile"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.business_name_ar} / {self.business_name}"


class ProductCategory(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    name_ar = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)

    class Meta:
        db_table = "marketplace_product_category"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name_ar} / {self.name}"


class ProductStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    ACTIVE = "active", "Active"
    OUT_OF_STOCK = "out_of_stock", "Out of Stock"
    DISCONTINUED = "discontinued", "Discontinued"


class Product(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.ForeignKey(VendorProfile, on_delete=models.CASCADE, related_name="products")
    category = models.ForeignKey(
        ProductCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )
    name = models.CharField(max_length=255)
    name_ar = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    description_ar = models.TextField(blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3)
    stock = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=20,
        choices=ProductStatus.choices,
        default=ProductStatus.DRAFT,
        db_index=True,
    )
    primary_image_url = models.URLField(max_length=1000, blank=True)

    class Meta:
        db_table = "marketplace_product"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["vendor", "status"], name="idx_product_vendor_status"),
            models.Index(fields=["category", "status"], name="idx_product_cat_status"),
            models.Index(fields=["status"], name="idx_product_status"),
        ]

    def __str__(self):
        return f"{self.name_ar} / {self.name} ({self.get_status_display()})"


class Cart(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="cart")

    class Meta:
        db_table = "marketplace_cart"

    def __str__(self):
        return f"Cart for {self.user.email}"


class CartItem(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="cart_items")
    quantity = models.PositiveSmallIntegerField(default=1)

    class Meta:
        db_table = "marketplace_cart_item"
        unique_together = [("cart", "product")]

    def __str__(self):
        return f"{self.cart.user.email} — {self.product.name} x {self.quantity}"


class OrderStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    CONFIRMED = "confirmed", "Confirmed"
    SHIPPED = "shipped", "Shipped"
    DELIVERED = "delivered", "Delivered"
    CANCELLED = "cancelled", "Cancelled"


class Order(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey("accounts.User", on_delete=models.PROTECT, related_name="orders")
    region = models.ForeignKey(Region, on_delete=models.PROTECT, related_name="orders")
    status = models.CharField(
        max_length=20,
        choices=OrderStatus.choices,
        default=OrderStatus.PENDING,
        db_index=True,
    )
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3)
    delivery_address = models.TextField(blank=True)

    class Meta:
        db_table = "marketplace_order"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["customer", "status"], name="idx_order_customer_status"),
        ]

    def __str__(self):
        return f"Order {self.id} — {self.customer.email} ({self.get_status_display()})"


class OrderItem(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.PROTECT, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="order_items")
    quantity = models.PositiveSmallIntegerField()
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Price snapshot at time of order.",
    )
    currency = models.CharField(max_length=3)

    class Meta:
        db_table = "marketplace_order_item"

    def __str__(self):
        return f"{self.order_id} — {self.product.name} x {self.quantity}"
