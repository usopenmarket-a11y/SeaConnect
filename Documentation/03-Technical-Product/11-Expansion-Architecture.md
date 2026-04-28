# Expansion Architecture — SeaConnect
**Version:** 1.0  
**Date:** April 8, 2026  
**Status:** Active — Binding technical design for global expansion

---

## Purpose

This document defines how SeaConnect scales from Egypt to MENA to global — technically, operationally, and legally. Every architectural decision made in Sprint 1 must be consistent with this plan. Retrofitting for multi-region after launch is 10x more expensive than designing for it upfront.

---

## 1. Expansion Roadmap

### Phase Timeline

| Phase | Markets | Target Date | Key Gate |
|-------|---------|-------------|----------|
| **Phase 1** | Egypt only | Launch Q3 2026 | 50 trips/month, Fawry live |
| **Phase 2** | Egypt mature | Q1 2027 | 200 trips/month, break-even unit economics |
| **Phase 3** | UAE | Q3 2027 | Egypt >500 trips/month, UAE supply secured (30+ boats) |
| **Phase 4** | KSA | Q1 2028 | UAE profitable, KSA regulatory approval |
| **Phase 5** | Morocco + Tunisia | Q3 2028 | North Africa cluster |
| **Phase 6** | Turkey + Greece | 2029 | Mediterranean cluster |
| **Phase 7** | Southeast Asia | 2030 | Global phase — Thailand, Indonesia |

### Expansion Gate Criteria (must meet ALL before entering new market)

1. Current market profitable at unit economics level (contribution margin positive)
2. Operational playbook written and tested (onboarding, support, legal)
3. Local supply secured before launch (min 20 boats OR 15 vendors)
4. Payment provider contracted and integrated
5. Local legal entity registered OR partner arrangement in place
6. At least one local operations person hired or contracted

---

## 2. Multi-Region Infrastructure Architecture

### 2.1 Phase 1 — Egypt Only (Single Region)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare (DNS + CDN + WAF)                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        Flutter App    Next.js (Vercel)  Admin Portal
        (App Stores)   (global CDN)     (Vercel)
              │              │              │
              └──────────────┼──────────────┘
                             │
                             ▼
              ┌──────────────────────────────┐
              │     Django API (Railway)      │
              │     Region: eu-west (Paris)   │
              │     — closest to Egypt        │
              └──────┬──────────────┬─────────┘
                     │              │
              ┌──────▼───┐   ┌──────▼──────────┐
              │ Supabase  │   │  Upstash Redis   │
              │ PostgreSQL│   │  (Global Edge)   │
              │ (eu-west) │   └──────────────────┘
              └──────┬────┘
                     │
              ┌──────▼──────────┐
              │ Cloudflare R2   │
              │ (File Storage)  │
              └─────────────────┘
```

### 2.2 Phase 3 — UAE Added (Multi-Region)

```
┌──────────────────────────────────────────────────────────────────────┐
│                     Cloudflare (Global DNS + CDN + WAF)               │
│            Route by: User's region → nearest API cluster             │
└────────────┬─────────────────────────────────────┬──────────────────┘
             │                                     │
    ┌────────▼──────────┐               ┌──────────▼──────────┐
    │  Egypt Cluster    │               │   UAE Cluster        │
    │  Fly.io eu-west   │               │   Fly.io Middle East │
    │  (Paris/Amsterdam)│               │   (Dubai)            │
    │                   │               │                      │
    │  Django API       │               │  Django API          │
    │  Celery Workers   │               │  Celery Workers      │
    └────────┬──────────┘               └──────────┬───────────┘
             │                                     │
    ┌────────▼──────────┐               ┌──────────▼───────────┐
    │  Supabase Egypt   │               │  Supabase UAE        │
    │  (EU region)      │               │  (ME region)         │
    │  EGP transactions │               │  AED transactions    │
    └───────────────────┘               └──────────────────────┘
             │                                     │
             └──────────────┬──────────────────────┘
                            │
                   ┌────────▼──────────┐
                   │  Global Services  │
                   │  - Cloudflare R2  │
                   │  - Upstash Redis  │
                   │  - SendGrid       │
                   │  - Sentry         │
                   └───────────────────┘
```

### 2.3 Migration Plan: Railway → Fly.io

Railway is Phase 1 only. Migrate when MAU > 10,000 or entering second country.

| Step | Action | Risk |
|------|--------|------|
| 1 | Dockerize everything (already required by ADR-017) | None |
| 2 | Deploy to Fly.io staging, run full smoke test suite | Low |
| 3 | DNS cutover with 5-minute TTL pre-set | Low |
| 4 | Keep Railway live for 48h as fallback | None |
| 5 | Decommission Railway | None |

---

## 3. Database Strategy for Multi-Region

### 3.1 Data Isolation by Region

Each country gets its own Supabase project (separate PostgreSQL cluster). This is required for:
- Data residency laws (GDPR in EU, PDPL in KSA, UAE DIFC Law)
- Independent scaling per market
- Regulatory audits per country

```
Global shared data (read-only reference):
  - fish_species (same worldwide)
  - weather_cache (per port, shared)
  - platform_config

Country-isolated data (per-region DB):
  - users (PII — must stay in country)
  - bookings (financial — must stay in country)
  - transactions (CBE/UAE Central Bank requirement)
  - kyc_documents (legal — must stay in country)
  - reviews, listings, products
```

### 3.2 Cross-Region Queries

Cross-region queries are forbidden in application code. Use a **data warehouse** (BigQuery) for cross-region analytics. The application never queries across country databases directly.

```python
# WRONG — never do this
egypt_bookings = Booking.objects.using('egypt').all()
uae_bookings = Booking.objects.using('uae').all()
combined = list(egypt_bookings) + list(uae_bookings)  # ← FORBIDDEN

# RIGHT — each region's API serves its own data
# Cross-region reporting goes through the data warehouse ETL
```

### 3.3 Shared Reference Data Sync

Fish species, port coordinates, and platform config are maintained in a global admin and pushed to each region's DB via a nightly sync job.

```python
# core/tasks.py
@app.task
def sync_reference_data_to_region(region_code: str):
    """Push global reference data to a specific region's DB."""
    # Runs nightly 02:00 UTC
    # Syncs: fish_species, departure_ports, platform_config
```

---

## 4. Payment Architecture by Region

### 4.1 Provider Matrix

| Region | Currency | Primary Provider | Secondary | Launch Phase |
|--------|----------|-----------------|-----------|-------------|
| Egypt | EGP | Fawry | Paymob | Phase 1 |
| UAE | AED | Telr | PayTabs | Phase 3 |
| KSA | SAR | Mada + STC Pay | Moyasar | Phase 4 |
| Morocco | MAD | CMI | PayDunya | Phase 5 |
| Turkey | TRY | İyzico | PayTR | Phase 6 |
| EU | EUR | Stripe | — | Phase 6 |
| Global | USD | Stripe | — | Phase 7 |

### 4.2 Currency Display Rules

```python
# core/currency.py
CURRENCY_CONFIG = {
    'EGP': {'symbol': 'ج.م', 'symbol_en': 'EGP', 'decimals': 2, 'direction': 'after'},
    'AED': {'symbol': 'د.إ', 'symbol_en': 'AED', 'decimals': 2, 'direction': 'before'},
    'SAR': {'symbol': 'ر.س', 'symbol_en': 'SAR', 'decimals': 2, 'direction': 'before'},
    'EUR': {'symbol': '€',   'symbol_en': 'EUR', 'decimals': 2, 'direction': 'before'},
}

def format_amount(amount: Decimal, currency: str, locale: str = 'ar') -> str:
    config = CURRENCY_CONFIG[currency]
    formatted = f"{amount:,.2f}"
    if locale == 'ar':
        return f"{formatted} {config['symbol']}"
    return f"{config['symbol_en']} {formatted}"
```

### 4.3 Commission Rates by Region

Commission rates may vary by market to stay competitive. The database stores rates per region, not hardcoded:

```sql
CREATE TABLE commission_rates (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_id    UUID NOT NULL REFERENCES regions(id),
    service_type VARCHAR(30) NOT NULL,  -- booking / marketplace / competition
    rate         NUMERIC(5,4) NOT NULL, -- 0.1200 = 12%
    effective_from DATE NOT NULL,
    effective_until DATE,               -- NULL = current rate
    UNIQUE (region_id, service_type, effective_from)
);
```

---

## 5. Localization & i18n Architecture

### 5.1 Language Priority by Region

| Region | Primary | Secondary | Phase 3+ |
|--------|---------|-----------|----------|
| Egypt | Arabic (ar-EG) | English (en) | — |
| UAE | Arabic (ar-AE) | English (en) | — |
| KSA | Arabic (ar-SA) | English (en) | — |
| Morocco | Arabic (ar-MA) | French (fr) | Amazigh |
| Turkey | Turkish (tr) | English (en) | — |
| Greece | Greek (el) | English (en) | — |
| Southeast Asia | English (en) | Local language | — |

### 5.2 Content Translation Pipeline

```
New feature → Write Arabic strings first (app_ar.arb / ar.json)
           → English strings second (native team)
           → Submit to translation memory for new language pairs
           → Professional review for legal/payment copy
           → Automated QA: check all keys present, no truncation in RTL
```

**Translation Memory:** Use Phrase (formerly Transifex) or Lokalise as the translation management system. All string keys synchronized from codebase automatically via CI.

### 5.3 Date, Number, and Name Formatting

```dart
// Flutter — always use intl package
import 'package:intl/intl.dart';

// Numbers
NumberFormat.currency(locale: 'ar-EG', symbol: 'ج.م').format(amount)

// Dates
DateFormat.yMMMMd('ar').format(date)  // ٨ أبريل ٢٠٢٦
DateFormat.yMMMMd('en').format(date)  // April 8, 2026

// Names: store full_name as single field
// Never assume "first name + last name" structure
// Arabic names can be 3-5 words; Turkish names are 2 words; Egyptian names often 3
```

### 5.4 Right-to-Left Languages

RTL languages in scope: Arabic (all dialects), Persian/Farsi (Phase 7), Hebrew (if Israel added)

LTR languages in scope: English, French, Turkish, Greek, Thai, Indonesian

**Rule:** The UI direction is set by the *active language*, not the user's country. An Egyptian user who switches to English gets LTR layout.

---

## 6. Legal & Regulatory Architecture

### 6.1 Data Residency Requirements

| Country | Law | Requirement | Implementation |
|---------|-----|-------------|----------------|
| Egypt | PDPL 151/2020 | Egyptian user data in Egypt or EU (adequate protection) | Supabase EU region |
| UAE | DIFC Data Protection Law | UAE resident data in UAE or adequate country | Supabase ME region |
| KSA | PDPL 2021 | KSA national data must stay in KSA | Supabase or local AWS Riyadh |
| EU | GDPR | EU resident data in EU/EEA | Supabase EU region |
| Turkey | KVKK | Turkish user data in Turkey or with transfer mechanism | Supabase EU + SCCs |

### 6.2 Legal Entity Structure

```
SeaConnect Holding (to be determined — Cyprus or UAE Free Zone for tax efficiency)
├── SeaConnect Egypt LLC (ش.ذ.م.م) — Egypt operations
├── SeaConnect UAE LLC — UAE operations (Phase 3)
├── SeaConnect KSA (Ltd or branch) — KSA operations (Phase 4)
└── SeaConnect Morocco SARL — Morocco operations (Phase 5)
```

**Phase 1 action:** Register Egypt LLC. Open holding company structure before Series A (Phase 2 task).

### 6.3 Maritime Regulatory Bodies by Market

| Country | Regulatory Body | License Required |
|---------|----------------|-----------------|
| Egypt | Egyptian Maritime Safety Authority (EMSA) | Vessel registration + captain's license |
| UAE | Federal Transport Authority — Land & Maritime | Maritime vessel registration |
| KSA | Saudi Ports Authority + Coast Guard | Commercial vessel permit |
| Turkey | Directorate General of Coastal Safety | Vessel registration + charter permit |
| Greece | Ministry of Shipping & Island Policy | ΧΕΠΑ license for charter boats |

Each expansion requires a dedicated regulatory compliance document (model: `06-Geographic-Regulatory/`).

---

## 7. Scaling Architecture by User Volume

### 7.1 Scaling Tiers

| MAU | Architecture | Estimated Cost/Month |
|-----|-------------|---------------------|
| 0 – 5K | Railway (single dyno) + Supabase free/pro | $50–150 |
| 5K – 20K | Fly.io single region, Supabase pro, Upstash | $200–500 |
| 20K – 100K | Fly.io multi-region, Supabase dedicated, Redis cluster | $1K–3K |
| 100K – 500K | Kubernetes (GKE/EKS), read replicas, CDN aggressive caching | $5K–15K |
| 500K+ | Full microservices extraction, dedicated ML infrastructure | $20K+ |

### 7.2 Performance Targets

| Metric | Phase 1 Target | Phase 3 Target | Phase 5 Target |
|--------|---------------|----------------|----------------|
| API P95 latency | < 400ms | < 200ms | < 150ms |
| API P99 latency | < 1s | < 500ms | < 300ms |
| Mobile app cold start | < 3s | < 2s | < 2s |
| Search results | < 800ms | < 300ms | < 200ms |
| Payment initiation | < 2s | < 1s | < 1s |
| Uptime SLA | 99.5% | 99.9% | 99.95% |

### 7.3 Database Scaling Strategy

```
Phase 1: Single Supabase instance (Egypt)
  → Connection pooling via pgBouncer (Supabase built-in)
  → No read replicas needed at <5K MAU

Phase 2: Add read replica for heavy read queries (search, explore)
  → Write: primary instance
  → Read: replica (listings, search, product browse)

Phase 3: Separate Supabase project per country
  → Egypt DB, UAE DB (data residency compliance)
  → Global analytics DB (BigQuery) fed by nightly ETL

Phase 5+: Consider Citus (distributed PostgreSQL) if single-country
          scale exceeds 10M rows in bookings table
```

---

## 8. Content Delivery & SEO Architecture

### 8.1 Global CDN Strategy

All static assets (Next.js, Flutter web PWA, images) served via Cloudflare CDN globally. No regional CDN configuration needed — Cloudflare handles this automatically via PoP routing.

### 8.2 SEO by Market

Boat listing pages must be indexable in each market's primary language:

```
/[lang]/yacht/[slug]          → e.g., /ar/yacht/luxury-yacht-hurghada
/[lang]/explore/[location]    → e.g., /en/explore/dubai-marina
/[lang]/fishing/guide         → e.g., /tr/fishing/rehber
```

**Hreflang tags** on all listing pages for language/region signals to Google:
```html
<link rel="alternate" hreflang="ar-EG" href="https://seaconnect.com/ar/yacht/..." />
<link rel="alternate" hreflang="ar-AE" href="https://seaconnect.ae/ar/yacht/..." />
<link rel="alternate" hreflang="en"    href="https://seaconnect.com/en/yacht/..." />
```

### 8.3 Domain Strategy

| Phase | Domain | Market |
|-------|--------|--------|
| Phase 1 | seaconnect.eg | Egypt primary |
| Phase 1 | seaconnect.com | Global (redirects to .eg for now) |
| Phase 3 | seaconnect.ae | UAE |
| Phase 4 | seaconnect.sa | KSA |
| Phase 5 | seaconnect.ma | Morocco |
| Phase 6 | seaconnect.com | Global hub |

---

## 9. Data Warehouse & Analytics Architecture

### 9.1 Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Raw events | PostgreSQL `booking_events` (per region) | Source of truth |
| ETL | Airbyte (self-hosted) or Fivetran | Sync to warehouse |
| Warehouse | Google BigQuery | Cross-region analytics |
| BI | Metabase (self-hosted) | Internal dashboards |
| Investor reporting | Metabase + PDF export | Monthly board pack |

### 9.2 Event Tracking Schema (Mixpanel)

Every user action emits a structured event:

```python
# analytics/tracker.py
def track(user_id: str, event: str, properties: dict):
    """
    Standard event format for Mixpanel + BigQuery.
    event naming: Object Verbed (e.g., 'Booking Created', 'Search Performed')
    """
    payload = {
        'distinct_id': user_id,
        'event': event,
        'properties': {
            **properties,
            'platform': 'mobile' or 'web',
            'app_version': settings.APP_VERSION,
            'region': request.region.code,
            'currency': request.region.currency,
            'language': request.LANGUAGE_CODE,
            'timestamp': datetime.utcnow().isoformat(),
        }
    }
```

### 9.3 Key Events to Track from Day 1

```
User Registered       → {method: phone/google, region}
Search Performed      → {query, location, date, filters_used}
Listing Viewed        → {listing_id, source: search/explore/direct}
Booking Started       → {listing_id, duration, amount, currency}
Booking Completed     → {booking_id, amount, currency, payment_method}
Booking Cancelled     → {booking_id, cancelled_by, hours_before_trip}
Review Submitted      → {booking_id, rating, has_text}
Product Purchased     → {product_id, vendor_id, amount, currency}
Competition Joined    → {competition_id, entry_fee}
Weather Checked       → {port, date, advisory_level}
Fishing Guide Opened  → {location, month, species_filtered}
```

---

## 10. Trust & Safety at Scale

### 10.1 Fraud Detection Signals

Phase 1 — Manual review triggers (flag for admin):
- New account books >3 trips in first 24h
- Payment method used on >2 different accounts
- Listing price changed >50% within 24h of booking
- Review submitted within 1 minute of booking completion (bot signal)

Phase 3 — ML-based fraud scoring:
- Train on Phase 1 labeled data (admin decisions as ground truth)
- Score each booking 0–100 on fraud probability
- Auto-hold payments >70 score for manual review

### 10.2 Review Integrity

- Reviews only allowed after trip completion (system-verified, not self-reported)
- Review window: 7 days after trip end
- One review per booking (enforced at DB level with unique constraint)
- Review editing: allowed within 48h of submission only

### 10.3 Content Moderation Pipeline

```
Phase 1 (Egypt, <500 listings):
  Admin manually approves every listing before it goes live
  24h SLA for approval

Phase 3 (UAE added, >1,000 listings):
  AI pre-screening (OpenAI Vision API for photos — detect inappropriate content)
  Auto-approve if AI confidence >95% clean
  Admin queue for borderline cases

Phase 5 (Multi-country, >5,000 listings):
  Dedicated Trust & Safety team (1 person per active country)
  AI screening + human review for appeals
  Community reporting system
```

---

## 11. Agent Handoff Protocol

This section defines how AI coding agents hand off work to each other across the SeaConnect codebase.

### 11.1 Handoff Format

When an agent completes a unit of work that another agent depends on, it writes a handoff note to `HANDOFFS.md` in the repo root:

```markdown
## HANDOFF-{date}-{seq}

**From:** backend-agent  
**To:** frontend-agent  
**Completed:** GET /api/v1/weather/ endpoint  
**Contract:** See 02-API-Specification.md Module 11  
**Test endpoint:** GET /api/v1/weather/?port=hurghada&date=2026-04-10  
**Expected response shape:**
{
  "port": "hurghada",
  "date": "2026-04-10",
  "advisory": "good",
  "wave_height_m": 0.8,
  ...
}
**Known limitations:** Cache miss on first call takes ~800ms (Open-Meteo latency)  
**Ready for:** Frontend integration  
```

### 11.2 Conflict Resolution

When two agents produce conflicting implementations:

1. The agent that wrote code matching the API Specification (`02-API-Specification.md`) wins
2. If both match the spec, the agent whose code has test coverage wins
3. If neither has tests, escalate to human for decision

### 11.3 Agent Cost Budget

| Agent Type | Max tokens/day | Max API calls/day | Alert threshold |
|-----------|---------------|------------------|-----------------|
| Code generation agents | 500K tokens | 50 calls | >400K tokens |
| Review/QA agents | 200K tokens | 30 calls | >150K tokens |
| Research agents | 100K tokens | 20 calls | >80K tokens |
| **Total daily budget** | **1M tokens** | **100 calls** | — |

Track in `AGENT-COSTS.md` (weekly summary).

---

## 12. Sprint 1 Checklist (Multi-Region Ready)

Before writing any feature code, Sprint 1 must deliver:

- [ ] `Region` model created and seeded (Egypt active, UAE/KSA seeded as inactive)
- [ ] `PaymentProvider` abstract class implemented (`payments/providers/base.py`)
- [ ] `FawryProvider` implemented and tested (`payments/providers/fawry.py`)
- [ ] i18n structure created: `lib/l10n/app_ar.arb`, `lib/l10n/app_en.arb`
- [ ] All Flutter widgets use `EdgeInsetsDirectional` (lint rule enforced)
- [ ] All strings use `AppLocalizations` (lint rule enforced)
- [ ] `booking_events` table created (append-only, with DB-level rules)
- [ ] `commission_rates` table created and seeded for Egypt
- [ ] `HANDOFFS.md` created in repo root
- [ ] `ADR-Log.md` linked from `CLAUDE.md` or equivalent agent-read file
- [ ] All dates stored as UTC in DB (Django: `USE_TZ = True`)
- [ ] Currency never hardcoded — always from `region.currency`
- [ ] CI pipeline: test → lint → security scan → deploy to staging
