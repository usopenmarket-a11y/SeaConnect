"""Shared upload validators for SeaConnect (Sprint 12A).

Used by yacht photo upload and product image upload endpoints.
Raises ``django.core.exceptions.ValidationError`` (not DRF's) so the
exception can be caught uniformly by DRF's field-level validation.

ADR-010: storage is abstract — validators only inspect the in-memory file
object (InMemoryUploadedFile / TemporaryUploadedFile) from the request, so
they are storage-backend agnostic.
"""
from __future__ import annotations

from django.conf import settings
from django.core.exceptions import ValidationError

ALLOWED_IMAGE_CONTENT_TYPES: frozenset[str] = frozenset(
    {"image/jpeg", "image/png", "image/webp"}
)


def validate_image_upload(file: object) -> None:
    """Validate that *file* is an image and within the configured size limit.

    Args:
        file: Any file-like object with ``.size`` and ``.content_type``
              attributes (e.g. Django's ``InMemoryUploadedFile``).

    Raises:
        ValidationError: if the file is too large or has an unsupported
                         content-type.
    """
    max_size: int = getattr(settings, "MAX_PHOTO_SIZE", 10 * 1024 * 1024)
    max_mb: int = max_size // (1024 * 1024)

    size: int = getattr(file, "size", 0)
    if size > max_size:
        raise ValidationError(
            f"File too large. Maximum allowed size is {max_mb} MB "
            f"(uploaded {size // (1024 * 1024)} MB).",
            code="FILE_TOO_LARGE",
        )

    content_type: str = getattr(file, "content_type", "")
    if content_type not in ALLOWED_IMAGE_CONTENT_TYPES:
        raise ValidationError(
            f"Unsupported file type '{content_type}'. "
            "Accepted formats: JPEG, PNG, WebP.",
            code="UNSUPPORTED_FILE_TYPE",
        )
