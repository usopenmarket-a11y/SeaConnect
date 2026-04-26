import django_filters

from .models import Yacht, YachtType


class YachtFilter(django_filters.FilterSet):
    region = django_filters.CharFilter(field_name="region__code", lookup_expr="iexact")
    port = django_filters.UUIDFilter(field_name="departure_port__id")
    capacity_min = django_filters.NumberFilter(field_name="capacity", lookup_expr="gte")
    yacht_type = django_filters.ChoiceFilter(choices=YachtType.choices)
    price_max = django_filters.NumberFilter(field_name="price_per_day", lookup_expr="lte")
    price_min = django_filters.NumberFilter(field_name="price_per_day", lookup_expr="gte")

    class Meta:
        model = Yacht
        fields = ["region", "port", "capacity_min", "yacht_type", "price_min", "price_max"]
