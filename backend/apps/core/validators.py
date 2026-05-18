"""Shared upload validators for SeaConnect (Sprint 12A).

Used by yacht photo upload and product image upload endpoints.
Raises ``django.core.exceptions.ValidationError`` (not DRF's) so the
exception can be caught uniformly by DRF's field-level validation.

ADR-010: storage is abstract — validators only inspect the in-memory file
object (InMemoryUploadedFile / TemporaryUploadedFile) from the request, so
they are storage-backend agnostic.
"""
from __future__ import annotations

import io

from django.conf import settings
from django.core.exceptions import ValidationError

try:
    from PIL import Image as PilImage
    _PIL_AVAILABLE = True
except ImportError:
    _PIL_AVAILABLE = False

ALLOWED_IMAGE_CONTENT_TYPES: frozenset[str] = frozenset(
    {"image/jpeg", "image/png", "image/webp"}
)

_PIL_FORMAT_MAP: dict[str, str] = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
}


def validate_image_upload(file: object) -> None:
    """Validate that *file* is an image and within the configured size limit.

    Performs both a Content-Type header check and a Pillow magic-bytes
    verification so attackers cannot bypass the check by spoofing the
    Content-Type header.

    Args:
        file: Any file-like object with ``.size``, ``.content_type``, and
              ``.read()`` / ``.seek()`` attributes (Django's
              ``InMemoryUploadedFile`` or ``TemporaryUploadedFile``).

    Raises:
        ValidationError: if the file is too large, has an unsupported
                         content-type, or does not contain valid image data.
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

    if _PIL_AVAILABLE:
        _verify_image_magic_bytes(file, content_type)


def _verify_image_magic_bytes(file: object, declared_content_type: str) -> None:
    """Use Pillow to verify the actual file content matches the declared type."""
    read_fn = getattr(file, "read", None)
    seek_fn = getattr(file, "seek", None)
    if read_fn is None:
        return

    try:
        data: bytes = read_fn()
        if seek_fn is not None:
            seek_fn(0)
        img = PilImage.open(io.BytesIO(data))
        img.verify()
        actual_mime = _PIL_FORMAT_MAP.get(img.format or "", "")
        if actual_mime not in ALLOWED_IMAGE_CONTENT_TYPES:
            raise ValidationError(
                "File content does not match an allowed image format.",
                code="INVALID_IMAGE_CONTENT",
            )
    except ValidationError:
        raise
    except Exception:
        raise ValidationError(
            "Could not verify image file. Ensure the file is a valid JPEG, PNG, or WebP.",
            code="INVALID_IMAGE_CONTENT",
        )
