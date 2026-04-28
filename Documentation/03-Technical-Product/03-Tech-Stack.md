# Technology Stack — SeaConnect
**Version:** 2.0 (Free-First for Dev + UAT)
**Date:** April 14, 2026
**Document Status:** ✅ Updated — No production environment yet. Dev + UAT only, 100% free tools.

---

## Philosophy

> **Zero spend until production is justified.**
> Every tool in Dev and UAT must have a free tier that covers our needs.
> Production stack is planned but not active — switch when first real users pay.

---

## Decision Summary

| Layer | Dev / Test | UAT | Production (planned, inactive) |
|-------|-----------|-----|-------------------------------|
| **Backend API** | Django 5.x + DRF 3.15 | Django 5.x + DRF 3.15 | same |
| **Mobile App** | Flutter 3.x | Flutter 3.x | same |
| **Web App** | Next.js 14 (TypeScript) | Next.js 14 | same |
| **Database** | PostgreSQL 16 (Docker local) | Supabase Free Tier | Supabase Pro |
| **Cache / Broker** | Redis 7 (Docker local) | Redis Cloud Free (30MB) | Upstash Pay-per-use |
| **Task Queue** | Celery + Beat (Docker local) | Celery on Render Free | Celery on Railway |
| **File Storage** | MinIO (Docker local, S3-compat) | Cloudflare R2 Free (10GB/mo) | Cloudflare R2 |
| **Payment** | Fawry Sandbox (free) | Fawry Sandbox (free) | Fawry Production |
| **Email** | Mailpit (Docker local) | Brevo Free (300/day) | Brevo or SendGrid |
| **SMS / OTP** | Twilio test magic numbers (free) | Twilio trial ($15 credit) | Twilio paid |
| **Push Notifications** | FCM (free, always) | FCM (free, always) | FCM (free, always) |
| **AI / Matching** | Ollama local (free) | OpenAI free credits | OpenAI paid |
| **Embeddings** | pgvector + Ollama local | pgvector + OpenAI free tier | pgvector + OpenAI |
| **Backend Hosting** | Docker Compose (local machine) | Render Free Tier | Railway or Fly.io |
| **Web Hosting** | localhost:3000 | Vercel Hobby (free) | Vercel Pro |
| **Admin Hosting** | localhost:3001 | Vercel Hobby (free) | Vercel Pro |
| **CI/CD** | GitHub Actions (free for public repos) | GitHub Actions | GitHub Actions |
| **Error Monitoring** | Django debug + console logs | Sentry Free (5K errors/mo) | Sentry Team |
| **Uptime Monitoring** | n/a (local) | UptimeRobot Free (50 monitors) | UptimeRobot paid |
| **Database Admin UI** | pgAdmin (Docker) | Supabase dashboard (free) | Supabase dashboard |
| **API Testing** | Bruno (free, local) | Bruno | Bruno |
| **Workflow Automation** | n8n (Docker local, free) | n8n (Docker on Render free) | n8n Cloud or self-hosted |
| **Project Management** | GitHub Projects (free) | GitHub Projects | GitHub Projects |
| **Docs / Wiki** | This repo (Markdown) | This repo | This repo |

---

## Free Tier Limits — What We Get

| Service | Free Tier | Enough for Dev+UAT? |
|---------|-----------|-------------------|
| **Supabase Free** | 500MB DB, 1GB storage, 50K monthly active users | ✅ Yes — UAT has <50 users |
| **Render Free** | 750 hrs/month (1 service), 512MB RAM, sleeps after 15min inactivity | ✅ Yes — UAT is not 24/7 critical |
| **Vercel Hobby** | Unlimited deploys, 100GB bandwidth, serverless functions | ✅ Yes |
| **Cloudflare R2 Free** | 10GB storage, 1M Class A ops/month, 10M Class B ops/month | ✅ Yes — UAT photos only |
| **Redis Cloud Free** | 30MB, 1 database | ✅ Yes — UAT cache is small |
| **Brevo Free** | 300 emails/day, unlimited contacts | ✅ Yes — UAT sends <300/day |
| **FCM (Firebase)** | Unlimited push notifications, always free | ✅ Yes |
| **Sentry Free** | 5,000 errors/month, 1 team member | ✅ Yes |
| **GitHub Actions Free** | 2,000 min/month (public repos: unlimited) | ✅ Yes — use public repos |
| **UptimeRobot Free** | 50 monitors, 5-min intervals | ✅ Yes |
| **Twilio Trial** | $15.50 credit, ~150 SMS | ✅ Yes for testing OTP |
| **Fawry Sandbox** | Full sandbox, free, no time limit | ✅ Yes |
| **Ollama (local)** | Run LLMs locally, completely free | ✅ Yes for dev AI features |
| **OpenAI Free Credits** | $5 new account credit | ✅ Yes for UAT AI testing |

**Total monthly cost for Dev + UAT: $0**

---

## 1. Backend — Django + DRF (unchanged)

No change to the framework decision. Django + DRF remains the final choice.

```
django==5.1
djangorestframework==3.15
djangorestframework-simplejwt==5.3
django-cors-headers==4.3
django-filter==24.1
django-storages[s3]==1.14        # works with MinIO (dev) and R2 (UAT/prod)
celery==5.3
redis==5.0
psycopg[binary]==3.1
pgvector==0.2
dj-database-url==2.1
gunicorn==22.0
python-decouple==3.8             # env var management
sentry-sdk[django]==2.5
```

**Dev-only additions:**
```
django-debug-toolbar==4.4        # query inspection in browser
factory-boy==3.3                 # test data factories
pytest-django==4.8
pytest-cov==5.0
```

### Project Structure
```
seaconnect-api/
├── manage.py
├── requirements/
│   ├── base.txt
│   ├── dev.txt          ← includes debug-toolbar, factory-boy, pytest
│   └── prod.txt         ← includes gunicorn, sentry (no debug tools)
├── config/
│   ├── settings/
│   │   ├── base.py
│   │   ├── dev.py       ← DEBUG=True, local DBs, Mailpit, Ollama
│   │   ├── uat.py       ← DEBUG=False, Supabase, Brevo, Render
│   │   └── prod.py      ← DEBUG=False, all paid services (future)
│   ├── urls.py
│   └── celery.py
├── apps/
│   ├── accounts/
│   ├── core/
│   ├── listings/
│   ├── bookings/
│   ├── payments/
│   ├── marketplace/
│   ├── competitions/
│   ├── weather/
│   ├── reviews/
│   ├── notifications/
│   ├── search/
│   ├── analytics/
│   └── admin_portal/
└── tests/
```

---

## 2. Database — PostgreSQL 16 + pgvector

### Dev: Docker (local)
```yaml
# docker-compose.yml
db:
  image: pgvector/pgvector:pg16    # official image, has pgvector pre-installed
  ports: ["5432:5432"]
  environment:
    POSTGRES_DB: seaconnect_dev
    POSTGRES_USER: sc_user
    POSTGRES_PASSWORD: localdev
  volumes: ["postgres_data:/var/lib/postgresql/data"]
```

### UAT: Supabase Free Tier
- Project name: `seaconnect-uat`
- Region: eu-west-1 (Paris — closest to Egypt)
- pgvector: pre-installed on all Supabase projects
- Connection: use Supabase connection pooler (port 6543) for Celery workers
- Backups: daily automatic (Supabase free includes 1-day PITR)

```bash
# UAT connection string format
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
```

### DB Admin UI

| Env | Tool | Access |
|-----|------|--------|
| Dev | pgAdmin 4 (Docker, free) | http://localhost:5050 |
| UAT | Supabase Dashboard | https://supabase.com/dashboard |

```yaml
# docker-compose.yml — pgAdmin for dev
pgadmin:
  image: dpage/pgadmin4
  ports: ["5050:80"]
  environment:
    PGADMIN_DEFAULT_EMAIL: admin@local.dev
    PGADMIN_DEFAULT_PASSWORD: admin
```

---

## 3. Cache & Celery Broker — Redis

### Dev: Docker (local)
```yaml
redis:
  image: redis:7-alpine
  ports: ["6379:6379"]
  command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

### UAT: Redis Cloud Free Tier
- Provider: Redis Cloud (redis.com) — free plan
- 30MB — enough for UAT cache (weather, sessions, feature flags)
- 1 database, shared infrastructure
- URL format: `redis://default:[password]@[host]:[port]`

**Alternative if Redis Cloud sign-up is blocked:** Use Upstash free tier (10K commands/day free).

---

## 4. File Storage — MinIO (Dev) / Cloudflare R2 (UAT)

### Dev: MinIO (Docker, S3-compatible)

MinIO is an open-source S3-compatible object store. Django can't tell the difference between MinIO and real S3.

```yaml
minio:
  image: minio/minio:latest
  ports: ["9000:9000", "9001:9001"]
  environment:
    MINIO_ROOT_USER: minioadmin
    MINIO_ROOT_PASSWORD: minioadmin
  command: server /data --console-address ":9001"
  volumes: ["minio_data:/data"]
```

```bash
# Dev env vars (MinIO looks like S3)
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_STORAGE_BUCKET_NAME=seaconnect-dev
AWS_S3_ENDPOINT_URL=http://minio:9000
AWS_S3_CUSTOM_DOMAIN=localhost:9000/seaconnect-dev
```

MinIO console: http://localhost:9001 (admin UI to browse files)

### UAT: Cloudflare R2 Free Tier
- 10GB storage, 1M write ops, 10M read ops/month — free
- S3-compatible API — same django-storages config, just different endpoint
- Zero egress fees (unlike AWS S3)

```bash
# UAT env vars (R2)
AWS_ACCESS_KEY_ID=[R2 Access Key]
AWS_SECRET_ACCESS_KEY=[R2 Secret Key]
AWS_STORAGE_BUCKET_NAME=seaconnect-uat
AWS_S3_ENDPOINT_URL=https://[account_id].r2.cloudflarestorage.com
```

No code changes between dev and UAT — only env vars change.

---

## 5. Backend Hosting

### Dev: Docker Compose (local machine)

Full stack runs locally. One command:
```bash
docker compose up --build
```

### UAT: Render Free Tier

Render offers a free web service tier:
- 512MB RAM, 0.1 CPU
- **Sleeps after 15 minutes of inactivity** (wakes in ~30 seconds on next request)
- This is fine for UAT — it's not a production system

```yaml
# render.yaml (Render blueprint file)
services:
  - type: web
    name: seaconnect-uat-api
    env: python
    buildCommand: pip install -r requirements/prod.txt && python manage.py collectstatic --noinput
    startCommand: gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
    envVars:
      - key: DJANGO_SETTINGS_MODULE
        value: config.settings.uat
      - key: DATABASE_URL
        fromDatabase:
          name: seaconnect-uat-db
          property: connectionString
    plan: free

  - type: worker
    name: seaconnect-uat-celery
    env: python
    buildCommand: pip install -r requirements/prod.txt
    startCommand: celery -A config worker -l info -c 1
    plan: free
```

**Important:** Render free services share infrastructure. For UAT this is acceptable.

---

## 6. Web Hosting — Vercel Hobby (Free)

Both Next.js apps (customer web + admin portal) deploy to Vercel free tier.

- Unlimited personal projects
- 100GB bandwidth/month
- Automatic preview deployments on every PR
- Custom domains (connect seaconnect.eg subdomain for UAT)

```bash
# One-time setup per project
vercel link        # link local folder to Vercel project
vercel env add     # add environment variables

# Deploy (also runs automatically via GitHub Actions)
vercel deploy --prebuilt
```

UAT URLs:
- Web: `https://seaconnect-uat.vercel.app` (or custom: `uat.seaconnect.eg`)
- Admin: `https://seaconnect-uat-admin.vercel.app`

---

## 7. Email — Mailpit (Dev) / Brevo (UAT)

### Dev: Mailpit (Docker)

Mailpit catches ALL outgoing email — nothing actually sends. View emails in browser.

```yaml
mailpit:
  image: axllent/mailpit:latest
  ports:
    - "1025:1025"    # SMTP port (Django sends here)
    - "8025:8025"    # Web UI
```

```bash
# Dev email settings
EMAIL_HOST=mailpit
EMAIL_PORT=1025
EMAIL_USE_TLS=False
DEFAULT_FROM_EMAIL=noreply@seaconnect.local
```

Mailpit UI: http://localhost:8025 — see every email the app sends

### UAT: Brevo Free Tier (formerly Sendinblue)

- 300 emails/day free, unlimited contacts
- Transactional email API (works like SendGrid)
- No credit card required for free tier

```bash
# UAT email settings
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=[brevo login email]
EMAIL_HOST_PASSWORD=[brevo SMTP key]
DEFAULT_FROM_EMAIL=noreply@seaconnect.eg
```

---

## 8. SMS / OTP — Twilio (Dev + UAT)

### Dev: Twilio Magic Test Numbers (Free)

Twilio provides test credentials that work without sending real SMS:

```bash
TWILIO_ACCOUNT_SID=ACtest...          # test account SID
TWILIO_AUTH_TOKEN=test_token
TWILIO_PHONE_NUMBER=+15005550006      # Twilio magic test "from" number

# Test "to" numbers (always succeed/fail predictably):
# +15005550001 → Invalid "To" number
# +15005550006 → Valid number, succeeds
# +15005550007 → Blacklisted number
# +15005550008 → Invalid number for SMS
```

No money needed. OTP codes appear in Twilio console logs.

### UAT: Twilio Trial Account ($15.50 free credit)

- Sign up for Twilio → get $15.50 credit automatically
- At ~$0.04/SMS in Egypt → ~380 test SMS messages
- More than enough for full UAT testing

---

## 9. Push Notifications — Firebase Cloud Messaging (Always Free)

FCM is completely free with no limits for push notifications. No tier change from dev to UAT to production.

```bash
# Setup (one time):
# 1. Create Firebase project at console.firebase.google.com
# 2. Add Android + iOS apps
# 3. Download google-services.json (Android) and GoogleService-Info.plist (iOS)
# 4. Download service account JSON for backend

FIREBASE_CREDENTIALS_PATH=/app/secrets/firebase-adminsdk.json
```

```python
# notifications/fcm.py
import firebase_admin
from firebase_admin import credentials, messaging

cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
firebase_admin.initialize_app(cred)

def send_push(token: str, title_ar: str, title_en: str, body_ar: str, body_en: str, data: dict):
    message = messaging.Message(
        notification=messaging.Notification(title=title_ar, body=body_ar),
        data=data,
        token=token,
    )
    messaging.send(message)
```

---

## 10. AI / Embeddings

### Dev: Ollama (Local, Completely Free)

Ollama runs open-source LLMs locally. No API costs.

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull models
ollama pull llama3.2        # general purpose (3.2B — fast on CPU)
ollama pull nomic-embed-text # embeddings (replaces OpenAI text-embedding)

# Add to docker-compose (optional — or run natively)
ollama:
  image: ollama/ollama
  ports: ["11434:11434"]
  volumes: ["ollama_data:/root/.ollama"]
```

```python
# dev settings — use Ollama
AI_PROVIDER = 'ollama'
OLLAMA_BASE_URL = 'http://ollama:11434'
EMBEDDING_MODEL = 'nomic-embed-text'    # 768 dims (vs OpenAI 1536)
LLM_MODEL = 'llama3.2'
```

**Note on embeddings:** Ollama `nomic-embed-text` uses 768 dimensions, not 1536. The pgvector column in dev uses `VectorField(dimensions=768)`. In UAT/prod it switches to OpenAI `text-embedding-3-small` (1536 dims). Use an env var to control the dimension:

```python
EMBEDDING_DIMENSIONS = int(env('EMBEDDING_DIMENSIONS', default='768'))
```

### UAT: OpenAI Free Credits

- New OpenAI accounts get $5 free credit
- `text-embedding-3-small`: $0.02/1M tokens — $5 covers ~2.5B tokens of embeddings
- More than enough for UAT

```bash
# UAT settings
AI_PROVIDER=openai
OPENAI_API_KEY=[key]
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
```

---

## 11. CI/CD — GitHub Actions (Free for Public Repos)

GitHub Actions is free with unlimited minutes on public repositories.

**Decision:** Keep repos public during development. No sensitive production secrets are in the code — all via environment variables. Switch to private repos when production is active.

```bash
# Free limits:
# Public repos:  Unlimited minutes
# Private repos: 2,000 min/month (500MB storage)
```

Pipelines defined in `14-Environments-Pipelines.md` remain unchanged.

---

## 12. Error Monitoring — Sentry Free

- 5,000 errors/month
- 1 team member
- 30-day data retention
- Covers Django backend + Flutter + Next.js

```bash
# One project per surface
SENTRY_DSN_BACKEND=[dsn]
SENTRY_DSN_WEB=[dsn]
# Flutter: add sentry_flutter package, DSN in dart-define
```

Active in UAT only (not dev — too noisy during development).

---

## 13. API Testing — Bruno (Free, Local)

Bruno is a free, offline API client (like Postman but no account needed, files stored in git).

```bash
# Install
npm install -g @usebruno/cli

# Or use the desktop app: https://www.usebruno.com/

# Collections stored in repo:
api-tests/
  auth/
    register.bru
    login.bru
    otp-verify.bru
  bookings/
    create-booking.bru
    confirm-booking.bru
  payments/
    initiate-payment.bru
```

Every API endpoint gets a Bruno test file. Agents write these alongside the endpoint code.

---

## 14. Local Development — Complete Stack

Running `docker compose up` starts everything:

| Service | Port | Purpose | URL |
|---------|------|---------|-----|
| Django API | 8000 | Backend | http://localhost:8000 |
| Next.js Web | 3000 | Customer web | http://localhost:3000 |
| Next.js Admin | 3001 | Admin portal | http://localhost:3001 |
| PostgreSQL | 5432 | Database | via psql or pgAdmin |
| pgAdmin | 5050 | DB admin UI | http://localhost:5050 |
| Redis | 6379 | Cache + broker | internal |
| Celery | — | Background tasks | (logs only) |
| Celery Beat | — | Scheduled tasks | (logs only) |
| MinIO | 9000/9001 | File storage | http://localhost:9001 |
| Mailpit | 1025/8025 | Email catcher | http://localhost:8025 |
| Ollama | 11434 | Local AI | http://localhost:11434 |

**Total RAM needed:** ~3GB for full stack. Minimum recommended: 8GB machine.

---

## 15. Environment Variables — Full Reference

### `.env.dev` (local development)

```bash
# Django
DJANGO_SETTINGS_MODULE=config.settings.dev
DJANGO_SECRET_KEY=dev-only-secret-key-change-in-uat
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,api

# Database
DATABASE_URL=postgresql://sc_user:localdev@db:5432/seaconnect_dev

# Redis
REDIS_URL=redis://redis:6379/0

# Storage (MinIO)
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_STORAGE_BUCKET_NAME=seaconnect-dev
AWS_S3_ENDPOINT_URL=http://minio:9000

# Email (Mailpit)
EMAIL_HOST=mailpit
EMAIL_PORT=1025
EMAIL_USE_TLS=False
DEFAULT_FROM_EMAIL=noreply@seaconnect.local

# SMS (Twilio test)
TWILIO_ACCOUNT_SID=ACtest_placeholder
TWILIO_AUTH_TOKEN=test_placeholder
TWILIO_PHONE_NUMBER=+15005550006

# Payments (Fawry sandbox)
FAWRY_MERCHANT_CODE=sandbox_merchant_code
FAWRY_SECURITY_KEY=sandbox_security_key
FAWRY_BASE_URL=https://atfawry.fawrystaging.com/ECommerceWeb

# Firebase
FIREBASE_CREDENTIALS_PATH=/app/secrets/firebase-dev-adminsdk.json

# AI (Ollama local)
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://ollama:11434
EMBEDDING_MODEL=nomic-embed-text
EMBEDDING_DIMENSIONS=768
LLM_MODEL=llama3.2

# App
APP_VERSION=0.1.0-dev
```

### `.env.uat` (Render + Supabase + free services)

```bash
# Django
DJANGO_SETTINGS_MODULE=config.settings.uat
DJANGO_SECRET_KEY=[generate: python -c "import secrets; print(secrets.token_urlsafe(50))"]
DEBUG=False
ALLOWED_HOSTS=seaconnect-uat-api.onrender.com,uat-api.seaconnect.eg

# Database (Supabase free)
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres

# Redis (Redis Cloud free)
REDIS_URL=redis://default:[password]@[host]:[port]

# Storage (Cloudflare R2 free)
AWS_ACCESS_KEY_ID=[R2 access key]
AWS_SECRET_ACCESS_KEY=[R2 secret key]
AWS_STORAGE_BUCKET_NAME=seaconnect-uat
AWS_S3_ENDPOINT_URL=https://[account_id].r2.cloudflarestorage.com

# Email (Brevo free)
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=[brevo account email]
EMAIL_HOST_PASSWORD=[brevo SMTP key]
DEFAULT_FROM_EMAIL=noreply@seaconnect.eg

# SMS (Twilio trial)
TWILIO_ACCOUNT_SID=[real account SID]
TWILIO_AUTH_TOKEN=[real auth token]
TWILIO_PHONE_NUMBER=[verified trial number]

# Payments (Fawry sandbox — same as dev)
FAWRY_MERCHANT_CODE=sandbox_merchant_code
FAWRY_SECURITY_KEY=sandbox_security_key
FAWRY_BASE_URL=https://atfawry.fawrystaging.com/ECommerceWeb

# Firebase
FIREBASE_CREDENTIALS_PATH=/etc/secrets/firebase-adminsdk.json

# AI (OpenAI free credits)
AI_PROVIDER=openai
OPENAI_API_KEY=[key]
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536

# Monitoring
SENTRY_DSN=[sentry project DSN]

# App
APP_VERSION=0.1.0-uat
```

---

## 16. Free Service Sign-Up Checklist

Do these once, in order:

```
GitHub
  [ ] Create GitHub account / organization
  [ ] Create 3 repos: seaconnect-api, seaconnect-web, seaconnect-mobile
  [ ] Keep repos PUBLIC (unlimited Actions minutes)

Supabase (database)
  [ ] Sign up at supabase.com (GitHub login)
  [ ] Create project: seaconnect-uat, region: eu-west-1
  [ ] Enable pgvector: Extensions → enable vector
  [ ] Copy connection string to .env.uat

Render (backend hosting)
  [ ] Sign up at render.com (GitHub login)
  [ ] Connect GitHub repo: seaconnect-api
  [ ] Create web service: seaconnect-uat-api
  [ ] Create background worker: seaconnect-uat-celery
  [ ] Set environment variables from .env.uat

Vercel (web hosting)
  [ ] Sign up at vercel.com (GitHub login)
  [ ] Import seaconnect-web → project: seaconnect-uat-web
  [ ] Import seaconnect-web (admin app) → project: seaconnect-uat-admin
  [ ] Set environment variables for each

Cloudflare (storage + DNS)
  [ ] Sign up at cloudflare.com (free)
  [ ] Create R2 bucket: seaconnect-uat
  [ ] Generate R2 API token (read+write)
  [ ] (Optional) Add domain seaconnect.eg to Cloudflare DNS

Redis Cloud (cache)
  [ ] Sign up at redis.com (free)
  [ ] Create free database (30MB)
  [ ] Copy connection URL to .env.uat

Brevo (email)
  [ ] Sign up at brevo.com (free, no credit card)
  [ ] Verify sender domain or email
  [ ] Go to SMTP & API → SMTP tab → copy host + credentials

Twilio (SMS)
  [ ] Sign up at twilio.com
  [ ] Auto-gets $15.50 trial credit
  [ ] Verify your own phone number (required for trial)
  [ ] Get a trial phone number
  [ ] Copy Account SID + Auth Token + phone number

Firebase (push notifications)
  [ ] Go to console.firebase.google.com
  [ ] Create project: seaconnect-uat
  [ ] Add Android app (package: com.seaconnect.app)
  [ ] Add iOS app (bundle: com.seaconnect.app)
  [ ] Download credentials files
  [ ] Project Settings → Service Accounts → Generate new private key
  [ ] Save as firebase-adminsdk.json

Sentry (error monitoring)
  [ ] Sign up at sentry.io (free)
  [ ] Create 3 projects: seaconnect-api, seaconnect-web, seaconnect-mobile
  [ ] Copy DSN for each to .env.uat

Fawry Sandbox (payments)
  [ ] Register at atfawry.com for sandbox merchant account
  [ ] Get sandbox merchant code + security key
  [ ] Test with Fawry sandbox card numbers (in Payment Gateway Plan doc)

UptimeRobot (uptime)
  [ ] Sign up at uptimerobot.com (free)
  [ ] Add monitor: https://seaconnect-uat-api.onrender.com/health/
  [ ] Set alert email

Total accounts to create: 12
Total cost: $0
```

---

## 17. When to Switch to Production Stack

Switch each service to paid when:

| Service | Switch When |
|---------|------------|
| Render → Railway | First paying user OR Render sleep is causing issues for demos |
| Supabase Free → Pro ($25/mo) | Database > 400MB OR need >50K MAU |
| Redis Cloud → Upstash | Cache > 25MB or need persistence |
| Brevo Free → Paid | Sending > 300 emails/day |
| Twilio Trial → Paid | Trial credit runs out |
| Vercel Hobby → Pro | Need team members or commercial use policy requires it |
| Cloudflare R2 → (already free at scale) | R2 stays free very long |
| OpenAI Free → Paid | $5 credit runs out |
| Sentry Free → Team | >5K errors/month |

**Expected switch point:** When first 10 paying users onboarded.  
**Expected first paid infrastructure bill:** ~$50–80/month.
