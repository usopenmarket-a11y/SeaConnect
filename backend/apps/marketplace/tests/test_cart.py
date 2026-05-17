"""Cart + Checkout integration tests — Sprint 16C.

Covers:
1. Add item → GET /marketplace/cart/ shows the item with correct fields
2. Add same product twice → quantity is updated (not duplicated)
3. DELETE /marketplace/cart/items/{id}/ → item is removed, 204 returned
4. POST /marketplace/cart/checkout/ → Order created, cart cleared

Rules:
  - Real PostgreSQL test DB — no DB mocking (project ADR rule)
  - pytest-django @pytest.mark.django_db
  - DRF APIClient for endpoint calls
"""
import decimal

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User, UserRole
from apps.core.models import Region
from apps.marketplace.models import (
    Cart,
    CartItem,
    Order,
    OrderItem,
    Product,
    ProductCategory,
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


def _make_category(name: str = "Gear", slug: str = "gear") -> ProductCategory:
    cat, _ = ProductCategory.objects.get_or_create(
        slug=slug,
        defaults={"name": name, "name_ar": "معدات"},
    )
    return cat


def _make_vendor(email: str, region: Region) -> VendorProfile:
    user = User.objects.create_user(
        email=email,
        password="TestPass123!",
        role=UserRole.VENDOR,
        region=region,
    )
    return VendorProfile.objects.create(
        user=user,
        region=region,
        business_name="Test Shop",
        business_name_ar="متجر اختبار",
        is_verified=True,
    )


def _make_product(
    vendor: VendorProfile,
    category: ProductCategory,
    *,
    name: str = "Life Jacket",
    name_ar: str = "سترة نجاة",
    price: str = "250.00",
    stock: int = 10,
    status: str = ProductStatus.ACTIVE,
) -> Product:
    return Product.objects.create(
        vendor=vendor,
        category=category,
        name=name,
        name_ar=name_ar,
        price=decimal.Decimal(price),
        currency="EGP",
        stock=stock,
        status=status,
    )


def _make_customer(email: str, region: Region) -> User:
    return User.objects.create_user(
        email=email,
        password="TestPass123!",
        role=UserRole.CUSTOMER,
        region=region,
    )


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def region(db) -> Region:
    return _make_region()


@pytest.fixture
def category(db) -> ProductCategory:
    return _make_category()


@pytest.fixture
def vendor(db, region) -> VendorProfile:
    return _make_vendor("cart_vendor@test.com", region)


@pytest.fixture
def product(db, vendor, category) -> Product:
    return _make_product(vendor, category)


@pytest.fixture
def customer(db, region) -> User:
    return _make_customer("cart_customer@test.com", region)


@pytest.fixture
def customer_client(customer) -> APIClient:
    client = APIClient()
    client.force_authenticate(customer)
    return client


# ---------------------------------------------------------------------------
# URLs
# ---------------------------------------------------------------------------

CART_URL = "/api/v1/marketplace/cart/"
CART_ITEMS_URL = "/api/v1/marketplace/cart/items/"
CHECKOUT_URL = "/api/v1/marketplace/cart/checkout/"


# ---------------------------------------------------------------------------
# Test 1: Add item to cart, then GET cart shows the item
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCartGetAfterAdd:
    """GET /api/v1/marketplace/cart/ after adding an item must show the item."""

    def test_happy_add_item_then_get_cart_shows_item(
        self, customer_client, product
    ) -> None:
        """Add a product then GET cart — item should appear with correct fields."""
        add_response = customer_client.post(
            CART_ITEMS_URL,
            {"product_id": str(product.id), "quantity": 3},
        )
        assert add_response.status_code == 201

        cart_response = customer_client.get(CART_URL)
        assert cart_response.status_code == 200

        items = cart_response.data["items"]
        assert len(items) == 1
        assert str(items[0]["product"]["id"]) == str(product.id)
        assert items[0]["quantity"] == 3
        assert cart_response.data["item_count"] == 1

    def test_sad_get_cart_requires_auth(self) -> None:
        """Unauthenticated GET /marketplace/cart/ must return 401."""
        client = APIClient()
        response = client.get(CART_URL)
        assert response.status_code == 401


# ---------------------------------------------------------------------------
# Test 2: Add same product twice → quantity updated, no duplicate row
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCartItemUpsert:
    """POST /api/v1/marketplace/cart/items/ with same product_id updates quantity."""

    def test_happy_add_same_product_twice_increments_quantity(
        self, customer_client, customer, product
    ) -> None:
        """Adding the same product a second time should update qty, not create a duplicate row."""
        customer_client.post(
            CART_ITEMS_URL,
            {"product_id": str(product.id), "quantity": 1},
        )
        response = customer_client.post(
            CART_ITEMS_URL,
            {"product_id": str(product.id), "quantity": 4},
        )
        # Second call is an update → 200
        assert response.status_code == 200

        # Only one CartItem row must exist for this customer + product
        cart = Cart.objects.get(user=customer)
        items = CartItem.objects.filter(cart=cart, product=product)
        assert items.count() == 1
        assert items.first().quantity == 4

    def test_sad_add_to_cart_unauthenticated(self, product) -> None:
        """POST without auth must be rejected with 401."""
        client = APIClient()
        response = client.post(
            CART_ITEMS_URL,
            {"product_id": str(product.id), "quantity": 1},
        )
        assert response.status_code == 401


# ---------------------------------------------------------------------------
# Test 3: DELETE cart item
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCartItemDelete:
    """DELETE /api/v1/marketplace/cart/items/{id}/ removes the item."""

    def test_happy_delete_cart_item_removes_it(
        self, customer_client, customer, product
    ) -> None:
        """DELETE an existing cart item — 204 returned, item gone from DB."""
        customer_client.post(
            CART_ITEMS_URL,
            {"product_id": str(product.id), "quantity": 2},
        )
        cart = Cart.objects.get(user=customer)
        item = CartItem.objects.get(cart=cart, product=product)

        delete_response = customer_client.delete(
            f"{CART_ITEMS_URL}{item.id}/"
        )
        assert delete_response.status_code == 204
        assert not CartItem.objects.filter(id=item.id).exists()

    def test_sad_delete_nonexistent_item_returns_404(
        self, customer_client
    ) -> None:
        """Trying to delete an item that doesn't exist must return 404."""
        import uuid
        fake_id = uuid.uuid4()
        response = customer_client.delete(f"{CART_ITEMS_URL}{fake_id}/")
        assert response.status_code == 404

    def test_sad_delete_requires_auth(self, customer, product, db) -> None:
        """Unauthenticated DELETE must return 401."""
        cart, _ = Cart.objects.get_or_create(user=customer)
        item = CartItem.objects.create(cart=cart, product=product, quantity=1)
        client = APIClient()
        response = client.delete(f"{CART_ITEMS_URL}{item.id}/")
        assert response.status_code == 401


# ---------------------------------------------------------------------------
# Test 4: POST /api/v1/marketplace/cart/checkout/ → Order created, cart cleared
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCartCheckout:
    """POST /api/v1/marketplace/cart/checkout/ creates Order and clears cart."""

    def _seed_cart(
        self,
        customer_client: APIClient,
        *products: Product,
        quantity: int = 1,
    ) -> None:
        for p in products:
            customer_client.post(
                CART_ITEMS_URL,
                {"product_id": str(p.id), "quantity": quantity},
            )

    def test_happy_checkout_creates_order_clears_cart(
        self, customer_client, customer, vendor, category
    ) -> None:
        """Checkout with 2 items creates an Order with 2 OrderItems and empties the cart."""
        product_a = _make_product(vendor, category, name="Rod", name_ar="عصا صيد")
        product_b = _make_product(vendor, category, name="Hook", name_ar="خطاف")
        self._seed_cart(customer_client, product_a, product_b)

        response = customer_client.post(
            CHECKOUT_URL,
            {"delivery_address": "23 Corniche Street, Alexandria"},
        )
        assert response.status_code == 201

        data = response.data
        assert data["status"] == "pending"
        assert len(data["items"]) == 2
        assert data["payment_required"] is True

        # Order is persisted
        order = Order.objects.get(id=data["id"])
        assert order.items.count() == 2

        # Cart is empty
        cart = Cart.objects.get(user=customer)
        assert cart.items.count() == 0

    def test_sad_checkout_empty_cart_returns_400(
        self, customer_client, customer
    ) -> None:
        """Checkout with an empty cart must return 400 with code EMPTY_CART."""
        # Ensure cart row exists but has no items
        Cart.objects.get_or_create(user=customer)

        response = customer_client.post(CHECKOUT_URL, {})
        assert response.status_code == 400
        assert response.data["code"] == "EMPTY_CART"

    def test_sad_checkout_insufficient_stock_returns_400(
        self, customer_client, vendor, category
    ) -> None:
        """Requesting more than available stock must return 400 with INSUFFICIENT_STOCK."""
        low_stock_product = _make_product(
            vendor, category,
            name="Rare Buoy", name_ar="عوامة نادرة",
            stock=2,
        )
        # Try to add 5 units when only 2 are available
        customer_client.post(
            CART_ITEMS_URL,
            {"product_id": str(low_stock_product.id), "quantity": 5},
        )

        response = customer_client.post(CHECKOUT_URL, {})
        assert response.status_code == 400
        assert response.data["code"] == "INSUFFICIENT_STOCK"
        assert response.data["detail"]["product_id"] == str(low_stock_product.id)

    def test_sad_checkout_requires_auth(self) -> None:
        """Unauthenticated POST /marketplace/cart/checkout/ must return 401."""
        client = APIClient()
        response = client.post(CHECKOUT_URL, {})
        assert response.status_code == 401

    def test_happy_checkout_currency_from_vendor_region(
        self, customer_client, vendor, category
    ) -> None:
        """Order.currency must come from the vendor's region — not hardcoded (ADR-018)."""
        product = _make_product(vendor, category, name="Compass", name_ar="بوصلة")
        self._seed_cart(customer_client, product)

        response = customer_client.post(CHECKOUT_URL, {})
        assert response.status_code == 201

        order = Order.objects.get(id=response.data["id"])
        assert order.currency == vendor.region.currency

    def test_happy_checkout_unit_price_snapshot(
        self, customer_client, vendor, category
    ) -> None:
        """OrderItem.unit_price must be the price at the time of checkout, not the current price."""
        product = _make_product(
            vendor, category,
            name="Anchor", name_ar="مرساة",
            price="500.00",
        )
        original_price = product.price
        self._seed_cart(customer_client, product)

        response = customer_client.post(CHECKOUT_URL, {})
        assert response.status_code == 201

        # Mutate product price after order — snapshot must be unaffected
        product.price = decimal.Decimal("9999.00")
        product.save(update_fields=["price", "updated_at"])

        order = Order.objects.get(id=response.data["id"])
        assert order.items.first().unit_price == original_price
