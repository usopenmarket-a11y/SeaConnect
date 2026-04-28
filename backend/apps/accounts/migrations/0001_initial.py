"""Initial migration for the accounts app.

Creates the custom User table with UUID PK and email-based auth.

Zero-downtime notes:
  - New table; no existing data.
  - Partial index on (role) WHERE is_active is created via RunSQL with
    CONCURRENTLY cannot be used inside a transaction, but since this is
    a fresh table creation it is fine to do inline.
"""
import uuid

import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("core", "0001_initial"),
        ("auth", "0012_alter_user_first_name_max_length"),
        ("contenttypes", "0002_remove_content_type_name"),
    ]

    operations = [
        migrations.CreateModel(
            name="User",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("password", models.CharField(max_length=128, verbose_name="password")),
                ("last_login", models.DateTimeField(blank=True, null=True, verbose_name="last login")),
                ("is_superuser", models.BooleanField(
                    default=False,
                    help_text="Designates that this user has all permissions without explicitly assigning them.",
                    verbose_name="superuser status",
                )),
                ("email", models.EmailField(help_text="Primary login identifier.", max_length=254, unique=True)),
                ("first_name", models.CharField(blank=True, max_length=150)),
                ("last_name", models.CharField(blank=True, max_length=150)),
                ("phone", models.CharField(
                    blank=True,
                    help_text="E.164 format, e.g. +201012345678. Used for OTP verification.",
                    max_length=20,
                    null=True,
                    unique=True,
                )),
                ("role", models.CharField(
                    choices=[("customer", "Customer"), ("owner", "Boat Owner"), ("vendor", "Vendor"), ("admin", "Admin")],
                    default="customer",
                    max_length=20,
                )),
                ("auth_provider", models.CharField(
                    choices=[("email", "Email"), ("google", "Google"), ("apple", "Apple"), ("phone", "Phone OTP")],
                    default="email",
                    max_length=20,
                )),
                ("is_verified", models.BooleanField(default=False, help_text="True after OTP phone or email verification.")),
                ("is_active", models.BooleanField(default=True)),
                ("is_staff", models.BooleanField(default=False, help_text="Allows access to the Django admin interface.")),
                ("preferred_lang", models.CharField(
                    choices=[("ar", "Arabic"), ("en", "English")],
                    default="ar",
                    max_length=5,
                )),
                ("fcm_token", models.TextField(blank=True, help_text="Firebase Cloud Messaging token for push notifications.", null=True)),
                ("region", models.ForeignKey(
                    blank=True,
                    help_text="User's home region — drives currency and timezone defaults.",
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="users",
                    to="core.region",
                )),
                ("last_login_at", models.DateTimeField(blank=True, null=True)),
                ("groups", models.ManyToManyField(
                    blank=True,
                    help_text="The groups this user belongs to.",
                    related_name="user_set",
                    related_query_name="user",
                    to="auth.group",
                    verbose_name="groups",
                )),
                ("user_permissions", models.ManyToManyField(
                    blank=True,
                    help_text="Specific permissions for this user.",
                    related_name="user_set",
                    related_query_name="user",
                    to="auth.permission",
                    verbose_name="user permissions",
                )),
            ],
            options={
                "verbose_name": "User",
                "verbose_name_plural": "Users",
                "db_table": "accounts_user",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="user",
            index=models.Index(
                condition=models.Q(is_active=True),
                fields=["role"],
                name="idx_user_role_active",
            ),
        ),
    ]
