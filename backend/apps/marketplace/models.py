"""Marketplace app models — stub for Sprint 1.

Full implementation in Sprint 3 (vendor profiles, products, cart, orders).

ADR-018: price/currency fields must use DecimalField + explicit currency CharField.
         Never use `currency = 'EGP'` as a hardcoded default in application logic.
ADR-019: products.embedding = VectorField(dimensions=1536) for semantic search.
"""
# Sprint 3 will add:
#   VendorProfile, ProductCategory, Product, Cart, CartItem,
#   Order, OrderItem, Shipment, PromoCode, PromoCodeUsage
