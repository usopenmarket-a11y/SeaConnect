"""Bookings app models — stub for Sprint 1.

Full implementation in Sprint 2 (booking lifecycle, state machine, event sourcing).

ADR-012: All state changes must write to BookingEvent within the same
         transaction.atomic() block as the state change itself.
ADR-013: List endpoints use CursorPagination with ordering='-created_at'.
ADR-018: Region FK on all location-specific models; currency never hardcoded.
"""
# Sprint 2 will add:
#   Yacht, Availability, MatchRequest, MatchResult, Booking, BookingEvent
#
# BookingEvent must be append-only (no UPDATE, no DELETE) per ADR-012.
# Use transaction.atomic() + BookingEvent.objects.create() on every state change.
