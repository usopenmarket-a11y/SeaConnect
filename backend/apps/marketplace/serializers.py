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
