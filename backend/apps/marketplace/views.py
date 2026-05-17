"""Marketplace views — Sprint 5 + Sprint 11D vendor product management + Sprint 12A image upload + Sprint 10E filters + Sprint 12F vendor API gaps + Sprint 14A semantic search."""
import os
import uuid as uuid_module
from decimal import Decimal, InvalidOperation

import httpx
from django.conf import settings
from django.core.files.storage import default_storage
from django.db import models, transaction
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.throttles import UploadThrottle

from .models import Cart, CartItem, Order, OrderItem, OrderStatus, Product, ProductCategory, ProductImage, ProductStatus, VendorProfile
from .permissions import IsOrderVendor, IsProductOwner, IsVendorProfileOwner, IsVendorRole
from .serializers import (
    CartItemSerializer,
    CartSerializer,
    OrderSerializer,
    ProductCategorySerializer,
    ProductDetailSerializer,
    ProductImageUploadSerializer,
    ProductListSerializer,
    ProductWriteSerializer,
    VendorProfileReadSerializer,
    VendorProfileWriteSerializer,
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


# ---------------------------------------------------------------------------
# Sprint 11D — Vendor product management views
# ---------------------------------------------------------------------------


class VendorProductListCreateView(generics.ListCreateAPIView):
    """GET (public list) + POST (vendor create) on /api/v1/marketplace/products/.

    GET is public (AllowAny) — returns active products from verified vendors.
    POST requires IsVendorRole — creates a product owned by request.user's
    VendorProfile. The product starts in DRAFT status; the vendor must
    explicitly activate it.

    ADR-013: CursorPagination is applied globally via DEFAULT_PAGINATION_CLASS.
    No N+1: select_related covers vendor + category on every queryset.
    """

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), IsVendorRole()]
        return [AllowAny()]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ProductWriteSerializer
        return ProductListSerializer

    def get_queryset(self):
        qs = (
            Product.objects.filter(status=ProductStatus.ACTIVE, vendor__is_verified=True)
            .select_related("vendor", "category")
            .order_by("-created_at")
        )
        params = self.request.query_params

        category_slug = params.get("category")
        if category_slug:
            qs = qs.filter(category__slug=category_slug)

        # price_min: include products where price >= N (silently ignore non-numeric values)
        price_min_raw = params.get("price_min")
        if price_min_raw is not None:
            try:
                qs = qs.filter(price__gte=Decimal(price_min_raw))
            except InvalidOperation:
                pass  # invalid param — ignore, return unfiltered

        # price_max: include products where price <= N (silently ignore non-numeric values)
        price_max_raw = params.get("price_max")
        if price_max_raw is not None:
            try:
                qs = qs.filter(price__lte=Decimal(price_max_raw))
            except InvalidOperation:
                pass  # invalid param — ignore, return unfiltered

        # rating: include products where average_rating >= N (silently ignore non-numeric values)
        rating_raw = params.get("rating")
        if rating_raw is not None:
            try:
                qs = qs.filter(average_rating__gte=Decimal(rating_raw))
            except InvalidOperation:
                pass  # invalid param — ignore, return unfiltered

        # search: vector search (ADR-019) with icontains fallback.
        search_query = params.get("search", "").strip()
        if search_query:
            qs = self._apply_search(qs, search_query)

        return qs

    def _apply_search(self, qs, query: str):
        """Apply pgvector cosine-distance search with icontains fallback (ADR-019).

        Primary path: fetch embedding from Ollama, filter to products that have
        an embedding, order by CosineDistance.
        Fallback path (Ollama timeout / no embeddings): icontains across name +
        description fields.  Both paths are ORM-only (ADR-001).
        """
        try:
            from pgvector.django import CosineDistance

            ollama_url: str = getattr(settings, "OLLAMA_BASE_URL", "http://ollama:11434")
            resp = httpx.post(
                f"{ollama_url}/api/embeddings",
                json={"model": "nomic-embed-text", "prompt": query},
                timeout=5.0,
            )
            resp.raise_for_status()
            query_vector: list[float] = resp.json()["embedding"]

            # Only rank by embedding when at least some products have embeddings.
            if qs.filter(embedding__isnull=False).exists():
                return (
                    qs.filter(embedding__isnull=False)
                    .annotate(distance=CosineDistance("embedding", query_vector))
                    .order_by("distance")
                )
            # No embeddings stored yet — fall through to text search.
            raise ValueError("no embeddings stored")  # noqa: TRY301
        except Exception:
            # Graceful fallback: icontains text search (ORM only, ADR-001).
            return qs.filter(
                models.Q(name__icontains=query)
                | models.Q(name_ar__icontains=query)
                | models.Q(description__icontains=query)
                | models.Q(description_ar__icontains=query)
            ).order_by("-created_at")

    def perform_create(self, serializer):
        """Attach the authenticated vendor's VendorProfile to the new product.

        After the DB transaction commits, schedule async embedding generation
        so the product becomes searchable via vector search (ADR-019).
        """
        vendor_profile = get_object_or_404(VendorProfile, user=self.request.user)
        serializer.save(vendor=vendor_profile, status=ProductStatus.DRAFT)

        # Trigger async embedding generation after the DB transaction commits
        # so the Celery task always sees the persisted row (ADR-019).
        from .tasks import generate_product_embedding
        instance = serializer.instance
        transaction.on_commit(
            lambda: generate_product_embedding.delay(str(instance.id))
        )


class VendorProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET (public detail) + PATCH (vendor update) + DELETE (vendor soft-delete).

    GET is public — returns any active product from a verified vendor.
    PATCH/DELETE require IsVendorRole + IsProductOwner.

    Soft-delete sets status=DISCONTINUED rather than removing the DB row,
    preserving OrderItem history (foreign key integrity).
    """

    lookup_field = "id"

    def get_permissions(self):
        if self.request.method in ("PATCH", "PUT", "DELETE"):
            return [IsAuthenticated(), IsVendorRole(), IsProductOwner()]
        return [AllowAny()]

    def get_serializer_class(self):
        if self.request.method in ("PATCH", "PUT"):
            return ProductWriteSerializer
        return ProductDetailSerializer

    def get_queryset(self):
        if self.request.method in ("PATCH", "PUT", "DELETE"):
            # Vendors can act on their own products regardless of status.
            return (
                Product.objects.select_related("vendor", "category")
                .filter(vendor__is_verified=True)
            )
        # Public GET — active products only.
        return (
            Product.objects.filter(status=ProductStatus.ACTIVE, vendor__is_verified=True)
            .select_related("vendor", "category")
        )

    def perform_destroy(self, instance):
        """Soft-delete: mark product DISCONTINUED instead of removing the row."""
        instance.status = ProductStatus.DISCONTINUED
        instance.save(update_fields=["status", "updated_at"])

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


class VendorProductInventoryView(APIView):
    """GET /api/v1/marketplace/vendor/products/ — vendor's own product list.

    Returns ALL products for the authenticated vendor regardless of status,
    including DRAFT and DISCONTINUED. Public ProductListView only shows ACTIVE.

    ADR-013: CursorPagination applied via the pagination_class attribute.
    """

    permission_classes = [IsAuthenticated, IsVendorRole]

    def get(self, request):
        vendor_profile = get_object_or_404(VendorProfile, user=request.user)
        products = (
            Product.objects.filter(vendor=vendor_profile)
            .select_related("vendor", "category")
            .order_by("-created_at")
        )
        from apps.core.pagination import SeaConnectCursorPagination
        paginator = SeaConnectCursorPagination()
        page = paginator.paginate_queryset(products, request, view=self)
        serializer = ProductListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class VendorProfileView(APIView):
    """GET + PATCH /api/v1/marketplace/vendor-profile/

    GET: returns the authenticated vendor's profile (get_or_create is NOT
    used here — the profile must be created explicitly or via Django admin,
    since it requires a ``region`` FK that cannot be inferred without input).
    Returns 404 if no profile exists yet.

    PATCH: partial update of storefront text fields only. ``is_verified``
    and ``region`` are not writable here.
    """

    permission_classes = [IsAuthenticated, IsVendorRole]

    def _get_profile(self, user):
        return get_object_or_404(VendorProfile, user=user)

    def get(self, request):
        profile = self._get_profile(request.user)
        return Response(VendorProfileReadSerializer(profile).data)

    def patch(self, request):
        profile = self._get_profile(request.user)
        serializer = VendorProfileWriteSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(VendorProfileReadSerializer(profile).data)


# ---------------------------------------------------------------------------
# Sprint 12A — Product image upload
# ---------------------------------------------------------------------------


def _build_product_image_path(product_id: str, filename: str) -> str:
    """Return a collision-resistant storage path for a product image.

    Pattern: ``products/{product_id}/images/{uuid4}{ext}``
    """
    ext = os.path.splitext(filename)[1].lower()
    return f"products/{product_id}/images/{uuid_module.uuid4()}{ext}"


class ProductImageUploadView(APIView):
    """POST /api/v1/marketplace/products/{id}/images/

    Upload a primary image for a vendor product.  The caller must be an
    authenticated vendor who owns the product.

    Steps:
      1. Validate file (type + size) via ``ProductImageUploadSerializer``.
      2. Save to ``default_storage`` (FileSystem dev / S3-R2 prod — ADR-010).
      3. Update ``product.primary_image_url`` with the resulting public URL.

    Returns 200 with ``{"image_url": "<url>"}`` on success.
    """

    permission_classes = [IsAuthenticated, IsVendorRole]
    parser_classes = [MultiPartParser]
    throttle_classes = [UploadThrottle]

    def post(self, request: Request, id) -> Response:
        # Ownership check — vendor must own the product.
        product = get_object_or_404(
            Product.objects.select_related("vendor__user"),
            id=id,
        )
        if product.vendor.user_id != request.user.id:
            return Response(
                {
                    "error": {
                        "code": "ERR_PERMISSION_DENIED",
                        "message": "You do not own this product.",
                    }
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = ProductImageUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        file = serializer.validated_data["file"]

        upload_path = _build_product_image_path(str(product.id), file.name)
        saved_name = default_storage.save(upload_path, file)
        file_url = default_storage.url(saved_name)

        with transaction.atomic():
            product.primary_image_url = file_url
            product.save(update_fields=["primary_image_url", "updated_at"])

            # Determine primary flag — first image for this product becomes primary.
            is_first = not ProductImage.objects.filter(product=product).exists()
            ProductImage.objects.create(
                product=product,
                image_url=file_url,
                is_primary=is_first,
            )

        return Response({"image_url": file_url}, status=status.HTTP_201_CREATED)


# ---------------------------------------------------------------------------
# Sprint 12F — Vendor order action endpoints
# ---------------------------------------------------------------------------

# Valid status transitions a vendor may trigger.
_VENDOR_ORDER_TRANSITIONS: dict[str, str] = {
    "confirm": OrderStatus.CONFIRMED,
    "ship": OrderStatus.SHIPPED,
    "cancel": OrderStatus.CANCELLED,
}

_VENDOR_TRANSITION_PRECONDITIONS: dict[str, list[str]] = {
    "confirm": [OrderStatus.PENDING],
    "ship": [OrderStatus.CONFIRMED],
    "cancel": [
        OrderStatus.PENDING,
        OrderStatus.CONFIRMED,
        OrderStatus.SHIPPED,
    ],
}


class VendorOrderActionView(APIView):
    """POST /api/v1/marketplace/orders/{id}/{action}/

    Vendor-only state-machine actions for an order.

    Allowed transitions:
      confirm  — pending → confirmed
      ship     — confirmed → shipped
      cancel   — pending | confirmed | shipped → cancelled

    The calling vendor must be the vendor of at least one item in the order
    (enforced by ``IsOrderVendor``).

    Returns 200 with the updated ``OrderSerializer`` representation on success.
    Returns 409 CONFLICT when the current status does not satisfy the precondition.
    """

    permission_classes = [IsAuthenticated, IsVendorRole, IsOrderVendor]

    def post(self, request: Request, id, action: str) -> Response:
        if action not in _VENDOR_ORDER_TRANSITIONS:
            return Response(
                {
                    "error": {
                        "code": "ERR_INVALID_ACTION",
                        "message": f"Unknown order action: {action!r}. "
                                   "Allowed: confirm, ship, cancel.",
                    }
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        order = get_object_or_404(
            Order.objects.prefetch_related("items__product__vendor__user"),
            id=id,
        )
        # Ownership check delegated to permission class; call explicitly for
        # object-level check (permission class has_object_permission).
        self.check_object_permissions(request, order)

        allowed_from = _VENDOR_TRANSITION_PRECONDITIONS[action]
        if order.status not in allowed_from:
            return Response(
                {
                    "error": {
                        "code": "ERR_INVALID_TRANSITION",
                        "message": (
                            f"Cannot perform '{action}' on an order with "
                            f"status '{order.status}'. "
                            f"Allowed current statuses: {allowed_from}."
                        ),
                    }
                },
                status=status.HTTP_409_CONFLICT,
            )

        new_status = _VENDOR_ORDER_TRANSITIONS[action]
        order.status = new_status
        order.save(update_fields=["status", "updated_at"])

        return Response(OrderSerializer(order).data, status=status.HTTP_200_OK)
