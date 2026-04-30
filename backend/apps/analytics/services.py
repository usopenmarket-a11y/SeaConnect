"""Analytics service layer — helper functions for writing audit log entries.

Usage example:
    from apps.analytics.services import log_event
    from apps.analytics.models import AuditLog

    log_event(
        event_type=AuditLog.EventType.BOOKING_CREATED,
        actor=request.user,
        reference_id=booking.id,
        reference_type='booking',
        amount=booking.total_amount,
        currency=booking.currency,
        metadata={'yacht_id': str(booking.yacht_id)},
        ip_address=request.META.get('REMOTE_ADDR'),
    )

The log_event function never raises — it silently captures exceptions so
that audit logging failures do not affect the main request lifecycle.
"""
import logging
from decimal import Decimal
from typing import Any
from uuid import UUID

from .models import AuditLog

logger = logging.getLogger(__name__)


def log_event(
    event_type: str,
    actor: Any = None,
    reference_id: UUID | str | None = None,
    reference_type: str = "",
    amount: Decimal | None = None,
    currency: str = "",
    metadata: dict | None = None,
    ip_address: str | None = None,
) -> AuditLog | None:
    """Append a new audit log entry. Never raises — silently logs errors.

    Args:
        event_type: One of AuditLog.EventType choices.
        actor: User instance that triggered the event. None for system events.
        reference_id: UUID of the related object (booking, payment, etc.).
        reference_type: String label for the reference, e.g. 'booking'.
        amount: Monetary amount at event time (NUMERIC-safe Decimal).
        currency: ISO 4217 currency code. Must match the region currency.
        metadata: Arbitrary dict of structured context data.
        ip_address: Originating IP address of the request, if available.

    Returns:
        The created AuditLog instance, or None if writing failed.
    """
    try:
        return AuditLog.objects.create(
            event_type=event_type,
            actor=actor,
            reference_id=reference_id,
            reference_type=reference_type,
            amount=amount,
            currency=currency,
            metadata=metadata or {},
            ip_address=ip_address,
        )
    except Exception:
        logger.exception(
            "Failed to write audit log [event_type=%s, reference_type=%s, reference_id=%s]",
            event_type,
            reference_type,
            reference_id,
        )
        return None
