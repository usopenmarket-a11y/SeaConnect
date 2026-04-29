from django.urls import path
from . import views

app_name = "marketplace"

urlpatterns = [
    path("marketplace/products/", views.ProductListView.as_view(), name="product-list"),
    path("marketplace/products/<uuid:id>/", views.ProductDetailView.as_view(), name="product-detail"),
    path("marketplace/categories/", views.CategoryListView.as_view(), name="category-list"),
    path("marketplace/cart/", views.CartView.as_view(), name="cart-get"),
    path("marketplace/cart/items/", views.CartItemView.as_view(), name="cart-item-add"),
    path("marketplace/cart/items/<uuid:id>/", views.CartItemDetailView.as_view(), name="cart-item-detail"),
    path("marketplace/orders/", views.OrderListCreateView.as_view(), name="order-list-create"),
    path("marketplace/orders/<uuid:id>/", views.OrderDetailView.as_view(), name="order-detail"),
]
