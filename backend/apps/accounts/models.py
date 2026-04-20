"""Custom User model for SeaConnect.

ADR compliance:
  ADR-001 — UUID PK, ORM only
  ADR-009 — Email as USERNAME_FIELD (no username field)
  ADR-018 — Region FK on User; currency never hardcoded

The User model is the single source of truth for authentication.
Role-specific profile data (BoatOwnerProfile, VendorProfile) lives in
separate related models to keep this table lean.
"""
import uuid

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models

from apps.core.models import Region, TimeStampedModel


class UserRole(models.TextChoices):
    CUSTOMER = "customer", "Customer"
    OWNER = "owner", "Boat Owner"
    VENDOR = "vendor", "Vendor"
    ADMIN = "admin", "Admin"


class AuthProvider(models.TextChoices):
    EMAIL = "email", "Email"
    GOOGLE = "google", "Google"
    APPLE = "apple", "Apple"
    PHONE = "phone", "Phone OTP"


class UserManager(BaseUserManager["User"]):
    """Custom manager that uses email as the unique identifier."""

    def create_user(
        self,
        email: str,
        password: str | None = None,
        **extra_fields: object,
    ) -> "User":
        if not email:
            raise ValueError("Users must have an email address.")
        email = self.normalize_email(email)
        extra_fields.setdefault("role", UserRole.CUSTOMER)
        user: "User" = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(
        self,
        email: str,
        password: str | None = None,
        **extra_fields: object,
    ) -> "User":
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", UserRole.ADMIN)
        extra_fields.setdefault("is_verified", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin, TimeStampedModel):
    """Platform user.

    All three sides of the marketplace (customer, owner, vendor) share this
    model. Role-specific data lives in profile tables (BoatOwnerProfile,
    VendorProfile) joined by FK.

    Field notes:
    - ``phone`` — nullable because OAuth users may not provide a phone.
    - ``is_verified`` — set to True after OTP phone verification.
    - ``preferred_lang`` — drives API response language for this user.
    - ``region`` — the user's home region, used for currency/timezone defaults.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, help_text="Primary login identifier.")
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    phone = models.CharField(
        max_length=20,
        unique=True,
        null=True,
        blank=True,
        help_text="E.164 format, e.g. +201012345678. Used for OTP verification.",
    )
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.CUSTOMER,
    )
    auth_provider = models.CharField(
        max_length=20,
        choices=AuthProvider.choices,
        default=AuthProvider.EMAIL,
    )
    is_verified = models.BooleanField(
        default=False,
        help_text="True after OTP phone or email verification.",
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(
        default=False,
        help_text="Allows access to the Django admin interface.",
    )
    preferred_lang = models.CharField(
        max_length=5,
        choices=[("ar", "Arabic"), ("en", "English")],
        default="ar",
    )
    fcm_token = models.TextField(
        null=True,
        blank=True,
        help_text="Firebase Cloud Messaging token for push notifications.",
    )
    region = models.ForeignKey(
        Region,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
        help_text="User's home region — drives currency and timezone defaults.",
    )
    last_login_at = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    class Meta:
        db_table = "accounts_user"
        ordering = ["-created_at"]
        verbose_name = "User"
        verbose_name_plural = "Users"
        indexes = [
            models.Index(fields=["role"], condition=models.Q(is_active=True), name="idx_user_role_active"),
        ]

    def __str__(self) -> str:
        return self.email

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip() or self.email
