# System Architecture — SeaConnect
**Version:** 1.0
**Date:** April 6, 2026
**Document Status:** ✅ Complete

---

## 1. Architecture Overview

SeaConnect uses a **monolith-first, modular architecture** — a single Django application with clearly separated modules (Booking, Marketplace, Competition, Admin). This is the right choice for an early-stage marketplace: fast to build, easy to debug, no distributed systems complexity until revenue justifies it.

Extraction to microservices (e.g., splitting Notifications into its own service) happens in Year 2 if load demands it.

---

## 2. C4 Model Diagrams

### 2.1 Level 1 — System Context

```
                    ┌─────────────────────────────────────────┐
                    │              SeaConnect Platform          │
                    │                                           │
  [Customer]  ────▶ │  Mobile App (Flutter)                    │
  [Boat Owner] ───▶ │  Web App (Next.js)                       │ ◀──── [Boat Owner]
  [Vendor]     ───▶ │  Admin Portal (Next.js)                  │ ◀──── [Vendor]
  [Organizer]  ───▶ │                                           │ ◀──── [Competition Organizer]
                    │  REST API (Django)                        │
                    └──────────────┬────────────────────────────┘
                                   │
              ┌────────────────────┼────────────────────────┐
              ▼                    ▼                         ▼
        [Fawry / Stripe]    [SendGrid / Twilio]        [OpenAI API]
        Payment Gateway       Notifications             AI Services
```

### 2.2 Level 2 — Container Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                        SeaConnect Platform                      │
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │  Flutter App      │    │  Next.js Web App │                   │
│  │  (Android + iOS)  │    │  (Customer + SSR)│                   │
│  │  - Arabic RTL     │    │  - SEO listings  │                   │
│  │  - Offline cache  │    │  - Admin portal  │                   │
│  └────────┬─────────┘    └────────┬─────────┘                   │
│           │                       │                               │
│           └──────────┬────────────┘                              │
│                      ▼                                           │
│           ┌──────────────────────┐                              │
│           │   Django REST API    │                              │
│           │   (Railway, Docker)  │                              │
│           │                      │                              │
│           │  ┌────────────────┐  │   ┌──────────────────────┐  │
│           │  │ Booking Module │  │   │   Celery Workers      │  │
│           │  │ Market Module  │  │──▶│   (async tasks)       │  │
│           │  │ Competition    │  │   │   - Notifications     │  │
│           │  │ Admin Module   │  │   │   - Payouts           │  │
│           │  │ Auth Module    │  │   │   - AI matching       │  │
│           │  └────────────────┘  │   └──────────────────────┘  │
│           └──────────┬───────────┘                              │
│                      │                                           │
│    ┌─────────────────┼─────────────────┐                        │
│    ▼                 ▼                 ▼                        │
│ ┌──────────┐  ┌──────────────┐  ┌──────────────┐               │
│ │PostgreSQL│  │  Redis Cache  │  │ Cloudflare R2│               │
│ │(Supabase)│  │  (Upstash)   │  │ (File Store) │               │
│ └──────────┘  └──────────────┘  └──────────────┘               │
└────────────────────────────────────────────────────────────────┘
```

### 2.3 Level 3 — Component Diagram (Django API)

```
django_api/
├── apps/
│   ├── auth/          # Registration, JWT, OAuth, OTP
│   ├── users/         # Profiles, notifications, settings
│   ├── yachts/        # Listings, availability, search
│   ├── bookings/      # Booking flow, status, matching
│   ├── payments/      # Gateway integration, webhooks, payouts
│   ├── marketplace/   # Products, carts, orders, shipments
│   ├── competitions/  # Events, entries, catches, leaderboard
│   ├── admin_portal/  # Management, analytics, approvals
│   └── notifications/ # FCM, email, SMS dispatch
├── core/
│   ├── middleware.py  # Auth, rate limiting, request logging
│   ├── permissions.py # Role-based access control
│   ├── pagination.py  # Cursor-based pagination
│   └── exceptions.py  # Standardized error responses
├── services/
│   ├── fawry.py       # Fawry payment service
│   ├── stripe.py      # Stripe payment service
│   ├── fcm.py         # Firebase push notifications
│   ├── sendgrid.py    # Email service
│   ├── twilio.py      # SMS OTP service
│   ├── r2.py          # Cloudflare R2 file uploads
│   └── openai_match.py # AI matching service
├── tasks/             # Celery async tasks
│   ├── booking_tasks.py
│   ├── payment_tasks.py
│   ├── notification_tasks.py
│   └── matching_tasks.py
└── config/
    ├── settings/
    │   ├── base.py
    │   ├── development.py
    │   └── production.py
    ├── urls.py
    └── celery.py
```

---

## 3. Deployment Architecture

### 3.1 Production Environment

```
┌─────────────────────────────────────────────────────────────┐
│                     Internet / Users                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │    Cloudflare (CDN)      │  ← DDoS protection, WAF,
              │    DNS + WAF + CDN       │    SSL termination, caching
              └──┬──────────┬──────────┘
                 │           │
    ┌────────────▼──┐   ┌────▼────────────┐
    │  Vercel        │   │  Railway         │
    │  (Next.js web) │   │  (Django API)    │
    │  - Customer web│   │  - Auto-scales   │
    │  - Admin portal│   │  - Docker        │
    │  - Edge SSR    │   │  - 2+ replicas   │
    └────────────────┘   └────────┬─────────┘
                                  │
                ┌─────────────────┼─────────────────┐
                ▼                 ▼                  ▼
        ┌──────────────┐ ┌──────────────┐  ┌──────────────┐
        │  Supabase     │ │  Upstash      │  │  Railway      │
        │  PostgreSQL   │ │  Redis        │  │  Celery Worker│
        │  - Connection │ │  - Session    │  │  - Async tasks│
        │    pooling    │ │  - Rate limit │  │  - Scheduled  │
        │  - Backups    │ │  - Job queue  │  │    jobs       │
        │  - pgvector   │ └──────────────┘  └──────────────┘
        └──────────────┘
                │
        ┌──────────────┐
        │ Cloudflare R2 │
        │ (Media files) │
        │ - Boat images │
        │ - Products    │
        │ - Competition │
        └──────────────┘
```

### 3.2 Container Configuration (Docker)

```dockerfile
# Production: 3 containers on Railway
# 1. django_api     - Web server (Gunicorn + Uvicorn)
# 2. celery_worker  - Async task processor
# 3. celery_beat    - Scheduled job scheduler
```

### 3.3 Scaling Strategy

| Component | Scaling Method | Trigger |
|-----------|---------------|---------|
| Django API (Railway) | Horizontal — add replicas | CPU > 70% for 5 min |
| Celery Workers | Horizontal — add workers | Queue depth > 500 tasks |
| PostgreSQL (Supabase) | Vertical → read replicas | Query time p95 > 100ms |
| Redis (Upstash) | Serverless — auto | Transparent |
| Media (R2) | Serverless — auto | Transparent |

---

## 4. Data Flow Diagrams

### 4.1 Booking Flow

```
Customer                API                  Database              Owner
   │                     │                      │                    │
   ├─ GET /yachts ───────▶│                      │                    │
   │                     ├─ Query available ────▶│                    │
   │◀─ Yacht list ────────│◀─ Results ───────────│                    │
   │                     │                      │                    │
   ├─ POST /bookings ────▶│                      │                    │
   │                     ├─ Create booking ─────▶│                    │
   │                     ├─ Block availability ──▶│                    │
   │                     ├─ Initiate payment ────▶(Fawry/Stripe)      │
   │◀─ Payment URL ───────│                      │                    │
   │                     │                      │                    │
   ├─ [Customer pays] ───▶(Fawry/Stripe)         │                    │
   │                     │◀─ Webhook ────────────│                    │
   │                     ├─ Update payment ──────▶│                    │
   │                     ├─ Update booking ──────▶│                    │
   │                     ├─ [Celery] Send FCM ───────────────────────▶│
   │◀─ Receipt email ─────│                      │                    │
   │                     │                      │                    │
   │                     │                      │   ├─ Owner approves  │
   │                     │◀──────────────────────────────────────────│
   │                     ├─ Update booking: confirmed ──▶│            │
   │◀─ Confirmed push ────│                      │                    │
```

### 4.2 AI Match Flow

```
Customer               API              Celery           OpenAI          DB
   │                    │                  │                │             │
   ├─ POST /bookings/match ─────────────▶ │                │             │
   │                    ├─ Create          │                │             │
   │                    │  match_request ──────────────────────────────▶ │
   │                    ├─ Queue task ───▶ │                │             │
   │◀─ 202 Accepted ─── │                  │                │             │
   │                    │                  ├─ Fetch yachts ──────────────▶│
   │                    │                  │◀─ Available yachts ─────────│
   │                    │                  ├─ Call GPT-4o ▶ │             │
   │                    │                  │◀─ Ranked list ─│             │
   │                    │                  ├─ Save results ──────────────▶│
   │                    │                  ├─ Notify owners (FCM) ────────────────▶
   │◀─ Push: matches ready ─────────────── │                │             │
   ├─ GET /bookings/match/{id} ─────────▶  │                │             │
   │◀─ Match results ─── │                 │                │             │
```

---

## 5. Security Architecture

### 5.1 Authentication & Authorization

```
Request → Cloudflare WAF → Nginx → Django Middleware → View

Middleware stack:
1. RateLimitMiddleware    — 100 req/min per IP; 300 req/min per user
2. JWTAuthMiddleware      — Validates Bearer token on every request
3. RolePermissionMiddleware — Checks user.role against view permissions
4. AuditLogMiddleware     — Logs action + actor to audit_logs table
```

**JWT Configuration:**
- Access token: 15 minutes TTL
- Refresh token: 30 days TTL, single-use (rotated on each refresh)
- Stored: access token in memory (Flutter/JS), refresh token in HTTP-only cookie
- Algorithm: RS256 (asymmetric — public key can be distributed to mobile)

### 5.2 Role-Based Access Control (RBAC)

| Role | Permissions |
|------|------------|
| `customer` | Browse, book, purchase, review, enter competitions |
| `owner` | All customer permissions + manage own yachts + view own bookings |
| `vendor` | All customer permissions + manage own products + view own orders |
| `organizer` | All customer permissions + create/manage competitions |
| `admin` | Full access — all objects, all operations |

### 5.3 Payment Security
- All payment amounts calculated server-side — never trust client-submitted amounts
- Fawry webhook: Verify SHA-256 HMAC signature using shared secret
- Stripe webhook: Verify using `stripe.webhook.construct_event()` with endpoint secret
- PCI DSS: SeaConnect never stores raw card numbers — gateways handle tokenization
- Sensitive data (bank accounts, national IDs): AES-256 encrypted at rest in DB

### 5.4 Data Security
- All API communication: HTTPS only (TLS 1.3)
- Database connections: SSL enforced (Supabase default)
- Secrets management: Environment variables via Railway (never in code)
- Media files: R2 bucket is private; access via signed URLs (1-hour TTL)
- SQL injection: Django ORM parameterized queries throughout (no raw SQL except indexed views)
- XSS: DRF renders JSON only (no HTML in API); Next.js uses React's auto-escaping

---

## 6. Performance Architecture

### 6.1 Caching Strategy (Redis)

| Cache Key | TTL | What's Cached |
|-----------|-----|---------------|
| `yacht_list:{filter_hash}` | 5 min | Search results (invalidated on new listing) |
| `yacht_detail:{id}` | 10 min | Single yacht page data |
| `product_list:{filter_hash}` | 5 min | Product search results |
| `competition_list` | 2 min | Active competitions |
| `leaderboard:{competition_id}` | 1 min | Competition rankings |
| `user_session:{user_id}` | 15 min | User profile data |
| `rate_limit:{ip}` | 1 min | Request count per IP |

### 6.2 Database Indexes

```sql
-- High-frequency queries get compound indexes
CREATE INDEX idx_yachts_location ON yachts(location_lat, location_lng) WHERE is_active = TRUE;
CREATE INDEX idx_availability_yacht_date ON availability(yacht_id, date, status);
CREATE INDEX idx_bookings_customer ON bookings(customer_id, status, created_at DESC);
CREATE INDEX idx_bookings_owner ON bookings(yacht_id, status, start_date);
CREATE INDEX idx_products_category ON products(category_id, is_active, price);
CREATE INDEX idx_orders_customer ON orders(customer_id, status, created_at DESC);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- Full-text search
CREATE INDEX idx_yachts_search ON yachts USING gin(to_tsvector('arabic', name_ar || ' ' || coalesce(description_ar, '')));
CREATE INDEX idx_products_search ON products USING gin(to_tsvector('arabic', name_ar || ' ' || coalesce(description_ar, '')));

-- Vector search for AI matching (pgvector)
CREATE INDEX idx_yacht_embedding ON yachts USING ivfflat (embedding vector_cosine_ops);
```

### 6.3 API Response Targets

| Endpoint Type | P50 Target | P95 Target |
|--------------|------------|------------|
| Yacht/Product list (cached) | < 50ms | < 100ms |
| Yacht/Product list (cold) | < 200ms | < 400ms |
| Booking creation | < 500ms | < 1,000ms |
| Payment initiation | < 800ms | < 1,500ms |
| AI match request | < 200ms (queued) | N/A (async) |

---

## 7. Localization Architecture

### 7.1 Arabic/RTL Strategy

**Database:** All user-facing text fields have paired `_ar` columns.
```sql
-- Example: yacht has both
name VARCHAR(255),      -- English
name_ar VARCHAR(255),   -- Arabic
description TEXT,
description_ar TEXT,
```

**API:** Language negotiated via `Accept-Language` header (`ar` or `en`).
```python
# API returns language-appropriate field automatically
class YachtSerializer(serializers.ModelSerializer):
    name = SerializerMethodField()
    def get_name(self, obj):
        lang = self.context['request'].LANGUAGE_CODE
        return obj.name_ar if lang == 'ar' and obj.name_ar else obj.name
```

**Flutter:**
```dart
// RTL layout activated automatically when locale is Arabic
MaterialApp(
  locale: Locale('ar', 'EG'),
  localizationsDelegates: [
    GlobalMaterialLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,  // handles RTL
    GlobalCupertinoLocalizations.delegate,
    AppLocalizations.delegate,            // app strings
  ],
)
```

**Next.js:**
```js
// next.config.js
i18n: {
  locales: ['ar', 'en'],
  defaultLocale: 'ar',
  localeDetection: true,
}
// HTML dir attribute set per locale
<html dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale}>
```

**Automated Translation:**
New English content → n8n webhook → OpenAI GPT-4o translates → stored in `_ar` column → Admin reviews in portal.

### 7.2 Date, Currency & Number Formatting

| Component | Egyptian Arabic Format |
|-----------|----------------------|
| Date | ٦ أبريل ٢٠٢٦ (using `Intl.DateTimeFormat('ar-EG')`) |
| Currency | ٣٬٥٠٠ ج.م. |
| Numbers | ٣٬٥٠٠ (Arabic-Indic numerals) or 3,500 (Latin, user-configurable) |
| Calendar | Gregorian (standard for business; Hijri shown optionally) |

---

## 8. Disaster Recovery & Backup

| Component | Backup Frequency | RPO | RTO | Method |
|-----------|-----------------|-----|-----|--------|
| PostgreSQL (Supabase) | Continuous WAL + daily snapshot | < 1 min | < 30 min | Supabase built-in + daily export to R2 |
| Redis (Upstash) | N/A — cache only, not source of truth | N/A | Instant (cold cache) | Rebuild from DB |
| Media files (R2) | Replicated across Cloudflare PoPs | N/A | Instant | Cloudflare redundancy |
| Application code | Git (GitHub) | Real-time | < 15 min (redeploy) | Railway auto-deploy |

**RTO target:** < 30 minutes for full platform restoration.
**Data loss tolerance:** < 1 minute of transaction data (WAL replication).

---

## Document Sign-Off

| Role | Name | Date |
|------|------|------|
| Tech Lead | _____________ | ___/___/___ |
| Product Owner | _____________ | ___/___/___ |

**Last Updated:** April 6, 2026
**Next Review:** August 6, 2026
