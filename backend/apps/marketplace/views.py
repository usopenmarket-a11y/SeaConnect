"""Marketplace views — Sprint 5."""
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

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
    permission_classes = [AllowAny]
    serializer_class = ProductListSerializer
    ordering = ["-created_at"]  # ADR-013: CursorPagination requires explicit ordering

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
    permission_classes = [AllowAny]
    serializer_class = ProductDetailSerializer
    lookup_field = "id"
    queryset = (
        Product.objects.filter(status="active", vendor__is_verified=True)
        .select_related("vendor", "category")
    )


class CategoryListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = ProductCategorySerializer
    queryset = ProductCategory.objects.all().order_by("name")
    pagination_class = None


class CartView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        return Response(CartSerializer(cart).data)


class CartItemView(APIView):
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
        return Response(
            CartItemSerializer(item).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class CartItemDetailView(APIView):
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
    permission_classes = [IsAuthenticated]
    ordering = ["-created_at"]  # ADR-013: CursorPagination requires explicit ordering

    def get_serializer_class(self):
        return OrderSerializer

    def get_queryset(self):
        return (
            Order.objects.filter(customer=self.request.user)
            .prefetch_related("items__product")
            .order_by("-created_at")
        )

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
        # MVP: use first item's region for order currency.
        # Multi-currency cart is post-MVP.
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
                unit_price=item.product.price,  # snapshot — never re-read after order creation
                currency=item.product.currency,
            )
        cart.items.all().delete()
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = OrderSerializer
    lookup_field = "id"

    def get_queryset(self):
        return (
            Order.objects.filter(customer=self.request.user)
            .prefetch_related("items__product")
        )
