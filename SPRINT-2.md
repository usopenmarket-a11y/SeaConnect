# Sprint 2 — Authentication + Listings Foundation
**Dates:** 2026-04-21 → 2026-04-28
**Goal:** A real user can register, log in, browse yacht listings, and see a yacht detail page — end-to-end through the web UI.
**Status:** Planning

---

## Sprint 1 Delivery State (What We're Building On)

Sprint 1 delivered a fully working infrastructure scaffold:

- Django 5 backend at `backend/` with 10 apps (core, accounts, bookings, marketplace, competitions, weather, payments, notifications, analytics, plus admin\_portal named `admin_portal`). The `listings` app from the Sprint 1 plan does not exist as a separate directory — yacht-related models will live in `backend/apps/bookings/` (stub file already signals this).
- `User` model in `apps/accounts/models.py` uses **email** as `USERNAME_FIELD` (not phone number — the Sprint 1 agent chose email over the plan's phone-first approach; this is the source of truth now). Fields: `first_name`, `last_name`, `email`, `phone`, `role` (TextChoices), `auth_provider` (TextChoices), `is_verified`, `preferred_lang`, `fcm_token`, `region` FK, `created_at`, `updated_at`.
- `UserSerializer` and `UserUpdateSerializer` exist with correct field sets.
- `CustomTokenObtainPairSerializer` already embeds `role`, `email`, and `region_code` in JWT payloads.
- JWT URL stubs at `/api/v1/auth/token/`, `/api/v1/auth/token/refresh/`, `/api/v1/auth/token/verify/`, `/api/v1/auth/token/blacklist/`, and `/api/v1/me/` (stub `MeView` exists).
- `TimeStampedModel`, `Region`, `DeparturePort`, `FeatureFlag` models in `apps/core/models.py`.
- Migrations applied for `core` (0001\_initial.py + 0002\_seed\_egypt.py) and `accounts` (0001\_initial.py).
- Next.js 14 at `web/` with App Router, next-intl, ar/en messages, `[locale]/layout.tsx`, auth and dashboard route stubs (`(auth)/login/page.tsx`, `(auth)/register/page.tsx`, `(dashboard)/bookings/`, `(dashboard)/profile/`), `Button` and `Card` components, Tailwind config.
- Auth page stubs are client components with correct imports but no real API call logic yet.

---

## Carry-overs from Sprint 1

| Task | Reason not completed | Priority |
|------|----------------------|----------|
| `POST /api/v1/auth/register/` endpoint | URL stub exists, no register view or serializer | High |
| Proper login endpoint (custom, not raw simplejwt) | Raw simplejwt `TokenObtainPairView` mounted but custom `CustomTokenObtainPairSerializer` not wired to it | High |
| `/api/v1/users/me/` PATCH endpoint | `MeView` is a stub, not fully tested | Medium |
| All auth endpoint tests | No test files for accounts app yet | High |
| Yacht/listings model | `bookings/models.py` is a stub stub explicitly flagging Yacht as Sprint 2 work | High |
| Yacht listings API | No listings app or endpoints | High |
| Login/register pages (real API calls) | Stubs exist but no `useAuth` hook, no real fetch | High |
| Yacht listing and detail web pages | Not started | High |

---

## Sprint 2 Tasks

---

### Phase A — Auth Backend

**Agent:** api-endpoint-agent
**Can start:** Immediately (all dependencies from Sprint 1 are in place)
**Blocks:** Phase C (web auth UI), Phase E (tests)

---

#### Task A-1 — Register endpoint
**Agent:** api-endpoint-agent
**Depends on:** Nothing (User model and base serializers exist)
**Files touched:**
- `backend/apps/accounts/serializers.py` — add `RegisterSerializer`
- `backend/apps/accounts/views.py` — add `RegisterView`
- `backend/apps/accounts/urls.py` — wire `POST auth/register/`
**Estimated tokens:** 6,000

**What to build:**

Add `RegisterSerializer` to `serializers.py`. It must:
- Accept: `email` (required), `password` (required, write-only, min 8 chars), `first_name` (required), `last_name` (required), `phone` (optional), `role` (optional, defaults to `customer`)
- Validate that `email` is not already taken (raise `serializers.ValidationError` with field `"email"` on duplicate)
- On `create()`, call `User.objects.create_user(email=..., password=..., **validated_data)` — never set the password hash manually
- Return the created User instance

Add `RegisterView` to `views.py`:
```python
class RegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )
```

Wire in `urls.py`:
```python
path("auth/register/", views.RegisterView.as_view(), name="register"),
```

**Definition of done:**
- `POST /api/v1/auth/register/` with valid payload returns HTTP 201 with `user`, `access`, and `refresh` keys
- Duplicate email returns HTTP 400 with `{"error": {"code": "VALIDATION_ERROR", "message": "...", "field": "email"}}`
- Password is never returned in any response
- `python manage.py check` passes

---

#### Task A-2 — Login endpoint (custom view wiring CustomTokenObtainPairSerializer)
**Agent:** api-endpoint-agent
**Depends on:** Task A-1 (url patterns consolidated)
**Files touched:**
- `backend/apps/accounts/views.py` — add `LoginView`
- `backend/apps/accounts/urls.py` — replace raw `TokenObtainPairView` with custom view
**Estimated tokens:** 4,000

**What to build:**

The `CustomTokenObtainPairSerializer` already exists in `serializers.py` and embeds `role`, `email`, and `region_code` in the token. The raw `TokenObtainPairView` at `auth/token/` does not use it. Replace with a named login endpoint:

In `views.py`, add:
```python
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer

class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer
```

In `urls.py`, update the token endpoint:
```python
path("auth/login/", views.LoginView.as_view(), name="login"),
# Keep the old path as an alias for backward compat with simplejwt clients:
path("auth/token/", views.LoginView.as_view(), name="token-obtain"),
```

**Definition of done:**
- `POST /api/v1/auth/login/` with `{"email": "...", "password": "..."}` returns `{"access": "...", "refresh": "..."}`
- Decoded access token contains `role`, `email`, `region_code` custom claims
- Invalid credentials return HTTP 401 using the standard error envelope
- `python manage.py check` passes

---

#### Task A-3 — Refresh and logout endpoints (verify correct wiring)
**Agent:** api-endpoint-agent
**Depends on:** Task A-2
**Files touched:**
- `backend/apps/accounts/urls.py` — rename paths to match API spec
**Estimated tokens:** 2,000

**What to build:**

Rename the existing simplejwt URL mounts to match the API spec exactly:

```python
path("auth/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
path("auth/logout/", TokenBlacklistView.as_view(), name="logout"),
```

Remove `auth/token/verify/` from public routes — it is an internal utility, not part of the documented API.

Confirm that `rest_framework_simplejwt.token_blacklist` is in `INSTALLED_APPS` in `base.py` and that `ROTATE_REFRESH_TOKENS = True` and `BLACKLIST_AFTER_ROTATION = True` are set in `SIMPLE_JWT`. These were spec'd in Sprint 1 but verify they exist.

**Definition of done:**
- `POST /api/v1/auth/refresh/` with `{"refresh": "..."}` returns new `{"access": "...", "refresh": "..."}`
- `POST /api/v1/auth/logout/` with `{"refresh": "..."}` in body returns HTTP 205 and blacklists the token
- Using the blacklisted refresh token a second time returns HTTP 401
- URL names: `token-refresh`, `logout`

---

#### Task A-4 — /users/me/ endpoint (fully implemented)
**Agent:** api-endpoint-agent
**Depends on:** Task A-1
**Files touched:**
- `backend/apps/accounts/views.py` — flesh out `MeView`
- `backend/apps/accounts/urls.py` — confirm path is `users/me/`
**Estimated tokens:** 3,000

**What to build:**

The `MeView` stub already exists. Ensure it is complete:
- `GET /api/v1/users/me/` — returns full user via `UserSerializer`, requires `IsAuthenticated`
- `PATCH /api/v1/users/me/` — accepts partial updates via `UserUpdateSerializer`, requires `IsAuthenticated`, supports partial=True
- The URL must be `users/me/` not `me/` — update `urls.py` if needed

Verify `UserUpdateSerializer` includes all mutable profile fields: `first_name`, `last_name`, `phone`, `preferred_lang`, `fcm_token`, `region`.

**Definition of done:**
- `GET /api/v1/users/me/` with valid Bearer token returns user JSON
- `PATCH /api/v1/users/me/` with `{"first_name": "Test"}` updates and returns updated user
- Unauthenticated requests return HTTP 401 with standard error envelope
- URL is `/api/v1/users/me/`

---

### Phase B — Yacht Listings Backend

**Agent:** django-model-agent (B-1, B-2), then api-endpoint-agent (B-3, B-4)
**Can start:** B-1 can start immediately. B-3 depends on B-1 and B-2.
**Blocks:** Phase D (web listings UI), Phase E (tests)

---

#### Task B-1 — Yacht and YachtMedia models
**Agent:** django-model-agent
**Depends on:** Nothing (User and Region models already exist)
**Files touched:**
- `backend/apps/bookings/models.py` — add `Yacht` and `YachtMedia` models
- `backend/apps/bookings/migrations/` — new migration
- `backend/apps/bookings/admin.py` — register both models
**Estimated tokens:** 8,000

**What to build:**

Add to `backend/apps/bookings/models.py`:

```python
class YachtType(models.TextChoices):
    SAILING = "sailing", "Sailing Yacht"
    MOTOR = "motor", "Motor Yacht"
    CATAMARAN = "catamaran", "Catamaran"
    SPEEDBOAT = "speedboat", "Speedboat"
    FISHING = "fishing", "Fishing Boat"
    HOUSEBOAT = "houseboat", "Houseboat"


class YachtStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    ACTIVE = "active", "Active"
    INACTIVE = "inactive", "Inactive"
    SUSPENDED = "suspended", "Suspended"


class Yacht(TimeStampedModel):
    """
    A vessel listed on SeaConnect for customer booking.

    ADR-001: UUID PK, ORM only
    ADR-018: region FK present; currency CharField not hardcoded to 'EGP'
    """
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="yachts",
        limit_choices_to={"role": "owner"},
    )
    region = models.ForeignKey(
        "core.Region",
        on_delete=models.PROTECT,
        related_name="yachts",
    )
    departure_port = models.ForeignKey(
        "core.DeparturePort",
        on_delete=models.PROTECT,
        related_name="yachts",
        null=True,
        blank=True,
    )
    name = models.CharField(max_length=255)          # English name
    name_ar = models.CharField(max_length=255)        # Arabic name — required
    description = models.TextField(blank=True)
    description_ar = models.TextField(blank=True)
    capacity = models.PositiveSmallIntegerField(
        help_text="Maximum number of passengers including crew.",
    )
    price_per_day = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(
        max_length=3,
        help_text="ISO 4217 currency code from the yacht's region.",
    )
    yacht_type = models.CharField(
        max_length=20,
        choices=YachtType.choices,
        default=YachtType.MOTOR,
    )
    status = models.CharField(
        max_length=20,
        choices=YachtStatus.choices,
        default=YachtStatus.DRAFT,
        db_index=True,
    )

    class Meta(TimeStampedModel.Meta):
        db_table = "bookings_yacht"
        verbose_name = "Yacht"
        verbose_name_plural = "Yachts"
        indexes = [
            models.Index(fields=["region", "status"]),
            models.Index(fields=["departure_port", "status"]),
            models.Index(fields=["yacht_type", "status"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.get_status_display()})"

    def save(self, *args, **kwargs):
        # Automatically populate currency from region if not set
        if not self.currency and self.region_id:
            self.currency = self.region.currency_code
        super().save(*args, **kwargs)


class MediaType(models.TextChoices):
    IMAGE = "image", "Image"
    VIDEO = "video", "Video"


class YachtMedia(TimeStampedModel):
    """
    Photos and videos attached to a Yacht listing.
    One record is marked is_primary=True — used as the card thumbnail.
    """
    yacht = models.ForeignKey(
        Yacht,
        on_delete=models.CASCADE,
        related_name="media",
    )
    url = models.URLField(max_length=1000)
    media_type = models.CharField(
        max_length=10,
        choices=MediaType.choices,
        default=MediaType.IMAGE,
    )
    is_primary = models.BooleanField(default=False, db_index=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta(TimeStampedModel.Meta):
        db_table = "bookings_yacht_media"
        verbose_name = "Yacht Media"
        verbose_name_plural = "Yacht Media"
        ordering = ["order", "-is_primary"]

    def __str__(self) -> str:
        return f"{self.yacht.name} — {self.media_type} ({self.order})"
```

Register in `admin.py`:
```python
from django.contrib import admin
from .models import Yacht, YachtMedia

class YachtMediaInline(admin.TabularInline):
    model = YachtMedia
    extra = 1

@admin.register(Yacht)
class YachtAdmin(admin.ModelAdmin):
    list_display = ["name", "owner", "region", "yacht_type", "status", "price_per_day", "currency"]
    list_filter = ["status", "yacht_type", "region"]
    inlines = [YachtMediaInline]

@admin.register(YachtMedia)
class YachtMediaAdmin(admin.ModelAdmin):
    list_display = ["yacht", "media_type", "is_primary", "order"]
```

**Definition of done:**
- `python manage.py makemigrations bookings` generates a clean migration
- `python manage.py migrate` applies without errors
- Both models visible and functional in Django admin
- `python manage.py check` passes
- `Yacht.save()` auto-populates `currency` from `region.currency_code`

---

#### Task B-2 — Yacht serializers
**Agent:** django-model-agent
**Depends on:** Task B-1
**Files touched:**
- `backend/apps/bookings/serializers.py` — create file
**Estimated tokens:** 5,000

**What to build:**

Create `backend/apps/bookings/serializers.py`:

```python
from rest_framework import serializers
from .models import Yacht, YachtMedia


class YachtMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = YachtMedia
        fields = ["id", "url", "media_type", "is_primary", "order"]


class YachtListSerializer(serializers.ModelSerializer):
    """Compact serializer for list endpoints — no media array to keep payload small."""
    primary_image_url = serializers.SerializerMethodField()
    region_code = serializers.CharField(source="region.code", read_only=True)
    port_code = serializers.CharField(source="departure_port.code", read_only=True, allow_null=True)

    class Meta:
        model = Yacht
        fields = [
            "id",
            "name",
            "name_ar",
            "capacity",
            "price_per_day",
            "currency",
            "yacht_type",
            "status",
            "region_code",
            "port_code",
            "primary_image_url",
            "created_at",
        ]

    def get_primary_image_url(self, obj: Yacht) -> str | None:
        primary = obj.media.filter(is_primary=True, media_type="image").first()
        if primary:
            return primary.url
        first_img = obj.media.filter(media_type="image").order_by("order").first()
        return first_img.url if first_img else None


class YachtDetailSerializer(serializers.ModelSerializer):
    """Full serializer for the detail endpoint — includes all media."""
    media = YachtMediaSerializer(many=True, read_only=True)
    region_code = serializers.CharField(source="region.code", read_only=True)
    port_name = serializers.CharField(source="departure_port.name_en", read_only=True, allow_null=True)
    port_name_ar = serializers.CharField(source="departure_port.name_ar", read_only=True, allow_null=True)

    class Meta:
        model = Yacht
        fields = [
            "id",
            "name",
            "name_ar",
            "description",
            "description_ar",
            "capacity",
            "price_per_day",
            "currency",
            "yacht_type",
            "status",
            "region_code",
            "port_name",
            "port_name_ar",
            "media",
            "created_at",
            "updated_at",
        ]
```

**Definition of done:**
- `YachtListSerializer` serializes a `Yacht` instance without error
- `YachtDetailSerializer` includes nested `media` array
- `primary_image_url` returns `None` (not an exception) for yachts with no media
- No circular imports

---

#### Task B-3 — Yacht list and detail endpoints
**Agent:** api-endpoint-agent
**Depends on:** Task B-1, Task B-2
**Files touched:**
- `backend/apps/bookings/views.py` — add `YachtListView`, `YachtDetailView`
- `backend/apps/bookings/urls.py` — create file, wire endpoints
- `backend/config/urls.py` — include bookings URLs
- `backend/apps/bookings/filters.py` — create file with `YachtFilter`
**Estimated tokens:** 8,000

**What to build:**

Create `backend/apps/bookings/filters.py`:
```python
import django_filters
from .models import Yacht, YachtType

class YachtFilter(django_filters.FilterSet):
    region = django_filters.CharFilter(field_name="region__code", lookup_expr="iexact")
    port = django_filters.CharFilter(field_name="departure_port__code", lookup_expr="iexact")
    capacity_min = django_filters.NumberFilter(field_name="capacity", lookup_expr="gte")
    yacht_type = django_filters.ChoiceFilter(choices=YachtType.choices)

    class Meta:
        model = Yacht
        fields = ["region", "port", "capacity_min", "yacht_type"]
```

Add to `backend/apps/bookings/views.py`:
```python
from rest_framework import generics
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from apps.core.pagination import StandardCursorPagination
from .models import Yacht
from .serializers import YachtListSerializer, YachtDetailSerializer
from .filters import YachtFilter

class YachtListView(generics.ListAPIView):
    """
    GET /api/v1/yachts/
    Public endpoint — no auth required. Returns active yachts only.
    ADR-013: CursorPagination enforced.
    """
    permission_classes = [AllowAny]
    serializer_class = YachtListSerializer
    pagination_class = StandardCursorPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = YachtFilter

    def get_queryset(self):
        return (
            Yacht.objects.filter(status="active", is_active=True)
            .select_related("region", "departure_port")
            .prefetch_related("media")
            .order_by("-created_at")
        )


class YachtDetailView(generics.RetrieveAPIView):
    """
    GET /api/v1/yachts/{id}/
    Public endpoint — no auth required.
    """
    permission_classes = [AllowAny]
    serializer_class = YachtDetailSerializer
    lookup_field = "id"

    def get_queryset(self):
        return (
            Yacht.objects.filter(status="active", is_active=True)
            .select_related("region", "departure_port")
            .prefetch_related("media")
        )
```

Create `backend/apps/bookings/urls.py`:
```python
from django.urls import path
from . import views

app_name = "bookings"

urlpatterns = [
    path("yachts/", views.YachtListView.as_view(), name="yacht-list"),
    path("yachts/<uuid:id>/", views.YachtDetailView.as_view(), name="yacht-detail"),
]
```

In `backend/config/urls.py`, add:
```python
path("api/v1/", include("apps.bookings.urls")),
```

**Definition of done:**
- `GET /api/v1/yachts/` returns `{"results": [...], "next": "...", "previous": null}` (cursor pagination shape)
- `GET /api/v1/yachts/?region=EG` filters by region code
- `GET /api/v1/yachts/?capacity_min=10` filters correctly
- `GET /api/v1/yachts/{uuid}/` returns full detail with nested `media`
- Inactive or draft yachts are excluded from both endpoints
- No auth header required for either endpoint
- `python manage.py check` passes

---

#### Task B-4 — Seed fixture for development yachts
**Agent:** api-endpoint-agent
**Depends on:** Task B-1
**Files touched:**
- `backend/apps/bookings/management/commands/seed_yachts.py` — create file
**Estimated tokens:** 3,000

**What to build:**

Create a management command that seeds 3 active yachts in the Egypt region for development/demo purposes. Each yacht should reference Hurghada Marina (port code `HRG`) and the Egypt region. This gives the frontend visible data without needing a UI to create listings.

The command must:
- Be idempotent — identify yachts by name to avoid duplicates
- Create one `YachtMedia` record per yacht with a placeholder image URL (can be a public Unsplash URL for a boat)
- Mark seeded media as `is_primary=True`
- Set all three yachts to `status="active"`

**Definition of done:**
- `python manage.py seed_yachts` creates 3 active yachts
- Re-running the command produces no duplicates
- `GET /api/v1/yachts/` returns the 3 seeded yachts

---

### Phase C — Auth Web UI

**Agent:** nextjs-page-agent
**Can start:** Immediately (stubs exist; does NOT need Phase A complete — can mock API while backend is in progress, but must call the real endpoint in the final implementation)
**Blocks:** Phase D (needs useAuth hook)

---

#### Task C-1 — useAuth hook and AuthContext
**Agent:** nextjs-page-agent
**Depends on:** Nothing (can build against the API contract)
**Files touched:**
- `web/lib/auth.ts` — create API client functions
- `web/lib/AuthContext.tsx` — create React context and provider
- `web/app/[locale]/layout.tsx` — wrap children in AuthProvider
**Estimated tokens:** 8,000

**What to build:**

Create `web/lib/auth.ts` — low-level API calls (no React):
```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export interface AuthTokens {
  access: string
  refresh: string
}

export interface UserProfile {
  id: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  role: 'customer' | 'owner' | 'vendor' | 'admin'
  region: string | null
  preferred_lang: 'ar' | 'en'
  is_verified: boolean
}

// Token storage: memory-only. Refresh token in HttpOnly cookie (managed by the server).
// NEVER write access or refresh tokens to localStorage (ADR-009).
let _accessToken: string | null = null

export function getAccessToken(): string | null { return _accessToken }
export function setAccessToken(token: string): void { _accessToken = token }
export function clearAccessToken(): void { _accessToken = null }

export async function apiRegister(payload: {
  email: string
  password: string
  first_name: string
  last_name: string
}): Promise<{ user: UserProfile; access: string; refresh: string }> {
  const res = await fetch(`${API_BASE}/api/v1/auth/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err?.error?.message ?? 'Registration failed')
  }
  return res.json()
}

export async function apiLogin(payload: {
  email: string
  password: string
}): Promise<AuthTokens> {
  const res = await fetch(`${API_BASE}/api/v1/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err?.error?.message ?? 'Login failed')
  }
  return res.json()
}

export async function apiLogout(refresh: string): Promise<void> {
  await fetch(`${API_BASE}/api/v1/auth/logout/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  })
}

export async function apiGetMe(accessToken: string): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/api/v1/users/me/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Failed to fetch user profile')
  return res.json()
}
```

Create `web/lib/AuthContext.tsx` — React context with `useAuth` hook:
- Store `user: UserProfile | null` and `isLoading: boolean` in state
- Expose `login(email, password)`, `register(payload)`, `logout()` methods
- Access token in module-level variable (memory, not state or localStorage)
- On mount, attempt a silent `GET /users/me/` using any stored token to rehydrate session

Wrap the locale layout's children in `<AuthProvider>`.

**ADR-009 requirement:** Access token lives in a JavaScript variable. Refresh token handling is out of scope for Sprint 2 — the logout call will clear the access token from memory and blacklist on the server. Full refresh rotation is Sprint 3.

**Definition of done:**
- `useAuth()` is callable from any client component
- `login()` calls `POST /api/v1/auth/login/`, stores access token in memory, fetches user via `GET /users/me/`, updates `user` state
- `logout()` calls `POST /api/v1/auth/logout/`, clears in-memory token, sets `user` to null
- `register()` calls `POST /api/v1/auth/register/`, stores access token, sets `user` state
- Access token is NEVER written to `localStorage`, `sessionStorage`, or any cookie
- TypeScript compiles with no errors

---

#### Task C-2 — Login page (real implementation)
**Agent:** nextjs-page-agent
**Depends on:** Task C-1
**Files touched:**
- `web/app/[locale]/(auth)/login/page.tsx` — replace stub with real form
- `web/messages/ar.json` — verify `auth.login.*` keys exist
- `web/messages/en.json` — verify `auth.login.*` keys exist
**Estimated tokens:** 6,000

**What to build:**

Replace the stub with a fully functional login form. The page already has the correct client component directive and imports. Replace the form body with:
- Controlled `email` and `password` inputs
- `onSubmit` calls `useAuth().login(email, password)`
- Loading state disables the submit button and shows the `common.loading` translation
- On success, calls `router.push(\`/${locale}/\`)` (redirect to home; bookings dashboard is Sprint 3)
- On error, shows the error message below the form using the `errors.network` or the API error message
- All labels and button text from `t('auth.login.*')` keys — never hardcoded strings
- Tailwind classes use logical properties: `ps-` `pe-` `ms-` `me-` (not `pl-` `pr-` `ml-` `mr-`)

Required i18n keys (add if missing from ar.json and en.json):
```
auth.login.title, auth.login.email, auth.login.password,
auth.login.submit, auth.login.noAccount, auth.login.registerLink
auth.login.error (generic login error message)
```

**Definition of done:**
- Form submits to `POST /api/v1/auth/login/` and redirects on success
- Loading state is visible during the API call
- Arabic form renders correctly RTL at `/ar/(auth)/login`
- English form renders correctly LTR at `/en/(auth)/login`
- No hardcoded strings — all via `t()` keys
- TypeScript compiles with no errors

---

#### Task C-3 — Register page (real implementation)
**Agent:** nextjs-page-agent
**Depends on:** Task C-1
**Files touched:**
- `web/app/[locale]/(auth)/register/page.tsx` — replace stub with real form
- `web/messages/ar.json` — verify `auth.register.*` keys
- `web/messages/en.json` — verify `auth.register.*` keys
**Estimated tokens:** 6,000

**What to build:**

Replace the stub with a fully functional registration form:
- Fields: `first_name`, `last_name`, `email`, `password`, `password_confirm`
- Client-side validation: all fields required, `password` min 8 chars, `password_confirm` must match
- `onSubmit` calls `useAuth().register({first_name, last_name, email, password})`
- On success, redirect to `/${locale}/` (home)
- On error, display the API error message
- All strings from i18n keys
- Logical CSS properties throughout

Required i18n keys (add if missing):
```
auth.register.title, auth.register.firstName, auth.register.lastName,
auth.register.email, auth.register.password, auth.register.passwordConfirm,
auth.register.submit, auth.register.hasAccount, auth.register.loginLink,
auth.register.passwordMismatch, auth.register.passwordTooShort
```

**Definition of done:**
- Form submits to `POST /api/v1/auth/register/` and redirects on success
- Password mismatch shows validation error without hitting the API
- Arabic layout renders correctly RTL
- TypeScript compiles with no errors

---

#### Task C-4 — Protected route wrapper
**Agent:** nextjs-page-agent
**Depends on:** Task C-1
**Files touched:**
- `web/components/layout/ProtectedRoute.tsx` — create component
- `web/app/[locale]/(dashboard)/bookings/page.tsx` — wrap with ProtectedRoute
- `web/app/[locale]/(dashboard)/profile/page.tsx` — wrap with ProtectedRoute
**Estimated tokens:** 4,000

**What to build:**

Create `web/components/layout/ProtectedRoute.tsx`:
```typescript
'use client'
import { useAuth } from '@/lib/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

interface Props {
  children: React.ReactNode
  locale: string
}

export function ProtectedRoute({ children, locale }: Props) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(`/${locale}/(auth)/login`)
    }
  }, [user, isLoading, router, locale])

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">
    {/* loading spinner — uses common.loading i18n key via a child component */}
  </div>

  if (!user) return null  // redirect is in progress

  return <>{children}</>
}
```

Apply the wrapper to the dashboard stub pages so unauthenticated users are redirected to login.

**Definition of done:**
- Visiting `/ar/(dashboard)/bookings` without being logged in redirects to `/ar/(auth)/login`
- Logged-in users can access the page
- TypeScript compiles with no errors

---

### Phase D — Yacht Listing Web UI

**Agent:** nextjs-page-agent
**Can start:** D-1 can start immediately (uses hardcoded fallback data). Switch to real API once Phase B is done. D-2 depends on D-1.
**Depends on:** Task C-1 (for shared layout components), Phase B complete (for real data)

---

#### Task D-1 — Yacht list page (Server Component, SSR)
**Agent:** nextjs-page-agent
**Depends on:** Nothing from Phase B is strictly required to start — use a typed placeholder until API is live
**Files touched:**
- `web/app/[locale]/yachts/page.tsx` — create Server Component
- `web/app/[locale]/yachts/loading.tsx` — create loading skeleton
- `web/components/yachts/YachtCard.tsx` — create card component
- `web/messages/ar.json` — add `yachts.*` keys
- `web/messages/en.json` — add `yachts.*` keys
**Estimated tokens:** 10,000

**What to build:**

`web/app/[locale]/yachts/page.tsx` must be a Server Component (no `'use client'` directive). It fetches yacht data server-side for SSR and SEO (ADR-003).

```typescript
// No 'use client' — this is a Server Component
import { getTranslations } from 'next-intl/server'
import { YachtCard } from '@/components/yachts/YachtCard'

interface Yacht {
  id: string
  name: string
  name_ar: string
  capacity: number
  price_per_day: string
  currency: string
  yacht_type: string
  primary_image_url: string | null
  port_code: string | null
}

async function fetchYachts(params: {
  region?: string
  port?: string
  capacity_min?: string
  yacht_type?: string
}): Promise<{ results: Yacht[]; next: string | null }> {
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null)) as Record<string, string>
  )
  const res = await fetch(`${api}/api/v1/yachts/?${qs}`, {
    next: { revalidate: 60 },  // ISR: revalidate every 60 seconds
  })
  if (!res.ok) return { results: [], next: null }
  return res.json()
}

export default async function YachtsPage({
  params,
  searchParams,
}: {
  params: { locale: string }
  searchParams: Record<string, string | undefined>
}) {
  const t = await getTranslations('yachts')
  const { locale } = params
  const { results: yachts } = await fetchYachts({
    region: 'EG',
    port: searchParams.port,
    capacity_min: searchParams.capacity_min,
    yacht_type: searchParams.yacht_type,
  })

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
      {yachts.length === 0 ? (
        <p className="text-muted-foreground">{t('empty')}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {yachts.map((yacht) => (
            <YachtCard key={yacht.id} yacht={yacht} locale={locale} />
          ))}
        </div>
      )}
    </main>
  )
}
```

Create `web/components/yachts/YachtCard.tsx` — card showing image, name (use `name_ar` when locale is `ar`), capacity, price, type, and a link to the detail page.

Required i18n keys:
```
yachts.title, yachts.empty, yachts.capacity, yachts.persons,
yachts.per_day, yachts.book_now, yachts.type.*
```

**Definition of done:**
- `GET /ar/yachts` and `GET /en/yachts` return 200 with SSR HTML
- Page renders seeded yachts from the API
- Arabic card names shown on `/ar/yachts` (using `name_ar`)
- English card names shown on `/en/yachts` (using `name`)
- Page is a Server Component — `'use client'` must NOT appear in `yachts/page.tsx`
- `npx tsc --noEmit` passes

---

#### Task D-2 — Yacht detail page (Server Component, SSR)
**Agent:** nextjs-page-agent
**Depends on:** Task D-1
**Files touched:**
- `web/app/[locale]/yachts/[id]/page.tsx` — create Server Component
- `web/components/yachts/MediaGallery.tsx` — create image gallery component
**Estimated tokens:** 8,000

**What to build:**

`web/app/[locale]/yachts/[id]/page.tsx` must be a Server Component. It fetches a single yacht by ID server-side.

```typescript
// No 'use client'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { MediaGallery } from '@/components/yachts/MediaGallery'

async function fetchYacht(id: string) {
  const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
  const res = await fetch(`${api}/api/v1/yachts/${id}/`, {
    next: { revalidate: 120 },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Failed to fetch yacht')
  return res.json()
}

export default async function YachtDetailPage({
  params,
}: {
  params: { locale: string; id: string }
}) {
  const { locale, id } = params
  const t = await getTranslations('yachts')
  const yacht = await fetchYacht(id)
  if (!yacht) notFound()

  const name = locale === 'ar' ? yacht.name_ar : yacht.name
  const description = locale === 'ar' ? yacht.description_ar : yacht.description

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <MediaGallery media={yacht.media} altText={name} />
      <h1 className="text-3xl font-bold mt-6 mb-2">{name}</h1>
      <p className="text-muted-foreground mb-4">{description}</p>
      <div className="flex flex-wrap gap-4 text-sm">
        <span>{t('capacity')}: {yacht.capacity} {t('persons')}</span>
        <span>{yacht.price_per_day} {yacht.currency} / {t('per_day')}</span>
        <span>{yacht.port_name || yacht.port_name_ar}</span>
      </div>
      {/* Book Now button — links to booking flow (Sprint 3) */}
      <a
        href={`/${locale}/bookings/new?yacht=${id}`}
        className="mt-8 inline-block bg-primary text-primary-foreground px-6 py-3 rounded-md font-semibold"
      >
        {t('book_now')}
      </a>
    </main>
  )
}
```

Create `web/components/yachts/MediaGallery.tsx` — simple gallery showing the primary image large, with thumbnails for additional images. Must work server-side (no client-only APIs). If no media, show a placeholder div.

**Definition of done:**
- `GET /ar/yachts/{uuid}` renders with SSR HTML including yacht name and description
- Navigating from the yacht list card link reaches the detail page correctly
- `notFound()` is called when API returns 404
- Gallery shows images from the `media` array
- `npx tsc --noEmit` passes

---

#### Task D-3 — Update home page hero to link to /yachts
**Agent:** nextjs-page-agent
**Depends on:** Task D-1
**Files touched:**
- `web/app/[locale]/page.tsx` — add CTA link
**Estimated tokens:** 1,500

**What to build:**

Update the existing home page scaffold to add a "Browse Yachts" / "استكشف اليخوت" call-to-action link pointing to `/${locale}/yachts`. The link should be styled as a primary button using the design tokens from `globals.css`. All text must use i18n keys.

Required i18n keys (add if missing):
```
home.hero.browseCta
```

**Definition of done:**
- Home page at `/ar` and `/en` shows a link to the yachts list
- Link renders correctly in RTL and LTR
- TypeScript compiles with no errors

---

### Phase E — Tests

**Agent:** test-writer-agent
**Can start:** After Phase A is complete (auth endpoints must exist to test)
**Depends on:** Phase A complete, Phase B complete

---

#### Task E-1 — Auth endpoint tests
**Agent:** test-writer-agent
**Depends on:** Phase A complete
**Files touched:**
- `backend/apps/accounts/tests/__init__.py` — create file
- `backend/apps/accounts/tests/factories.py` — create UserFactory
- `backend/apps/accounts/tests/test_auth.py` — create test file
**Estimated tokens:** 12,000

**What to build:**

Create `backend/apps/accounts/tests/factories.py`:
```python
import factory
from factory.django import DjangoModelFactory
from apps.accounts.models import User, UserRole

class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    password = factory.PostGenerationMethodCall("set_password", "TestPass123!")
    role = UserRole.CUSTOMER
    is_active = True
```

Create `backend/apps/accounts/tests/test_auth.py` with these test cases:

**Register tests:**
- `test_register_success` — POST valid payload, assert 201, assert `user.email` in response, assert `access` and `refresh` tokens present, assert password not in response
- `test_register_duplicate_email` — POST with already-used email, assert 400 with `error.code == "VALIDATION_ERROR"`
- `test_register_missing_password` — POST without password, assert 400
- `test_register_short_password` — POST with 5-char password, assert 400

**Login tests:**
- `test_login_success` — POST valid credentials, assert 200, assert `access` token present
- `test_login_invalid_password` — POST wrong password, assert 401
- `test_login_unknown_email` — POST unknown email, assert 401
- `test_login_token_contains_role` — decode the `access` token, assert `role` claim is present

**Refresh tests:**
- `test_refresh_success` — POST valid refresh token, assert 200, assert new `access` token
- `test_refresh_blacklisted` — logout first, then try refresh with same token, assert 401

**Logout tests:**
- `test_logout_success` — POST refresh token to logout, assert 205

**Me endpoint tests:**
- `test_me_authenticated` — GET with Bearer token, assert 200, assert `email` matches
- `test_me_unauthenticated` — GET without token, assert 401
- `test_me_patch_name` — PATCH `{"first_name": "NewName"}`, assert 200, assert updated value returned

All tests must use `@pytest.mark.django_db` and the `APIClient` fixture. No mocking of the database.

**Definition of done:**
- `pytest apps/accounts/tests/ -v` runs and all tests pass
- Test coverage for `apps/accounts/` is at least 80%
- No test calls `User.objects.create()` directly — all use `UserFactory`

---

#### Task E-2 — Yacht endpoint tests
**Agent:** test-writer-agent
**Depends on:** Phase B complete (Task B-1 through B-3)
**Files touched:**
- `backend/apps/bookings/tests/__init__.py` — create file
- `backend/apps/bookings/tests/factories.py` — create YachtFactory, YachtMediaFactory
- `backend/apps/bookings/tests/test_yachts.py` — create test file
**Estimated tokens:** 8,000

**What to build:**

Create `backend/apps/bookings/tests/factories.py`:
```python
import factory
from factory.django import DjangoModelFactory
from apps.accounts.tests.factories import UserFactory
from apps.bookings.models import Yacht, YachtMedia, YachtType, YachtStatus

class YachtFactory(DjangoModelFactory):
    class Meta:
        model = Yacht

    owner = factory.SubFactory(UserFactory, role="owner")
    region = factory.LazyAttribute(lambda _: Region.objects.filter(code="EG").first())
    name = factory.Sequence(lambda n: f"Test Yacht {n}")
    name_ar = factory.Sequence(lambda n: f"يخت تجريبي {n}")
    capacity = 10
    price_per_day = factory.Faker("pydecimal", left_digits=5, right_digits=2, positive=True)
    currency = "EGP"
    yacht_type = YachtType.MOTOR
    status = YachtStatus.ACTIVE
```

Create `backend/apps/bookings/tests/test_yachts.py` with:

**Yacht list tests:**
- `test_list_returns_active_only` — create one active and one draft yacht, assert list returns only the active one
- `test_list_no_auth_required` — assert GET returns 200 without Authorization header
- `test_list_filter_by_region` — create yachts in two regions, filter by EG, assert only EG yachts returned
- `test_list_filter_by_capacity` — create yachts with capacity 5 and 15, filter capacity_min=10, assert only the 15-capacity yacht returned
- `test_list_uses_cursor_pagination` — assert response has `results` key and `next` key (not `count`)

**Yacht detail tests:**
- `test_detail_returns_media` — create yacht with two media records, assert detail response includes `media` array of length 2
- `test_detail_not_found` — GET with random UUID, assert 404 with `error.code == "NOT_FOUND"`
- `test_detail_draft_returns_404` — create draft yacht, assert GET returns 404 (draft is not public)
- `test_detail_no_auth_required` — assert GET returns 200 without token

**Definition of done:**
- `pytest apps/bookings/tests/ -v` runs and all tests pass
- No test creates fixtures that depend on data not created in the test itself (no relying on `seed_yachts`)
- Tests for regions requiring the Egypt `Region` row use `get_or_create(code="EG")`

---

### Phase F — Security and RTL Review

**Agent:** security-audit-agent (F-1), rtl-audit-agent (F-2)
**Can start:** After Phase A and Phase C are complete
**These reviews must pass before the sprint is considered done**

---

#### Task F-1 — Security audit of auth endpoints
**Agent:** security-audit-agent
**Depends on:** Phase A complete
**Files reviewed:**
- `backend/apps/accounts/views.py`
- `backend/apps/accounts/serializers.py`
- `backend/apps/accounts/urls.py`
- `backend/config/settings/base.py` (JWT section)
**Estimated tokens:** 10,000

**Checklist the security agent must verify:**

1. JWT algorithm is RS256, not HS256
2. Access token lifetime is 15 minutes (not more)
3. Refresh tokens are blacklisted on logout (not just ignored)
4. Register endpoint does not return password hash in any field
5. Login endpoint does not reveal whether an email exists (same error for wrong email vs wrong password — this is acceptable for UX but note the tradeoff)
6. `AllowAny` is only on register, login, refresh, and logout — not on `/users/me/`
7. No raw SQL in any accounts app file
8. Password validation: minimum length enforced in the serializer
9. `CORS_ALLOWED_ORIGINS` does not include `*` in any settings file
10. JWT keys are loaded from file path (not hardcoded in settings)

**Definition of done:**
- Security agent produces a written finding report as a comment block at the top of `backend/apps/accounts/views.py`
- Any critical findings (items 1–5) must be fixed before sprint closes
- Non-critical findings are recorded in `HANDOFFS.md` for Sprint 3

---

#### Task F-2 — RTL audit of auth and yacht web pages
**Agent:** rtl-audit-agent
**Depends on:** Phase C and Phase D complete
**Files reviewed:**
- `web/app/[locale]/(auth)/login/page.tsx`
- `web/app/[locale]/(auth)/register/page.tsx`
- `web/app/[locale]/yachts/page.tsx`
- `web/app/[locale]/yachts/[id]/page.tsx`
- `web/components/yachts/YachtCard.tsx`
**Estimated tokens:** 6,000

**Checklist the RTL agent must verify:**

1. No use of `ml-`, `mr-`, `pl-`, `pr-` Tailwind classes — must use `ms-`, `me-`, `ps-`, `pe-`
2. No inline styles with `left:` or `right:` CSS properties — must use `inset-inline-start` / `inset-inline-end`
3. Form inputs align correctly in RTL (text aligns right, icons on correct side)
4. Yacht card price and capacity labels read naturally in RTL
5. No hardcoded Arabic strings in JSX — all via `t()` calls
6. `dir` attribute is set at the layout level (already done in Sprint 1 layout — confirm it propagates)

**Definition of done:**
- All 6 checklist items pass for all 5 files reviewed
- Any violations are fixed in the same PR before merge
- RTL agent adds a brief note to `HANDOFFS.md` confirming the audit passed

---

## Agent Coordination Notes

### Dependency order for execution

```
Week 1 (Days 1-5):
  Day 1-2: Phase A (api-endpoint-agent) runs first — auth endpoints
            Phase B-1, B-2 (django-model-agent) runs in parallel with Phase A
  Day 2-3: Phase C-1 (nextjs-page-agent) — AuthContext and useAuth hook
            Can start against the API contract without waiting for Phase A to finish
  Day 3-4: Phase A done → Phase C-2, C-3 (login/register pages can call real API)
            Phase B-3, B-4 (api-endpoint-agent) — yacht endpoints (after B-1, B-2 done)
  Day 4-5: Phase D (nextjs-page-agent) — yacht web pages
            Phase C-4 (protected routes)

Week 2 (Days 6-8):
  Day 6-7: Phase E (test-writer-agent) — runs after A and B are both complete
  Day 7-8: Phase F-1 (security-audit-agent), Phase F-2 (rtl-audit-agent)
            These run in parallel
  Day 8:   Fix any findings from Phase F, final smoke test, HANDOFFS update
```

### File conflict zones

The following files are touched by more than one agent. Agents must coordinate in this order:

| File | First writer | Second writer | Resolution |
|------|-------------|---------------|------------|
| `backend/apps/accounts/urls.py` | api-endpoint-agent (A-1) | api-endpoint-agent (A-3) | Sequential — A-3 follows A-1 |
| `backend/apps/accounts/views.py` | api-endpoint-agent (A-1) | api-endpoint-agent (A-4) | Sequential — A-4 follows A-1 |
| `backend/config/urls.py` | api-endpoint-agent (A-1) | api-endpoint-agent (B-3) | B-3 adds a new `include()` line only |
| `web/messages/ar.json` | nextjs-page-agent (C-2) | nextjs-page-agent (D-1) | D-1 adds new top-level `yachts` key — no conflict |
| `web/messages/en.json` | nextjs-page-agent (C-2) | nextjs-page-agent (D-1) | Same |

### Important implementation notes for agents

1. The `User` model uses **email** as the login identifier (`USERNAME_FIELD = "email"`). The Sprint 2 scope document mentioned phone number — ignore that. Email is the source of truth.
2. The `CustomTokenObtainPairSerializer` in `serializers.py` already exists and must be used for the login view. Do not create a second token serializer.
3. Yacht models go in `backend/apps/bookings/models.py`, NOT a new `listings` app. The bookings app stub file explicitly reserves this location.
4. The `django-filter` package is in `requirements/base.txt` (from Sprint 1). No new packages are needed for `YachtFilter`.
5. `rest_framework_simplejwt.token_blacklist` must be in `INSTALLED_APPS` for logout to work. Verify and add if missing — this requires a migration (`python manage.py migrate token_blacklist`).
6. All new Django migrations must be generated with `makemigrations` and committed. No hand-written migrations except the extensions migration (already done in Sprint 1).
7. The `web/` project uses the directory layout `web/app/[locale]/...` (not `web/src/app/`). The actual Sprint 1 delivery used `web/app/` not `web/src/app/` — agents must read the actual directory before writing paths.

---

## Token Budget

| Agent | Phase | Estimated tokens | Purpose |
|-------|-------|-----------------|---------|
| api-endpoint-agent | A | 15,000 | 4 auth endpoints (register, login, refresh, logout, /me) |
| django-model-agent | B-1, B-2 | 13,000 | Yacht + YachtMedia models, serializers, admin |
| api-endpoint-agent | B-3, B-4 | 11,000 | Yacht list/detail views, filter, seed command |
| nextjs-page-agent | C + D | 43,500 | AuthContext, login/register pages, protected routes, yacht list/detail pages, home CTA |
| test-writer-agent | E | 20,000 | Auth tests (12K) + yacht tests (8K) |
| security-audit-agent | F-1 | 10,000 | Auth endpoint security review |
| rtl-audit-agent | F-2 | 6,000 | RTL audit of 5 pages |
| **Total** | | **118,500** | |
| **Sprint 1 actual** | | ~74,500 est | Carried forward — actuals TBD |
| **Cumulative estimate** | | ~193,000 | Of 500,000 sprint budget |
| **Budget remaining** | | ~307,000 | Two sprints of headroom |

---

## Risk Flags

- The `token_blacklist` app from `djangorestframework-simplejwt` requires its own migration table. If it is not in `INSTALLED_APPS` in `base.py`, the logout endpoint will fail. The security-audit-agent must check this as item 0 before reviewing other security concerns.
- The Sprint 1 User model uses `first_name` and `last_name` as separate fields, not a single `full_name` field. The `UserSerializer` exposes a computed `full_name` read-only field. The register serializer must accept `first_name` + `last_name` as separate inputs — not a single `full_name` field.
- The web project is at `web/app/[locale]/` not `web/src/app/[locale]/`. Any agent that reads `SPRINT-1.md` and takes the described structure literally will write to the wrong path. Always read the actual filesystem before writing.
- `django-filter` must be added to `REST_FRAMEWORK["DEFAULT_FILTER_BACKENDS"]` in `base.py` for the `YachtFilter` to work automatically. Check if it was set in Sprint 1 — if not, api-endpoint-agent must add it when building the yacht views.
- No OTP/phone verification is in Sprint 2 scope. The User model has `is_verified` field but it will not be set to `True` on registration. This is intentional — OTP is Sprint 3.
- The "Book Now" button on the yacht detail page must link to `/[locale]/bookings/new?yacht={id}` but that page does not exist yet (Sprint 3). This is expected — it will be a dead link until Sprint 3.

---

## Definition of Sprint Done

- [ ] `POST /api/v1/auth/register/` returns 201 with user + JWT tokens
- [ ] `POST /api/v1/auth/login/` returns 200 with JWT tokens containing custom claims
- [ ] `POST /api/v1/auth/refresh/` rotates tokens correctly
- [ ] `POST /api/v1/auth/logout/` blacklists refresh token
- [ ] `GET /api/v1/users/me/` returns authenticated user profile
- [ ] `PATCH /api/v1/users/me/` updates mutable profile fields
- [ ] `GET /api/v1/yachts/` returns cursor-paginated list with filter support
- [ ] `GET /api/v1/yachts/{id}/` returns full yacht detail with media
- [ ] `python manage.py seed_yachts` seeds 3 demo yachts
- [ ] Login page at `/ar/(auth)/login` and `/en/(auth)/login` calls real API and redirects on success
- [ ] Register page at `/ar/(auth)/register` and `/en/(auth)/register` calls real API and redirects on success
- [ ] Unauthenticated access to dashboard pages redirects to login
- [ ] Yacht list page at `/ar/yachts` and `/en/yachts` is SSR, shows real API data
- [ ] Yacht detail page at `/ar/yachts/{id}` and `/en/yachts/{id}` is SSR, shows full detail
- [ ] Home page hero has a working link to `/[locale]/yachts`
- [ ] All auth tests pass (`pytest apps/accounts/tests/ -v`)
- [ ] All yacht tests pass (`pytest apps/bookings/tests/ -v`)
- [ ] Security audit of auth endpoints is complete — no critical findings outstanding
- [ ] RTL audit passes for all new pages — no logical CSS violations
- [ ] `python manage.py check` passes
- [ ] `npx tsc --noEmit` passes in `web/`
- [ ] `HANDOFFS.md` updated with Sprint 2 → Sprint 3 handoff entry
- [ ] `AGENT-COSTS.md` updated with Sprint 2 token row
