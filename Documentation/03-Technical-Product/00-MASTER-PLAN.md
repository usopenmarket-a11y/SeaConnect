# SeaConnect — Master Plan
**Version:** 1.0  
**Date:** April 6, 2026  
**Status:** Active Planning Document

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Gap Analysis](#2-gap-analysis)
3. [Technology Stack — Final Decisions](#3-technology-stack--final-decisions)
4. [Full Database Schema](#4-full-database-schema)
5. [API Specification Overview](#5-api-specification-overview)
6. [MVP Scope Definition](#6-mvp-scope-definition)
7. [Automation Architecture](#7-automation-architecture)
8. [Phase-by-Phase Roadmap](#8-phase-by-phase-roadmap)
9. [Financial Plan (Filled)](#9-financial-plan-filled)
10. [Project Governance](#10-project-governance)

---

## 1. Executive Summary

SeaConnect is a three-sided maritime marketplace for Egypt (MENA expansion later) connecting:
- **Boat/Yacht Owners** — listing vessels for charters and fishing trips
- **Customers** — booking trips, buying gear, joining fishing competitions
- **Vendors** — selling fishing equipment through an integrated marketplace

**Current status:** Documentation phase complete. Zero code written.  
**This document:** Closes all identified gaps and defines the full path from planning to a fully automated, production-ready platform.

---

## 2. Gap Analysis

### 2.1 Documentation Gaps

| Gap | File | Action |
|-----|------|--------|
| Filename typo | `BuinessModel.md` | Rename → `BusinessModel.md` |
| Duplicate file | `RequriedDocuments.md` | Delete (superseded by `RequiredDocuments.md`) |
| All commission rates blank | `04-Monetization-Strategy.md` | Filled in Section 9 of this document |
| All financial projections blank | `05-Financial-Projections.md` | Filled in Section 9 of this document |
| Legal docs are templates | `02-Legal-Administrative/*` | Flag for Egyptian legal counsel review |
| SRS approval signatures blank | `ChatGPTFiles/SRS_Document.md` | Requires stakeholder sign-off meeting |

### 2.2 Technical Gaps

| Gap | Priority | Resolution |
|-----|----------|------------|
| No tech stack decision | P0 | Decided in Section 3 |
| DB schema incomplete (booking only) | P0 | Full schema in Section 4 |
| No API specifications | P0 | Overview in Section 5; full OpenAPI files in `03-Technical-Product/API/` |
| No system architecture diagram | P1 | Defined in Section 7 |
| No MVP definition | P0 | Defined in Section 6 |
| No wireframes | P1 | Schedule UX sprint (Week 3–4) |
| No Arabic/RTL plan | P1 | Defined in Section 7.5 |
| No payment gateway chosen | P0 | Decided in Section 3 |

### 2.3 Process Gaps

| Gap | Action |
|-----|--------|
| No project management tool | Use GitHub Projects (free, code-adjacent) |
| No risk register | Appendix A of this document |
| No stakeholder sign-off | Schedule review meeting; use SRS approval section |
| No test strategy | Defined in Section 8 (Phase 2) |
| No CI/CD pipeline | Defined in Section 7 (Automation) |

---

## 3. Technology Stack — Final Decisions

> These are binding decisions. Rationale is included so future team members understand the trade-offs.

### 3.1 Backend
**Decision: Django (Python) + Django REST Framework**

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Django | Built-in admin, ORM, auth, fast iteration | Slower raw performance vs Node | **CHOSEN** |
| Laravel | Great ecosystem, PHP | PHP hiring harder in Egypt | Rejected |
| Node.js | Fast I/O, JS everywhere | More boilerplate for marketplace patterns | Rejected |

**Version:** Python 3.12, Django 5.x, DRF 3.x

### 3.2 Mobile
**Decision: Flutter (Dart)**

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Flutter | Single codebase, strong RTL Arabic support, fast UI | Dart learning curve | **CHOSEN** |
| React Native | JS ecosystem | RTL Arabic issues, bridge performance | Rejected |

**Version:** Flutter 3.x, targeting Android API 26+ and iOS 14+

### 3.3 Web Frontend
**Decision: Next.js (React)**  
- Server-side rendering for SEO (boat listings must be indexed)
- Used for the customer-facing web app and the admin portal
- **Version:** Next.js 14, TypeScript

### 3.4 Database
**Decision: PostgreSQL 16**
- Full ACID compliance for payments
- JSON columns for flexible media/metadata
- Native UUID support
- Hosted on: **Supabase** (managed Postgres, built-in auth helpers, file storage)

### 3.5 Cache & Queues
- **Redis** (via Upstash) — session cache, rate limiting, background job queue
- **Celery** — async task runner (booking notifications, email, payment webhooks)

### 3.6 File Storage
- **Cloudflare R2** — boat images, product images, competition media (S3-compatible, cheaper egress)

### 3.7 Payment Gateway
**Decision: Fawry + Stripe**

| Gateway | Coverage | Use Case |
|---------|----------|----------|
| Fawry | Egypt-first, cash at kiosks, mobile wallets | Local customers |
| Stripe | Cards, international | Tourists, future MENA |

### 3.8 Notifications
- **Firebase Cloud Messaging (FCM)** — push notifications (Android + iOS)
- **SendGrid** — transactional email
- **Twilio** — SMS OTP for Egyptian phone verification

### 3.9 Infrastructure & DevOps
- **Cloud:** Railway (backend API) + Vercel (Next.js frontend)
- **CI/CD:** GitHub Actions
- **Monitoring:** Sentry (errors) + Grafana Cloud (metrics)
- **Container:** Docker + Docker Compose for local dev

### 3.10 AI/Automation Layer
- **OpenAI GPT-4o API** — boat matching algorithm, smart search, chatbot support
- **n8n** (self-hosted) — workflow automation (booking confirmations, vendor alerts, competition triggers)
- **Langchain** — AI matching engine orchestration

---

## 4. Full Database Schema

### 4.1 Entity Relationship Overview

```
USERS
  ├── BOAT_OWNERS (profile extension)
  ├── VENDORS (profile extension)
  └── COMPETITION_ORGANIZERS (profile extension)

YACHTS → AVAILABILITY → BOOKINGS → PAYMENTS → TRANSACTIONS
PRODUCTS → CART_ITEMS → ORDERS → ORDER_ITEMS → SHIPMENTS
COMPETITIONS → COMPETITION_ENTRIES → CATCH_LOGS → LEADERBOARD
NOTIFICATIONS → NOTIFICATION_PREFERENCES
REVIEWS → (Yachts | Products | Vendors)
AUDIT_LOGS
```

### 4.2 Core Tables

#### USERS
```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE,
    phone           VARCHAR(20) UNIQUE,
    full_name       VARCHAR(255) NOT NULL,
    avatar_url      TEXT,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('customer','owner','vendor','organizer','admin')),
    auth_provider   VARCHAR(20) DEFAULT 'email' CHECK (auth_provider IN ('email','google','apple','phone')),
    is_verified     BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    preferred_lang  VARCHAR(5) DEFAULT 'ar' CHECK (preferred_lang IN ('ar','en')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### BOAT_OWNER_PROFILES
```sql
CREATE TABLE boat_owner_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    national_id     VARCHAR(20),
    license_number  VARCHAR(50),
    bank_account    TEXT, -- encrypted
    verified_at     TIMESTAMPTZ,
    rating_avg      DECIMAL(3,2) DEFAULT 0,
    total_bookings  INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### VENDOR_PROFILES
```sql
CREATE TABLE vendor_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    store_name      VARCHAR(255) NOT NULL,
    store_name_ar   VARCHAR(255),
    description     TEXT,
    description_ar  TEXT,
    logo_url        TEXT,
    subscription_tier VARCHAR(20) DEFAULT 'starter' CHECK (subscription_tier IN ('starter','professional','enterprise')),
    subscription_expires_at TIMESTAMPTZ,
    bank_account    TEXT, -- encrypted
    rating_avg      DECIMAL(3,2) DEFAULT 0,
    is_approved     BOOLEAN DEFAULT FALSE,
    approved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### YACHTS
```sql
CREATE TABLE yachts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        UUID REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    name_ar         VARCHAR(255),
    description     TEXT,
    description_ar  TEXT,
    yacht_type      VARCHAR(30) CHECK (yacht_type IN ('fishing_boat','speedboat','sailboat','motor_yacht','luxury_yacht')),
    capacity        INT NOT NULL,
    location_name   VARCHAR(255),
    location_name_ar VARCHAR(255),
    location_lat    DECIMAL(10,8),
    location_lng    DECIMAL(11,8),
    base_price_per_day DECIMAL(10,2) NOT NULL,
    currency        VARCHAR(3) DEFAULT 'EGP',
    media           JSONB DEFAULT '[]', -- [{url, type, order}]
    amenities       JSONB DEFAULT '[]',
    rules           TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    is_approved     BOOLEAN DEFAULT FALSE,
    approved_at     TIMESTAMPTZ,
    rating_avg      DECIMAL(3,2) DEFAULT 0,
    total_bookings  INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### AVAILABILITY
```sql
CREATE TABLE availability (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    yacht_id    UUID REFERENCES yachts(id) ON DELETE CASCADE,
    date        DATE NOT NULL,
    status      VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available','blocked','booked')),
    UNIQUE(yacht_id, date)
);
```

#### BOOKINGS
```sql
CREATE TABLE bookings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID REFERENCES users(id),
    yacht_id        UUID REFERENCES yachts(id),
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    trip_type       VARCHAR(20) CHECK (trip_type IN ('half_day','full_day','multi_day')),
    trip_category   VARCHAR(20) CHECK (trip_category IN ('fishing','picnic','private','corporate')),
    num_people      INT NOT NULL,
    booking_mode    VARCHAR(20) DEFAULT 'direct' CHECK (booking_mode IN ('direct','system_match')),
    status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','confirmed','declined','cancelled','completed')),
    total_amount    DECIMAL(10,2),
    platform_fee    DECIMAL(10,2),
    owner_payout    DECIMAL(10,2),
    special_requests TEXT,
    cancellation_reason TEXT,
    confirmed_at    TIMESTAMPTZ,
    cancelled_at    TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### PAYMENTS
```sql
CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id      UUID REFERENCES bookings(id),
    order_id        UUID REFERENCES orders(id), -- for marketplace
    competition_entry_id UUID REFERENCES competition_entries(id),
    user_id         UUID REFERENCES users(id),
    amount          DECIMAL(10,2) NOT NULL,
    currency        VARCHAR(3) DEFAULT 'EGP',
    method          VARCHAR(20) CHECK (method IN ('card','fawry','wallet','cash','stripe')),
    gateway_ref     VARCHAR(255), -- gateway transaction ID
    gateway         VARCHAR(20) CHECK (gateway IN ('fawry','stripe','manual')),
    status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded','partial_refund')),
    refund_amount   DECIMAL(10,2),
    refund_reason   TEXT,
    paid_at         TIMESTAMPTZ,
    refunded_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### TRANSACTIONS (Payout Ledger)
```sql
CREATE TABLE transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id      UUID REFERENCES payments(id),
    recipient_id    UUID REFERENCES users(id), -- owner or vendor
    amount          DECIMAL(10,2) NOT NULL,
    type            VARCHAR(20) CHECK (type IN ('payout','commission','refund','adjustment')),
    status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','processed','failed')),
    processed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.3 Marketplace Tables

#### PRODUCT_CATEGORIES
```sql
CREATE TABLE product_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    name_ar     VARCHAR(100),
    slug        VARCHAR(100) UNIQUE,
    parent_id   UUID REFERENCES product_categories(id),
    icon_url    TEXT,
    is_active   BOOLEAN DEFAULT TRUE
);
```

#### PRODUCTS
```sql
CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id       UUID REFERENCES vendor_profiles(id) ON DELETE CASCADE,
    category_id     UUID REFERENCES product_categories(id),
    name            VARCHAR(255) NOT NULL,
    name_ar         VARCHAR(255),
    description     TEXT,
    description_ar  TEXT,
    sku             VARCHAR(100),
    price           DECIMAL(10,2) NOT NULL,
    sale_price      DECIMAL(10,2),
    currency        VARCHAR(3) DEFAULT 'EGP',
    stock_qty       INT DEFAULT 0,
    media           JSONB DEFAULT '[]',
    attributes      JSONB DEFAULT '{}', -- {weight, color, size, etc.}
    is_active       BOOLEAN DEFAULT TRUE,
    is_approved     BOOLEAN DEFAULT FALSE,
    rating_avg      DECIMAL(3,2) DEFAULT 0,
    total_sold      INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### CARTS
```sql
CREATE TABLE carts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cart_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id     UUID REFERENCES carts(id) ON DELETE CASCADE,
    product_id  UUID REFERENCES products(id),
    quantity    INT NOT NULL DEFAULT 1,
    added_at    TIMESTAMPTZ DEFAULT NOW()
);
```

#### ORDERS
```sql
CREATE TABLE orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID REFERENCES users(id),
    status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','paid','processing','shipped','delivered','cancelled','refunded')),
    subtotal        DECIMAL(10,2),
    platform_fee    DECIMAL(10,2),
    shipping_fee    DECIMAL(10,2) DEFAULT 0,
    total_amount    DECIMAL(10,2),
    shipping_address JSONB,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id  UUID REFERENCES products(id),
    vendor_id   UUID REFERENCES vendor_profiles(id),
    quantity    INT NOT NULL,
    unit_price  DECIMAL(10,2) NOT NULL,
    subtotal    DECIMAL(10,2) NOT NULL
);

CREATE TABLE shipments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID REFERENCES orders(id),
    tracking_number VARCHAR(100),
    carrier         VARCHAR(100),
    status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','picked_up','in_transit','delivered','returned')),
    estimated_delivery DATE,
    shipped_at      TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.4 Competition Tables

#### COMPETITIONS
```sql
CREATE TABLE competitions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id    UUID REFERENCES users(id),
    title           VARCHAR(255) NOT NULL,
    title_ar        VARCHAR(255),
    description     TEXT,
    description_ar  TEXT,
    location_name   VARCHAR(255),
    location_lat    DECIMAL(10,8),
    location_lng    DECIMAL(11,8),
    start_date      TIMESTAMPTZ NOT NULL,
    end_date        TIMESTAMPTZ NOT NULL,
    registration_deadline TIMESTAMPTZ,
    max_participants INT,
    entry_fee       DECIMAL(10,2) DEFAULT 0,
    prize_pool      DECIMAL(10,2),
    prize_details   JSONB, -- [{place, prize_type, value}]
    rules           TEXT,
    status          VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','open','registration_closed','active','completed','cancelled')),
    media           JSONB DEFAULT '[]',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### COMPETITION_ENTRIES
```sql
CREATE TABLE competition_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id  UUID REFERENCES competitions(id),
    user_id         UUID REFERENCES users(id),
    team_name       VARCHAR(100),
    status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','disqualified')),
    entry_fee_paid  BOOLEAN DEFAULT FALSE,
    registered_at   TIMESTAMPTZ DEFAULT NOW(),
    approved_at     TIMESTAMPTZ
);
```

#### CATCH_LOGS
```sql
CREATE TABLE catch_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id        UUID REFERENCES competition_entries(id),
    fish_species    VARCHAR(100),
    weight_kg       DECIMAL(6,3),
    length_cm       DECIMAL(6,2),
    photo_url       TEXT,
    gps_lat         DECIMAL(10,8),
    gps_lng         DECIMAL(11,8),
    logged_at       TIMESTAMPTZ DEFAULT NOW(),
    verified        BOOLEAN DEFAULT FALSE,
    verified_by     UUID REFERENCES users(id),
    verified_at     TIMESTAMPTZ
);
```

#### LEADERBOARD (Materialized View)
```sql
CREATE MATERIALIZED VIEW leaderboard AS
SELECT
    ce.competition_id,
    ce.id AS entry_id,
    ce.user_id,
    u.full_name,
    COALESCE(SUM(cl.weight_kg), 0) AS total_weight_kg,
    COUNT(cl.id) AS total_catches,
    RANK() OVER (PARTITION BY ce.competition_id ORDER BY SUM(cl.weight_kg) DESC) AS rank
FROM competition_entries ce
JOIN users u ON u.id = ce.user_id
LEFT JOIN catch_logs cl ON cl.entry_id = ce.id AND cl.verified = TRUE
WHERE ce.status = 'approved'
GROUP BY ce.competition_id, ce.id, ce.user_id, u.full_name;
```

### 4.5 Supporting Tables

#### REVIEWS
```sql
CREATE TABLE reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_id     UUID REFERENCES users(id),
    target_type     VARCHAR(20) CHECK (target_type IN ('yacht','product','vendor')),
    target_id       UUID NOT NULL,
    rating          INT CHECK (rating BETWEEN 1 AND 5),
    comment         TEXT,
    comment_ar      TEXT,
    is_visible      BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### NOTIFICATIONS
```sql
CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(50) NOT NULL, -- 'booking_confirmed','order_shipped', etc.
    title       VARCHAR(255),
    title_ar    VARCHAR(255),
    body        TEXT,
    body_ar     TEXT,
    data        JSONB DEFAULT '{}', -- deep link, related IDs
    channel     VARCHAR(20) CHECK (channel IN ('push','email','sms','in_app')),
    is_read     BOOLEAN DEFAULT FALSE,
    sent_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

#### AUDIT_LOGS
```sql
CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    UUID REFERENCES users(id),
    action      VARCHAR(100) NOT NULL, -- 'booking.created', 'product.approved', etc.
    target_type VARCHAR(50),
    target_id   UUID,
    old_value   JSONB,
    new_value   JSONB,
    ip_address  INET,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

#### MATCH_REQUESTS & MATCH_RESULTS (AI Matching)
```sql
CREATE TABLE match_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    trip_type       VARCHAR(20),
    num_people      INT,
    trip_category   VARCHAR(20),
    budget_min      DECIMAL(10,2),
    budget_max      DECIMAL(10,2),
    preferred_dates JSONB, -- [date range options]
    preferences     JSONB, -- amenities, location, etc.
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE match_results (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id      UUID REFERENCES match_requests(id),
    yacht_id        UUID REFERENCES yachts(id),
    match_score     DECIMAL(5,4),
    ai_reasoning    TEXT,
    status          VARCHAR(20) DEFAULT 'offered' CHECK (status IN ('offered','accepted','declined','expired')),
    offered_at      TIMESTAMPTZ DEFAULT NOW(),
    expires_at      TIMESTAMPTZ
);
```

---

## 5. API Specification Overview

> Full OpenAPI 3.1 YAML files to be created in `03-Technical-Product/API/`

### 5.1 Base URL
```
Production: https://api.seaconnect.app/v1
Staging:    https://staging-api.seaconnect.app/v1
```

### 5.2 Authentication
- **Method:** JWT (access token 15min + refresh token 30 days)
- **Header:** `Authorization: Bearer <token>`
- **OTP flow:** Phone → SMS OTP → JWT issued

### 5.3 Endpoint Summary

#### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Email/phone registration |
| POST | `/auth/login` | Email or phone login |
| POST | `/auth/otp/send` | Send SMS OTP |
| POST | `/auth/otp/verify` | Verify OTP → JWT |
| POST | `/auth/oauth/google` | Google OAuth |
| POST | `/auth/oauth/apple` | Apple OAuth |
| POST | `/auth/refresh` | Refresh JWT |
| POST | `/auth/logout` | Revoke token |

#### Users
| Method | Path | Description |
|--------|------|-------------|
| GET | `/users/me` | Current user profile |
| PATCH | `/users/me` | Update profile |
| GET | `/users/me/notifications` | Notification list |
| PATCH | `/users/me/notifications/{id}/read` | Mark read |

#### Yachts (Booking Module)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/yachts` | List/search yachts (filters: location, dates, capacity, price, type) |
| GET | `/yachts/{id}` | Yacht detail |
| POST | `/yachts` | Owner: create listing |
| PATCH | `/yachts/{id}` | Owner: update listing |
| GET | `/yachts/{id}/availability` | Get availability calendar |
| PUT | `/yachts/{id}/availability` | Owner: set availability |
| POST | `/yachts/{id}/reviews` | Customer: submit review |

#### Bookings
| Method | Path | Description |
|--------|------|-------------|
| POST | `/bookings` | Customer: create booking |
| GET | `/bookings` | Customer: my bookings |
| GET | `/bookings/{id}` | Booking detail |
| PATCH | `/bookings/{id}/confirm` | Owner: confirm |
| PATCH | `/bookings/{id}/decline` | Owner: decline |
| PATCH | `/bookings/{id}/cancel` | Customer/Owner: cancel |
| POST | `/bookings/match` | Request AI match |

#### Marketplace
| Method | Path | Description |
|--------|------|-------------|
| GET | `/products` | List/search products |
| GET | `/products/{id}` | Product detail |
| POST | `/products` | Vendor: create product |
| PATCH | `/products/{id}` | Vendor: update product |
| GET | `/cart` | Get cart |
| POST | `/cart/items` | Add to cart |
| PATCH | `/cart/items/{id}` | Update quantity |
| DELETE | `/cart/items/{id}` | Remove item |
| POST | `/orders` | Checkout (creates order) |
| GET | `/orders` | My orders |
| GET | `/orders/{id}` | Order detail |

#### Competitions
| Method | Path | Description |
|--------|------|-------------|
| GET | `/competitions` | List competitions |
| GET | `/competitions/{id}` | Competition detail |
| POST | `/competitions` | Organizer: create |
| POST | `/competitions/{id}/register` | Participant: register |
| POST | `/competitions/{id}/catches` | Log a catch |
| GET | `/competitions/{id}/leaderboard` | Live leaderboard |

#### Payments
| Method | Path | Description |
|--------|------|-------------|
| POST | `/payments/initiate` | Start payment (returns gateway URL/token) |
| POST | `/payments/webhook/fawry` | Fawry webhook handler |
| POST | `/payments/webhook/stripe` | Stripe webhook handler |
| GET | `/payments/history` | My payment history |
| POST | `/payments/{id}/refund` | Admin: issue refund |

#### Admin
| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/users` | All users |
| PATCH | `/admin/users/{id}` | Update user / ban |
| GET | `/admin/yachts/pending` | Pending approvals |
| PATCH | `/admin/yachts/{id}/approve` | Approve yacht |
| GET | `/admin/products/pending` | Pending products |
| PATCH | `/admin/products/{id}/approve` | Approve product |
| GET | `/admin/bookings` | All bookings |
| GET | `/admin/analytics` | Platform analytics dashboard |
| POST | `/admin/promotions` | Create promotion/promo code |

---

## 6. MVP Scope Definition

### 6.1 What Ships in MVP (v1.0)

**Booking Module — FULL**
- User registration (email + phone OTP)
- Boat owner onboarding + listing creation
- Yacht search with filters (location, date, capacity, type, price)
- Direct booking flow + payment (Fawry card)
- Owner accepts/declines notifications
- Basic reviews (post-trip)
- Admin approval for yachts

**Marketplace Module — BASIC**
- Vendor onboarding (subscription: starter only at launch)
- Product listing + admin approval
- Product browse + search
- Cart + checkout (Fawry card only)
- Order tracking (status updates)

**Authentication — FULL**
- Email + phone OTP + Google OAuth
- Role-based access (customer, owner, vendor, admin)

**Admin Portal — CORE**
- User management
- Yacht/product approvals
- Booking overrides
- Basic analytics (revenue, bookings count, GMV)

**Notifications — BASIC**
- Push (FCM) for booking confirmations + order updates
- Email (SendGrid) for receipts

### 6.2 NOT in MVP (Phase 2+)

| Feature | Phase |
|---------|-------|
| Competition module | Phase 2 |
| AI smart matching | Phase 2 |
| Apple OAuth | Phase 2 |
| SMS notifications | Phase 2 |
| Stripe (international cards) | Phase 2 |
| Loyalty/rewards points | Phase 3 |
| Live GPS tracking | Phase 3 |
| Vendor analytics dashboard | Phase 2 |
| Multi-city expansion (UAE, KSA) | Phase 3 |
| Sponsorship/ads system | Phase 3 |

### 6.3 MVP Success Criteria

| Metric | Target (3 months post-launch) |
|--------|-------------------------------|
| Registered boat owners | 50 |
| Active yacht listings | 100 |
| Registered vendors | 30 |
| Completed bookings | 200 |
| Marketplace orders | 150 |
| App downloads | 2,000 |
| Platform uptime | ≥ 99.5% |

---

## 7. Automation Architecture

This section defines how SeaConnect becomes a **fully automated, low-touch operation**.

### 7.1 Automation Layers

```
┌─────────────────────────────────────────────────────┐
│                 USER-FACING AUTOMATION               │
│  Smart Search · AI Match · Chatbot · Auto-Pricing   │
├─────────────────────────────────────────────────────┤
│               BUSINESS PROCESS AUTOMATION            │
│  n8n Workflows · Celery Tasks · Scheduled Jobs      │
├─────────────────────────────────────────────────────┤
│               INFRASTRUCTURE AUTOMATION              │
│  CI/CD · Auto-scaling · DB backups · Monitoring     │
└─────────────────────────────────────────────────────┘
```

### 7.2 Business Process Automation (n8n Workflows)

Install n8n on Railway (self-hosted). Each workflow below is a trigger → action chain:

#### Booking Lifecycle Automation
```
[Booking Created]
  → Send push/email to owner (FCM + SendGrid)
  → Start 2-hour owner response timer
  → If no response → auto-decline + notify customer + suggest alternatives
  → If confirmed → send receipt to customer + update availability
  → D-1 reminder to customer (push)
  → D-day morning reminder (push + SMS)
  → Post-trip (T+24h) → request review from customer
  → T+48h → trigger owner payout (via Transactions table)
```

#### Marketplace Order Automation
```
[Order Created]
  → Confirm payment via webhook
  → Notify vendor (push + email)
  → Deduct stock_qty
  → If stock_qty <= 5 → alert vendor (low stock warning)
  → [Order Shipped] → send tracking update to customer
  → [Order Delivered] → trigger vendor payout (T+7 days escrow)
  → T+7 after delivery → request product review
```

#### Vendor Subscription Automation
```
[Subscription expires in 7 days]
  → Send renewal reminder email
[Subscription expires in 1 day]
  → Final reminder + downgrade warning
[Subscription expired]
  → Auto-downgrade to Starter tier
  → Deactivate listings over Starter limit
  → Send "your listings were paused" email
```

#### Competition Automation
```
[Competition created]
  → Notify all users matching "fishing" interest (push)
[Registration deadline approaching T-24h]
  → Push reminder to interested users
[Competition day]
  → Open catch log submissions (auto status change)
[Competition ends]
  → Auto-close submissions
  → Refresh leaderboard materialized view
  → Notify top 3 winners
  → Trigger prize distribution workflow
```

#### Admin Alert Automation
```
Daily at 08:00 → Send admin digest email:
  - New pending approvals (yachts + products)
  - Yesterday revenue
  - Failed payments
  - New user signups

Every 15min → Check for:
  - Payments stuck in 'pending' > 2 hours → alert admin
  - Bookings with no owner response > 1.5 hours → alert admin
```

### 7.3 AI Automation

#### AI Boat Matching Engine
```python
# Flow: customer submits match_request →
# Celery task fetches available yachts →
# GPT-4o scores each against preferences →
# Top 3 returned, match_results created →
# Owner notified for each match

Inputs:  budget, dates, party size, trip_type, preferences (amenities, location)
Outputs: ranked yacht suggestions with AI reasoning text
Model:   GPT-4o via LangChain
```

#### AI-Powered Search
- Semantic search on yacht/product descriptions using embeddings (OpenAI text-embedding-3-small)
- Stored in PostgreSQL using `pgvector` extension
- "Find me a yacht for 8 people near Hurghada under 3000 EGP" → works naturally

#### AI Customer Support Chatbot
- Integrated in Flutter app and web
- Handles: booking status, cancellation policy, product FAQs, competition rules
- Falls back to human support ticket if confidence < 0.7
- Built with: LangChain + OpenAI + Retrieval-Augmented Generation (RAG) over docs

#### Dynamic Pricing Suggestions (Owner Tool)
- Analyzes: season, local demand, competitor rates, yacht rating
- Suggests optimal pricing to owners in their dashboard
- Owner approves/rejects; no auto-price changes

### 7.4 CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml

Triggers:
  - Push to `main` → deploy to production
  - Push to `develop` → deploy to staging
  - PR opened → run checks

Jobs:
  1. lint        → ruff (Python), eslint (JS), dartanalyze (Flutter)
  2. test        → pytest (Django), jest (Next.js), flutter test
  3. security    → bandit (Python security), npm audit
  4. build       → Docker build (API), Next.js build, Flutter build
  5. migrate     → django migrate (staging/prod with approval gate)
  6. deploy      → Railway (API), Vercel (web), play store / TestFlight
  7. notify      → Slack/email on failure
```

### 7.5 Infrastructure Automation

#### Auto-Scaling
- **API (Railway):** Auto-scales containers on CPU > 70%
- **Database (Supabase):** Connection pooling via PgBouncer (built-in)
- **Cache (Upstash Redis):** Serverless, auto-scales

#### Scheduled Jobs (Celery Beat)
```
Every 15 min:  Check stuck payments + stuck bookings
Every hour:    Refresh leaderboard materialized view
Every 6 hours: Re-index search embeddings for new listings
Daily 02:00:   Database backup (Supabase automatic + export to R2)
Daily 08:00:   Admin digest email
Weekly Sunday: Payout batch processing report
Monthly 1st:   Vendor subscription renewal reminders
```

#### Monitoring & Alerting
- **Sentry:** Error tracking for Django API + Flutter + Next.js
- **Grafana Cloud:** Metrics (request rate, p95 latency, error rate, booking conversion)
- **UptimeRobot:** Uptime checks every 5 min → PagerDuty alert if down
- **PgHero:** Slow query monitoring

### 7.6 Arabic/RTL Localization Automation

- All DB text fields have paired `_ar` columns (no separate translation table)
- Django: `gettext` + `.po` files for UI strings
- Flutter: `flutter_localizations` + `intl` package; RTL layout automatic
- Next.js: `next-i18next` with `dir="rtl"` switching
- Content translation workflow: new English content → n8n triggers → OpenAI GPT-4o translates → stored in `_ar` column → admin reviews in portal
- Date/currency formatting: Egyptian locale (`ar-EG`) everywhere

### 7.7 Payment Automation

```
Customer initiates payment
  → Backend calls Fawry/Stripe API → gets payment token/URL
  → Customer completes payment on gateway
  → Gateway sends webhook to /payments/webhook/{gateway}
  → Backend verifies signature (HMAC/Stripe signature)
  → Updates payment status → triggers booking/order confirmation
  → Creates Transaction record for payout ledger
  → Celery task: schedule payout (T+48h bookings, T+7d orders)
  → Payout day: auto-transfer via bank API (manual phase 1, automated phase 2)
```

---

## 8. Phase-by-Phase Roadmap

### Phase 0 — Planning Completion (Weeks 1–4, April 2026)

| Week | Tasks |
|------|-------|
| 1 | Fix doc typos, fill financial numbers, tech stack sign-off |
| 2 | Finalize full DB schema (this doc), create OpenAPI YAML files |
| 3 | UX wireframes sprint (Figma, all core flows including Arabic RTL) |
| 4 | Stakeholder sign-off meeting, MVP scope locked, dev team assembled |

**Deliverables:**
- [ ] All `_____` placeholders filled in financial docs
- [ ] OpenAPI 3.1 YAML for all endpoints
- [ ] Figma wireframes (EN + AR) for booking, marketplace, competition
- [ ] Signed SRS document
- [ ] Dev environment setup guide

### Phase 1 — MVP Development (Weeks 5–20, May–August 2026)

| Sprint | Focus |
|--------|-------|
| 1–2 | Project scaffolding: Django, Next.js, Flutter, Docker, GitHub Actions CI |
| 3–4 | Auth module: registration, phone OTP, Google OAuth, JWT |
| 5–6 | Yacht listings: CRUD, image upload to R2, admin approval flow |
| 7–8 | Booking flow: calendar, booking creation, owner notifications |
| 9–10 | Payment integration: Fawry cards, webhook handling, receipts |
| 11–12 | Marketplace: vendor onboarding, product listings, cart, checkout |
| 13–14 | Admin portal: approvals, user management, basic analytics |
| 15–16 | Notifications: FCM push, SendGrid email, notification center |
| 17–18 | Arabic localization: all screens RTL, AR content, date/currency |
| 19–20 | QA, load testing, security audit, bug fixes |

**Test Strategy:**
- Unit tests: ≥ 80% coverage on all business logic (pytest + flutter_test)
- Integration tests: all API endpoints (pytest + DRF test client)
- E2E tests: core flows (Playwright for web, Appium for mobile)
- Load test: 500 concurrent users, Locust framework
- Security: OWASP ZAP scan, SQL injection checks, payment PCI-DSS review

### Phase 2 — Feature Expansion (Months 6–9, Sept–Dec 2026)

| Feature | Description |
|---------|-------------|
| Competition Module | Full competitions, catch logging, live leaderboard |
| AI Matching Engine | Smart yacht matching via GPT-4o + embeddings |
| AI Chatbot | In-app customer support bot with RAG |
| Stripe Integration | International card support |
| Vendor Analytics | Sales dashboard, conversion metrics |
| Apple OAuth | iOS sign-in with Apple |
| n8n Automation | All workflows from Section 7.2 |
| Dynamic Pricing Tool | AI pricing suggestions for owners |

### Phase 3 — Scale & Expansion (2027)

| Feature | Description |
|---------|-------------|
| MENA Expansion | UAE, KSA market launch (Arabic-first, local payment gateways) |
| Live GPS Tracking | Real-time boat tracking during trips |
| Loyalty Points System | Customer retention program |
| Sponsorship/Ads | Platform advertising system for vendors/brands |
| B2B API | White-label API for marinas and tour operators |
| Offline Mode | Flutter offline-first for areas with weak connectivity |

---

## 9. Financial Plan (Filled)

> Estimates based on Egypt maritime leisure market data (2025). Adjust quarterly.

### 9.1 Commission Structure (Final)

| Revenue Stream | Rate | Notes |
|---------------|------|-------|
| Boat charter commission | 12% | Charged to owner |
| Marketplace commission | 10% | Charged to vendor |
| Vendor subscription — Professional | 299 EGP/month | Unlimited listings |
| Vendor subscription — Enterprise | 799 EGP/month | API + account manager |
| Featured boat listing | 150 EGP / 7 days | Homepage placement |
| Featured product | 75 EGP / 7 days | Category page top |
| Competition entry platform fee | 15% of entry fee | Organizer keeps 85% |

### 9.2 Boat Charter Pricing (Market Reference)

| Boat Type | Half-Day | Full-Day | Multi-Day |
|-----------|----------|----------|-----------|
| Small Fishing Boat | 800 EGP | 1,400 EGP | 1,000 EGP/day |
| Medium Yacht (6–10 pax) | 2,000 EGP | 3,500 EGP | 2,800 EGP/day |
| Large Yacht (10–20 pax) | 4,000 EGP | 7,000 EGP | 5,500 EGP/day |
| Luxury Charter (20+ pax) | 8,000 EGP | 15,000 EGP | 12,000 EGP/day |

### 9.3 Year 1 Revenue Projection

| Stream | Monthly (Avg) | Annual |
|--------|--------------|--------|
| Boat charter commissions (12% × 200 bookings × 2,000 EGP avg) | 48,000 EGP | 576,000 EGP |
| Marketplace commissions (10% × 150 orders × 500 EGP avg) | 7,500 EGP | 90,000 EGP |
| Vendor subscriptions (20 Pro × 299 + 3 Ent × 799) | 8,377 EGP | 100,524 EGP |
| Featured listings/ads | 5,000 EGP | 60,000 EGP |
| Competition entry fees | 3,000 EGP | 36,000 EGP |
| **TOTAL YEAR 1** | **71,877 EGP** | **862,524 EGP** |

### 9.4 Key Unit Economics

| Metric | Value |
|--------|-------|
| CAC (Customer) | 120 EGP |
| CAC (Boat Owner) | 400 EGP |
| CAC (Vendor) | 250 EGP |
| Customer LTV (12 months) | 800 EGP |
| LTV:CAC ratio | 6.7:1 |
| Payback period | ~2 months |
| Monthly churn target | < 5% |

### 9.5 Cost Structure (Month 6, steady-state)

| Category | Monthly Cost |
|----------|-------------|
| Infrastructure (Railway + Supabase + Upstash + R2) | 1,500 EGP |
| Notification services (FCM free + SendGrid + Twilio) | 800 EGP |
| Payment gateway fees (~2.5% of GTV) | 4,000 EGP |
| AI API costs (OpenAI) | 1,200 EGP |
| n8n (self-hosted Railway) | 300 EGP |
| Monitoring (Sentry + Grafana Cloud) | 500 EGP |
| **Total Infrastructure** | **~8,300 EGP/month** |

### 9.6 Break-Even Analysis

- Break-even MRR needed: ~8,300 EGP infrastructure + 20,000 EGP salaries = ~28,300 EGP/month
- Projected break-even: **Month 5 post-launch**
- Profitability (Year 1 total): Positive by Q4

---

## 10. Project Governance

### 10.1 Stakeholder Sign-Off Required

| Role | Responsible For | Sign-Off Needed On |
|------|----------------|-------------------|
| Product Owner | Feature prioritization, MVP scope | This document + SRS |
| Tech Lead | Architecture decisions, tech stack | Section 3 + Section 4 |
| Legal Counsel | Legal document review | `02-Legal-Administrative/*` |
| CFO / Financial Lead | Financial projections | Section 9 |
| QA Lead | Test strategy | Section 8 |

### 10.2 Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Payment gateway delays (Fawry onboarding can take 4–6 weeks) | High | High | Start Fawry application in Week 1 |
| Egyptian maritime regulations blocking app | Medium | High | Legal review + Tourism Board partnership |
| Slow boat owner adoption | Medium | High | Offer 0% commission first 3 months |
| Flutter developer availability in Egypt | Medium | Medium | Budget for remote devs or training |
| AI API costs exceed budget | Low | Medium | Set hard monthly cap, use caching |
| Scope creep during development | High | Medium | Lock MVP scope in Week 4, no exceptions |

### 10.3 Document Maintenance

| Document | Review Frequency | Owner |
|----------|-----------------|-------|
| This Master Plan | Monthly | Product Owner |
| DB Schema | Per sprint | Tech Lead |
| API Specs | Per sprint | Tech Lead |
| Financial Projections | Quarterly | CFO |
| Legal Documents | Annually + regulatory change | Legal Counsel |

---

## Appendix A: Immediate Action Items (Week 1)

- [ ] Rename `BuinessModel.md` → `BusinessModel.md`
- [ ] Delete `RequriedDocuments.md` (duplicate)
- [ ] Apply to Fawry merchant portal (fawry.com/merchant)
- [ ] Create GitHub organization + private repo (`seaconnect/platform`)
- [ ] Set up GitHub Projects board with Phase 0 tasks
- [ ] Schedule stakeholder sign-off meeting
- [ ] Hire / confirm: 1 Django dev, 1 Flutter dev, 1 Next.js dev, 1 UI/UX designer
- [ ] Purchase domain: `seaconnect.app`
- [ ] Set up Supabase project + Railway account + Vercel account
- [ ] Order Egyptian company registration (if not done)

---

**Document Owner:** Product Owner  
**Last Updated:** April 6, 2026  
**Next Review:** May 6, 2026
