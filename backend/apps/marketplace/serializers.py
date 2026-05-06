from rest_framework import serializers
from .models import Cart, CartItem, Order, OrderItem, Product, ProductCategory, ProductStatus, VendorProfile


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
            "id",
            "name",
            "name_ar",
            "category",
            "vendor_name",
            "vendor_name_ar",
            "price",
            "currency",
            "stock",
            "status",
            "primary_image_url",
            "created_at",
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

    def get_line_total(self, obj):
        return str(obj.product.price * obj.quantity)


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ["id", "items", "item_count"]

    def get_item_count(self, obj):
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
        fields = [
            "id",
            "status",
            "total_amount",
            "currency",
            "delivery_address",
            "items",
            "created_at",
        ]
        read_only_fields = ["id", "status", "total_amount", "currency", "created_at"]


# ---------------------------------------------------------------------------
# Sprint 11D — Vendor product write serializers
# ---------------------------------------------------------------------------


class ProductWriteSerializer(serializers.ModelSerializer):
    """Serializer for vendor product create and update.

    Accepts the mutable fields only. ``vendor`` and ``status`` are set
    server-side — never accepted from the client.

    Validation rules:
      - price must be > 0
      - stock must be >= 0 (PositiveIntegerField already enforces > 0 at DB
        level, but we give a clear API message here)
    """

    class Meta:
        model = Product
        fields = [
            "name",
            "name_ar",
            "description",
            "description_ar",
            "price",
            "currency",
            "stock",
            "category",
            "primary_image_url",
        ]

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than zero.")
        return value

    def validate_stock(self, value):
        if value < 0:
            raise serializers.ValidationError("Stock cannot be negative.")
        return value

    def validate_currency(self, value):
        if len(value) != 3:
            raise serializers.ValidationError("Currency must be a 3-character ISO 4217 code.")
        return value.upper()


class VendorProfileReadSerializer(serializers.ModelSerializer):
    """Read-only vendor profile response shape."""

    region_name = serializers.CharField(source="region.name_en", read_only=True)
    region_currency = serializers.CharField(source="region.currency", read_only=True)

    class Meta:
        model = VendorProfile
        fields = [
            "id",
            "business_name",
            "business_name_ar",
            "description",
            "description_ar",
            "is_verified",
            "region_name",
            "region_currency",
            "created_at",
        ]
        read_only_fields = fields


class VendorProfileWriteSerializer(serializers.ModelSerializer):
    """Write serializer for vendor profile updates.

    Vendors may update their storefront text. ``is_verified`` and ``region``
    are admin-only fields and are never accepted here.
    """

    class Meta:
        model = VendorProfile
        fields = [
            "business_name",
            "business_name_ar",
            "description",
            "description_ar",
        ]

    def validate_business_name(self, value):
        if not value.strip():
            raise serializers.ValidationError("Business name may not be blank.")
        return value
