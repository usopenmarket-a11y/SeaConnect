"""URL routes for the weather app — Sprint 5."""
from django.urls import path

from . import views

app_name = "weather"

urlpatterns = [
    path("weather/", views.WeatherView.as_view(), name="weather"),
    path("fishing/whats-biting/", views.WhatsBitingView.as_view(), name="whats-biting"),
    path("fishing/seasons/", views.FishingSeasonsView.as_view(), name="fishing-seasons"),
]
