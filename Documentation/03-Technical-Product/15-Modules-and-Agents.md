# Complete Module & Agent Reference — SeaConnect
**Version:** 1.0  
**Date:** April 14, 2026  
**Status:** Active — Master reference for all system modules and AI agents

---

## Part 1: All System Modules

SeaConnect is composed of **13 backend modules** (Django apps), **4 frontend surfaces** (Flutter + Next.js), and **3 infrastructure modules**.

---

### Backend Modules (Django Apps)

---

#### Module 1 — `accounts` (Auth & Users)

**Purpose:** User identity, authentication, roles, KYC, and profile management.

**Owns:**
- User registration (phone OTP + email + Google OAuth)
- JWT token issuance and refresh (RS256)
- Role assignment: `customer` | `owner` | `vendor` | `organizer` | `admin`
- User profile (name, photo, phone, language preference)
- KYC document upload and status tracking
- Account deletion and data export (PDPL compliance)
- Region assignment (which country the user is in)

**Key models:** `User`, `UserProfile`, `KYCDocument`, `OTPVerification`, `UserEvent`

**Key endpoints:**
```
POST /auth/register/
POST /auth/login/
POST /auth/token/refresh/
POST /auth/otp/send/
POST /auth/otp/verify/
GET  /accounts/me/
PUT  /accounts/me/
GET  /accounts/me/export/
DELETE /accounts/me/
```

**Depends on:** `core` (Region), `notifications` (OTP SMS)  
**Depended on by:** All modules (authentication)

---

#### Module 2 — `core`

**Purpose:** Shared reference data, configuration, and utilities used by all other modules.

**Owns:**
- `Region` model (Egypt, UAE, KSA — currency, timezone, active status)
- `DeparturePort` model (lat/lon, sea region, weather slug)
- `FeatureFlag` model (on/off switches per feature)
- `CommissionRate` model (per region, per service type, effective date)
- `PlatformConfig` model (key-value settings, editable from admin)
- Base model classes: `TimeStampedModel`, `SoftDeleteModel`
- Currency formatting utilities
- Health check endpoint

**Key models:** `Region`, `DeparturePort`, `FeatureFlag`, `CommissionRate`, `PlatformConfig`

**Key endpoints:**
```
GET /health/
GET /core/regions/
GET /core/config/
```

**Depends on:** Nothing (foundational module)  
**Depended on by:** All modules

---

#### Module 3 — `listings` (Boat & Yacht Listings)

**Purpose:** Owner-side listing management — create, edit, publish, and manage availability for boats and yachts.

**Owns:**
- Yacht/boat listing creation and editing
- Photo and video upload (Cloudflare R2)
- Listing categories: `yacht` | `fishing_boat` | `speedboat` | `kayak` | `sailboat`
- Amenities management
- Availability calendar (blocked dates)
- Pricing (base rate, extras, seasonal pricing in Phase 2)
- Admin approval workflow (pending → approved → live / rejected)
- Listing embedding generation (pgvector, for semantic search)

**Key models:** `Listing`, `ListingPhoto`, `ListingVideo`, `Amenity`, `AvailabilityBlock`, `ListingEmbedding`

**Key endpoints:**
```
GET    /listings/
GET    /listings/{id}/
POST   /listings/                          (owner only)
PUT    /listings/{id}/                     (owner only)
DELETE /listings/{id}/                     (owner only)
POST   /listings/{id}/photos/
DELETE /listings/{id}/photos/{photo_id}/
POST   /listings/{id}/availability/block/
DELETE /listings/{id}/availability/{block_id}/
GET    /listings/{id}/availability/
```

**Depends on:** `accounts`, `core`, `weather` (weather card on listing)  
**Depended on by:** `bookings`, `search`, `reviews`

---

#### Module 4 — `bookings`

**Purpose:** The core transaction engine — booking lifecycle from creation to completion and payout.

**Owns:**
- Booking creation (customer selects listing + date + trip details)
- Booking state machine: `pending_payment` → `pending_owner` → `confirmed` → `in_progress` → `completed` / `cancelled`
- Owner accept / decline flow
- Customer cancellation and refund trigger
- Booking event log (append-only audit trail — ADR-012)
- Trip extras (add-ons selected at booking)
- Payout scheduling (24h after trip completion — triggers `payments` module)

**Key models:** `Booking`, `BookingEvent`, `BookingExtra`, `TripReport`

**Key endpoints:**
```
POST   /bookings/
GET    /bookings/
GET    /bookings/{id}/
POST   /bookings/{id}/confirm/             (owner only)
POST   /bookings/{id}/decline/             (owner only)
POST   /bookings/{id}/cancel/              (customer or owner)
GET    /bookings/{id}/events/              (admin only)
```

**Depends on:** `accounts`, `listings`, `payments`, `notifications`  
**Depended on by:** `reviews`, `analytics`, `payments`

---

#### Module 5 — `payments`

**Purpose:** Payment processing abstraction — all money in and money out via the PaymentProvider interface (ADR-007).

**Owns:**
- `PaymentProvider` abstract interface + `FawryProvider` implementation
- Payment intent creation and tracking
- Webhook ingestion and verification (HMAC-SHA256)
- Payout release logic (hold → release 24h after trip)
- Refund processing (customer cancellation, admin-initiated)
- Payment event log (`payment_events` table — financial audit trail)
- Commission calculation and split (platform cut vs owner payout)
- Payout records per owner

**Key models:** `Payment`, `PaymentEvent`, `Payout`, `Refund`

**Key endpoints:**
```
POST   /payments/initiate/                 (internal — called by bookings)
POST   /payments/webhooks/fawry/           (public — Fawry callback)
POST   /payments/webhooks/telr/            (Phase 3)
GET    /payments/{booking_id}/status/
POST   /payments/{booking_id}/refund/      (admin only)
GET    /owners/{id}/payouts/
```

**Depends on:** `accounts`, `core` (Region → currency → provider)  
**Depended on by:** `bookings`, `marketplace`

---

#### Module 6 — `marketplace`

**Purpose:** Fishing gear and accessories e-commerce — vendor stores, products, cart, orders.

**Owns:**
- Vendor store creation and management
- Product listing (name, description, category, price, stock, photos)
- Product search (Arabic full-text + semantic)
- Shopping cart (Redis-backed, 24h TTL)
- Order creation and lifecycle: `pending_payment` → `confirmed` → `shipped` → `delivered` / `cancelled`
- Order event log (`order_events` — audit trail)
- Vendor payout (same payment abstraction as bookings)
- Admin approval for new products

**Key models:** `VendorStore`, `Product`, `ProductPhoto`, `ProductCategory`, `Order`, `OrderItem`, `OrderEvent`, `Cart`, `CartItem`

**Key endpoints:**
```
GET    /marketplace/stores/
GET    /marketplace/stores/{id}/
POST   /marketplace/stores/                (vendor only)
GET    /marketplace/products/
GET    /marketplace/products/{id}/
POST   /marketplace/products/              (vendor only)
GET    /marketplace/cart/
POST   /marketplace/cart/items/
PUT    /marketplace/cart/items/{id}/
DELETE /marketplace/cart/items/{id}/
POST   /marketplace/orders/
GET    /marketplace/orders/
GET    /marketplace/orders/{id}/
POST   /marketplace/orders/{id}/ship/      (vendor only)
```

**Depends on:** `accounts`, `payments`, `notifications`  
**Depended on by:** `reviews`, `analytics`

---

#### Module 7 — `competitions`

**Purpose:** Fishing competition management — creation, registration, scoring, leaderboard.

**Owns:**
- Competition creation (by organizer role)
- Registration and entry fee payment
- Bracket/participant management
- Catch submission (species, weight, photo)
- Leaderboard calculation
- Prize distribution record

**Key models:** `Competition`, `CompetitionRegistration`, `CatchSubmission`, `Leaderboard`

**Key endpoints:**
```
GET    /competitions/
GET    /competitions/{id}/
POST   /competitions/                      (organizer only)
POST   /competitions/{id}/register/
GET    /competitions/{id}/leaderboard/
POST   /competitions/{id}/catches/         (registered participants)
```

**Depends on:** `accounts`, `payments`, `notifications`  
**Depended on by:** `analytics`

**Note:** Competitions module ships in Phase 2 (post-MVP). Scaffolded in Sprint 1 but feature-flagged off.

---

#### Module 8 — `weather`

**Purpose:** Marine weather advisory and fishing season guide.

**Owns:**
- Open-Meteo API integration (no API key, free)
- Go/no-go advisory logic (good / caution / danger thresholds)
- Weather cache (Redis 6h TTL + DB persistent store)
- 12 pre-seeded Egyptian ports (lat/lon)
- Fish species database (Red Sea, Mediterranean, Gulf of Suez)
- Fishing season rating matrix (species × port × month × rating)
- "What's biting now" query

**Key models:** `WeatherCache`, `FishSpecies`, `FishingSeasonRating`

**Key endpoints:**
```
GET /weather/                              port + date → advisory
GET /weather/ports/                        list all ports
GET /fishing/whats-biting/                 port + month → top species
GET /fishing/seasons/                      port + month → full species list
GET /fishing/species/{id}/                 species detail + 12-month calendar
```

**Depends on:** `core` (DeparturePort)  
**Depended on by:** `listings` (weather card), `search`

---

#### Module 9 — `reviews`

**Purpose:** Post-trip and post-purchase review system.

**Owns:**
- Review creation (only after verified completed booking/order)
- Rating (1–5 stars) + text review + photos
- Review moderation (admin can hide abusive reviews)
- Owner/vendor reply to reviews
- Aggregate rating calculation (updates listing/store avg_rating)
- Review integrity (one review per booking, 7-day window, editing 48h only)

**Key models:** `Review`, `ReviewPhoto`, `ReviewReply`

**Key endpoints:**
```
POST   /reviews/                           (booking_id or order_id required)
GET    /listings/{id}/reviews/
GET    /marketplace/products/{id}/reviews/
PUT    /reviews/{id}/                      (author, within 48h)
POST   /reviews/{id}/reply/               (owner/vendor)
DELETE /reviews/{id}/                      (admin only)
```

**Depends on:** `accounts`, `bookings`, `marketplace`  
**Depended on by:** `listings` (avg_rating), `marketplace` (avg_rating)

---

#### Module 10 — `notifications`

**Purpose:** All outbound communications — push, email, and SMS.

**Owns:**
- FCM push notification delivery (iOS + Android)
- SendGrid email delivery (transactional templates in AR + EN)
- Twilio SMS/OTP delivery
- In-app notification center (stored, read/unread state)
- Notification preference management (user can mute types)
- Notification templates (registered in DB, not hardcoded)

**Key models:** `Notification`, `NotificationTemplate`, `NotificationPreference`

**Key endpoints:**
```
GET    /notifications/
POST   /notifications/{id}/read/
POST   /notifications/read-all/
PUT    /notifications/preferences/
POST   /notifications/device-tokens/       (register FCM token)
```

**Notification Events:**
```
booking.created          → Customer: booking received; Owner: new booking request
booking.confirmed        → Customer: booking confirmed
booking.declined         → Customer: booking declined
booking.cancelled        → Both parties
trip.reminder_24h        → Customer: trip tomorrow reminder
trip.completed           → Customer: review prompt
payout.released          → Owner: payout sent
order.confirmed          → Customer: order placed
order.shipped            → Customer: order shipped
product.approved         → Vendor: product live
listing.approved         → Owner: listing live
```

**Depends on:** `accounts`, `core`  
**Depended on by:** `bookings`, `marketplace`, `payments`, `competitions`

---

#### Module 11 — `search`

**Purpose:** Unified search across listings and products, with semantic and filter-based results.

**Owns:**
- Listing search (location, date, capacity, price, type filters)
- Product search (category, price, keyword, vendor)
- Semantic search via pgvector embeddings (boat recommendations)
- Search result ranking (relevance × recency × rating × availability)
- Search analytics (queries logged for ML training)
- Map-based search (listings within bounding box)

**Key models:** `SearchLog`

**Key endpoints:**
```
GET /search/listings/
GET /search/products/
GET /search/listings/map/                  lat/lon bounding box
GET /search/suggestions/                   autocomplete
```

**Depends on:** `listings`, `marketplace`, `weather` (advisory filter)  
**Depended on by:** Frontend (explore screen)

---

#### Module 12 — `analytics`

**Purpose:** Event tracking, behavioral data pipeline, and internal reporting.

**Owns:**
- Event emission to Mixpanel (all user-facing events)
- Event sourcing tables (`booking_events`, `order_events`, `user_events`, `payment_events`)
- Owner earnings reports (monthly summary, per-booking breakdown)
- Admin KPI dashboard data (bookings/day, GMV, conversion funnels)
- Data export for BigQuery ETL

**Key models:** `BookingEvent`, `OrderEvent`, `UserEvent`, `PaymentEvent` (all append-only)

**Key endpoints:**
```
GET /analytics/owner/earnings/             (owner only)
GET /analytics/admin/kpis/                 (admin only)
GET /analytics/admin/funnel/               (admin only)
```

**Depends on:** `bookings`, `marketplace`, `accounts`, `payments`  
**Depended on by:** Nothing (terminal module)

---

#### Module 13 — `admin_portal`

**Purpose:** Internal tools for SeaConnect operations team — not Django admin (that's auto-generated), but custom API endpoints used by the Next.js admin portal.

**Owns:**
- Listing approval / rejection workflow
- Product approval / rejection workflow
- User KYC review and approval
- Dispute resolution tools
- Manual payout override
- Platform stats summary
- Content moderation (hide reviews, suspend listings)
- Feature flag management

**Key endpoints:**
```
GET    /admin/listings/pending/
POST   /admin/listings/{id}/approve/
POST   /admin/listings/{id}/reject/
GET    /admin/products/pending/
POST   /admin/products/{id}/approve/
GET    /admin/users/
POST   /admin/users/{id}/suspend/
GET    /admin/disputes/
POST   /admin/disputes/{id}/resolve/
GET    /admin/stats/
```

**Depends on:** All modules  
**Depended on by:** Nothing (admin-only surface)

---

### Frontend Modules

---

#### Frontend 1 — Flutter Mobile App *(DEFERRED — Year 2+)*

> **Decision (April 2026):** Mobile apps are deferred until the web platform achieves product-market fit. Flutter development begins after the web app is live and growing. All `flutter-screen-agent` tasks are inactive until this phase starts.

**When activated (Year 2):**
- ~71 screens across 4 roles
- State management: Riverpod
- Navigation: GoRouter
- Localizations: `app_ar.arb` + `app_en.arb`

---

#### Frontend 2 — Next.js Customer Web

**Pages:** ~14 public pages (SSR for SEO)  
**Framework:** Next.js 14 App Router  

| Page | Route | Backend Module |
|------|-------|----------------|
| Home / Explore | `/` | `search`, `listings` |
| Search Results | `/explore` | `search` |
| Yacht Detail | `/yacht/[slug]` | `listings`, `reviews`, `weather` |
| Booking Flow | `/book/[listing_id]` | `bookings` |
| Marketplace | `/marketplace` | `marketplace` |
| Product Detail | `/marketplace/[slug]` | `marketplace`, `reviews` |
| Fishing Guide | `/fishing-guide` | `weather` |
| Competition List | `/competitions` | `competitions` |
| Competition Detail | `/competitions/[id]` | `competitions` |
| My Bookings | `/dashboard/bookings` | `bookings` |
| My Orders | `/dashboard/orders` | `marketplace` |
| Profile | `/dashboard/profile` | `accounts` |
| Notifications | `/dashboard/notifications` | `notifications` |
| Auth pages | `/login`, `/register` | `accounts` |

---

#### Frontend 3 — Next.js Admin Portal

**Pages:** ~8 admin pages (client components, auth-gated)  
**Access:** Admin role only  

| Page | Route | Backend Module |
|------|-------|----------------|
| Dashboard | `/admin` | `analytics`, `admin_portal` |
| Pending Listings | `/admin/listings` | `admin_portal`, `listings` |
| Pending Products | `/admin/products` | `admin_portal`, `marketplace` |
| User Management | `/admin/users` | `admin_portal`, `accounts` |
| Bookings Monitor | `/admin/bookings` | `bookings`, `admin_portal` |
| Disputes | `/admin/disputes` | `admin_portal` |
| Payouts | `/admin/payouts` | `payments` |
| Feature Flags | `/admin/flags` | `core` |

---

#### Frontend 4 — Flutter Web (PWA) — Phase 2

Lightweight Progressive Web App version of the Flutter mobile app. Same codebase, responsive layout. Ships in Phase 2 for markets where app download friction is high.

---

### Infrastructure Modules

| Module | Technology | Purpose |
|--------|-----------|---------|
| **Task Queue** | Celery + Celery Beat | Async tasks, scheduled jobs |
| **File Storage** | Cloudflare R2 + django-storages | Photos, videos, KYC docs |
| **Cache** | Redis (Upstash) | API cache, session, cart, weather, feature flags |

---

## Part 2: All AI Agents

SeaConnect uses **20 specialized AI agents**. Each has a defined trigger, scope, mandatory reads, and output format.

---

### Category A — Code Generation Agents (7 agents)

---

#### Agent 1 — `django-model-agent`

**Trigger:** New database table needed, or existing model needs new fields  
**Mandatory reads:** `04-Database-Schema.md`, `02-API-Specification.md`, existing models  
**Output:**
- Django model class (fields, Meta, `__str__`, indexes)
- Admin registration (`list_display`, `search_fields`, `list_filter`)
- DRF serializers (read + write variants)
- Migration file (runs `makemigrations`)
- Event sourcing table if the model has state transitions

**ADR enforcements:** UUID PKs, TimeStampedModel, NUMERIC for money, no raw SQL

---

#### Agent 2 — `api-endpoint-agent`

**Trigger:** New API endpoint needed  
**Mandatory reads:** `02-API-Specification.md` (target module), `10-ADR-Log.md`  
**Output:**
- DRF ViewSet or APIView
- URL routing
- Permission class (role-based)
- Request/response serializers
- Throttling class
- 3 minimum tests: happy path + auth + validation

**ADR enforcements:** CursorPagination, standard error format, versioned under `/api/v1/`

---

#### Agent 3 — `flutter-screen-agent`

**Trigger:** New Flutter screen needed  
**Mandatory reads:** `07-UX-Flows.md` (target screen), `06-Brand-Design-System.md`, `10-ADR-Log.md`  
**Output:**
- Screen widget file
- GoRouter route registration
- Riverpod provider(s) for screen state
- Loading state (shimmer skeleton)
- Empty state (Arabic message + illustration)
- Error state (retry button + Arabic error)
- Both `app_ar.arb` and `app_en.arb` string entries

**ADR enforcements:** EdgeInsetsDirectional, AppLocalizations, Theme colors only, CachedNetworkImage

---

#### Agent 4 — `nextjs-page-agent`

**Trigger:** New Next.js page needed  
**Mandatory reads:** `07-UX-Flows.md` (target page), `06-Brand-Design-System.md`, `03-ADR-Log.md`  
**Output:**
- Page component (Server Component for public pages, Client Component for dashboard)
- Metadata export for SEO (title, description, og:image)
- Hreflang tags for AR/EN
- Loading skeleton
- Error boundary
- Both `ar.json` and `en.json` string entries

**ADR enforcements:** Logical CSS properties, next-intl strings, `dir` attribute

---

#### Agent 5 — `celery-task-agent`

**Trigger:** New background job, scheduled task, or async operation needed  
**Mandatory reads:** `10-ADR-Log.md` (ADR-011), existing tasks in `*/tasks.py`  
**Output:**
- Celery task with `@app.task(bind=True, max_retries=3, default_retry_delay=60)`
- Idempotency guard (check state before acting)
- Celery Beat schedule entry (if recurring)
- Task unit test
- Entry in ADR-011 scheduled tasks registry (if new recurring task)

**ADR enforcements:** `max_retries=3`, idempotency, no side effects without state check

---

#### Agent 6 — `payment-integration-agent`

**Trigger:** New payment flow, new payment provider, or payment bug  
**Mandatory reads:** `05-Payment-Financial/01-Payment-Gateway-Plan.md`, `10-ADR-Log.md` (ADR-007, ADR-008), `payments/providers/base.py`  
**Output:**
- `PaymentProvider` subclass for new provider (or fix for existing)
- Webhook handler with HMAC signature verification
- Provider registry entry
- Integration tests with mock provider

**ADR enforcements:** Never bypass PaymentProvider interface, HMAC webhook validation always, amount in Decimal not float

---

#### Agent 7 — `notification-agent`

**Trigger:** New notification event needed  
**Mandatory reads:** `notifications/` module, `06-Brand-Design-System.md` (email templates), existing notification templates  
**Output:**
- FCM push payload (title_ar, title_en, body_ar, body_en, deep_link)
- SendGrid email template (HTML — Arabic + English versions)
- DB notification template record
- Celery task for async delivery
- Deep link mapping in `07-UX-Flows.md` format

---

### Category B — Quality & Safety Agents (5 agents)

---

#### Agent 8 — `test-writer-agent`

**Trigger:** After any backend feature is written, before PR is opened  
**Mandatory reads:** Target feature code, `02-API-Specification.md`  
**Output:**
- `pytest` unit tests for service layer
- `pytest` integration tests using real DB (no mocks — ADR rule)
- Fixtures in `conftest.py` using `factory_boy`
- Minimum coverage: 80% on new code
- At minimum: happy path, permission denied, validation error, state conflict

---

#### Agent 9 — `security-audit-agent`

**Trigger:** Before any PR that touches: auth, payments, KYC, user data, or admin endpoints  
**Mandatory reads:** `09-Safety-Security/01-Safety-Requirements.md`, `10-ADR-Log.md` (ADR-009)  
**Output:**
- OWASP Top 10 checklist scan (pass/fail per item)
- Specific code-level findings with line numbers
- Fix recommendations
- Blocks merge if: SQL injection risk, auth bypass, hardcoded secrets, insecure direct object reference

---

#### Agent 10 — `migration-safety-agent`

**Trigger:** Before any `makemigrations` or before production deploy  
**Mandatory reads:** `14-Environments-Pipelines.md` (section 7.1), pending migration files  
**Output:**
- Migration safety report: pass / fail per migration
- Flags: column drops, NOT NULL without default, index without CONCURRENTLY, table renames
- Estimated execution time on prod DB (rows × operation type)
- Recommended zero-downtime migration split if needed

---

#### Agent 11 — `rtl-audit-agent`

**Trigger:** After any Flutter UI change or Next.js page change  
**Mandatory reads:** `06-Brand-Design-System.md` (RTL rules), `10-ADR-Log.md` (ADR-014)  
**Output:**
- List of RTL violations (left/right instead of start/end, hardcoded strings, non-intl numbers)
- Auto-fix suggestions with correct code
- Screenshot diff description for AR vs EN layout (where possible)

---

#### Agent 12 — `pr-review-agent`

**Trigger:** Before merging any PR to `develop` or `main`  
**Mandatory reads:** `10-ADR-Log.md`, `13-Agent-Protocol.md` (Gate 4 checklist)  
**Output:**
- Structured PR review report (pass/fail per Gate 4 item)
- Code quality observations (not style — only correctness and safety)
- Handoff note to `HANDOFFS.md` if output needed by another agent
- Explicit approval or block with reason

---

### Category C — Domain-Specific Agents (5 agents)

---

#### Agent 13 — `arabic-copy-agent`

**Trigger:** Any new UI string, marketing copy, or notification content  
**Mandatory reads:** `06-Brand-Design-System.md` (tone of voice), existing `app_ar.arb`  
**Output:**
- Arabic string (MSA, maritime context, appropriate formality level)
- English equivalent
- Key name following `{screen}.{component}.{element}` convention
- RTL text direction note (if string contains mixed AR/EN or numbers)
- Entries ready to paste into `.arb` / `.json` files

---

#### Agent 14 — `db-query-agent`

**Trigger:** Slow query alert from Supabase, or any query touching >10K rows  
**Mandatory reads:** `04-Database-Schema.md` (table indexes), Supabase query plan  
**Output:**
- `EXPLAIN ANALYZE` interpretation
- Index recommendation (specific `CREATE INDEX CONCURRENTLY` command)
- ORM query rewrite using Django annotations or `select_related`/`prefetch_related`
- Estimated performance improvement

---

#### Agent 15 — `weather-fishing-agent`

**Trigger:** New port added, new species added, or fishing season data update  
**Mandatory reads:** `09-Weather-FishingSeasons.md`  
**Output:**
- Seed data SQL for new port or species
- Season rating matrix entries
- Weather advisory threshold validation
- Updated port list in API spec if new port added

---

#### Agent 16 — `expansion-agent`

**Trigger:** Entering a new market (Phase 3+)  
**Mandatory reads:** `11-Expansion-Architecture.md`, `08-Growth-Strategy/01-Expansion-Playbook.md`, target country profile  
**Output:**
- Region seed data (code, currency, timezone)
- New `PaymentProvider` class scaffold for target country
- Commission rates seed data for new region
- New port/location seed data for new country
- i18n locale file scaffold for new language (if required)
- New compliance document scaffold in `06-Geographic-Regulatory/`

---

#### Agent 17 — `admin-portal-agent`

**Trigger:** New admin management page needed  
**Mandatory reads:** `07-UX-Flows.md` (admin pages), existing admin pages  
**Output:**
- Next.js admin page (Client Component, shadcn/ui data table)
- Server action for mutations
- API endpoint in `admin_portal` module
- Role permission guard (`admin` role only)

---

### Category D — Process & Orchestration Agents (3 agents)

---

#### Agent 18 — `sprint-kickoff-agent`

**Trigger:** Start of each development sprint  
**Mandatory reads:** `05-MVP-Scope.md`, `HANDOFFS.md`, previous `SPRINT-{N}.md`, `AGENT-COSTS.md`  
**Output:**
- `SPRINT-{N+1}.md` with full task list
- Task breakdown: which agent handles which task, dependencies, order
- Estimated token budget for the sprint
- List of files each task will touch
- Any carry-over from previous sprint
- Updated `HANDOFFS.md` for sprint start state

---

#### Agent 19 — `technical-orchestrator-agent`

**Trigger:** Cross-agent conflict, architectural question, or multi-module feature  
**Mandatory reads:** `10-ADR-Log.md`, `13-Agent-Protocol.md`, `HANDOFFS.md`, all affected module specs  
**Output:**
- Conflict resolution decision (with rationale referencing ADRs)
- Updated `HANDOFFS.md` if blocked items can be unblocked
- New ADR proposal if the conflict reveals an undecided architecture question
- Task re-sequencing plan if dependencies require reordering

---

#### Agent 20 — `release-agent`

**Trigger:** Before any production release (merge to `main`)  
**Mandatory reads:** `14-Environments-Pipelines.md`, `SPRINT-{N}.md`, all pending migrations  
**Output:**
- `RELEASE-{version}.md` with: changes included, migrations list, rollback plan, smoke test checklist
- UAT sign-off checklist (confirms human review was done)
- Migration safety report (delegates to Agent 10)
- Feature flag state summary (which flags are on/off in this release)
- Go / no-go recommendation with rationale

---

## Part 3: Module × Agent Responsibility Matrix

Which agents touch which modules:

| Module | Primary Agent | QA Agent | Review Agent |
|--------|--------------|---------|-------------|
| `accounts` | `api-endpoint-agent` + `django-model-agent` | `test-writer-agent` | `security-audit-agent` |
| `core` | `django-model-agent` + `expansion-agent` | `test-writer-agent` | `pr-review-agent` |
| `listings` | `api-endpoint-agent` + `django-model-agent` | `test-writer-agent` | `migration-safety-agent` |
| `bookings` | `api-endpoint-agent` + `django-model-agent` | `test-writer-agent` | `security-audit-agent` |
| `payments` | `payment-integration-agent` | `test-writer-agent` | `security-audit-agent` |
| `marketplace` | `api-endpoint-agent` + `django-model-agent` | `test-writer-agent` | `pr-review-agent` |
| `competitions` | `api-endpoint-agent` + `django-model-agent` | `test-writer-agent` | `pr-review-agent` |
| `weather` | `weather-fishing-agent` + `celery-task-agent` | `test-writer-agent` | `pr-review-agent` |
| `reviews` | `api-endpoint-agent` + `django-model-agent` | `test-writer-agent` | `pr-review-agent` |
| `notifications` | `notification-agent` + `celery-task-agent` | `test-writer-agent` | `pr-review-agent` |
| `search` | `api-endpoint-agent` + `db-query-agent` | `test-writer-agent` | `pr-review-agent` |
| `analytics` | `django-model-agent` + `celery-task-agent` | `test-writer-agent` | `pr-review-agent` |
| `admin_portal` | `admin-portal-agent` | `test-writer-agent` | `security-audit-agent` |
| Flutter screens | `flutter-screen-agent` | `rtl-audit-agent` | `pr-review-agent` |
| Next.js pages | `nextjs-page-agent` | `rtl-audit-agent` | `pr-review-agent` |
| Migrations | `migration-safety-agent` | — | `migration-safety-agent` |
| Sprint planning | `sprint-kickoff-agent` | — | `technical-orchestrator-agent` |
| Releases | `release-agent` | — | `technical-orchestrator-agent` |

---

## Part 4: Sprint-by-Sprint Agent Activation

> **Web-First Strategy (decided April 2026):** All Flutter mobile sprints are deferred to Year 2. Sprints 1–20 focus on the Next.js web app + Django backend only.

| Sprint | Goal | Active Agents |
|--------|------|--------------|
| 1 | Infrastructure + core setup | `django-model-agent`, `sprint-kickoff-agent` |
| 2 | Auth module complete | `django-model-agent`, `api-endpoint-agent`, `test-writer-agent`, `security-audit-agent` |
| 3 | Listings module + web explore page | `django-model-agent`, `api-endpoint-agent`, `nextjs-page-agent`, `test-writer-agent` |
| 4 | Bookings module + web booking flow | All above + `rtl-audit-agent` |
| 5 | Payments (Fawry) integration | `payment-integration-agent`, `security-audit-agent`, `test-writer-agent` |
| 6 | Marketplace module + web marketplace pages | `api-endpoint-agent`, `nextjs-page-agent`, `rtl-audit-agent` |
| 7 | Admin portal + approval workflows | `admin-portal-agent`, `nextjs-page-agent`, `security-audit-agent` |
| 8 | Reviews + notifications | `api-endpoint-agent`, `notification-agent`, `nextjs-page-agent` |
| 9 | Weather + fishing guide web pages | `weather-fishing-agent`, `nextjs-page-agent`, `celery-task-agent` |
| 10 | Search + semantic matching | `api-endpoint-agent`, `db-query-agent` |
| 11–14 | Polish, RTL QA, performance | `rtl-audit-agent`, `db-query-agent`, `test-writer-agent` |
| 15–17 | Load testing + security hardening | `security-audit-agent`, `migration-safety-agent` |
| 18–20 | Soft launch + production release | `release-agent`, `technical-orchestrator-agent` |

**Year 2+ (Mobile Phase):** Activate `flutter-screen-agent`, `rtl-audit-agent` (Flutter), add mobile sprints after web PMF confirmed.
