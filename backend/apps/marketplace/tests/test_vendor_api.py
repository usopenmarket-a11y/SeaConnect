"""Vendor API gap tests — Sprint 12F.

Covers:
  - GET /api/v1/marketplace/vendor/products/ — own products only, non-vendor blocked
  - DELETE /api/v1/marketplace/products/{id}/ — soft-delete own, 403 on others
  - POST /api/v1/marketplace/products/{id}/images/ — valid upload, ProductImage created
  - POST /api/v1/marketplace/orders/{id}/confirm/ — pending → confirmed
  - POST /api/v1/marketplace/orders/{id}/ship/ — confirmed → shipped
  - POST /api/v1/marketplace/orders/{id}/cancel/ — any → cancelled, vendor ownership
  - Invalid transitions return 409

Rules:
  - Real PostgreSQL test DB (ADR — no mocking)
  - pytest-django @pytest.mark.django_db
  - DRF APIClient for all HTTP interactions
  - default_storage patched for image upload tests (no MinIO in CI)
"""
from __future__ import annotations

import decimal
import io
import uuid

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from unittest.mock import patch, MagicMock

from apps.accounts.models import User, UserRole
from apps.core.models import Region
from apps.marketplace.models import (
    Cart,
    CartItem,
    Order,
    OrderItem,
    OrderStatus,
    Product,
    ProductCategory,
    ProductImage,
    ProductStatus,
    VendorProfile,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_region(code: str = "EG", currency: str = "EGP") -> Region:
    region, _ = Region.objects.get_or_create(
        code=code,
        defaults={
            "name_ar": "مصر",
            "name_en": "Egypt",
            "currency": currency,
            "timezone": "Africa/Cairo",
            "is_active": True,
        },
    )
    return region


def _make_user(email: str, role: str, region: Region) -> User:
    return User.objects.create_user(
        email=email,
        password="TestPass123!",
        role=role,
        region=region,
    )


def _make_vendor_profile(
    user: User,
    region: Region,
    *,
    is_verified: bool = True,
    business_name: str = "Test Marine Shop",
    business_name_ar: str = "متجر المارين",
) -> VendorProfile:
    return VendorProfile.objects.create(
        user=user,
        region=region,
        business_name=business_name,
        business_name_ar=business_name_ar,
        is_verified=is_verified,
    )


def _make_category(name: str = "Gear", slug: str = "gear") -> ProductCategory:
    cat, _ = ProductCategory.objects.get_or_create(
        slug=slug,
        defaults={"name": name, "name_ar": "معدات"},
    )
    return cat


def _make_product(
    vendor: VendorProfile,
    category: ProductCategory | None = None,
    *,
    name: str = "Life Jacket",
    name_ar: str = "سترة نجاة",
    status: str = ProductStatus.ACTIVE,
    price: str = "250.00",
    currency: str = "EGP",
) -> Product:
    return Product.objects.create(
        vendor=vendor,
        category=category,
        name=name,
        name_ar=name_ar,
        price=decimal.Decimal(price),
        currency=currency,
        stock=10,
        status=status,
    )


def _make_order(
    customer: User,
    region: Region,
    *products: Product,
    order_status: str = OrderStatus.PENDING,
) -> Order:
    """Create an Order + OrderItems for the given products.

    Mirrors the logic in OrderListCreateView.create() without going through
    the cart, so tests stay isolated from the cart flow.
    """
    total = sum(p.price for p in products)
    order = Order.objects.create(
        customer=customer,
        region=region,
        status=order_status,
        total_amount=total,
        currency=region.currency,
        delivery_address="Test Harbour, Alexandria",
    )
    for product in products:
        OrderItem.objects.create(
            order=order,
            product=product,
            quantity=1,
            unit_price=product.price,
            currency=product.currency,
        )
    return order


def _minimal_jpeg_bytes() -> bytes:
    """Return the smallest valid JPEG byte sequence (~150 bytes).

    This is a 1x1 white JPEG produced without Pillow to keep the test
    dependency-free.
    """
    return (
        b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
        b"\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t"
        b"\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a"
        b"\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\x1e"
        b"C  C\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4"
        b"\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00"
        b"\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xc4"
        b"\x00\xb5\x10\x00\x02\x01\x03\x03\x02\x04\x03\x05\x05\x04\x04\x00"
        b"\x00\x01}\x01\x02\x03\x00\x04\x11\x05\x12!1A\x06\x13Qa\x07\"q\x142"
        b"\x81\x91\xa1\x08#B\xb1\xc1\x15R\xd1\xf0$3br\x82\t\n\x16\x17\x18"
        b"\x19\x1a%&'()*456789:CDEFGHIJSTUVWXYZ"
        b"cdefghijstuvwxyz\x83\x84\x85\x86\x87\x88\x89\x8a\x92\x93\x94\x95"
        b"\x96\x97\x98\x99\x9a\xa2\xa3\xa4\xa5\xa6\xa7\xa8\xa9\xaa\xb2\xb3"
        b"\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xfb\xd2\x8a(\x03\xff\xd9"
    )


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def region(db) -> Region:
    return _make_region()


@pytest.fixture
def vendor_user(db, region) -> User:
    return _make_user("v1@test.com", UserRole.VENDOR, region)


@pytest.fixture
def vendor_profile(db, vendor_user, region) -> VendorProfile:
    return _make_vendor_profile(vendor_user, region, is_verified=True)


@pytest.fixture
def other_vendor_user(db, region) -> User:
    return _make_user("v2@test.com", UserRole.VENDOR, region)


@pytest.fixture
def other_vendor_profile(db, other_vendor_user, region) -> VendorProfile:
    return _make_vendor_profile(
        other_vendor_user, region, is_verified=True,
        business_name="Other Shop", business_name_ar="متجر آخر",
    )


@pytest.fixture
def customer_user(db, region) -> User:
    return _make_user("cust@test.com", UserRole.CUSTOMER, region)


@pytest.fixture
def category(db) -> ProductCategory:
    return _make_category()


@pytest.fixture
def vendor_client(vendor_user) -> APIClient:
    c = APIClient()
    c.force_authenticate(vendor_user)
    return c


@pytest.fixture
def other_vendor_client(other_vendor_user) -> APIClient:
    c = APIClient()
    c.force_authenticate(other_vendor_user)
    return c


@pytest.fixture
def customer_client(customer_user) -> APIClient:
    c = APIClient()
    c.force_authenticate(customer_user)
    return c


@pytest.fixture
def anon_client() -> APIClient:
    return APIClient()


@pytest.fixture
def active_product(db, vendor_profile, category) -> Product:
    return _make_product(vendor_profile, category, name="Anchor", name_ar="مرساة")


@pytest.fixture
def other_product(db, other_vendor_profile, category) -> Product:
    return _make_product(other_vendor_profile, category, name="Buoy", name_ar="عوامة")


@pytest.fixture
def pending_order(db, customer_user, region, active_product) -> Order:
    return _make_order(customer_user, region, active_product, order_status=OrderStatus.PENDING)


@pytest.fixture
def confirmed_order(db, customer_user, region, active_product) -> Order:
    return _make_order(customer_user, region, active_product, order_status=OrderStatus.CONFIRMED)


# ---------------------------------------------------------------------------
# URL helpers
# ---------------------------------------------------------------------------

VENDOR_INVENTORY_URL = "/api/v1/marketplace/vendor/products/"
PRODUCTS_URL = "/api/v1/marketplace/products/"


def product_url(product_id) -> str:
    return f"{PRODUCTS_URL}{product_id}/"


def image_url(product_id) -> str:
    return f"{PRODUCTS_URL}{product_id}/images/"


def order_action_url(order_id, action: str) -> str:
    return f"/api/v1/marketplace/orders/{order_id}/{action}/"


# ---------------------------------------------------------------------------
# Test: GET /api/v1/marketplace/vendor/products/
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestVendorProductInventory:
    """Verify the vendor inventory endpoint scopes results to the calling vendor."""

    def test_vendor_sees_only_own_products(
        self, vendor_client, vendor_profile, other_vendor_profile, category
    ):
        """Vendor's own products (all statuses) must appear; other vendors' must not."""
        mine_active = _make_product(vendor_profile, category, name="Mine Active", status=ProductStatus.ACTIVE)
        mine_draft = _make_product(vendor_profile, category, name="Mine Draft", name_ar="مسودة", status=ProductStatus.DRAFT)
        theirs = _make_product(other_vendor_profile, category, name="Theirs", name_ar="لهم")

        response = vendor_client.get(VENDOR_INVENTORY_URL)

        assert response.status_code == 200
        returned_ids = [str(p["id"]) for p in response.data["results"]]
        assert str(mine_active.id) in returned_ids
        assert str(mine_draft.id) in returned_ids
        assert str(theirs.id) not in returned_ids

    def test_non_vendor_gets_403(self, customer_client):
        """Customer must be denied with 403."""
        response = customer_client.get(VENDOR_INVENTORY_URL)
        assert response.status_code == 403

    def test_anonymous_gets_401(self, anon_client):
        """Unauthenticated request must be rejected with 401."""
        response = anon_client.get(VENDOR_INVENTORY_URL)
        assert response.status_code == 401

    def test_response_has_pagination_keys(self, vendor_client, vendor_profile, category):
        """Response must include cursor pagination keys (ADR-013)."""
        _make_product(vendor_profile, category, name="Rope", name_ar="حبل")
        response = vendor_client.get(VENDOR_INVENTORY_URL)
        assert response.status_code == 200
        assert "results" in response.data


# ---------------------------------------------------------------------------
# Test: DELETE /api/v1/marketplace/products/{id}/
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestVendorDeleteProduct:
    """Verify vendor can soft-delete own product; 403 on others."""

    def test_vendor_can_soft_delete_own_product(self, vendor_client, active_product):
        """DELETE sets status=DISCONTINUED and returns 204."""
        response = vendor_client.delete(product_url(active_product.id))
        assert response.status_code == 204

        active_product.refresh_from_db()
        assert active_product.status == ProductStatus.DISCONTINUED

    def test_vendor_cannot_delete_another_vendors_product(
        self, vendor_client, other_product
    ):
        """Vendor must receive 403 when targeting another vendor's product."""
        response = vendor_client.delete(product_url(other_product.id))
        assert response.status_code == 403

    def test_customer_cannot_delete_product(self, customer_client, active_product):
        """Customer must receive 403 on DELETE."""
        response = customer_client.delete(product_url(active_product.id))
        assert response.status_code == 403

    def test_anonymous_cannot_delete_product(self, anon_client, active_product):
        """Unauthenticated DELETE must return 401."""
        response = anon_client.delete(product_url(active_product.id))
        assert response.status_code == 401

    def test_delete_nonexistent_product_returns_404(self, vendor_client):
        """DELETE on a non-existent UUID must return 404."""
        response = vendor_client.delete(product_url(uuid.uuid4()))
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# Test: POST /api/v1/marketplace/products/{id}/images/
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestProductImageUpload:
    """Verify image upload creates ProductImage record and returns image_url."""

    def _make_jpeg_upload(self, name: str = "photo.jpg") -> SimpleUploadedFile:
        return SimpleUploadedFile(
            name,
            _minimal_jpeg_bytes(),
            content_type="image/jpeg",
        )

    def test_valid_jpeg_upload_returns_201_with_image_url(
        self, vendor_client, active_product
    ):
        """Happy path: valid JPEG → 201, image_url in response, ProductImage row created."""
        uploaded_file = self._make_jpeg_upload()

        with (
            patch("apps.marketplace.views.default_storage.save", return_value="products/test/photo.jpg"),
            patch("apps.marketplace.views.default_storage.url", return_value="http://storage/products/test/photo.jpg"),
        ):
            response = vendor_client.post(
                image_url(active_product.id),
                data={"file": uploaded_file},
                format="multipart",
            )

        assert response.status_code == 201
        assert "image_url" in response.data
        assert ProductImage.objects.filter(product=active_product).exists()

    def test_first_upload_is_marked_primary(
        self, vendor_client, active_product
    ):
        """First image uploaded for a product must have is_primary=True."""
        uploaded_file = self._make_jpeg_upload()

        with (
            patch("apps.marketplace.views.default_storage.save", return_value="products/test/photo.jpg"),
            patch("apps.marketplace.views.default_storage.url", return_value="http://storage/products/test/photo.jpg"),
        ):
            vendor_client.post(
                image_url(active_product.id),
                data={"file": uploaded_file},
                format="multipart",
            )

        img = ProductImage.objects.get(product=active_product)
        assert img.is_primary is True

    def test_other_vendor_cannot_upload_to_foreign_product(
        self, other_vendor_client, active_product
    ):
        """A vendor must not be able to upload images to another vendor's product — 403."""
        uploaded_file = self._make_jpeg_upload()
        response = other_vendor_client.post(
            image_url(active_product.id),
            data={"file": uploaded_file},
            format="multipart",
        )
        assert response.status_code == 403

    def test_anonymous_upload_returns_401(self, anon_client, active_product):
        """Unauthenticated upload must return 401."""
        uploaded_file = self._make_jpeg_upload()
        response = anon_client.post(
            image_url(active_product.id),
            data={"file": uploaded_file},
            format="multipart",
        )
        assert response.status_code == 401

    def test_missing_file_field_returns_400(self, vendor_client, active_product):
        """POST without a file field must return 400."""
        response = vendor_client.post(
            image_url(active_product.id),
            data={},
            format="multipart",
        )
        assert response.status_code == 400


# ---------------------------------------------------------------------------
# Test: POST /api/v1/marketplace/orders/{id}/confirm/  (pending → confirmed)
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestVendorOrderConfirm:
    """Vendor confirm action: pending → confirmed."""

    def test_vendor_confirms_own_order_happy_path(
        self, vendor_client, pending_order
    ):
        """Vendor with items in order can confirm it — returns 200 with status=confirmed."""
        response = vendor_client.post(order_action_url(pending_order.id, "confirm"))
        assert response.status_code == 200
        pending_order.refresh_from_db()
        assert pending_order.status == OrderStatus.CONFIRMED

    def test_confirm_already_confirmed_order_returns_409(
        self, vendor_client, confirmed_order
    ):
        """Confirming an already-confirmed order must return 409 CONFLICT."""
        response = vendor_client.post(order_action_url(confirmed_order.id, "confirm"))
        assert response.status_code == 409

    def test_non_vendor_cannot_confirm_order(
        self, customer_client, pending_order
    ):
        """Customer must receive 403 on confirm action."""
        response = customer_client.post(order_action_url(pending_order.id, "confirm"))
        assert response.status_code == 403

    def test_anonymous_cannot_confirm_order(self, anon_client, pending_order):
        """Unauthenticated request must return 401."""
        response = anon_client.post(order_action_url(pending_order.id, "confirm"))
        assert response.status_code == 401

    def test_other_vendor_cannot_confirm_unrelated_order(
        self, other_vendor_client, pending_order
    ):
        """A vendor must not confirm orders that contain none of their products — 403."""
        response = other_vendor_client.post(order_action_url(pending_order.id, "confirm"))
        assert response.status_code == 403


# ---------------------------------------------------------------------------
# Test: POST /api/v1/marketplace/orders/{id}/ship/  (confirmed → shipped)
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestVendorOrderShip:
    """Vendor ship action: confirmed → shipped."""

    def test_vendor_ships_confirmed_order(self, vendor_client, confirmed_order):
        """Vendor with items in order can mark it shipped — returns 200."""
        response = vendor_client.post(order_action_url(confirmed_order.id, "ship"))
        assert response.status_code == 200
        confirmed_order.refresh_from_db()
        assert confirmed_order.status == OrderStatus.SHIPPED

    def test_ship_pending_order_returns_409(self, vendor_client, pending_order):
        """Shipping a pending order (not yet confirmed) must return 409."""
        response = vendor_client.post(order_action_url(pending_order.id, "ship"))
        assert response.status_code == 409

    def test_non_vendor_cannot_ship_order(self, customer_client, confirmed_order):
        """Customer must receive 403 on ship action."""
        response = customer_client.post(order_action_url(confirmed_order.id, "ship"))
        assert response.status_code == 403


# ---------------------------------------------------------------------------
# Test: POST /api/v1/marketplace/orders/{id}/cancel/
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestVendorOrderCancel:
    """Vendor cancel action: any cancellable status → cancelled."""

    def test_vendor_cancels_pending_order(self, vendor_client, pending_order):
        """Vendor can cancel a pending order — returns 200, status=cancelled."""
        response = vendor_client.post(order_action_url(pending_order.id, "cancel"))
        assert response.status_code == 200
        pending_order.refresh_from_db()
        assert pending_order.status == OrderStatus.CANCELLED

    def test_vendor_cancels_confirmed_order(
        self, vendor_client, confirmed_order
    ):
        """Vendor can also cancel a confirmed order."""
        response = vendor_client.post(order_action_url(confirmed_order.id, "cancel"))
        assert response.status_code == 200
        confirmed_order.refresh_from_db()
        assert confirmed_order.status == OrderStatus.CANCELLED

    def test_cancel_delivered_order_returns_409(
        self, vendor_client, customer_user, region, active_product
    ):
        """A delivered order cannot be cancelled — 409."""
        delivered_order = _make_order(
            customer_user, region, active_product,
            order_status=OrderStatus.DELIVERED,
        )
        response = vendor_client.post(order_action_url(delivered_order.id, "cancel"))
        assert response.status_code == 409

    def test_other_vendor_cannot_cancel_unrelated_order(
        self, other_vendor_client, pending_order
    ):
        """A vendor with no items in the order must receive 403 on cancel."""
        response = other_vendor_client.post(order_action_url(pending_order.id, "cancel"))
        assert response.status_code == 403

    def test_non_vendor_cannot_cancel_order(self, customer_client, pending_order):
        """Customer must receive 403 on cancel action."""
        response = customer_client.post(order_action_url(pending_order.id, "cancel"))
        assert response.status_code == 403
