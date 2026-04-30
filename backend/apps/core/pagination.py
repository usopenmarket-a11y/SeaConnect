"""Global cursor pagination for SeaConnect (ADR-013).

All models inherit TimeStampedModel which provides created_at, not the
DRF default field name 'created'. This class overrides the ordering so
any view using the global pagination class works without extra configuration.
"""
from rest_framework.pagination import CursorPagination


class SeaConnectCursorPagination(CursorPagination):
    page_size = 20
    ordering = "-created_at"
