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
