"""Marketplace URL routes — Sprint 5 + Sprint 11D + Sprint 12A + Sprint 12F.

Sprint 11D additions:
  - ProductListView replaced by VendorProductListCreateView (adds POST for vendors)
  - ProductDetailView replaced by VendorProductDetailView (adds PATCH/DELETE for vendors)
  - /marketplace/vendor/products/    — vendor's own product inventory (all statuses)
  - /marketplace/vendor-profile/     — vendor storefront profile GET + PATCH

Sprint 12A additions:
  - /marketplace/products/{id}/images/ — product image upload (vendor owner only)

Sprint 12F additions:
  - /marketplace/orders/{id}/confirm/ — vendor confirms order (pending → confirmed)
  - /marketplace/orders/{id}/ship/    — vendor ships order (confirmed → shipped)
  - /marketplace/orders/{id}/cancel/  — vendor cancels order (any → cancelled)

Public GET routes remain unchanged so existing clients are not broken.
"""
from django.urls import path
from . import views

app_name = "marketplace"

urlpatterns = [
    # -----------------------------------------------------------------------
    # Products — public read + vendor write (Sprint 5 routes, Sprint 11D upgraded)
    # -----------------------------------------------------------------------
    path(
        "marketplace/products/",
        views.VendorProductListCreateView.as_view(),
        name="product-list-create",
    ),
    path(
        "marketplace/products/<uuid:id>/",
        views.VendorProductDetailView.as_view(),
        name="product-detail-update-delete",
    ),

    # -----------------------------------------------------------------------
    # Sprint 12A — Product image upload
    # -----------------------------------------------------------------------
    path(
        "marketplace/products/<uuid:id>/images/",
        views.ProductImageUploadView.as_view(),
        name="product-image-upload",
    ),

    # -----------------------------------------------------------------------
    # Vendor-specific — authenticated vendor only
    # -----------------------------------------------------------------------
    path(
        "marketplace/vendor/products/",
        views.VendorProductInventoryView.as_view(),
        name="vendor-product-inventory",
    ),
    path(
        "marketplace/vendor-profile/",
        views.VendorProfileView.as_view(),
        name="vendor-profile",
    ),

    # -----------------------------------------------------------------------
    # Categories
    # -----------------------------------------------------------------------
    path("marketplace/categories/", views.CategoryListView.as_view(), name="category-list"),

    # -----------------------------------------------------------------------
    # Cart
    # -----------------------------------------------------------------------
    path("marketplace/cart/", views.CartView.as_view(), name="cart-get"),
    path("marketplace/cart/items/", views.CartItemView.as_view(), name="cart-item-add"),
    path("marketplace/cart/items/<uuid:id>/", views.CartItemDetailView.as_view(), name="cart-item-detail"),

    # -----------------------------------------------------------------------
    # Orders
    # -----------------------------------------------------------------------
    path("marketplace/orders/", views.OrderListCreateView.as_view(), name="order-list-create"),
    path("marketplace/orders/<uuid:id>/", views.OrderDetailView.as_view(), name="order-detail"),

    # -----------------------------------------------------------------------
    # Sprint 12F — Vendor order actions (confirm / ship / cancel)
    # -----------------------------------------------------------------------
    path(
        "marketplace/orders/<uuid:id>/confirm/",
        views.VendorOrderActionView.as_view(),
        {"action": "confirm"},
        name="vendor-order-confirm",
    ),
    path(
        "marketplace/orders/<uuid:id>/ship/",
        views.VendorOrderActionView.as_view(),
        {"action": "ship"},
        name="vendor-order-ship",
    ),
    path(
        "marketplace/orders/<uuid:id>/cancel/",
        views.VendorOrderActionView.as_view(),
        {"action": "cancel"},
        name="vendor-order-cancel",
    ),
]
