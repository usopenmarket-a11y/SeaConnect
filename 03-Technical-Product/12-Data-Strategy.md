# Data Strategy — SeaConnect
**Version:** 1.0  
**Date:** April 8, 2026  
**Status:** Active — Binding data architecture decisions

---

## Purpose

Data is SeaConnect's most durable competitive advantage. Booking patterns, fishing catches, weather correlations, and user behavior are assets that compound over time and become defensible moats. This document defines how data is collected, stored, processed, monetized, and protected across all phases.

**Rule for AI Agents:** Any new feature that generates user interactions must include event tracking from day 1. No feature ships without its tracking spec.

---

## 1. Data Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Data Lifecycle                               │
│                                                                       │
│  User Action → Event Emitted → Operational DB → ETL → Warehouse     │
│       │                                                    │          │
│       │                                               Analytics +     │
│       └──────────── Real-time (Redis) ───────────→  ML Training      │
└─────────────────────────────────────────────────────────────────────┘
```

### Three Data Tiers

| Tier | Storage | Purpose | Retention |
|------|---------|---------|-----------|
| **Hot** | PostgreSQL + Redis | Operational queries, live app | Forever (PostgreSQL), 6h–7d (Redis) |
| **Warm** | PostgreSQL (archive schema) | Historical analysis, dispute resolution | 7 years (legal requirement) |
| **Cold** | BigQuery (data warehouse) | Cross-region analytics, ML training, BI | Indefinite |

---

## 2. Event Sourcing — Operational Layer

All state-changing operations emit immutable events. This is enforced by ADR-012.

### 2.1 Event Tables by Domain

```sql
-- Bookings (ADR-012 — already defined)
CREATE TABLE booking_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id  UUID NOT NULL REFERENCES bookings(id),
    event_type  VARCHAR(50) NOT NULL,
    actor_id    UUID REFERENCES users(id),
    actor_type  VARCHAR(20) NOT NULL,
    payload     JSONB NOT NULL DEFAULT '{}',
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Marketplace orders
CREATE TABLE order_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID NOT NULL REFERENCES marketplace_orders(id),
    event_type  VARCHAR(50) NOT NULL,
    -- created / payment_confirmed / shipped / delivered / cancelled / refunded
    actor_id    UUID REFERENCES users(id),
    actor_type  VARCHAR(20) NOT NULL,
    payload     JSONB NOT NULL DEFAULT '{}',
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User account events
CREATE TABLE user_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id),
    event_type  VARCHAR(50) NOT NULL,
    -- registered / verified / profile_updated / role_changed /
    -- suspended / reinstated / deleted
    payload     JSONB NOT NULL DEFAULT '{}',
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payment events (financial audit trail)
CREATE TABLE payment_events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id      VARCHAR(100) NOT NULL,  -- provider's reference
    provider        VARCHAR(20) NOT NULL,   -- fawry / telr / stripe
    event_type      VARCHAR(50) NOT NULL,
    -- initiated / authorized / captured / failed / refund_initiated / refund_completed
    amount          NUMERIC(12,2) NOT NULL,
    currency        CHAR(3) NOT NULL,
    booking_id      UUID REFERENCES bookings(id),
    order_id        UUID REFERENCES marketplace_orders(id),
    raw_payload     JSONB NOT NULL,         -- full provider webhook payload
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.2 Event Type Registry

```python
# events/types.py — canonical list of all event types

class BookingEvent:
    CREATED             = 'created'
    PAYMENT_INITIATED   = 'payment_initiated'
    PAYMENT_CONFIRMED   = 'payment_confirmed'
    PAYMENT_FAILED      = 'payment_failed'
    OWNER_CONFIRMED     = 'owner_confirmed'
    OWNER_DECLINED      = 'owner_declined'
    CUSTOMER_CANCELLED  = 'customer_cancelled'
    OWNER_CANCELLED     = 'owner_cancelled'
    TRIP_STARTED        = 'trip_started'
    TRIP_COMPLETED      = 'trip_completed'
    PAYOUT_RELEASED     = 'payout_released'
    REFUND_INITIATED    = 'refund_initiated'
    REFUND_COMPLETED    = 'refund_completed'
    DISPUTED            = 'disputed'
    DISPUTE_RESOLVED    = 'dispute_resolved'

class UserEvent:
    REGISTERED          = 'registered'
    PHONE_VERIFIED      = 'phone_verified'
    EMAIL_VERIFIED      = 'email_verified'
    KYC_SUBMITTED       = 'kyc_submitted'
    KYC_APPROVED        = 'kyc_approved'
    KYC_REJECTED        = 'kyc_rejected'
    PROFILE_UPDATED     = 'profile_updated'
    ROLE_CHANGED        = 'role_changed'
    SUSPENDED           = 'suspended'
    REINSTATED          = 'reinstated'
    DELETED             = 'deleted'
```

---

## 3. Behavioral Analytics — Mixpanel + BigQuery

### 3.1 Tracking Architecture

```
Flutter App ──────────────────────────────────────────────────────┐
Next.js Web ───────────────────────────────────────────────────── │
                                                                   ▼
                                                          Mixpanel SDK
                                                               │
                                              ┌────────────────┼─────────────────┐
                                              ▼                ▼                 ▼
                                      Real-time           Mixpanel          BigQuery
                                      dashboards          reports           (via export)
```

### 3.2 Standard Event Schema

Every tracked event must include this base structure:

```python
BASE_PROPERTIES = {
    # Identity
    'distinct_id':   str,     # user UUID or anonymous ID
    'session_id':    str,     # UUID per app session
    
    # Context
    'platform':      str,     # 'ios' | 'android' | 'web'
    'app_version':   str,     # '1.0.0'
    'region':        str,     # 'sa-egy' | 'sa-uae'
    'language':      str,     # 'ar' | 'en'
    'currency':      str,     # 'EGP' | 'AED'
    
    # Time
    'timestamp':     str,     # ISO 8601 UTC
    'local_hour':    int,     # 0–23 (user's local time — for UX timing analysis)
    
    # Device (mobile only)
    'os_version':    str,     # 'iOS 17.4' | 'Android 14'
    'device_model':  str,     # 'iPhone 15' | 'Samsung S24'
    'network_type':  str,     # 'wifi' | '4g' | '3g'
}
```

### 3.3 Full Event Catalog

#### Acquisition Events
```
App Installed           → {source: store/referral/ad, campaign_id}
Onboarding Started      → {screen: 1}
Onboarding Completed    → {screens_seen: 3}
Onboarding Skipped      → {at_screen: 1|2}
Registration Started    → {}
Registration Completed  → {method: phone, role: customer|owner|vendor}
Login                   → {method: phone|google|apple}
```

#### Discovery Events
```
Home Viewed             → {tab: explore|marketplace|competitions}
Search Performed        → {query, location, date, result_count, filters: {}}
Search Result Clicked   → {position: int, listing_id, search_id}
Listing Viewed          → {listing_id, source: search|explore|direct|share}
Photos Browsed          → {listing_id, photo_count_seen}
Map Viewed              → {listings_visible: int}
Filter Applied          → {filter_type, filter_value}
Weather Checked         → {port, date, advisory: good|caution|danger}
Fishing Guide Opened    → {location, month}
Species Card Viewed     → {species_id, season_rating}
```

#### Booking Events
```
Booking Started         → {listing_id, date, duration, guest_count, amount, currency}
Date Selected           → {listing_id, date, available: bool}
Guest Count Changed     → {listing_id, from, to}
Extras Added            → {listing_id, extra_ids: []}
Checkout Reached        → {listing_id, amount, currency}
Payment Method Selected → {method: fawry_card|fawry_cash|meeza|wallet}
Booking Completed       → {booking_id, listing_id, amount, currency, payment_method}
Booking Cancelled       → {booking_id, by: customer|owner, hours_before: float}
Review Submitted        → {booking_id, rating: 1-5, has_text: bool, photo_count: int}
```

#### Marketplace Events
```
Store Viewed            → {vendor_id, source}
Product Viewed          → {product_id, vendor_id, price, currency}
Cart Updated            → {action: add|remove, product_id, quantity}
Cart Abandoned          → {cart_value, item_count, time_in_cart_min}
Order Placed            → {order_id, vendor_id, amount, currency, item_count}
Order Cancelled         → {order_id, by: customer|vendor, reason}
```

#### Competition Events
```
Competition Viewed      → {competition_id, entry_fee, spots_remaining}
Competition Registered  → {competition_id, entry_fee, currency}
Competition Completed   → {competition_id, placement: int}
```

#### Supply-Side Events (Owner/Vendor)
```
Listing Created         → {listing_id, type: yacht|boat|kayak}
Listing Published       → {listing_id, photos_count, price}
Listing Paused          → {listing_id, reason}
Availability Updated    → {listing_id, dates_blocked: int}
Booking Accepted        → {booking_id, response_time_min: float}
Booking Declined        → {booking_id, reason, response_time_min: float}
Payout Received         → {amount, currency, booking_count}
```

### 3.4 Funnel Definitions

```
Booking Funnel:
  Home Viewed
    → Search Performed (conversion: target 60%)
    → Listing Viewed   (conversion: target 40% of searches)
    → Checkout Reached (conversion: target 20% of views)
    → Booking Completed (conversion: target 70% of checkouts)
  
  Overall: Home → Booking = target 3.4%

Marketplace Funnel:
  Store Viewed
    → Product Viewed   (conversion: target 50%)
    → Cart Updated     (conversion: target 25%)
    → Order Placed     (conversion: target 60% of carts)
  
  Overall: Store → Order = target 7.5%

Owner Acquisition Funnel:
  Registration Started
    → Profile Completed    (target 80%)
    → Listing Created      (target 70%)
    → Listing Published    (target 85%)
    → First Booking        (target 60% within 30 days)
```

---

## 4. Data Warehouse — BigQuery

### 4.1 Why BigQuery

| Criterion | BigQuery | Snowflake | Redshift |
|-----------|----------|-----------|---------|
| Cost at our scale | Free tier 1TB/month query | $23/credit | $0.25/hr always-on |
| Setup complexity | Low | Medium | High |
| Airbyte connector | ✅ Native | ✅ Native | ✅ Native |
| SQL dialect | Standard SQL | Standard SQL | PostgreSQL-like |
| Decision | **CHOSEN** | Fallback | Rejected |

### 4.2 BigQuery Schema

```sql
-- Namespace: seaconnect_{region}_{env}
-- e.g., seaconnect_egy_prod, seaconnect_uae_prod, seaconnect_global_prod

-- Fact tables (append-only, partitioned by date)
CREATE TABLE seaconnect_global_prod.fact_bookings (
    booking_id      STRING,
    region          STRING,
    listing_id      STRING,
    customer_id     STRING,
    owner_id        STRING,
    trip_date       DATE,
    booked_at       TIMESTAMP,
    amount          NUMERIC,
    currency        STRING,
    commission_rate NUMERIC,
    commission_amt  NUMERIC,
    status          STRING,
    payment_method  STRING,
    _ingested_at    TIMESTAMP
)
PARTITION BY DATE(trip_date)
CLUSTER BY region, status;

CREATE TABLE seaconnect_global_prod.fact_events (
    event_id        STRING,
    user_id         STRING,
    session_id      STRING,
    event_name      STRING,
    platform        STRING,
    region          STRING,
    language        STRING,
    properties      JSON,
    occurred_at     TIMESTAMP,
    _ingested_at    TIMESTAMP
)
PARTITION BY DATE(occurred_at)
CLUSTER BY region, event_name;

-- Dimension tables
CREATE TABLE seaconnect_global_prod.dim_users (
    user_id         STRING,
    region          STRING,
    role            STRING,
    registered_at   TIMESTAMP,
    is_verified     BOOL,
    total_bookings  INT64,
    total_spent     NUMERIC,
    last_active_at  TIMESTAMP,
    _updated_at     TIMESTAMP
);

CREATE TABLE seaconnect_global_prod.dim_listings (
    listing_id      STRING,
    region          STRING,
    owner_id        STRING,
    listing_type    STRING,
    port            STRING,
    capacity        INT64,
    base_price      NUMERIC,
    currency        STRING,
    avg_rating      NUMERIC,
    review_count    INT64,
    total_bookings  INT64,
    is_active       BOOL,
    _updated_at     TIMESTAMP
);
```

### 4.3 ETL Pipeline — Airbyte

```
Source: PostgreSQL (per region) → Airbyte → BigQuery (global)

Sync frequency:
  - booking_events: every 1h (near real-time for operations)
  - user_events: every 6h
  - payment_events: every 1h (financial reconciliation)
  - dim tables: daily at 03:00 UTC

Transformations (dbt):
  - Join booking_events → bookings → fact_bookings
  - Calculate owner LTV, customer LTV
  - Build daily cohort retention tables
  - Generate monthly revenue by region/currency
```

### 4.4 Key Reports

| Report | Frequency | Audience | Source |
|--------|-----------|----------|--------|
| Daily ops brief | Daily 08:00 | CEO, Ops | BigQuery → Metabase |
| Weekly KPI dashboard | Monday 09:00 | All team | BigQuery → Metabase |
| Monthly board pack | 1st of month | Board, Investors | BigQuery → PDF |
| Real-time booking monitor | Live | On-call | Redis counters |
| Owner earnings report | Monthly | Each owner | Per-region PostgreSQL |
| Payment reconciliation | Daily | Finance | payment_events table |

---

## 5. Machine Learning Pipeline

### 5.1 ML Use Cases by Phase

| Phase | Model | Input | Output | Training Data |
|-------|-------|-------|--------|--------------|
| Phase 2 | Boat Recommendation | User history, search query, location | Ranked listing IDs | Booking events + search events |
| Phase 2 | Price Optimization | Historical bookings, season, demand | Suggested price range | fact_bookings + calendar |
| Phase 3 | Fraud Detection | Booking sequence, payment pattern | Fraud score 0–100 | Admin-labelled disputes |
| Phase 3 | Demand Forecasting | Date, port, season, history | Expected bookings/week | fact_bookings 12+ months |
| Phase 4 | Dynamic Pricing | Real-time demand, competitor pricing | Optimal price | External signals + internal data |
| Phase 5 | Catch Prediction | Port, date, species, weather | Catch probability | User-reported catches + fishing events |

### 5.2 Embedding Strategy (pgvector)

```python
# Boat listing embeddings — updated on every description change
EMBEDDING_MODEL = 'text-embedding-3-small'  # 1536 dimensions, $0.02/1M tokens
EMBEDDING_FIELDS = [
    'name',
    'description',
    'amenities_list',
    'port_name',
    'listing_type',  # yacht / fishing_boat / kayak
]

def generate_listing_embedding(listing) -> list[float]:
    """Concatenate relevant fields, generate embedding, store in pgvector column."""
    text = f"{listing.name}. {listing.description}. "
          f"Located in {listing.port.name_en}. "
          f"Type: {listing.listing_type}. "
          f"Amenities: {', '.join(listing.amenities)}."
    response = openai.embeddings.create(input=text, model=EMBEDDING_MODEL)
    return response.data[0].embedding

# Semantic search query
def search_listings_semantic(query: str, port_id=None, limit=20):
    query_embedding = generate_query_embedding(query)
    return Listing.objects.annotate(
        similarity=CosineDistance('embedding', query_embedding)
    ).filter(
        similarity__lt=0.3,  # cosine distance threshold
        **(dict(port_id=port_id) if port_id else {})
    ).order_by('similarity')[:limit]
```

### 5.3 ML Infrastructure

```
Phase 2 (simple models):
  Training:  Google Colab Pro or local (no dedicated infra)
  Serving:   Django endpoint loads model from Cloudflare R2
  Storage:   Cloudflare R2 for model artifacts
  Framework: scikit-learn (recommendation), statsmodels (forecasting)

Phase 3 (fraud + demand):
  Training:  Vertex AI (managed, auto-scaling)
  Serving:   Vertex AI Endpoints
  Storage:   GCS (Google Cloud Storage)
  Framework: XGBoost (fraud), Prophet (forecasting)

Phase 5 (advanced):
  Training:  Vertex AI + custom GPU instances
  Serving:   Dedicated ML service (extract from Django monolith)
  Framework: PyTorch for deep learning models
```

---

## 6. Data Retention & Compliance

### 6.1 Retention Policy

| Data Category | Retention | Legal Basis | Delete Method |
|--------------|-----------|-------------|---------------|
| Booking records | 7 years | Egyptian Commercial Law | Hard archive after 7y |
| Payment records | 7 years | Tax law requirement | Hard archive |
| KYC documents | 5 years after last transaction | AML Law 80/2002 | Secure deletion |
| User PII (active users) | Indefinite while account active | Contract performance | — |
| User PII (deleted accounts) | 30 days after deletion request | PDPL 151/2020 | Secure deletion |
| Behavioral events (Mixpanel) | 5 years | Legitimate interest | Auto-expiry |
| Weather cache | 90 days | Operational | Auto-expiry |
| Chat/messages | 2 years | Dispute resolution | Auto-archive |
| Server logs | 90 days | Security | Auto-rotation |

### 6.2 Data Subject Rights (PDPL 151/2020 + GDPR)

Users have the right to:
- **Access:** Export their data — 30-day SLA. Served via `GET /api/v1/accounts/me/export/`
- **Correction:** Update their profile — immediate. Standard profile update endpoints.
- **Deletion:** Delete account + PII — 30-day processing. `DELETE /api/v1/accounts/me/`
- **Portability:** Export booking history as CSV/PDF — 30-day SLA.

```python
# accounts/tasks.py
@app.task
def process_account_deletion(user_id: str):
    """
    GDPR/PDPL compliant deletion:
    1. Anonymize PII fields (name, phone, email → hashed)
    2. Retain booking records (financial obligation) with anonymized user ref
    3. Delete: profile photo, KYC docs (after 5y hold), session data
    4. Emit: UserEvent.DELETED
    5. Notify user via email that deletion is complete
    """
```

### 6.3 Data Classification

| Class | Examples | Encryption | Access |
|-------|---------|-----------|--------|
| **PII — High** | Name, phone, email, national ID | AES-256 at rest + TLS in transit | User + Admin only |
| **PII — Medium** | Location, booking history, preferences | TLS in transit | User + Admin + Owner (their bookings) |
| **Financial** | Payment amounts, payout records | AES-256 at rest + TLS in transit | User + Finance + Admin |
| **Documents** | KYC docs, license scans | AES-256 at rest, access-logged | Admin + Compliance only |
| **Operational** | Search queries, event logs | TLS in transit | Internal analytics only |
| **Public** | Listing descriptions, port names | None required | Everyone |

---

## 7. Data Monetization (Phase 3+)

### 7.1 B2B Data Products

SeaConnect accumulates unique maritime data that has commercial value:

| Product | Target Buyer | Pricing Model | Phase |
|---------|-------------|--------------|-------|
| Fishing hotspot reports | Fishing tackle brands, tourism boards | Annual license | Phase 3 |
| Sea tourism demand reports | Resort operators, hotel chains | Quarterly subscription | Phase 3 |
| Weather + catch correlation data | Marine research institutions | Academic license | Phase 4 |
| Port demand forecasting | Marina operators | Annual license | Phase 4 |
| Aggregated booking trends | Egyptian Tourism Authority | Government contract | Phase 3 |

**Rule:** All B2B data is fully anonymized and aggregated. No individual user data is sold. No PII leaves the platform.

### 7.2 Data Product Principles

1. Minimum aggregation: No report contains fewer than 100 data points
2. No re-identification: Reports cannot be used to identify individual users or boats
3. Consent: Platform T&C explicitly discloses aggregated data use for market reports
4. Revenue split: Data revenue feeds the analytics infrastructure budget (not profit center until Phase 5)

---

## 8. Data Quality Rules

### 8.1 Agent Rules for Data Quality

- **Never insert NULL into required analytics fields.** Use explicit defaults (`'unknown'`, `0`, `false`).
- **All timestamps are UTC in the database.** Timezone conversion happens in the API response layer only.
- **All monetary amounts are stored as `NUMERIC(12,2)`** — never `FLOAT` (floating point errors in financial calculations).
- **Currency is always stored as a 3-char ISO 4217 code** — never a symbol or full name.
- **All event payloads must be valid JSON** — use `JSONB` and validate before insert.

### 8.2 Data Validation Pipeline

```python
# analytics/validators.py
class EventValidator:
    REQUIRED_BASE_FIELDS = [
        'distinct_id', 'session_id', 'platform', 'app_version',
        'region', 'language', 'currency', 'timestamp'
    ]

    def validate(self, event: dict) -> bool:
        # Check base fields present
        for field in self.REQUIRED_BASE_FIELDS:
            if field not in event:
                logger.error(f"Missing required analytics field: {field}")
                return False
        # Check timestamp is valid ISO 8601 UTC
        # Check region is in ACTIVE_REGIONS
        # Check currency matches region's expected currency
        return True
```

---

## 9. Sprint 1 Data Requirements

Before writing any feature code, these data foundations must be in place:

- [ ] `booking_events` table created (append-only — ADR-012)
- [ ] `order_events` table created (append-only)
- [ ] `user_events` table created (append-only)
- [ ] `payment_events` table created (append-only)
- [ ] Mixpanel project created, API key in environment variables
- [ ] `analytics/tracker.py` base tracking function implemented
- [ ] `Registration Completed` and `Login` events tracked
- [ ] BigQuery project created (free tier), dataset `seaconnect_egy_prod` created
- [ ] Metabase instance deployed (Docker, self-hosted on Railway)
- [ ] `fact_bookings` and `fact_events` tables created in BigQuery
- [ ] Data retention policy documented in `settings/data_retention.py`
- [ ] `GET /api/v1/accounts/me/export/` endpoint stubbed (returns 501 until Phase 2)
