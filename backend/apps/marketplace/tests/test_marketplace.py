"""Marketplace integration tests — Sprint 5 / Sprint 14A.

Tests cover:
  - Product listing (active-only, unverified vendor exclusion, category filter)
  - Product detail (404 for draft)
  - Cart CRUD (auth, create, update quantity, remove)
  - Checkout (order creation, empty cart, currency from region, unit price snapshot)
  - Semantic search: empty-embedding fallback, Ollama timeout, absent param (Sprint 14A)

Rules:
  - Real PostgreSQL test DB — no DB mocking (ADR rule)
  - factory_boy for all test data
  - pytest-django @pytest.mark.django_db
  - DRF APIClient for endpoint calls
"""
import decimal
from unittest.mock import patch

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
# Helpers — minimal object builders (no Model.objects.create in test bodies)
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


def _make_vendor_user(email: str, region: Region) -> User:
    return User.objects.create_user(
        email=email,
        password="TestPass123!",
        role=UserRole.VENDOR,
        region=region,
    )


def _make_vendor_profile(
    user: User,
    region: Region,
    *,
    is_verified: bool = True,
    business_name: str = "Test Shop",
    business_name_ar: str = "متجر اختبار",
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
def verified_vendor(db, region) -> VendorProfile:
    user = _make_vendor_user("vendor@test.com", region)
    return _make_vendor_profile(user, region, is_verified=True)


@pytest.fixture
def unverified_vendor(db, region) -> VendorProfile:
    user = _make_vendor_user("unverified@test.com", region)
    return _make_vendor_profile(user, region, is_verified=False, business_name="Unverified Shop")


@pytest.fixture
def gear_category(db) -> ProductCategory:
    return _make_category(name="Gear", slug="gear")


@pytest.fixture
def bait_category(db) -> ProductCategory:
    return _make_category(name="Bait", slug="bait")


@pytest.fixture
def active_product(db, verified_vendor, gear_category) -> Product:
    return _make_product(verified_vendor, gear_category, name="Life Jacket", name_ar="سترة نجاة")


@pytest.fixture
def draft_product(db, verified_vendor, gear_category) -> Product:
    return _make_product(
        verified_vendor, gear_category,
        name="Draft Item", name_ar="عنصر مسودة",
        status=ProductStatus.DRAFT,
    )


@pytest.fixture
def customer(db, region) -> User:
    return _make_customer("customer@test.com", region)


@pytest.fixture
def customer_client(customer) -> APIClient:
    client = APIClient()
    client.force_authenticate(customer)
    return client


# ---------------------------------------------------------------------------
# Test: Product Listing
# ---------------------------------------------------------------------------

PRODUCT_LIST_URL = "/api/v1/marketplace/products/"


@pytest.mark.django_db
class TestProductList:
    """GET /api/v1/marketplace/products/"""

    def test_product_list_no_auth_required(self, api_client, active_product):
        """Public endpoint — no authentication token needed."""
        response = api_client.get(PRODUCT_LIST_URL)
        assert response.status_code == 200

    def test_happy_product_list_returns_active_only(self, api_client, active_product, draft_product):
        """Only active products from verified vendors should be returned."""
        response = api_client.get(PRODUCT_LIST_URL)
        assert response.status_code == 200
        results = response.data["results"]
        returned_ids = [str(p["id"]) for p in results]
        assert str(active_product.id) in returned_ids
        assert str(draft_product.id) not in returned_ids

    def test_sad_product_list_excludes_unverified_vendors(self, api_client, region, unverified_vendor, gear_category):
        """Products from unverified vendors must not appear in the public list."""
        unverified_product = _make_product(unverified_vendor, gear_category, name="Hidden Product")
        response = api_client.get(PRODUCT_LIST_URL)
        results = response.data["results"]
        returned_ids = [str(p["id"]) for p in results]
        assert str(unverified_product.id) not in returned_ids

    def test_happy_product_list_filter_by_category(
        self, api_client, verified_vendor, gear_category, bait_category
    ):
        """?category=<slug> must return only products in that category."""
        gear_product = _make_product(verified_vendor, gear_category, name="Rope", name_ar="حبل")
        bait_product = _make_product(verified_vendor, bait_category, name="Worm", name_ar="دودة")

        response = api_client.get(PRODUCT_LIST_URL, {"category": "gear"})
        assert response.status_code == 200
        results = response.data["results"]
        returned_ids = [str(p["id"]) for p in results]
        assert str(gear_product.id) in returned_ids
        assert str(bait_product.id) not in returned_ids

    def test_product_list_filter_by_category_excludes_others(
        self, api_client, verified_vendor, gear_category, bait_category
    ):
        """Results should be empty when filtering a category with no active products."""
        response = api_client.get(PRODUCT_LIST_URL, {"category": "bait"})
        assert response.status_code == 200
        assert len(response.data["results"]) == 0


# ---------------------------------------------------------------------------
# Test: Product Detail
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestProductDetail:
    """GET /api/v1/marketplace/products/{id}/"""

    def test_happy_product_detail_active_returns_200(self, api_client, active_product):
        url = f"/api/v1/marketplace/products/{active_product.id}/"
        response = api_client.get(url)
        assert response.status_code == 200
        assert str(active_product.id) == str(response.data["id"])

    def test_sad_product_detail_not_found_for_draft(self, api_client, draft_product):
        """Draft products must return 404 on the detail endpoint."""
        url = f"/api/v1/marketplace/products/{draft_product.id}/"
        response = api_client.get(url)
        assert response.status_code == 404

    def test_sad_product_detail_not_found_for_unverified_vendor(
        self, api_client, region, unverified_vendor, gear_category
    ):
        """Products from unverified vendors must return 404 on detail."""
        product = _make_product(unverified_vendor, gear_category, name="Sneaky Item")
        url = f"/api/v1/marketplace/products/{product.id}/"
        response = api_client.get(url)
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# Test: Cart
# ---------------------------------------------------------------------------

CART_ITEMS_URL = "/api/v1/marketplace/cart/items/"


@pytest.mark.django_db
class TestCartItemAdd:
    """POST /api/v1/marketplace/cart/items/"""

    def test_sad_add_to_cart_requires_auth(self, api_client, active_product):
        """Unauthenticated request must be rejected with 401."""
        response = api_client.post(CART_ITEMS_URL, {"product_id": str(active_product.id), "quantity": 1})
        assert response.status_code == 401

    def test_happy_add_to_cart_creates_item(self, customer_client, customer, active_product):
        """Authenticated POST creates a CartItem with the correct quantity."""
        response = customer_client.post(
            CART_ITEMS_URL,
            {"product_id": str(active_product.id), "quantity": 2},
        )
        assert response.status_code == 201
        assert CartItem.objects.filter(
            cart__user=customer,
            product=active_product,
            quantity=2,
        ).exists()

    def test_happy_add_same_product_updates_quantity(
        self, customer_client, customer, active_product
    ):
        """Adding the same product twice replaces the quantity — no duplicate CartItem rows."""
        customer_client.post(
            CART_ITEMS_URL,
            {"product_id": str(active_product.id), "quantity": 1},
        )
        response = customer_client.post(
            CART_ITEMS_URL,
            {"product_id": str(active_product.id), "quantity": 5},
        )
        # Second call should return 200 (update) not 201 (create)
        assert response.status_code == 200
        items = CartItem.objects.filter(cart__user=customer, product=active_product)
        assert items.count() == 1
        assert items.first().quantity == 5

    def test_sad_add_draft_product_to_cart_returns_404(
        self, customer_client, draft_product
    ):
        """Trying to add a draft product to the cart must return 404."""
        response = customer_client.post(
            CART_ITEMS_URL,
            {"product_id": str(draft_product.id), "quantity": 1},
        )
        assert response.status_code == 404


@pytest.mark.django_db
class TestCartItemDelete:
    """DELETE /api/v1/marketplace/cart/items/{id}/"""

    def test_happy_remove_cart_item(self, customer_client, customer, active_product):
        """DELETE removes the CartItem and returns 204."""
        # Add item first
        customer_client.post(
            CART_ITEMS_URL,
            {"product_id": str(active_product.id), "quantity": 1},
        )
        item = CartItem.objects.get(cart__user=customer, product=active_product)
        url = f"/api/v1/marketplace/cart/items/{item.id}/"
        response = customer_client.delete(url)
        assert response.status_code == 204
        assert not CartItem.objects.filter(id=item.id).exists()

    def test_sad_remove_other_users_cart_item_returns_404(
        self, customer_client, region, verified_vendor, gear_category
    ):
        """Deleting another user's cart item must return 404."""
        other_user = _make_customer("other@test.com", region)
        other_client = APIClient()
        other_client.force_authenticate(other_user)
        product = _make_product(verified_vendor, gear_category, name="Other Item", name_ar="عنصر آخر")

        # other_user adds to their own cart
        other_client.post(CART_ITEMS_URL, {"product_id": str(product.id), "quantity": 1})
        item = CartItem.objects.get(cart__user=other_user, product=product)

        # customer_client tries to delete other_user's item
        url = f"/api/v1/marketplace/cart/items/{item.id}/"
        response = customer_client.delete(url)
        assert response.status_code == 404

    def test_sad_remove_cart_item_requires_auth(self, api_client, customer, active_product, db):
        """Unauthenticated DELETE must return 401."""
        # We need an existing item; create via ORM since this is fixture setup
        cart, _ = Cart.objects.get_or_create(user=customer)
        item = CartItem.objects.create(cart=cart, product=active_product, quantity=1)
        url = f"/api/v1/marketplace/cart/items/{item.id}/"
        response = api_client.delete(url)
        assert response.status_code == 401


# ---------------------------------------------------------------------------
# Test: Checkout / Orders
# ---------------------------------------------------------------------------

ORDERS_URL = "/api/v1/marketplace/orders/"


@pytest.mark.django_db
class TestOrderCreate:
    """POST /api/v1/marketplace/orders/"""

    def _seed_cart(self, customer_client, *product_ids):
        """Helper: add each product to the cart of the authenticated customer."""
        for pid in product_ids:
            customer_client.post(CART_ITEMS_URL, {"product_id": str(pid), "quantity": 1})

    def test_happy_checkout_creates_order_from_cart(
        self, customer_client, customer, verified_vendor, gear_category, bait_category
    ):
        """Checkout with 2 cart items must create an Order with 2 OrderItems and empty the cart."""
        product_a = _make_product(verified_vendor, gear_category, name="Rod", name_ar="عصا صيد")
        product_b = _make_product(verified_vendor, bait_category, name="Hook", name_ar="خطاف")
        self._seed_cart(customer_client, product_a.id, product_b.id)

        response = customer_client.post(ORDERS_URL, {"delivery_address": "123 Corniche, Alexandria"})
        assert response.status_code == 201

        order_id = response.data["id"]
        order = Order.objects.get(id=order_id)
        assert order.items.count() == 2

        # Cart must be empty after checkout
        cart = Cart.objects.get(user=customer)
        assert cart.items.count() == 0

    def test_sad_checkout_empty_cart_returns_400(self, customer_client, customer):
        """POSTing to orders/ with a cart that has no items returns EMPTY_CART 400.

        A cart row must exist first (get_or_create it), then post to orders/.
        Without any items the view returns 400 EMPTY_CART.
        """
        # Ensure a cart row exists for this user with no items
        Cart.objects.get_or_create(user=customer)

        response = customer_client.post(ORDERS_URL, {"delivery_address": "123 Test St"})
        assert response.status_code == 400
        assert response.data["error"]["code"] == "EMPTY_CART"

    def test_happy_order_currency_from_vendor_region(
        self, customer_client, region, verified_vendor, gear_category
    ):
        """Order.currency must equal the vendor's region currency (never a hardcoded string)."""
        product = _make_product(verified_vendor, gear_category, name="Compass", name_ar="بوصلة")
        self._seed_cart(customer_client, product.id)

        response = customer_client.post(ORDERS_URL, {})
        assert response.status_code == 201

        order = Order.objects.get(id=response.data["id"])
        # Derived from region, not hardcoded
        assert order.currency == verified_vendor.region.currency

    def test_happy_order_unit_price_is_snapshot(
        self, customer_client, customer, verified_vendor, gear_category
    ):
        """OrderItem.unit_price must be locked at the time of order, not reflect future price changes."""
        product = _make_product(
            verified_vendor, gear_category,
            name="Buoy", name_ar="عوامة",
            price="300.00",
        )
        original_price = product.price
        self._seed_cart(customer_client, product.id)

        response = customer_client.post(ORDERS_URL, {})
        assert response.status_code == 201

        # Change product price after order is created
        product.price = decimal.Decimal("999.00")
        product.save(update_fields=["price", "updated_at"])

        order = Order.objects.get(id=response.data["id"])
        order_item = order.items.first()
        assert order_item.unit_price == original_price

    def test_sad_checkout_requires_auth(self, api_client):
        """Unauthenticated POST to orders/ must return 401."""
        response = api_client.post(ORDERS_URL, {})
        assert response.status_code == 401

    def test_happy_order_list_returns_only_current_users_orders(
        self, customer_client, customer, region, verified_vendor, gear_category
    ):
        """Order list must be scoped to the authenticated user only."""
        product = _make_product(verified_vendor, gear_category, name="Net", name_ar="شبكة")
        self._seed_cart(customer_client, product.id)
        customer_client.post(ORDERS_URL, {})

        # Create a second user who also has an order
        other_user = _make_customer("other2@test.com", region)
        other_client = APIClient()
        other_client.force_authenticate(other_user)
        other_product = _make_product(
            verified_vendor, gear_category, name="Float", name_ar="عائم",
        )
        other_client.post(CART_ITEMS_URL, {"product_id": str(other_product.id), "quantity": 1})
        other_client.post(ORDERS_URL, {})

        response = customer_client.get(ORDERS_URL)
        assert response.status_code == 200
        # customer_client should only see their own 1 order
        results = response.data["results"]
        customer_order_ids = [str(o["id"]) for o in results]
        other_orders = Order.objects.filter(customer=other_user)
        for o in other_orders:
            assert str(o.id) not in customer_order_ids


# ---------------------------------------------------------------------------
# Test: Product price + rating filters (Sprint 10E)
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestProductFilters:
    """GET /api/v1/marketplace/products/ with ?price_min, ?price_max, ?rating."""

    def test_price_min_returns_products_above_threshold(
        self, api_client, verified_vendor, gear_category
    ):
        """?price_min=200 must exclude products whose price < 200."""
        cheap = _make_product(
            verified_vendor, gear_category,
            name="Cheap Rope", name_ar="حبل رخيص",
            price="99.00",
        )
        expensive = _make_product(
            verified_vendor, gear_category,
            name="Premium Rod", name_ar="عصا ممتازة",
            price="350.00",
        )

        response = api_client.get(PRODUCT_LIST_URL, {"price_min": "200"})

        assert response.status_code == 200
        returned_ids = [str(p["id"]) for p in response.data["results"]]
        assert str(expensive.id) in returned_ids
        assert str(cheap.id) not in returned_ids

    def test_price_max_returns_products_below_threshold(
        self, api_client, verified_vendor, gear_category
    ):
        """?price_max=300 must exclude products whose price > 300."""
        affordable = _make_product(
            verified_vendor, gear_category,
            name="Budget Hook", name_ar="خطاف اقتصادي",
            price="150.00",
        )
        luxury = _make_product(
            verified_vendor, gear_category,
            name="Luxury Buoy", name_ar="عوامة فاخرة",
            price="800.00",
        )

        response = api_client.get(PRODUCT_LIST_URL, {"price_max": "300"})

        assert response.status_code == 200
        returned_ids = [str(p["id"]) for p in response.data["results"]]
        assert str(affordable.id) in returned_ids
        assert str(luxury.id) not in returned_ids

    def test_rating_filter_returns_products_at_or_above_threshold(
        self, api_client, verified_vendor, gear_category
    ):
        """?rating=4 must include products with average_rating >= 4.0 and exclude those below."""
        high_rated = _make_product(
            verified_vendor, gear_category,
            name="Top Net", name_ar="شبكة ممتازة",
            price="200.00",
        )
        high_rated.average_rating = decimal.Decimal("4.50")
        high_rated.save(update_fields=["average_rating", "updated_at"])

        low_rated = _make_product(
            verified_vendor, gear_category,
            name="Basic Float", name_ar="عائم عادي",
            price="50.00",
        )
        low_rated.average_rating = decimal.Decimal("2.80")
        low_rated.save(update_fields=["average_rating", "updated_at"])

        response = api_client.get(PRODUCT_LIST_URL, {"rating": "4"})

        assert response.status_code == 200
        returned_ids = [str(p["id"]) for p in response.data["results"]]
        assert str(high_rated.id) in returned_ids
        assert str(low_rated.id) not in returned_ids

    def test_price_range_combined_filter(
        self, api_client, verified_vendor, gear_category
    ):
        """?price_min=100&price_max=500 must return only products within that range."""
        in_range = _make_product(
            verified_vendor, gear_category,
            name="Mid Jacket", name_ar="سترة متوسطة",
            price="300.00",
        )
        too_cheap = _make_product(
            verified_vendor, gear_category,
            name="Bargain Line", name_ar="خط رخيص",
            price="50.00",
        )
        too_expensive = _make_product(
            verified_vendor, gear_category,
            name="Elite Sonar", name_ar="سونار متقدم",
            price="999.00",
        )

        response = api_client.get(PRODUCT_LIST_URL, {"price_min": "100", "price_max": "500"})

        assert response.status_code == 200
        returned_ids = [str(p["id"]) for p in response.data["results"]]
        assert str(in_range.id) in returned_ids
        assert str(too_cheap.id) not in returned_ids
        assert str(too_expensive.id) not in returned_ids

    def test_invalid_price_min_is_ignored_returns_200(
        self, api_client, verified_vendor, gear_category
    ):
        """?price_min=abc (non-numeric) must not raise 400 — silently ignored, all active products returned."""
        product = _make_product(
            verified_vendor, gear_category,
            name="Compass", name_ar="بوصلة",
            price="120.00",
        )

        response = api_client.get(PRODUCT_LIST_URL, {"price_min": "not-a-number"})

        assert response.status_code == 200
        returned_ids = [str(p["id"]) for p in response.data["results"]]
        # Product must still appear — the invalid param is ignored
        assert str(product.id) in returned_ids


# ---------------------------------------------------------------------------
# Tests: Product semantic search — Sprint 14A (ADR-019)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestProductSearchEmptyEmbeddings:
    """?search= with no embeddings stored → falls back to icontains text search."""

    def test_search_empty_embedding_db_falls_back_to_text_search(
        self, api_client, verified_vendor, gear_category
    ):
        """When no products have an embedding AND Ollama raises (simulating cold-
        start before Celery workers generate embeddings), the endpoint falls back
        to icontains text search and returns 200 with matching results.

        The httpx.post patch forces the Ollama code path to throw, exercising
        the except-block fallback in ``_apply_search`` (ADR-019 fallback clause).
        """
        import httpx

        product = _make_product(
            verified_vendor, gear_category,
            name="Life Jacket Special", name_ar="سترة نجاة خاصة",
            price="300.00",
        )
        # Confirm no embedding is stored (field default is null).
        assert product.embedding is None

        # Simulate Ollama being unreachable so the fallback path is exercised.
        with patch(
            "apps.marketplace.views.httpx.post",
            side_effect=httpx.ConnectError("Ollama unreachable"),
        ):
            response = api_client.get(PRODUCT_LIST_URL, {"search": "Life Jacket Special"})

        assert response.status_code == 200
        returned_ids = [str(p["id"]) for p in response.data["results"]]
        assert str(product.id) in returned_ids


@pytest.mark.django_db
class TestProductSearchOllamaTimeout:
    """?search= when Ollama times out → graceful fallback, returns 200."""

    def test_ollama_timeout_falls_back_gracefully(
        self, api_client, verified_vendor, gear_category
    ):
        """When the Ollama httpx call raises TimeoutException, the view must
        catch it and fall back to icontains search without returning a 500
        error (ADR-019: wrap Ollama calls in try/except with timeout).
        """
        import httpx

        product = _make_product(
            verified_vendor, gear_category,
            name="Fishing Rod", name_ar="عصا صيد",
            price="180.00",
        )

        # Patch httpx.post inside marketplace views to simulate a timeout.
        with patch(
            "apps.marketplace.views.httpx.post",
            side_effect=httpx.TimeoutException("Ollama timed out"),
        ):
            response = api_client.get(PRODUCT_LIST_URL, {"search": "Fishing Rod"})

        assert response.status_code == 200
        # Text-search fallback must still find the matching product by name.
        returned_ids = [str(p["id"]) for p in response.data["results"]]
        assert str(product.id) in returned_ids


@pytest.mark.django_db
class TestProductSearchParamAbsent:
    """When ?search= is absent, normal list is returned without calling Ollama."""

    def test_no_search_param_returns_normal_list_without_ollama_call(
        self, api_client, verified_vendor, gear_category
    ):
        """Absence of ?search= must short-circuit the embedding path entirely.
        Ollama must never be called and the standard active-product list is
        returned (200), ensuring no performance regression on the common path.
        """
        product = _make_product(
            verified_vendor, gear_category,
            name="Snorkel Set", name_ar="طقم غطس",
            price="95.00",
        )

        # Any call to httpx.post would mean the search path was entered incorrectly.
        with patch(
            "apps.marketplace.views.httpx.post",
            side_effect=AssertionError("Ollama must not be called when search param is absent"),
        ):
            response = api_client.get(PRODUCT_LIST_URL)

        assert response.status_code == 200
        returned_ids = [str(p["id"]) for p in response.data["results"]]
        assert str(product.id) in returned_ids
