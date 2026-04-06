# Technology Stack — SeaConnect
**Version:** 1.0 (Final Decisions)
**Date:** April 6, 2026
**Document Status:** ✅ Complete — These are binding decisions.

---

## Decision Summary

| Layer | Technology | Version | Status |
|-------|-----------|---------|--------|
| Backend API | Django + Django REST Framework | Python 3.12 / Django 5.x / DRF 3.15 | **FINAL** |
| Mobile App | Flutter | 3.x (latest stable) | **FINAL** |
| Web App | Next.js (TypeScript) | 14.x | **FINAL** |
| Database | PostgreSQL | 16 (via Supabase) | **FINAL** |
| Cache | Redis | 7.x (via Upstash) | **FINAL** |
| Task Queue | Celery + Celery Beat | 5.x | **FINAL** |
| File Storage | Cloudflare R2 | — | **FINAL** |
| Primary Payment | Fawry | API v2 | **FINAL** |
| Secondary Payment | Stripe | API v2024 | **FINAL** |
| Push Notifications | Firebase Cloud Messaging | v1 API | **FINAL** |
| Email | SendGrid | v3 API | **FINAL** |
| SMS / OTP | Twilio | — | **FINAL** |
| AI / Matching | OpenAI GPT-4o + LangChain | — | **FINAL** |
| Embeddings / Search | pgvector (PostgreSQL extension) | 0.7 | **FINAL** |
| Workflow Automation | n8n (self-hosted) | latest | **FINAL** |
| API Backend Hosting | Railway | — | **FINAL** |
| Web Hosting | Vercel | — | **FINAL** |
| CI/CD | GitHub Actions | — | **FINAL** |
| Monitoring — Errors | Sentry | — | **FINAL** |
| Monitoring — Metrics | Grafana Cloud | — | **FINAL** |
| Uptime Monitoring | UptimeRobot | — | **FINAL** |
| CDN / WAF / DNS | Cloudflare | — | **FINAL** |
| Containers | Docker + Docker Compose | — | **FINAL** |

---

## 1. Backend — Django + Django REST Framework

### Why Django
| Criterion | Django | Node.js | Laravel |
|-----------|--------|---------|---------|
| Built-in admin panel | ✅ Excellent | ❌ None | ⚠️ Basic |
| ORM quality | ✅ Best-in-class | ❌ N/A (choose your own) | ✅ Eloquent |
| Auth & permissions | ✅ Built-in | ⚠️ Requires libs | ✅ Built-in |
| Marketplace pattern support | ✅ Battle-tested | ⚠️ Manual | ✅ Good |
| Egyptian dev availability | ✅ Common | ✅ Very common | ⚠️ Limited |
| Python AI ecosystem | ✅ Best (OpenAI, LangChain, pgvector) | ❌ Secondary | ❌ Poor |
| Decision | **CHOSEN** | Rejected | Rejected |

### Key Libraries
```
django==5.1
djangorestframework==3.15
djangorestframework-simplejwt==5.3
django-cors-headers==4.3
django-filter==24.1
django-storages[cloudflare-r2]==1.14
celery==5.3
redis==5.0
psycopg[binary]==3.1
pgvector==0.2
dj-database-url==2.1
gunicorn==22.0
openai==1.35
langchain==0.2
sentry-sdk==2.5
```

### Project Structure
```
seaconnect_api/
├── manage.py
├── requirements/
│   ├── base.txt
│   ├── development.txt
│   └── production.txt
├── config/
│   ├── settings/
│   │   ├── base.py
│   │   ├── development.py
│   │   └── production.py
│   ├── urls.py
│   └── celery.py
├── apps/
│   ├── auth/
│   ├── users/
│   ├── yachts/
│   ├── bookings/
│   ├── payments/
│   ├── marketplace/
│   ├── competitions/
│   ├── notifications/
│   └── admin_portal/
├── services/
├── tasks/
└── tests/
    ├── unit/
    ├── integration/
    └── fixtures/
```

### Environment Variables (Required)
```bash
# Django
SECRET_KEY=
DEBUG=False
ALLOWED_HOSTS=api.seaconnect.app
DATABASE_URL=postgresql://...  # Supabase connection string

# Redis
REDIS_URL=rediss://...  # Upstash Redis URL

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=seaconnect-media

# Fawry
FAWRY_MERCHANT_CODE=
FAWRY_SECURITY_KEY=
FAWRY_API_URL=https://www.atfawry.com/ECommerceWeb/Fawry/payments/

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Firebase (FCM)
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# SendGrid
SENDGRID_API_KEY=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=+20...

# OpenAI
OPENAI_API_KEY=sk-...

# Sentry
SENTRY_DSN=

# JWT
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=15
JWT_REFRESH_TOKEN_LIFETIME_DAYS=30
```

---

## 2. Mobile — Flutter

### Why Flutter
| Criterion | Flutter | React Native |
|-----------|---------|-------------|
| Arabic RTL support | ✅ Native, reliable | ⚠️ Known issues with some components |
| Single codebase (iOS + Android) | ✅ Yes | ✅ Yes |
| Performance | ✅ Compiled to native | ⚠️ JS bridge overhead |
| UI consistency | ✅ Own rendering engine | ⚠️ Platform differences |
| Egyptian dev availability | ✅ Growing fast | ✅ Common |
| Offline capability | ✅ Excellent | ✅ Good |
| Decision | **CHOSEN** | Rejected |

### Key Packages
```yaml
dependencies:
  flutter_localizations: sdk: flutter
  intl: ^0.19.0              # Date/number formatting (Arabic)
  dio: ^5.4.0                # HTTP client
  flutter_secure_storage: ^9.0.0  # JWT storage
  firebase_core: ^2.27.0
  firebase_messaging: ^14.7.0    # Push notifications
  google_sign_in: ^6.2.0
  sign_in_with_apple: ^5.0.0
  image_picker: ^1.0.7
  cached_network_image: ^3.3.1
  flutter_map: ^6.1.0        # Maps (OpenStreetMap, free)
  geolocator: ^11.0.0
  go_router: ^13.2.0         # Navigation
  riverpod: ^2.5.1           # State management
  freezed: ^2.5.2            # Immutable models
  json_annotation: ^4.9.0
  hive: ^2.2.3               # Local cache
  flutter_stripe: ^10.1.0    # Stripe SDK
```

### Folder Structure
```
seaconnect_app/
├── lib/
│   ├── main.dart
│   ├── app.dart              # MaterialApp, routing, locale
│   ├── core/
│   │   ├── api/              # Dio client, interceptors
│   │   ├── auth/             # JWT storage, refresh logic
│   │   ├── theme/            # Colors, typography, RTL
│   │   └── localization/     # AR/EN strings
│   ├── features/
│   │   ├── auth/             # Login, register, OTP
│   │   ├── home/             # Dashboard
│   │   ├── yachts/           # Browse, detail, book
│   │   ├── bookings/         # My bookings, history
│   │   ├── marketplace/      # Products, cart, checkout
│   │   ├── competitions/     # Browse, register, leaderboard
│   │   ├── profile/          # User + owner/vendor profile
│   │   └── notifications/    # Notification center
│   └── shared/
│       ├── widgets/          # Reusable UI components
│       └── utils/            # Date formatting, validators
├── assets/
│   ├── images/
│   ├── icons/
│   └── translations/
│       ├── ar.json
│       └── en.json
└── test/
```

### Build & Release
```bash
# Android release APK
flutter build apk --release

# Android App Bundle (Play Store)
flutter build appbundle --release

# iOS (requires Mac + Xcode)
flutter build ios --release

# Run tests
flutter test

# Analyze
flutter analyze
```

---

## 3. Web App — Next.js 14 (TypeScript)

### Why Next.js
- Server-side rendering critical for SEO — boat listings must appear in Google search
- App Router (Next.js 14) supports server components → faster initial load
- Vercel deployment is zero-config → reduced DevOps burden
- TypeScript enforces type safety at build time

### Key Packages
```json
{
  "dependencies": {
    "next": "14.2",
    "react": "18.3",
    "typescript": "5.4",
    "next-intl": "3.12",
    "@tanstack/react-query": "5.40",
    "axios": "1.7",
    "zustand": "4.5",
    "react-hook-form": "7.51",
    "zod": "3.23",
    "tailwindcss": "3.4",
    "@stripe/stripe-js": "3.4",
    "next-auth": "4.24",
    "sentry/nextjs": "8.6",
    "leaflet": "1.9",
    "react-leaflet": "4.2",
    "date-fns": "3.6",
    "date-fns/locale/ar": "3.6"
  }
}
```

### Folder Structure
```
seaconnect_web/
├── app/                      # Next.js 14 App Router
│   ├── [locale]/             # Language routing (/ar/, /en/)
│   │   ├── page.tsx          # Homepage
│   │   ├── yachts/
│   │   │   ├── page.tsx      # Yacht listing (SSR + SEO)
│   │   │   └── [id]/page.tsx # Yacht detail (SSR)
│   │   ├── marketplace/
│   │   ├── competitions/
│   │   ├── bookings/
│   │   ├── account/
│   │   └── admin/            # Admin portal (role-gated)
│   └── api/                  # Next.js API routes (webhooks, OAuth callbacks)
├── components/
│   ├── ui/                   # Base components (Button, Input, Modal)
│   ├── yacht/                # YachtCard, YachtMap, AvailabilityCalendar
│   ├── marketplace/          # ProductCard, Cart, OrderStatus
│   └── competition/          # CompetitionCard, Leaderboard
├── lib/
│   ├── api.ts                # Axios client to Django API
│   ├── auth.ts               # next-auth configuration
│   └── utils.ts
├── messages/                 # i18n strings
│   ├── ar.json
│   └── en.json
└── middleware.ts             # Locale detection + auth middleware
```

---

## 4. Database — PostgreSQL 16 (Supabase)

### Why Supabase
- Managed PostgreSQL with automatic backups (point-in-time recovery)
- Built-in connection pooling (PgBouncer) — handles Django's connection model
- pgvector extension enabled by default — required for AI semantic search
- Built-in dashboard for admin queries
- Row-level security (RLS) available if needed
- Free tier sufficient for development; Pro ($25/month) for production

### Extensions Required
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";    -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgvector";      -- AI embeddings
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- Fuzzy text search
CREATE EXTENSION IF NOT EXISTS "unaccent";      -- Arabic text search normalization
```

### Connection Configuration
```python
# Django settings
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'OPTIONS': {
            'pool': True,         # Use connection pooling
            'connect_timeout': 10,
            'options': '-c default_transaction_isolation=read\ committed'
        }
    }
}
# Or use dj-database-url:
DATABASES = {'default': dj_database_url.parse(env('DATABASE_URL'))}
```

---

## 5. Cache & Queue — Redis (Upstash) + Celery

### Upstash Redis
- Serverless Redis — pay per request, no idle cost
- Persistent (AOF) — data survives restarts
- TLS encrypted by default
- Global edge network — low latency from Egypt

### Celery Configuration
```python
# config/celery.py
app = Celery('seaconnect')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.conf.update(
    broker_url=env('REDIS_URL'),
    result_backend=env('REDIS_URL'),
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    timezone='Africa/Cairo',
    task_routes={
        'tasks.booking_tasks.*': {'queue': 'bookings'},
        'tasks.payment_tasks.*': {'queue': 'payments'},
        'tasks.notification_tasks.*': {'queue': 'notifications'},
        'tasks.matching_tasks.*': {'queue': 'ai_matching'},
    }
)
```

### Celery Beat Schedule (Cron Jobs)
```python
app.conf.beat_schedule = {
    'check-stuck-payments': {
        'task': 'tasks.payment_tasks.check_stuck_payments',
        'schedule': crontab(minute='*/15'),  # Every 15 min
    },
    'check-unanswered-bookings': {
        'task': 'tasks.booking_tasks.check_unanswered_bookings',
        'schedule': crontab(minute='*/15'),  # Every 15 min
    },
    'refresh-leaderboard': {
        'task': 'tasks.competition_tasks.refresh_leaderboard',
        'schedule': crontab(minute=0),       # Every hour
    },
    'daily-admin-digest': {
        'task': 'tasks.notification_tasks.send_admin_digest',
        'schedule': crontab(hour=8, minute=0),  # 8 AM Cairo
    },
    'process-pending-payouts': {
        'task': 'tasks.payment_tasks.process_pending_payouts',
        'schedule': crontab(hour=2, minute=0),  # 2 AM daily
    },
    'vendor-subscription-renewals': {
        'task': 'tasks.subscription_tasks.check_renewals',
        'schedule': crontab(hour=9, minute=0),  # 9 AM daily
    },
    'reindex-search-embeddings': {
        'task': 'tasks.search_tasks.reindex_new_listings',
        'schedule': crontab(minute=0, hour='*/6'),  # Every 6 hours
    },
}
```

---

## 6. CI/CD — GitHub Actions

### Pipeline Definition
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  # ── Backend ──────────────────────────────────────
  backend-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install ruff
      - run: ruff check .

  backend-test:
    needs: backend-lint
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env: { POSTGRES_PASSWORD: test }
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -r requirements/development.txt
      - run: python manage.py test --parallel
      - run: coverage report --fail-under=80

  backend-security:
    needs: backend-lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install bandit safety
      - run: bandit -r apps/ services/
      - run: safety check -r requirements/production.txt

  backend-deploy:
    needs: [backend-test, backend-security]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Railway
        run: railway up --service django_api
        env: { RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }} }

  # ── Frontend ─────────────────────────────────────
  frontend-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
        working-directory: seaconnect_web
      - run: npm run lint && npm run type-check && npm run build
        working-directory: seaconnect_web

  # ── Mobile ───────────────────────────────────────
  flutter-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with: { flutter-version: '3.x' }
      - run: flutter pub get && flutter analyze && flutter test
        working-directory: seaconnect_app
```

---

## 7. Infrastructure Accounts to Set Up (Week 1 Checklist)

| Service | URL | Priority | Notes |
|---------|-----|----------|-------|
| GitHub Organization | github.com | P0 | Create `seaconnect` org, private repo |
| Supabase | supabase.com | P0 | Create project, note DB URL |
| Railway | railway.app | P0 | Create project, add PostgreSQL service |
| Vercel | vercel.com | P0 | Connect GitHub repo |
| Upstash Redis | upstash.com | P0 | Create Redis database |
| Cloudflare | cloudflare.com | P0 | Add domain, enable R2 |
| Fawry Merchant Portal | fawry.com/merchant | P0 | Apply immediately — 4-6 week wait |
| Firebase Console | firebase.google.com | P1 | Create project, enable FCM |
| SendGrid | sendgrid.com | P1 | Verify domain, create API key |
| Twilio | twilio.com | P1 | Get Egyptian phone number |
| Stripe | stripe.com | P1 | Create account, pending bank verification |
| OpenAI | platform.openai.com | P1 | Set monthly spend cap ($100 to start) |
| Sentry | sentry.io | P1 | Create Django + Flutter + Next.js projects |
| Grafana Cloud | grafana.com | P2 | Free tier sufficient for Year 1 |
| UptimeRobot | uptimerobot.com | P2 | Monitor `api.seaconnect.app` and `seaconnect.app` |

---

**Last Updated:** April 6, 2026
**Owner:** CTO / Tech Lead
