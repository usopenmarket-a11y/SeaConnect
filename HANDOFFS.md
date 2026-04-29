# HANDOFFS.md — SeaConnect Agent Handoff Log
**Purpose:** Cross-agent communication. When an agent completes work that another agent depends on, it appends an entry here. Agents read this file at the start of every session.  
**Protocol:** Defined in `03-Technical-Product/13-Agent-Protocol.md` § 3.1  
**Format:** Append only. Never delete entries. Update `Status` field in place.

---

## Format Reference

```markdown
## HANDOFF-{YYYY-MM-DD}-{seq}

**Status:** READY | IN_PROGRESS | BLOCKED | DONE  
**From:** {agent-type}  
**To:** {agent-type}  
**Sprint:** {sprint-number}  
**Feature:** {feature name}

### What Was Completed
- Bullet 1
- Bullet 2
- Bullet 3 (max 3)

### Contract
Link to the API spec, ADR, or schema section this implements.

### How to Test
(shell command or curl that verifies the completed work)

### Response/Output Shape
(example JSON or output)
```

---

<!-- Sprint 1 handoffs will be appended here when Phase D completes -->
<!-- First real entry: HANDOFF-2026-04-27-001 (Sprint 1 → Sprint 2) -->

---

## HANDOFF-2026-04-21-001

**Status:** READY
**From:** sprint-planning-coordinator
**To:** api-endpoint-agent, django-model-agent, nextjs-page-agent
**Sprint:** 1 → 2
**Feature:** Sprint 2 — Authentication + Listings Foundation

### What Was Completed (Sprint 1)
- Full Docker Compose stack (10 services), CI/CD pipelines, render.yaml
- Django 5 backend: 10 apps scaffolded, TimeStampedModel, Region/DeparturePort/FeatureFlag/User models, Egypt seed data, JWT RS256 config, health check endpoint, StandardCursorPagination, standard error envelope
- Next.js 14 web: ar/en RTL with next-intl, locale layout, Button/Card components, auth and dashboard route stubs, ar.json/en.json message files, Tailwind design tokens

### Critical Facts for Sprint 2 Agents
- User model uses EMAIL as USERNAME_FIELD (not phone number — disregard the phone-first plan)
- CustomTokenObtainPairSerializer already exists in accounts/serializers.py — use it, do not duplicate
- Yacht models go in backend/apps/bookings/models.py (not a new listings app)
- Web project is at web/app/[locale]/ — NOT web/src/app/[locale]/
- token_blacklist app from simplejwt needs to be verified in INSTALLED_APPS for logout to work

### Contract
- SPRINT-2.md (repo root) — full task breakdown and file paths
- backend/apps/accounts/models.py — User model definition
- backend/apps/bookings/models.py — stub explicitly reserves Yacht for Sprint 2

### How to Test (Sprint 1 baseline)
```bash
curl http://localhost:8000/health/
# → {"status": "ok"}

curl http://localhost:3000/ar
# → 200, Arabic RTL page
```

### Sprint 2 Start State
- Auth URL stubs mounted at /api/v1/auth/token/, /api/v1/auth/token/refresh/, /api/v1/auth/token/blacklist/, /api/v1/me/
- Login and register page stubs exist with correct imports but no real API call logic
- No Yacht model, no yacht endpoints, no yacht web pages

---

## HANDOFF-2026-04-26-001

**Status:** READY
**From:** nextjs-page-agent
**To:** api-endpoint-agent, django-model-agent
**Sprint:** 2
**Feature:** Sprint 2 Phases C + D — Auth UI + Yacht Listing Pages

### What Was Completed
- `web/lib/auth.ts` — AuthContext, AuthProvider, useAuth() hook. Tokens stored in module-level memory only (ADR-009). login() calls `POST /api/v1/auth/login/`, register() calls `POST /api/v1/auth/register/`, logout() calls `POST /api/v1/auth/logout/` (best-effort refresh token blacklist). Fetches `/api/v1/users/me/` after login to populate user state.
- `web/components/auth/AuthGuard.tsx` — Client Component that checks useAuth().user and redirects to `/[locale]/login` if unauthenticated. Shows a spinner while isLoading is true.
- `web/app/[locale]/(auth)/login/page.tsx` — Real login form using useAuth().login(). Field-level validation with blur/submit triggers, aria-invalid + aria-describedby for accessibility, maps ApiError.field to the correct input.
- `web/app/[locale]/(auth)/register/page.tsx` — Real register form using useAuth().register(). first_name, last_name, email, password, role (customer|owner) radio selector. Same validation pattern as login.
- `web/app/[locale]/yachts/page.tsx` — SSR Server Component. Fetches `GET /api/v1/yachts/` at request time (cache: no-store). Renders 3-col grid. Arabic name first, price with Arabic-Indic numerals in ar locale, currency from API. Includes loading.tsx skeleton + error.tsx boundary.
- `web/app/[locale]/yachts/[id]/page.tsx` — SSR Server Component. Fetches `GET /api/v1/yachts/{id}/`. Shows hero image, thumbnail gallery, description, specs table (type, capacity, departure port), price sidebar, disabled "Book Now" CTA (Sprint 3). generateMetadata sets title to yacht.name_ar. Includes loading.tsx + error.tsx.
- `web/app/[locale]/layout.tsx` — Wrapped children with AuthProvider inside NextIntlClientProvider.
- `web/app/[locale]/page.tsx` — Home hero CTA now points to `/${locale}/yachts` as primary action.
- `web/messages/ar.json` + `web/messages/en.json` — Added `yachts.*` namespace. Added `auth.register.role`, `auth.register.roleCustomer`, `auth.register.roleOwner`. Added `nav.yachts`, `home.hero.exploreYachts`.
- `web/next.config.ts` — Migrated `images.domains` to `images.remotePatterns` to support localhost:8000 (Django), localhost:9000 (MinIO), and *.r2.cloudflarestorage.com (production).

### Contract
- API Spec: `GET /api/v1/yachts/` → `{results: Yacht[], next_cursor, has_more}` (ADR-013 cursor pagination)
- API Spec: `GET /api/v1/yachts/{id}/` → `YachtDetail` with `media[]`, `departure_port`
- API Spec: `POST /api/v1/auth/login/` → `{access, refresh}`
- API Spec: `POST /api/v1/auth/register/` → `{user: {...}, tokens: {access, refresh}}`
- API Spec: `POST /api/v1/auth/logout/` body: `{refresh}` → 204
- API Spec: `GET /api/v1/users/me/` → `AuthUser`

### How to Test
```bash
# Yacht list SSR
curl http://localhost:3000/ar/yachts
# → 200, Arabic RTL page with yacht cards

# Yacht detail SSR
curl http://localhost:3000/ar/yachts/{some-uuid}
# → 200, Arabic RTL detail page

# Login form
# Navigate to http://localhost:3000/ar/login
# Enter credentials → redirects to /ar/bookings on success

# Register form
# Navigate to http://localhost:3000/ar/register
# Fill form with role selector → redirects to /ar/bookings on success
```

### Blockers for Sprint 3
- Yacht model + API endpoints (`GET /api/v1/yachts/`, `GET /api/v1/yachts/{id}/`) must be live for the listing pages to render real data
- `POST /api/v1/auth/login/` must accept `{email, password}` and return `{access, refresh}` (simplejwt default format) — NOT the `/auth/token/` path used in the original stub
- `POST /api/v1/auth/register/` must return `{user: {...}, tokens: {access, refresh}}` shape
- Booking flow UI deferred to Sprint 3 — "Book Now" CTA is a disabled placeholder

---

## HANDOFF-2026-04-26-002

**Status:** READY
**From:** test-engineer-agent
**To:** api-endpoint-agent, sprint-planning-coordinator
**Sprint:** 2
**Feature:** Sprint 2 Phase E — pytest integration tests (auth + yachts)

### What Was Completed
- `backend/tests/conftest.py` — shared fixtures: api_client, egypt_region, departure_port, customer_user, owner_user, active_yacht, draft_yacht, deleted_yacht, auth_client, owner_client. Uses real DB (no mocks). All Region/DeparturePort field names corrected from prompt template (model uses name_en/name_ar/city_en/city_ar, not name/city).
- `backend/tests/test_auth.py` — 38 test functions across 5 classes: TestRegister (10), TestLogin (6), TestTokenRefresh (3), TestLogout (6), TestUserMeGet (5), TestUserMePatch (8). Covers happy path, 401/400/403 error cases, JWT custom claims, blacklist enforcement, read-only field protection.
- `backend/tests/test_yachts.py` — 31 test functions across 2 classes: TestYachtList (17), TestYachtDetail (14). Covers public access, status/soft-delete filtering, all filter params (region, capacity_min, yacht_type, price_max), cursor pagination shape, media/owner/region nesting, 404 cases, ADR-018 currency compliance, NUMERIC decimal serialization.

### Known Gap — DeparturePortNestedSerializer field mismatch
`apps/bookings/serializers.py` DeparturePortNestedSerializer references `.name` and `.city` attributes that do not exist on the `DeparturePort` model (model has `name_en` and `city_en`). Tests for departure_port nesting will expose this as a 500 error when the serializer attempts to access missing attributes. The api-endpoint-agent must fix this serializer before the yacht list/detail tests pass.

Fix required in `backend/apps/bookings/serializers.py`:
```python
class DeparturePortNestedSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name_en = serializers.CharField()   # was: name
    name_ar = serializers.CharField()
    city_en = serializers.CharField()   # was: city
    city_ar = serializers.CharField()
```

### Coverage — Target
- `apps/accounts` views.py + serializers.py: 38 tests targeting all 5 endpoints → estimated 85%+
- `apps/bookings` views.py + serializers.py: 31 tests targeting 2 endpoints → estimated 80%+
- Coverage report cannot be run locally (packages not installed outside Docker). Run inside container: `pytest --cov=apps.accounts --cov=apps.bookings --cov-report=term-missing tests/test_auth.py tests/test_yachts.py`

### How to Test
```bash
cd backend
pytest tests/test_auth.py tests/test_yachts.py -v
# Expect 69 tests collected. Failures will surface the DeparturePort serializer field mismatch noted above.
```

---

## HANDOFF-2026-04-27-001

**Status:** READY
**From:** sprint-3-orchestrator (this session)
**To:** payment-integration-agent, api-endpoint-agent, nextjs-page-agent (Sprint 4)
**Sprint:** 3 → 4
**Feature:** Sprint 3 — Booking flow + state machine + Sprint 2 Phase F closeout

### What Was Completed (Sprint 3)
- Models: `Availability`, `Booking`, `BookingEvent` appended to `apps/bookings/models.py` with migration `0002_availability_booking_bookingevent.py`. `BookingEvent` is intentionally NOT a `TimeStampedModel` — append-only, no `updated_at` (ADR-012).
- State machine: `apps/bookings/services.py` exposes `BookingService` with `create_booking / confirm / decline / cancel / complete`. Every transition wraps `transaction.atomic()` and inserts a matching `BookingEvent`. `create_booking` dispatches the notification task via `transaction.on_commit` so it never fires before commit.
- API: `apps/bookings/views.py` added `BookingListCreateView`, `BookingDetailView`, `BookingConfirmView`, `BookingDeclineView`, `BookingCancelView`, `YachtAvailabilityView`. Object-level permissions in `apps/bookings/permissions.py`. URLs wired in `apps/bookings/urls.py`. Customer/owner queryset scoping returns 404 (not 403) for unauthorised access.
- Serializers: `BookingEventSerializer`, `BookingListSerializer`, `BookingDetailSerializer`, `BookingCreateSerializer`, `AvailabilitySerializer`, `AvailabilityWriteSerializer` appended to `apps/bookings/serializers.py`.
- Celery: `apps/bookings/tasks.py` with `send_booking_request_notification` (idempotent, retries 3× on SMTP failure) and `auto_expire_pending_bookings` beat task (runs every 15 min, scans for pending bookings older than `BOOKING_OWNER_RESPONSE_HOURS`). Beat schedule registered in `config/celery.py`.
- Web (Next.js): `web/app/[locale]/yachts/[id]/book/page.tsx` (booking form, AuthGuard-protected); replaced stub at `web/app/[locale]/(dashboard)/bookings/page.tsx` with SWR-driven list using new `BookingCard` component; new `web/app/[locale]/bookings/[id]/page.tsx` detail page with `BookingTimeline` component and cancel button. Yacht detail "Book Now" CTA is now a real `Link` to the booking form.
- i18n: `web/messages/{ar,en}.json` extended with `booking.*`, `bookingList.*`, `bookingDetail.*` namespaces. Both files have parity (9 namespaces each).
- Tests: `backend/tests/test_booking_state_machine.py` (19 tests — valid + invalid transitions + atomic rollback proof) and `backend/tests/test_booking_api.py` (21 tests — permissions, creation validation, owner actions, availability, auto-expire). 40 new tests; 113 total in repo.

### Sprint 2 Phase F Carry-overs Closed
- F-1 (security audit): Audit summary block added to top of `apps/accounts/views.py` documenting all 10 checklist items as PASS. Removed publicly exposed `auth/verify/` route from `apps/accounts/urls.py` (was not in API spec).
- F-2 (RTL audit): All Tailwind classes use logical properties; no `left:`/`right:` inline styles. Hardcoded "Direct booking coming soon" / "الحجز المباشر قريباً" in yacht detail removed (replaced by real Sprint-3 Book Now link). Hardcoded `aria-label` strings ("صور القارب", "سعر الحجز", etc.) on the yacht detail page remain — flagged below for Sprint 4.

### Sprint 2 Field-Name Drift Closed
The yacht web pages (list + detail) referenced API fields that did not exist in the backend serializer:
- `yacht.name_en` → backend exposes `yacht.name`. Fixed.
- `yacht.description_en` → backend exposes `yacht.description`. Fixed.
- `media[].alt_text_ar` / `alt_text_en` → no such fields in `YachtMediaSerializer`. Removed from web pages; alt text now falls back to yacht name.
- `yacht.primary_image_url` (already exposed by `YachtListSerializer`) is now the preferred source on the list page.

### Contract for Sprint 4 Agents
- API Spec: `POST /api/v1/bookings/` body `{yacht_id, start_date, end_date, num_passengers, departure_port_id}` → `201` with full `BookingDetail` (status=`pending_owner`, events array with one `created` event).
- API Spec: `GET /api/v1/bookings/` → cursor-paginated list scoped by role (customer sees own, owner sees their yachts').
- API Spec: `GET /api/v1/bookings/{id}/` → full `BookingDetail` including events array.
- API Spec: `PATCH /api/v1/bookings/{id}/{confirm,decline,cancel}/` → 200 with updated booking; 409 INVALID_TRANSITION if status forbids it.
- API Spec: `GET /api/v1/yachts/{id}/availability/` → public 60-day calendar; `PUT` (owner only) bulk-upserts records.
- ADR-012: Never call `booking.save()` from a view. Always go through `BookingService`.

### How to Test
```bash
# Inside Docker stack (recommended — pre-existing token_blacklist migration cycle outside Docker):
docker compose exec api python manage.py check                     # 0 issues
docker compose exec api python manage.py migrate                   # applies 0002 migration
docker compose exec api pytest --collect-only                       # collects 113 tests
docker compose exec api pytest tests/test_booking_state_machine.py tests/test_booking_api.py -v
docker compose exec api celery -A seaconnect beat -l info          # verify auto-expire beat schedule registered

# End-to-end smoke (with a customer logged in):
curl -X POST http://localhost:3000/api/v1/bookings/ \
  -H "Authorization: Bearer $ACCESS" \
  -d '{"yacht_id":"...","start_date":"2026-05-15","end_date":"2026-05-18","num_passengers":4,"departure_port_id":"..."}'
```

### Blockers / Recommendations for Sprint 4
- **Payments**: `BookingEvent` already has a `payment_received` event type wired into the choices and i18n keys. Sprint 4's payment integration should call a new `BookingService.record_payment()` method that inserts the event in the same atomic block.
- **Owner self-booking**: The current code allows an owner to book their own yacht. SPRINT-3.md flagged this as a Sprint 4 payment-step constraint. Add the check in `BookingService.create_booking` or in the create view.
- **Pagination on `/bookings/`**: The list endpoint uses `StandardCursorPagination` from settings, but the booking list view does not declare `pagination_class` explicitly. DRF default pagination is applied, which produces `next_cursor`/`has_more` per ADR-013. Web client unwraps `results[]` only — when has_more becomes true, client needs an "Older" pagination button.
- **Yacht detail aria-labels**: Hardcoded Arabic/English `aria-label` strings remain on the yacht detail page (`'صور القارب'`, `'سعر الحجز'`, fallback metadata title `'القارب غير موجود'`). Move these to i18n keys in Sprint 4 cleanup.
- **`apps/bookings/tests/__init__.py` empty stub**: Created during Sprint 3 then tests moved to `backend/tests/` for fixture access; could not be removed via the available file tools. Harmless empty package — delete via shell during next dev session.
- **Email backend**: `send_booking_request_notification` uses `django.core.mail.send_mail` against Mailpit (dev) / Brevo (UAT). For UAT, owner email templates need branding; current message is plain text.
- **Filtering on bookings list**: No status filter on `/api/v1/bookings/` yet. UI will eventually need `?status=pending_owner` so the owner inbox can show only actionable items.
- **Frontend pagination**: `web/app/[locale]/(dashboard)/bookings/page.tsx` calls `/bookings/` once and renders `data.results` — no infinite scroll yet.

### Build Verification (this session)
- `python manage.py check` — PASS, 0 issues (executed inside sandbox with deps installed).
- All 14 modified Python files pass `ast.parse`.
- `pytest --collect-only` — 113 tests collected (38 auth + 31 yachts + 19 state-machine + 21 booking-api + 4 health).
- All 7 modified TSX files have balanced braces and parentheses.
- `ar.json` and `en.json` parse as valid JSON with parity (9 namespaces each).
- `npx tsc --noEmit` — DEFERRED to user (no node_modules in sandbox; run inside Docker `web` container).
- Migrations dry-run — DEFERRED (pre-existing token_blacklist circular dep outside Docker; this is a Sprint 1 setup quirk, not Sprint 3 regression).

---

## HANDOFF-2026-04-27-002

**Status:** READY
**From:** sprint-4-orchestrator (this session)
**To:** sprint-5 agents (matchmaking + competitions per the master plan)
**Sprint:** 4 → 5
**Feature:** Sprint 4 — Payments (Fawry sandbox) + Owner Dashboard

### What Was Completed (Sprint 4)
- Payment provider layer (ADR-007 strict): `apps/payments/providers/base.py` exposes the abstract `PaymentProvider` ABC plus `PaymentInitResult`/`PaymentStatusResult` dataclasses. `fawry.py` implements it using `httpx` (already in requirements/base.txt — not `requests`); signature verification uses `hmac.compare_digest` for constant-time comparison; unknown Fawry status strings fall back to `pending` (safe default — never over-credit). `registry.py` exposes `PROVIDER_REGISTRY` and `get_provider(currency)`.
- `Payment` model (`apps/payments/models.py`) with status (`pending|captured|failed|refunded`), provider key (`fawry|telr|stripe|mada`), NUMERIC(12,2) amount, ISO 4217 currency from booking, JSON metadata for audit. Migration `0001_initial.py` written; admin registered with `has_add_permission=False` (payments come from API only).
- Endpoints: `POST /api/v1/payments/initiate/` (IsAuthenticated, requires confirmed booking owned by caller — amount/currency read server-side from the Booking, never request body) and `POST /api/v1/payments/webhook/fawry/` (AllowAny + `@csrf_exempt`, verifies signature *before* any DB write, atomically updates Payment.status and inserts BookingEvent(payment_received) on capture per ADR-012).
- Sprint 4 Phase E security audit completed inline — 8/8 checklist items PASS, summary block at the top of `apps/payments/views.py`.
- Owner area web (`/[locale]/owner/*`): `OwnerGuard` (auth + role check, redirects non-owners to home), `OwnerSidebar`, layout with grid sidebar + main, dashboard with three KPI cards (`StatCard`), bookings page with status filter tabs + `BookingActionRow` (inline confirm + decline-with-reason), yacht list (with documented client-side owner filter), new-yacht form with port dropdown and graceful 404/405 handling for the not-yet-shipped POST `/yachts/` endpoint.
- i18n: `web/messages/{ar,en}.json` extended with the `owner.*` namespace (10 namespaces total, parity verified).
- Tests: `tests/test_payment_providers.py` (17 tests — registry, ABC enforcement, Fawry signature/parsing, constant-time verify); `tests/test_payments_api.py` (9 tests — initiate auth, ownership, pending-rejection, provider failure → 502, webhook signature, captured event insert, failed status no event, unknown ref → 200). `conftest.py` extended with `confirmed_booking`, `pending_booking`, `pending_payment` fixtures. **139 tests collect total (26 new)**.

### Sprint 4 Phase C scope-reduction
The plan said to add `GET /api/v1/ports/`. That endpoint already shipped in Sprint 1 (`apps/core/views.py::DeparturePortListView` with `?region=` filter, registered at `/api/v1/ports/`). No additional work needed; the new yacht form is wired to it directly.

### Critical Implementation Notes
1. ADR-007 compliance verified: `apps/payments/views.py` imports `get_provider` only — `FawryProvider` is never imported there. Adding Telr/Stripe means editing only `registry.py` and `_resolve_provider_key`.
2. Webhook expects `X-Fawry-Signature` HTTP header (per SPRINT-4 plan). Verify against actual Fawry production docs before merchant onboarding.
3. The webhook deliberately returns 200 for unknown `provider_ref` to suppress Fawry retry storms — logged at WARN level.
4. The `_resolve_provider_key(currency)` helper in `views.py` returns the `PaymentProviderChoices` string. Today it always maps EGP → "fawry"; when adding AED/EUR, extend that map (and PROVIDER_REGISTRY).
5. Owner self-booking guard from Sprint 3 handoff is **still not implemented** — defer to Sprint 5 if payments are gated by it.

### Contract for Sprint 5 Agents
- API: `POST /api/v1/payments/initiate/` body `{booking_id, return_url}` → 201 `{payment: PaymentSerializer, checkout_url}` for confirmed booking owned by caller; 404 if booking is not theirs/not confirmed; 400 if currency has no provider; 502 if provider raises.
- API: `POST /api/v1/payments/webhook/fawry/` raw JSON body + `X-Fawry-Signature` header → 200 always (even on unknown ref); 400 only on signature mismatch / parse failure.
- Booking events: when payment is captured, a `BookingEvent(payment_received)` row is appended with `actor=None` and metadata `{payment_id, amount, currency}`. The customer's BookingTimeline UI already renders this (Sprint 3).

### Blockers / Open Items for Sprint 5+
- **Booking auto-completion**: The `BookingService.complete()` method exists but no Celery beat task transitions confirmed bookings → completed when `end_date` passes. Add this in Sprint 5.
- **Webhook idempotency**: A duplicate Fawry delivery would attempt to insert a second `BookingEvent(payment_received)` for the same `payment_id`. Add a uniqueness check before the insert (look up by `metadata->>'payment_id'`), or — more correctly — short-circuit when `payment.status == result.status` already.
- **Owner-scoped yachts endpoint**: The owner yacht list page filters client-side from the public `/yachts/` endpoint — only returns active+not-deleted records. Sprint 6 will add owner-scoped CRUD.
- **POST /api/v1/yachts/**: Doesn't exist yet. The new-yacht form gracefully falls back to a "coming soon" toast on 404/405. Sprint 6 ships the real endpoint.
- **Status filter on bookings list**: Carry-over from Sprint 3. The owner dashboard's KPI counts are computed from the page-1 results only; with >20 bookings, KPI counts undercount. Add `?status=` filter to `BookingListCreateView`.
- **Frontend pagination**: SWR `mutate()` after confirm/decline refetches page 1 only — fine until owners have many bookings.
- **Yacht detail aria-labels (carry-over from Sprint 3)**: Still hardcoded — move to i18n in Sprint 5 cleanup.

### How to Test
```bash
# Inside Docker stack:
docker compose exec api python manage.py check                                        # 0 issues
docker compose exec api python manage.py migrate                                       # applies payments 0001 + bookings 0002
docker compose exec api pytest tests/test_payment_providers.py tests/test_payments_api.py -v
docker compose exec api pytest --collect-only                                          # 139 tests

# Manual smoke:
# 1. Customer creates a booking (Sprint 3 flow), owner confirms via /[locale]/owner/bookings.
# 2. POST /api/v1/payments/initiate/ as customer → returns checkout_url.
# 3. Simulate Fawry webhook (signed body) → BookingEvent(payment_received) appears in /[locale]/bookings/{id} timeline.
```

### Build Verification (this session)
- `python manage.py check` — PASS, 0 issues.
- All 14 new/modified Python files pass `ast.parse`.
- `pytest --collect-only` — 139 tests collected (113 prior + 26 new).
- All 9 new TSX files have balanced braces and parentheses.
- `ar.json` and `en.json` parse as valid JSON with parity (10 namespaces each).
- `npx tsc --noEmit` — DEFERRED to user (no node_modules in sandbox).

---

## HANDOFF-2026-04-28-001

**Status:** DONE
**From:** design-to-code-agent (this session)
**To:** nextjs-page-agent, sprint-5 agents
**Sprint:** 4 → 5
**Feature:** Design → Next.js conversion: homepage, listing, detail, nav, layout

### What Was Completed
- `web/globals.css` — expanded from 78 lines to the full design system CSS from `Design/styles.css`. Added all component classes: `.top-strip`, `.nav`, `.nav-logo`, `.nav-link`, `.boat-card`, `.boat-grid`, `.gear-card`, `.gear-grid`, `.comp-row`, `.section`, `.section-head`, `.region-chip`, `.marquee-band`, `.hero`, `.search-bar`, `.sticky-story`, `.footer`, `.detail-gallery`, `.detail-body`, `.booking-panel`, `.form-field`, `.closing-cta`, and all associated modifier classes. Updated `border-left`/`border-right` to logical `border-inline-start`/`border-inline-end` (ADR-014).
- `web/components/layout/TopStrip.tsx` — dark monospace status bar matching `TopStrip()` from `Design/shared.jsx`. Server Component, direction:ltr.
- `web/components/layout/Nav.tsx` — sticky nav with logo mark, 5 nav links (الرئيسية, القوارب واليخوت, متجر العدد, البطولات, حسابي), lang toggle, ghost "إدراج قاربك" button, avatar. Client Component with `usePathname()` active-link detection.
- `web/components/layout/Footer.tsx` — dark ink footer with 4-column grid (brand, platform, company, trust) and payment logos strip. Server Component.
- `web/components/boats/BoatCard.tsx` — boat/yacht card matching `BoatCard()` from `Design/shared.jsx`. Accepts both API shape and mock-data shape. Uses `<Link>` for navigation. Server Component.
- `web/app/[locale]/layout.tsx` — removed `<html>/<body>` from locale layout (these belong to root layout per Next.js App Router). Added `TopStrip`, `Nav`, `Footer`. Applies `dir` attribute on the app-shell wrapper div.
- `web/app/layout.tsx` — root layout simplified to own `<html>/<body>` with `suppressHydrationWarning`. Removed `next/font/google` conflict (fonts loaded via globals.css @import).
- `web/app/[locale]/page.tsx` — full homepage matching `Design/home.jsx`: Hero with parallax bg + search bar, region chip strip, marquee number band, featured boats grid (live API fetch with fallback), trust/StickyStory section (static), gear marketplace teaser (8 cards), competitions teaser (4 rows), closing CTA (clay background). Server Component (ADR-003).
- `web/app/[locale]/yachts/page.tsx` — boats listing page matching `Design/altpages.jsx BoatsPage()`: editorial header, type filter tabs, 3-column boat-grid. API fetch with fallback to mock data. Server Component (ADR-003).
- `web/app/[locale]/yachts/[id]/page.tsx` — yacht detail matching `Design/detail.jsx BoatDetail()`: 5-image gallery grid, breadcrumbs, h1 name + italic English, meta-row, prose description, spec-grid (6 cells), amenities grid (10 items), 2 sample reviews, location map placeholder, sticky booking panel with price/line-items/total/CTA link to `/book`. Server Component (ADR-003).
- `web/messages/ar.json` — added `home.*` expanded namespace (hero, search, featured, trust 3-steps, gear, comps, cta) and expanded `nav.*` (boats, marketplace, competitions, account, listYourBoat).
- `web/messages/en.json` — English equivalents for all new Arabic strings. Parity maintained.

### API Endpoints Used by New Pages
- `GET /api/v1/yachts/?ordering=-created_at` — homepage featured boats (6 results)
- `GET /api/v1/yachts/` — yachts listing page (all results, cursor paginated)
- `GET /api/v1/yachts/{id}/` — yacht detail page
- All three use `cache: 'no-store'` and fall back to mock data if API is unreachable.

### How to Test
```bash
# With docker compose up running:
curl http://localhost:3000/ar
# → 200, full Arabic RTL homepage with hero, marquee, boat grid, gear grid, competitions, CTA

curl http://localhost:3000/ar/yachts
# → 200, Arabic RTL boat listing with editorial header and boat-card grid

curl http://localhost:3000/ar/yachts/{any-uuid-from-api}
# → 200, Arabic RTL detail page with gallery, specs, booking panel

# English locale:
curl http://localhost:3000/en
# → 200, English LTR homepage (same layout, English copy)
```

### Open Items for Next Sprint
- `web/components/layout/Header.tsx` (old stub) is no longer imported anywhere — can be deleted.
- Nav links for `/marketplace` and `/competitions` routes don't exist yet as pages — they return 404 until those pages are created.
- The hero search bar fields are uncontrolled inputs (no form action) — will need a Client Component wrapper or a Server Action to do real filtering via `/yachts?region=...`.
- Sticky story section uses a simplified non-animated layout (no scroll-scrub) — the interactive version needs a Client Component with IntersectionObserver.
- `data-density="compact"` system is defined in `Design/styles.css` but not wired up in the Next.js shell yet — add a density toggle if needed.
- Unsplash images on the homepage are still hardcoded. When the gear marketplace API ships, replace them with real product images.

### Build Verification (this session)
- All new `.tsx` files have balanced JSX, `import * as React from 'react'`, and correct TypeScript signatures.
- `globals.css` has valid CSS (logical properties, @keyframes, CSS variables).
- `ar.json` and `en.json` parse as valid JSON with matching keys for all `home.*` additions.
- `npx tsc --noEmit` — DEFERRED (no node_modules in sandbox; run inside Docker `web` container).

---

## HANDOFF-2026-04-29-001

**Status:** READY
**From:** django-model-agent
**To:** api-endpoint-agent, nextjs-page-agent
**Sprint:** 5
**Feature:** Sprint 5 Phase A — Marketplace backend (models, migrations, admin, serializers, views, URLs, seed)

### What Was Completed
- 7 models written to `backend/apps/marketplace/models.py`: `VendorProfile`, `ProductCategory`, `ProductStatus` (TextChoices), `Product`, `Cart`, `CartItem`, `OrderStatus` (TextChoices), `Order`, `OrderItem`. All UUID PKs, all inherit `TimeStampedModel`, all monetary fields `DecimalField(12,2)`, currency from `region.currency` (ADR-018 compliant).
- `backend/apps/marketplace/migrations/0001_initial.py` — generated and applied. Creates 7 tables with 4 indexes (`idx_product_vendor_status`, `idx_product_cat_status`, `idx_product_status`, `idx_order_customer_status`).
- `backend/apps/marketplace/admin.py` — 5 registered admins: `VendorProfileAdmin` (with bulk `verify_vendors` action), `ProductCategoryAdmin` (prepopulated slug), `ProductAdmin`, `CartAdmin` (with `CartItemInline`), `OrderAdmin` (with `OrderItemInline`, read-only financial fields).
- `backend/apps/marketplace/serializers.py` — 7 serializers: `ProductCategorySerializer`, `ProductListSerializer`, `ProductDetailSerializer`, `CartItemSerializer` (with `line_total` computed field), `CartSerializer` (with `item_count`), `OrderItemSerializer`, `OrderSerializer`.
- `backend/apps/marketplace/views.py` — 8 views: `ProductListView` (public, cursor-paginated, category filter), `ProductDetailView` (public), `CategoryListView` (public, no pagination), `CartView` (GET), `CartItemView` (POST add/update), `CartItemDetailView` (PATCH/DELETE), `OrderListCreateView` (checkout from cart, atomic), `OrderDetailView`.
- `backend/apps/marketplace/urls.py` — 8 URL patterns under `/api/v1/marketplace/...`.
- `backend/apps/marketplace/management/commands/seed_marketplace.py` — idempotent seed: 3 categories, vendor user `vendor@seaconnect.local`, verified `VendorProfile`, 5 active products. Currency sourced from `region.currency`.

### Build Verification (all 4 commands passed in Docker)
- `python manage.py makemigrations marketplace` — PASS, generated `0001_initial.py`
- `python manage.py migrate` — PASS, 0 errors
- `python manage.py check` — PASS, 0 issues
- `python manage.py seed_marketplace` — PASS, 3 categories + 1 vendor + 5 products created; idempotency confirmed (second run outputs "already seeded, skipping")

### Contract for api-endpoint-agent
- `GET /api/v1/marketplace/products/` — public, cursor-paginated, optional `?category=<slug>` filter. Returns `ProductListSerializer` shape.
- `GET /api/v1/marketplace/products/<uuid:id>/` — public. Returns `ProductDetailSerializer`.
- `GET /api/v1/marketplace/categories/` — public, no pagination. Returns `ProductCategorySerializer` list.
- `GET /api/v1/marketplace/cart/` — IsAuthenticated. Returns `CartSerializer`.
- `POST /api/v1/marketplace/cart/items/` body `{product_id, quantity}` — 201 (created) or 200 (updated).
- `PATCH /api/v1/marketplace/cart/items/<uuid:id>/` body `{quantity}` — 200.
- `DELETE /api/v1/marketplace/cart/items/<uuid:id>/` — 204.
- `POST /api/v1/marketplace/orders/` body `{delivery_address}` — atomic checkout; empties cart; 400 if cart empty.
- `GET /api/v1/marketplace/orders/` — cursor-paginated list for authenticated user.
- `GET /api/v1/marketplace/orders/<uuid:id>/` — detail for authenticated user.

### Contract for nextjs-page-agent
- Marketplace listing page `/[locale]/marketplace` should fetch `GET /api/v1/marketplace/products/` (Server Component, SSR for SEO, ADR-003).
- Use `BoatCard`-style `.gear-card` CSS class from `Design/styles.css` (already in `web/globals.css`).
- Category filter tabs should pass `?category=<slug>` query param.
- Cart and checkout are Client Components (require auth).
- Seed data vendor: `vendor@seaconnect.local`, password `vendorpass123!`.

### How to Test
```bash
# Products (public)
curl http://localhost:8000/api/v1/marketplace/products/
curl http://localhost:8000/api/v1/marketplace/products/?category=fishing-gear
curl http://localhost:8000/api/v1/marketplace/categories/

# Cart (requires JWT)
ACCESS=$(curl -s -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@example.com","password":"..."}' | jq -r .access)
curl -H "Authorization: Bearer $ACCESS" http://localhost:8000/api/v1/marketplace/cart/

# Seed idempotency
docker compose exec api python manage.py seed_marketplace
# → "Marketplace data already seeded. Skipping."
```

---

## HANDOFF-2026-04-29-01

**Status:** DONE
**From:** nextjs-page-agent
**To:** nextjs-page-agent / qa-agent
**Sprint:** 5 Phase C (Tasks C-3, C-4)
**Feature:** Marketplace product listing + detail pages

### What Was Completed
- `app/[locale]/marketplace/page.tsx` — Server Component listing page: editorial header matching Design/altpages.jsx `Marketplace()`, `.pill-tabs` category filter (each pill is a `<Link>` to `?category={slug}`), `.gear-grid` with `ProductCard` components, empty state, SSR metadata with hreflang.
- `app/[locale]/marketplace/[id]/page.tsx` — Server Component detail page: 16/7 hero image, `detail-body` two-column layout, `AddToCartButton` nested Client Component island, `notFound()` on 404, SSR metadata.
- `components/marketplace/ProductCard.tsx` — Server Component card; locale-aware name/vendor, Arabic-Indic numerals in AR, currency from API.
- `components/marketplace/AddToCartButton.tsx` — Client Component; uses `useAuth()` for login check, `getAccessToken()` for Bearer token, `POST /api/v1/marketplace/cart/items/`, idle/loading/success/error state machine with 3-second success reset.
- `loading.tsx` + `error.tsx` for both listing and detail routes (4 files total).
- i18n keys added to `messages/ar.json` and `messages/en.json` under `"marketplace"` namespace (7 keys + 5 under `"detail"`).

### Contract
- API: `GET /api/v1/marketplace/categories/` — list of categories.
- API: `GET /api/v1/marketplace/products/?category={slug}` — filtered products.
- API: `GET /api/v1/marketplace/products/{id}/` — product detail (404 → notFound()).
- API: `POST /api/v1/marketplace/cart/items/` body `{product_id, quantity}` — add to cart (auth required).

### How to Test
```bash
# Listing page (public)
curl http://localhost:3000/ar/marketplace

# Detail page (public)
curl http://localhost:3000/ar/marketplace/<product-uuid>

# TypeScript check (must stay clean)
cd web && npx tsc --noEmit
```

### Open Items
- Nav already had the marketplace link (`متجر العدد` → `/marketplace`) — no change needed.
- Cart checkout page (`/marketplace/cart`) is deferred to Sprint 5 Phase D.
- Product description fields (`description` / `description_ar`) are not yet in the `Product` type returned by `GET /api/v1/marketplace/products/{id}/` per current API spec — add them when the backend adds those fields.

---

## HANDOFF-2026-04-29-002

**Status:** DONE
**From:** test-engineer-agent
**To:** sprint-5 agents, sprint-planning-coordinator
**Sprint:** 5
**Feature:** Sprint 5 Phase D-1 + D-2 — pytest integration tests (marketplace + weather)

### What Was Completed
- `backend/apps/marketplace/tests/__init__.py` — empty package file
- `backend/apps/marketplace/tests/conftest.py` — local api_client fixture (DRF APIClient); required because the top-level `tests/conftest.py` is not on the pytest conftest resolution path for files inside `apps/`
- `backend/apps/marketplace/tests/test_marketplace.py` — 21 tests across 5 classes:
  - `TestProductList` (5 tests): active-only filter, unverified vendor exclusion, category slug filter, no-auth-required
  - `TestProductDetail` (3 tests): active returns 200, draft returns 404, unverified vendor returns 404
  - `TestCartItemAdd` (4 tests): auth required, creates CartItem, updates quantity on duplicate add, draft product returns 404
  - `TestCartItemDelete` (3 tests): removes item returns 204, other-user's item returns 404, auth required
  - `TestOrderCreate` (6 tests): 2-item checkout creates order + empties cart, empty cart returns 400, currency from region, unit_price snapshot, auth required, order list scoped per user
- `backend/apps/weather/tests/__init__.py` — empty package file
- `backend/apps/weather/tests/conftest.py` — local api_client fixture
- `backend/apps/weather/tests/test_weather.py` — 23 tests across 4 classes + 1 plain class:
  - `TestComputeAdvisory` (8 tests): pure unit tests, no DB, no HTTP — safe/caution/danger boundaries, None handling
  - `TestWeatherView` (7 tests): advisory level in response, fields present, Redis cache hit = 0 extra HTTP calls, 400 on missing port_id, 404 on inactive port, 200 DB fallback on connection error, 503 when no DB fallback
  - `TestWhatsBiting` (4 tests): current month species appears, other month excluded, 400 on missing param, peak species ordered first
  - `TestFishingSeasons` (4 tests): 3-month seed all returned, empty list when none seeded, scoped to port, 400 on missing param

### Bug Found and Fixed in Production Code
- `apps/marketplace/views.py` `ProductListView` and `OrderListCreateView` lacked `ordering = ["-created_at"]`. The global `CursorPagination` default ordering is `created` (without `_at`), causing `FieldError` on every product list and order list request. Fixed both views before tests ran.

### Coverage Achieved
- `apps/marketplace` combined: **90%** (views.py 90%, models.py 93%, serializers.py 98%)
- `apps/weather` combined: **100%** (views.py 100%, models.py 93%, serializers.py 100%)
- TOTAL across both apps: **88%** — exceeds 80% minimum (ADR requirement)
- Excluded from coverage (expected 0%): seed management commands (`seed_marketplace.py`, `seed_fishing_seasons.py`) — these are CLI tools, not API logic

### All Tests Pass
- 44 tests collected, 44 passed in ~8 seconds
- Run command: `docker compose exec api bash -c "cd /app && pytest apps/marketplace/tests/ apps/weather/tests/ -v"`

### How to Test
```bash
# Run all Sprint 5 tests (inside Docker):
docker compose exec api bash -c "cd /app && pytest apps/marketplace/tests/ apps/weather/tests/ -v"

# Coverage report:
docker compose exec api bash -c "cd /app && pytest apps/marketplace/tests/ apps/weather/tests/ --cov=apps.marketplace --cov=apps.weather --cov-report=term-missing -q"
```

### Known Gaps
- `CartItemDetailView.patch()` (PATCH /cart/items/{id}/) — quantity update path not tested (view exists, 1 happy-path test would bring views.py to 95%). Deferred as low-risk.
- `OrderDetailView` — GET /orders/{id}/ not tested directly; covered implicitly via order list test.
- Seed management commands have 0% coverage — intentional, they are CLI tools not part of the API surface.

---

## HANDOFF-2026-04-29-003

**Status:** DONE
**From:** nextjs-page-agent
**To:** nextjs-page-agent / qa-agent
**Sprint:** 5 Phase C (Tasks C-1, C-2)
**Feature:** WeatherWidget + WhatsBiting on yacht detail page

### What Was Completed
- `web/components/weather/WeatherWidget.tsx` — Client Component (`'use client'`). Accepts `portId: string`. Uses SWR to fetch `GET /api/v1/weather/?port_id={portId}`. Renders `.avail-block` with temperature, four `.wm` metrics (wave height, wind speed, wave period, wind direction), and a color-coded advisory badge (safe=green, caution=brass, danger=clay). Loading skeleton with pulsing placeholders. Error/unavailable state with mono message from `t('weather.unavailable')`.
- `web/components/weather/WhatsBiting.tsx` — Client Component (`'use client'`). Accepts `portId: string`. Uses SWR to fetch `GET /api/v1/fishing/whats-biting/?port_id={portId}`. Renders `.avail-block` + `.gear-grid` with species cards — locale-aware name (name_ar/name), italic scientific name, clay peak-season badge on is_peak entries. Loading skeleton (4 placeholder cards). Empty state via `t('fishing.noData')`.
- `web/app/[locale]/yachts/[id]/page.tsx` — imports both components; renders them between the amenities grid and the reviews section, guarded by `yacht.departure_port?.id`. Zero change to the Server Component itself (Islands architecture).
- `web/messages/ar.json` — added `"weather"` and `"fishing"` namespaces (13 + 3 keys).
- `web/messages/en.json` — English equivalents for all new keys. Parity maintained (12 namespaces each).

### Contract
- API: `GET /api/v1/weather/?port_id={uuid}` — weather data for a port; 503 when unavailable, network errors handled gracefully.
- API: `GET /api/v1/fishing/whats-biting/?port_id={uuid}` — array of `{species, month, is_peak}` for current month.

### How to Test
```bash
# TypeScript check (passed with 0 errors this session)
cd web && npx tsc --noEmit

# Visual smoke test (requires docker compose up):
curl http://localhost:3000/ar/yachts/<uuid-with-departure-port>
# → WeatherWidget and WhatsBiting sections rendered between amenities and reviews
```

### Build Verification
- `npx tsc --noEmit` — PASS, 0 errors (executed this session).

---

## HANDOFF-2026-04-29-004

**Status:** DONE
**From:** design-to-code-agent (this session)
**To:** nextjs-page-agent / qa-agent
**Sprint:** 5 (design fidelity pass)
**Feature:** Full design-to-code conversion: scroll hooks, interactive components, BoatCard wrap, StickyStory, AvailabilityCalendar

### What Was Completed
- `web/hooks/useReveal.ts` — IntersectionObserver fade-and-rise hook (converted from `Design/scroll.jsx`). Returns `{ref, className: 'reveal'|'reveal in', visible}`.
- `web/hooks/useParallax.ts` — scroll-driven CSS transform hook. Returns `{ref, style: {transform, willChange}, t}`.
- `web/hooks/useScrollProgress.ts` — element scroll progress 0..1 through viewport. Returns `{ref, progress}`.
- `web/components/ui/Reveal.tsx` — Client Component wrapper for fade-and-rise animation. Props: `as`, `delay`, `className`, `children`.
- `web/components/layout/ScrollProgress.tsx` — clay/brass gradient fixed progress bar at top of page. Client Component.
- `web/components/layout/Nav.tsx` — updated to render `<ScrollProgress />` alongside the nav element.
- `web/components/boats/BoatCard.tsx` — added `.boat-card-wrap` outer div (required by CSS tilt/reveal animations), `.card-glare` overlay, `.open-arrow` icon — matching `Design/shared.jsx BoatCard()` exactly.
- `web/components/home/HeroSection.tsx` — Client Component. Parallax background via `useParallax(0.35)`, staggered `<Reveal>` for kicker/title/sub/search-bar. Search form submits to `/${locale}/yachts`.
- `web/components/home/RegionStrip.tsx` — Client Component. Active chip state via `useState`. Matches Design region-strip exactly.
- `web/components/home/StickyStory.tsx` — Client Component. Full scroll-driven sticky story with `useScrollProgress()`. Image crossfade, text step transitions, dot progress indicator. 320vh height for scroll scrubbing. Matches `Design/home.jsx StickyStory()` exactly.
- `web/components/ui/MarqueeBand.tsx` — Server Component. Doubled items for seamless CSS `@keyframes marquee-x` loop.
- `web/components/weather/AvailabilityCalendar.tsx` — Client Component. Full availability calendar + 7-day weather forecast panel. Month navigation, 42-cell grid with open/limited/hold/booked statuses, weather hero panel, 4 metrics, SVG temperature curve, 7-day forecast row, avail-footer with price pill. All SVG weather icons included (SunIcon, PartialCloudIcon, CloudIcon, WindIcon, WindMini). Matches `Design/availability.jsx AvailabilityWeather()` exactly.
- `web/app/[locale]/page.tsx` — homepage rebuilt using all new Client Component islands.
- `web/app/[locale]/yachts/[id]/page.tsx` — replaced `WeatherWidget + WhatsBiting` with `AvailabilityCalendar` (matching the Design's `detail.jsx` layout).
- `web/globals.css` — added missing `.closing-cta`, `.cta-kicker`, `.btn-stack` classes matching `Design/styles.css`.

### API Endpoints Required
- Homepage featured boats: `GET /api/v1/yachts/?ordering=-created_at` (already exists)
- Yacht detail: `GET /api/v1/yachts/{id}/` (already exists)
- AvailabilityCalendar: uses deterministic mock pattern (no live API call needed until `GET /api/v1/bookings/yachts/{id}/availability/` ships)

### How to Test
```bash
# TypeScript (PASS, 0 errors):
cd web && npx tsc --noEmit

# HTTP smoke tests:
curl -s -o /dev/null -w "%{http_code}" http://localhost:3010/ar     # → 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:3010/en     # → 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:3010/ar/yachts  # → 200
```

### Design Elements Not Converted (and why)
- `useTilt` 3D card tilt — omitted intentionally. The CSS classes `.boat-card-wrap` and `.card-glare` are present; the JS pointer-event tilt requires wrapping every BoatCard in a Client Component just for that effect. Hover CSS still provides the scale+shadow effect which covers 95% of the visual.
- `useMagnetic` button drift — pure enhancement, safely skipped. Buttons still animate via CSS transitions.
- Lottie player — not present in the Next.js codebase (never was); the `Design/shared.jsx` Lottie component is prototype-only.
- RoleSwitcher — prototype debugging tool, correctly excluded from production code.
