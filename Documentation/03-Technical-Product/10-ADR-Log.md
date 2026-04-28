# Architecture Decision Records (ADR) Log — SeaConnect
**Version:** 1.0  
**Date:** April 8, 2026  
**Status:** Active — All agents must read this file before making architectural decisions.

---

## Purpose

This document is the **single source of truth for all architectural decisions** made on SeaConnect. Every decision recorded here:
- Has a status: `Accepted` | `Deprecated` | `Superseded`
- Has a rationale (so agents and new team members understand *why*)
- Has consequences (what it enables and what it constrains)
- Has a reversal cost (low / medium / high / irreversible)

**Rule for AI Agents:** Before proposing any architectural change, check this log. If your proposal conflicts with an `Accepted` ADR, you must explicitly flag the conflict and get human approval before proceeding.

---

## ADR Index

| ID | Title | Status | Date | Reversal Cost |
|----|-------|--------|------|---------------|
| ADR-001 | Django + DRF as backend framework | Accepted | 2026-04-06 | High |
| ADR-002 | Flutter for mobile (iOS + Android) | Accepted | 2026-04-06 | High |
| ADR-003 | Next.js 14 for web app and admin portal | Accepted | 2026-04-06 | Medium |
| ADR-004 | PostgreSQL 16 via Supabase | Accepted | 2026-04-06 | High |
| ADR-005 | Redis via Upstash for caching | Accepted | 2026-04-06 | Low |
| ADR-006 | Monolith-first architecture | Accepted | 2026-04-06 | Medium |
| ADR-007 | PaymentProvider abstraction layer | Accepted | 2026-04-08 | Low |
| ADR-008 | Fawry as Phase 1 payment provider | Accepted | 2026-04-06 | Low |
| ADR-009 | JWT authentication (RS256, 15min/30day) | Accepted | 2026-04-06 | Medium |
| ADR-010 | Cloudflare R2 for file storage | Accepted | 2026-04-06 | Low |
| ADR-011 | Celery + Celery Beat for async tasks | Accepted | 2026-04-06 | Medium |
| ADR-012 | Event sourcing for booking state changes | Accepted | 2026-04-08 | Low |
| ADR-013 | Cursor-based pagination on all list endpoints | Accepted | 2026-04-06 | Low |
| ADR-014 | Arabic-first, RTL-first UI design | Accepted | 2026-04-06 | High |
| ADR-015 | i18n content key system (not hardcoded strings) | Accepted | 2026-04-08 | Medium |
| ADR-016 | Open-Meteo API for weather data | Accepted | 2026-04-07 | Low |
| ADR-017 | Railway for backend hosting (Phase 1) | Accepted | 2026-04-06 | Low |
| ADR-018 | Multi-region deployment design from Sprint 1 | Accepted | 2026-04-08 | High |
| ADR-019 | pgvector for semantic search and embeddings | Accepted | 2026-04-06 | Low |
| ADR-020 | GitHub Actions for CI/CD | Accepted | 2026-04-06 | Low |

---

## ADR-001 — Django + DRF as Backend Framework

**Status:** Accepted  
**Date:** 2026-04-06  
**Reversal Cost:** High

### Decision
Use Django 5.x + Django REST Framework 3.15 as the sole backend framework.

### Context
We needed a backend framework that handles a 3-sided marketplace with complex permissions, an admin panel, payment webhooks, async tasks, and Arabic content — while being accessible to Egyptian developers.

### Rationale
- Django Admin replaces a custom admin panel for Phase 1 (saves 2 sprints)
- Django ORM handles complex multi-table queries without raw SQL
- Python is the native language of our AI/ML stack (OpenAI, LangChain, pgvector)
- Egyptian developer market has strong Django supply
- DRF has proven patterns for marketplace APIs (throttling, permissions, serializers)

### Consequences
- **Enables:** Fast admin panel, rich ORM, Python ML libraries
- **Constrains:** Cannot use Node.js-native libraries; GIL limits CPU-bound parallelism (use Celery workers instead)
- **Agent rule:** Never introduce raw SQL. Use Django ORM or annotated querysets.

---

## ADR-002 — Flutter for Mobile

**Status:** Accepted  
**Date:** 2026-04-06  
**Reversal Cost:** High

### Decision
Single Flutter codebase targeting Android and iOS.

### Rationale
- Single codebase = one agent maintains both platforms
- Dart is strongly typed (fewer agent-generated bugs vs JavaScript)
- Material 3 component library has RTL support built in
- Flutter Web considered and rejected (SEO limitations for listing pages)

### Consequences
- **Enables:** Shared business logic, single CI pipeline for both platforms
- **Constrains:** No native module access without platform channels; React Native devs cannot contribute without learning Dart
- **Agent rule:** All Flutter code must use `EdgeInsetsDirectional` not `EdgeInsets` for RTL compatibility. All strings via `AppLocalizations`.

---

## ADR-003 — Next.js 14 for Web and Admin

**Status:** Accepted  
**Date:** 2026-04-06  
**Reversal Cost:** Medium

### Decision
Next.js 14 (App Router, TypeScript) for the customer-facing web and admin portal.

### Rationale
- SSR for SEO on listing pages (boat pages must be crawlable)
- App Router supports server components (reduce client bundle for slow Egyptian connections)
- Vercel deployment is zero-config
- TypeScript enforced by agents to prevent type errors

### Consequences
- **Enables:** SEO-indexed listings, fast TTFB, shared TypeScript types with API
- **Constrains:** No React Native code sharing (separate from Flutter)
- **Agent rule:** Public listing pages (`/yacht/[id]`, `/vendor/[id]`) must use Server Components. Admin pages can use Client Components.

---

## ADR-004 — PostgreSQL 16 via Supabase

**Status:** Accepted  
**Date:** 2026-04-06  
**Reversal Cost:** High

### Decision
PostgreSQL 16 hosted on Supabase as the primary database.

### Rationale
- pgvector extension for semantic search (boat matching)
- Row-level security for multi-tenant data isolation
- Supabase provides managed backups, point-in-time recovery, and connection pooling
- PostgreSQL JSONB for flexible metadata fields without schema migrations

### Consequences
- **Enables:** Vector search, RLS policies, JSONB columns, full-text search
- **Constrains:** Cannot use MySQL-only features; Supabase vendor lock-in on managed features
- **Agent rule:** Never use `TextField` for structured data. Use `JSONField` or a proper related table. All migrations must be reversible.

---

## ADR-005 — Redis via Upstash for Caching

**Status:** Accepted  
**Date:** 2026-04-06  
**Reversal Cost:** Low

### Decision
Redis 7.x via Upstash (serverless Redis) for caching and Celery broker.

### Rationale
- Upstash is serverless — no idle cost in early months
- REST-compatible (works from edge functions if needed later)
- Celery broker and cache in one service simplifies infrastructure

### Consequences
- **Enables:** Zero-cost idle, Celery task queue, session cache, weather cache (6h TTL)
- **Constrains:** 1MB max value size on free tier; large payloads must be stored in DB
- **Agent rule:** All cache keys must follow the pattern `sc:{module}:{id}:{version}`. TTLs must always be set explicitly — never cache without TTL.

---

## ADR-006 — Monolith-First Architecture

**Status:** Accepted  
**Date:** 2026-04-06  
**Reversal Cost:** Medium

### Decision
Single Django application with modular Django apps. No microservices until Year 2.

### Context
Early-stage marketplace. Premature microservices add distributed systems complexity (network failures, service discovery, distributed tracing) before product-market fit is proven.

### Rationale
- Single deploy pipeline, single DB, single test suite
- Django apps (`bookings`, `marketplace`, `competitions`, `weather`, `accounts`) are the bounded contexts — extractable later if needed
- Monolith is debuggable by one developer or one AI agent without distributed tracing

### Trigger for Extraction
Extract a service when: >1,000 RPS sustained on that module OR team size >8 engineers dedicated to that module.

### Consequences
- **Enables:** Fast iteration, simple debugging, no inter-service network calls
- **Constrains:** Cannot scale individual modules independently until extracted
- **Agent rule:** Django apps must never import from each other directly. Use signals or a shared `services/` layer for cross-app communication.

---

## ADR-007 — PaymentProvider Abstraction Layer

**Status:** Accepted  
**Date:** 2026-04-08  
**Reversal Cost:** Low

### Decision
All payment operations must go through a `PaymentProvider` abstract interface. No direct calls to Fawry/Stripe APIs anywhere in business logic.

### Context
SeaConnect launches in Egypt with Fawry. The 5-year plan requires UAE (Telr/PayTabs), KSA (Mada), Morocco (CMI), and EU (Stripe) expansion. Without an abstraction layer, adding each new country requires modifying core booking logic.

### Interface Contract

```python
# payments/providers/base.py
from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal
from typing import Optional

@dataclass
class PaymentIntent:
    provider_id: str          # Fawry ref / Stripe PI id
    amount: Decimal
    currency: str             # ISO 4217: EGP, AED, SAR, EUR
    status: str               # pending / authorized / captured / failed
    redirect_url: Optional[str]
    raw_response: dict

@dataclass
class WebhookEvent:
    event_type: str           # payment.success / payment.failed / refund.issued
    payment_id: str
    amount: Decimal
    currency: str
    metadata: dict

@dataclass
class Refund:
    refund_id: str
    original_payment_id: str
    amount: Decimal
    status: str               # pending / completed / failed

class PaymentProvider(ABC):

    @abstractmethod
    def create_payment(
        self,
        amount: Decimal,
        currency: str,
        reference: str,
        customer_email: str,
        metadata: dict
    ) -> PaymentIntent:
        """Initiate a new payment. Returns intent with redirect URL if needed."""

    @abstractmethod
    def verify_webhook(
        self,
        payload: bytes,
        signature: str
    ) -> WebhookEvent:
        """Verify and parse an incoming webhook. Raises InvalidSignature on failure."""

    @abstractmethod
    def issue_refund(
        self,
        payment_id: str,
        amount: Decimal,
        reason: str
    ) -> Refund:
        """Issue a full or partial refund."""

    @abstractmethod
    def get_payment_status(self, payment_id: str) -> str:
        """Poll payment status. Returns: pending/authorized/captured/failed."""
```

### Provider Registry

```python
# payments/providers/registry.py
from django.conf import settings

PROVIDER_MAP = {
    'EGP': 'payments.providers.fawry.FawryProvider',
    'AED': 'payments.providers.telr.TelrProvider',      # Phase 3
    'SAR': 'payments.providers.mada.MadaProvider',      # Phase 4
    'EUR': 'payments.providers.stripe.StripeProvider',  # Phase 3
}

def get_provider(currency: str) -> PaymentProvider:
    provider_path = PROVIDER_MAP.get(currency)
    if not provider_path:
        raise ValueError(f"No payment provider configured for currency: {currency}")
    module_path, class_name = provider_path.rsplit('.', 1)
    module = importlib.import_module(module_path)
    return getattr(module, class_name)()
```

### Rationale
- Adding a new country = write one new Provider class + add one line to PROVIDER_MAP
- Business logic in `bookings/` never changes when adding new payment providers
- Enables parallel development: agent can write Telr provider without touching booking logic

### Consequences
- **Enables:** UAE/KSA/EU expansion as 2-day tasks, testability via mock providers
- **Constrains:** All payment code must go through the interface — no shortcuts
- **Agent rule:** Any call to payment APIs must use `get_provider(currency)`. Direct imports of `fawry`, `stripe`, or any payment SDK are forbidden outside `payments/providers/`.

---

## ADR-008 — Fawry as Phase 1 Payment Provider

**Status:** Accepted  
**Date:** 2026-04-06  
**Reversal Cost:** Low

### Decision
Fawry API v2 is the sole payment provider for Egypt (EGP) in Phase 1.

### Rationale
- Fawry has 37M+ registered users in Egypt
- Supports cash payment (Fawry outlets) — critical for unbanked Egyptian customers
- Supports Meeza cards (Egyptian national debit card)
- No Stripe Egypt support for marketplace payouts

### Consequences
- **Enables:** Cash payments, Meeza, Visa/MC for Egyptian users
- **Constrains:** EGP only; international tourists must use cash or workaround until Stripe added in Phase 2

---

## ADR-009 — JWT Authentication (RS256)

**Status:** Accepted  
**Date:** 2026-04-06  
**Reversal Cost:** Medium

### Decision
JWT with RS256 signing. Access token: 15 minutes. Refresh token: 30 days. OTP via Twilio for phone verification.

### Rationale
- RS256 (asymmetric) allows future microservices to verify tokens without the private key
- 15-minute access token limits exposure if token is intercepted
- Phone OTP is mandatory for Egyptian users (CBE compliance requirement)

### Consequences
- **Enables:** Stateless auth, future service-to-service token verification
- **Constrains:** Requires key rotation plan; RS256 is slower than HS256 (negligible at our scale)
- **Agent rule:** Never store JWT in localStorage. Mobile: Flutter secure storage. Web: httpOnly cookie only.

---

## ADR-010 — Cloudflare R2 for File Storage

**Status:** Accepted  
**Date:** 2026-04-06  
**Reversal Cost:** Low

### Decision
Cloudflare R2 for all user-uploaded files (boat photos, KYC documents, product images).

### Rationale
- Zero egress fees (vs AWS S3 egress billing)
- Cloudflare CDN integration built-in
- S3-compatible API — django-storages supports it natively

### Consequences
- **Enables:** Free CDN delivery, no egress surprise bills, S3-compatible SDK
- **Constrains:** No Lambda@Edge equivalent (Cloudflare Workers instead if needed)
- **Agent rule:** Never store uploaded files in the Django container or PostgreSQL. Always use `django-storages` with R2 backend. File size limits: photos 10MB, documents 25MB.

---

## ADR-011 — Celery + Celery Beat for Async Tasks

**Status:** Accepted  
**Date:** 2026-04-06  
**Reversal Cost:** Medium

### Decision
Celery 5.x with Redis broker for async tasks. Celery Beat for scheduled tasks.

### Rationale
- Payment webhooks must be processed asynchronously (Fawry expects 200 response within 5 seconds)
- Payout release (24h after trip) requires scheduled tasks
- Weather prefetching (daily 06:00 EGT) requires cron-like scheduling

### Scheduled Tasks Registry

| Task | Schedule | Module |
|------|----------|--------|
| `release_held_payouts` | Daily 08:00 EGT | payments |
| `expire_pending_bookings` | Every 30 min | bookings |
| `prefetch_weather` | Daily 06:00 EGT | weather |
| `refresh_weather_cache` | Every 6h | weather |
| `send_trip_reminders` | Daily 07:00 EGT | notifications |
| `generate_owner_reports` | Weekly Monday 09:00 | analytics |

### Consequences
- **Enables:** Non-blocking webhooks, scheduled payouts, background notifications
- **Constrains:** Tasks must be idempotent (safe to retry on failure)
- **Agent rule:** All Celery tasks must have `max_retries=3`, `default_retry_delay=60`. Tasks must be idempotent — check state before acting.

---

## ADR-012 — Event Sourcing for Booking State Changes

**Status:** Accepted  
**Date:** 2026-04-08  
**Reversal Cost:** Low

### Decision
Every booking state change is recorded as an immutable event in a `booking_events` table. The booking's current state is always derivable from its event history.

### Context
Booking disputes are the highest-risk customer support scenario. Without an audit trail, resolving "did the owner cancel or did the customer?" is impossible. ML models for fraud detection also need labeled event sequences.

### Event Schema

```sql
CREATE TABLE booking_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id  UUID NOT NULL REFERENCES bookings(id),
    event_type  VARCHAR(50) NOT NULL,
    -- Values: created, payment_initiated, payment_confirmed, payment_failed,
    --         owner_confirmed, owner_declined, customer_cancelled,
    --         owner_cancelled, trip_started, trip_completed,
    --         payout_released, refund_initiated, refund_completed, disputed
    actor_id    UUID REFERENCES users(id),  -- NULL for system events
    actor_type  VARCHAR(20) NOT NULL,       -- customer / owner / system / admin
    payload     JSONB NOT NULL DEFAULT '{}',
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- NO UPDATE, NO DELETE — this table is append-only
    CONSTRAINT no_future_events CHECK (occurred_at <= NOW() + INTERVAL '1 minute')
);

-- Immutability enforced at DB level
CREATE RULE booking_events_no_update AS ON UPDATE TO booking_events DO INSTEAD NOTHING;
CREATE RULE booking_events_no_delete AS ON DELETE TO booking_events DO INSTEAD NOTHING;
```

### Consequences
- **Enables:** Full audit trail, dispute resolution, ML training data, time-travel debugging
- **Constrains:** Events are permanent — wrong events must be corrected with a compensating event, not deletion
- **Agent rule:** Any booking state change must write to `booking_events` within the same database transaction as the state change itself. Use `transaction.atomic()`. Never update booking state without an event.

---

## ADR-013 — Cursor-Based Pagination

**Status:** Accepted  
**Date:** 2026-04-06  
**Reversal Cost:** Low

### Decision
All list endpoints use cursor-based pagination, not offset pagination.

### Rationale
- Offset pagination breaks on live data (items shift positions between pages)
- Cursor pagination is stable for real-time boat/product listings
- Required for infinite scroll in mobile app

### Standard Response Format

```json
{
  "results": [...],
  "next_cursor": "eyJpZCI6IjEyMyJ9",
  "has_more": true,
  "total_count": null
}
```

Note: `total_count` is always null (cursor pagination cannot efficiently compute total count). UI must use "load more" pattern, never "page X of Y".

### Consequences
- **Agent rule:** Never use `PageNumberPagination` in DRF. Always use `CursorPagination` with `ordering = '-created_at'` as default.

---

## ADR-014 — Arabic-First, RTL-First UI

**Status:** Accepted  
**Date:** 2026-04-06  
**Reversal Cost:** High

### Decision
Arabic is the primary language. All UI is designed RTL-first, with English as the secondary language.

### Rules

**Flutter:**
- Use `EdgeInsetsDirectional` everywhere (never `EdgeInsets` with hardcoded left/right)
- Use `start`/`end` alignment (never `left`/`right`)
- All user-facing strings via `AppLocalizations` — no hardcoded Arabic or English strings
- Number formatting via `intl` package (Arabic numerals for AR locale)

**Next.js:**
- `<html dir="rtl" lang="ar">` on Arabic pages
- Use `logical CSS properties` (`margin-inline-start` not `margin-left`)
- Tailwind: use `ms-` and `me-` (margin-start/end) not `ml-`/`mr-`

### Consequences
- **Constrains:** Every new UI component must be tested in both RTL and LTR before merging
- **Agent rule:** Raise a flag if any component uses hardcoded `left`/`right` directional values. All new screens must include both `ar` and `en` strings in localization files.

---

## ADR-015 — i18n Content Key System

**Status:** Accepted  
**Date:** 2026-04-08  
**Reversal Cost:** Medium

### Decision
All user-facing strings are referenced by content keys, never hardcoded. Translation files are the single source of truth for all copy.

### Structure

```
# Flutter
lib/
  l10n/
    app_ar.arb    ← Arabic (primary, written first)
    app_en.arb    ← English (secondary)

# Next.js
messages/
  ar.json         ← Arabic (primary)
  en.json         ← English (secondary)
  fr.json         ← French (Phase 3 — North Africa)
  tr.json         ← Turkish (Phase 4)
```

### Key Naming Convention

```
{screen}.{component}.{element}
Examples:
  explore.search.placeholder
  booking.confirm.cta_button
  owner.dashboard.earnings_title
  error.network.retry_message
```

### Rationale
- Enables adding French (Morocco/Tunisia) and Turkish without code changes
- Enables A/B testing copy without deploys
- Enables non-technical content editors to update copy

### Consequences
- **Agent rule:** Never write a string literal in Flutter widgets or Next.js JSX. Always use `AppLocalizations.of(context)!.keyName` (Flutter) or `t('keyName')` (Next.js). When adding a new screen, add all strings to `app_ar.arb` first, then `app_en.arb`.

---

## ADR-016 — Open-Meteo for Weather Data

**Status:** Accepted  
**Date:** 2026-04-07  
**Reversal Cost:** Low

### Decision
Open-Meteo API for all marine weather data. No API key required. Free tier: 10,000 calls/day.

### Rationale
- Free at our scale (Phase 1: <500 calls/day)
- Marine-specific parameters: `wave_height`, `wind_speed`, `weathercode`
- No vendor lock-in risk (open-source API)

### Cache Strategy
- Redis: 6h TTL per port per date
- DB: `weather_cache` table stores fetched data for historical analysis and ML training

### Consequences
- **Agent rule:** Never call Open-Meteo directly from a request handler. Always check Redis cache first. If miss, fetch and cache. Weather data older than 6h is stale.

---

## ADR-017 — Railway for Backend Hosting (Phase 1)

**Status:** Accepted  
**Date:** 2026-04-06  
**Reversal Cost:** Low

### Decision
Railway.app for Django API + Celery workers in Phase 1 (Egypt only).

### Migration Trigger
Migrate to Fly.io multi-region when: Monthly active users >10,000 OR expanding to second country.

### Rationale
- Railway has zero DevOps overhead for a solo/small team
- Docker-based — migration to any other host is low-friction
- Cost: ~$20–50/month for Phase 1 load

### Consequences
- **Enables:** Fast deployment, automatic SSL, built-in metrics
- **Constrains:** Single-region only; no multi-AZ; not suitable for >50K MAU
- **Agent rule:** All configuration via environment variables. No hardcoded Railway-specific APIs in application code. Dockerfile must be self-contained and portable.

---

## ADR-018 — Multi-Region Deployment Design from Sprint 1

**Status:** Accepted  
**Date:** 2026-04-08  
**Reversal Cost:** High

### Decision
Even though Phase 1 is Egypt-only, the system must be *designed* for multi-region from Sprint 1. This means:

1. **No geography-hardcoded logic** in application code
2. **Database rows have a `region` field** where applicable
3. **Currency is always stored and processed explicitly** — never assumed to be EGP
4. **Payment provider is selected by currency**, not hardcoded
5. **All dates stored in UTC**, converted to user's timezone at display layer

### Region Configuration Model

```python
# core/models.py
class Region(models.Model):
    code        = models.CharField(max_length=10, unique=True)  # eg, sa-egy
    name_ar     = models.CharField(max_length=100)
    name_en     = models.CharField(max_length=100)
    currency    = models.CharField(max_length=3)     # ISO 4217: EGP, AED, SAR
    timezone    = models.CharField(max_length=50)    # Africa/Cairo, Asia/Dubai
    is_active   = models.BooleanField(default=False)
    launched_at = models.DateTimeField(null=True, blank=True)

# Seed data (Phase 1 — Egypt only active)
REGIONS = [
    {'code': 'sa-egy', 'name_ar': 'مصر', 'name_en': 'Egypt',   'currency': 'EGP', 'timezone': 'Africa/Cairo',  'is_active': True},
    {'code': 'sa-uae', 'name_ar': 'الإمارات', 'name_en': 'UAE', 'currency': 'AED', 'timezone': 'Asia/Dubai',   'is_active': False},
    {'code': 'sa-ksa', 'name_ar': 'السعودية', 'name_en': 'KSA', 'currency': 'SAR', 'timezone': 'Asia/Riyadh', 'is_active': False},
]
```

### Consequences
- **Enables:** UAE/KSA launch as a config change + new provider, not a codebase rewrite
- **Constrains:** Slightly more complex models from day 1
- **Agent rule:** Any model that holds location-specific data must have a `region` FK or `currency` field. Never write `currency = 'EGP'` as a hardcoded default anywhere except seed data.

---

## ADR-019 — pgvector for Semantic Search

**Status:** Accepted  
**Date:** 2026-04-06  
**Reversal Cost:** Low

### Decision
pgvector PostgreSQL extension for boat/product embedding storage and semantic similarity search.

### Use Cases
- "Find me a boat similar to this one" (vector similarity)
- AI-powered trip recommendation ("family of 4 wanting snorkeling near Hurghada")
- Semantic product search in marketplace

### Consequences
- **Enables:** AI-powered matching without a separate vector database
- **Constrains:** Embedding dimensions must be consistent (OpenAI `text-embedding-3-small` = 1536 dims)
- **Agent rule:** All embedding columns use `VectorField(dimensions=1536)`. Embeddings are regenerated whenever the source text (boat description, product description) changes.

---

## ADR-020 — GitHub Actions for CI/CD

**Status:** Accepted  
**Date:** 2026-04-06  
**Reversal Cost:** Low

### Decision
GitHub Actions as the sole CI/CD pipeline. No external CI services (CircleCI, Jenkins, etc.).

### Pipeline Rules

**On every PR:**
1. Run Django tests (`pytest`) — must pass
2. Run Flutter tests — must pass  
3. Run ESLint + TypeScript check on Next.js — must pass
4. Run security scan (Bandit for Python, npm audit for JS) — must pass
5. Agent-generated code is treated identically to human-generated code — no exceptions

**On merge to main:**
1. All PR checks must have passed
2. Deploy to staging automatically
3. Run smoke tests against staging
4. Manual approval required before production deploy

### Consequences
- **Agent rule:** Never suggest bypassing CI with `--no-verify` or skipping tests. If tests fail on agent-generated code, fix the code — don't disable the test.

---

## How to Add a New ADR

When making an architectural decision that affects multiple files, costs significant effort to reverse, or will confuse future agents/developers:

1. Copy the template below
2. Assign the next sequential ID
3. Add a row to the ADR Index at the top of this file
4. Get human approval before marking status as `Accepted`

### ADR Template

```markdown
## ADR-XXX — [Short Title]

**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-YYY  
**Date:** YYYY-MM-DD  
**Reversal Cost:** Low | Medium | High | Irreversible

### Decision
[One paragraph stating the decision clearly.]

### Context
[Why did this decision need to be made?]

### Rationale
[Why this option over alternatives?]

### Consequences
- **Enables:** [What does this unlock?]
- **Constrains:** [What does this prevent?]
- **Agent rule:** [Specific instruction for AI agents working on this codebase]
```
