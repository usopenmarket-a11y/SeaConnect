# Environments & CI/CD Pipelines — SeaConnect
**Version:** 2.0 (Free-First)
**Date:** April 14, 2026
**Status:** Active — Dev + UAT only. No production yet. 100% free tools.

---

## Overview

SeaConnect runs two active environments: **Dev/Test** and **UAT**. Production is planned but not active — it activates when real users pay.

All tools are free tier. Zero monthly spend until production launches.

---

## 1. Environment Matrix

| Property | Dev / Test | UAT | Production (planned, not active) |
|----------|-----------|-----|----------------------------------|
| **Purpose** | Agent code generation, local testing | Business validation, stakeholder review | Live users, real money |
| **URL — API** | `http://localhost:8000` | `https://seaconnect-uat-api.onrender.com` | `https://api.seaconnect.eg` |
| **URL — Web** | `http://localhost:3000` | `https://seaconnect-uat.vercel.app` | `https://seaconnect.eg` |
| **URL — Admin** | `http://localhost:3001` | `https://seaconnect-uat-admin.vercel.app` | `https://admin.seaconnect.eg` |
| **Database** | pgvector/pg16 (Docker) | Supabase Free Tier | Supabase Pro |
| **Cache** | Redis 7 (Docker) | Redis Cloud Free (30MB) | Upstash Pay-per-use |
| **Storage** | MinIO (Docker, S3-compat) | Cloudflare R2 Free (10GB) | Cloudflare R2 |
| **Payment** | Fawry Sandbox (free) | Fawry Sandbox (free) | Fawry Production |
| **Email** | Mailpit (Docker, catches all) | Brevo Free (300/day) | Brevo or SendGrid |
| **SMS** | Twilio magic test numbers (free) | Twilio Trial ($15 credit) | Twilio paid |
| **Push Notifications** | FCM (always free) | FCM (always free) | FCM (always free) |
| **AI / Embeddings** | Ollama local (free) | OpenAI $5 free credits | OpenAI paid |
| **Backend Hosting** | Docker Compose (local) | Render Free Tier | Railway or Fly.io |
| **Web Hosting** | localhost | Vercel Hobby (free) | Vercel Pro |
| **Error Monitoring** | Console logs only | Sentry Free (5K/mo) | Sentry Team |
| **Uptime** | n/a | UptimeRobot Free | UptimeRobot paid |
| **API Testing** | Bruno (local, free) | Bruno | Bruno |
| **Data** | Seeded fixtures + factories | Fresh seeded data | Real user data |
| **Deployment trigger** | Manual (docker compose) | Auto on merge to `develop` | Manual approval |
| **Monthly cost** | **$0** | **$0** | ~$80–150/month |

---

## 2. Git Branching Strategy

```
main ─────────────────────────────────────────────────────→ Production
  │
  └── develop ──────────────────────────────────────────→ UAT (auto-deploy)
        │
        ├── feature/TASK-N-XXX-short-name              (agent work)
        ├── feature/TASK-N-YYY-another-feature
        ├── fix/TASK-N-ZZZ-bug-description
        └── hotfix/PROD-XXX-critical-fix               (bypasses develop, goes to main)
```

### Branch Rules

| Branch | Protected | Who can push | Merge via |
|--------|-----------|-------------|-----------|
| `main` | ✅ Yes | No direct push | PR + human approval + all checks green |
| `develop` | ✅ Yes | No direct push | PR + all automated checks green |
| `feature/*` | ❌ No | Agents + devs | PR to `develop` |
| `hotfix/*` | ❌ No | Agents + devs | PR to `main` AND backmerge to `develop` |

### Commit Message Convention

All commits (human and agent) must follow Conventional Commits:

```
type(scope): short description

feat(bookings): add owner decline reason field
fix(payments): handle Fawry timeout on webhook retry
chore(deps): bump django from 5.1.0 to 5.1.2
test(marketplace): add cart checkout integration tests
docs(adr): add ADR-021 for multi-currency display
refactor(auth): extract OTP service from views
```

Types: `feat` | `fix` | `chore` | `test` | `docs` | `refactor` | `perf` | `ci`

---

## 3. Dev / Test Environment

### 3.1 Local Setup (Docker Compose)

Single command to spin up the full stack locally:

```bash
docker compose up --build
```

`docker-compose.yml` services:

```yaml
services:
  api:
    build: ./backend
    ports: ["8000:8000"]
    env_file: .env.dev
    depends_on: [db, redis]
    volumes: ["./backend:/app"]  # hot reload

  web:
    build: ./web
    ports: ["3000:3000"]
    env_file: .env.dev
    volumes: ["./web:/app"]

  admin:
    build: ./admin
    ports: ["3001:3001"]
    env_file: .env.dev

  db:
    image: pgvector/pgvector:pg16
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: seaconnect_dev
      POSTGRES_USER: sc_user
      POSTGRES_PASSWORD: localpassword
    volumes: ["postgres_dev_data:/var/lib/postgresql/data"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  celery:
    build: ./backend
    command: celery -A seaconnect worker -l info
    env_file: .env.dev
    depends_on: [db, redis]

  celery-beat:
    build: ./backend
    command: celery -A seaconnect beat -l info
    env_file: .env.dev
    depends_on: [db, redis]

  minio:
    image: minio/minio:latest
    ports: ["9000:9000", "9001:9001"]
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes: ["minio_data:/data"]

  mailpit:
    image: axllent/mailpit:latest
    ports: ["1025:1025", "8025:8025"]  # SMTP + web UI

  pgadmin:
    image: dpage/pgadmin4:latest
    ports: ["5050:80"]
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@local.dev
      PGADMIN_DEFAULT_PASSWORD: admin
    depends_on: [db]

  ollama:
    image: ollama/ollama:latest
    ports: ["11434:11434"]
    volumes: ["ollama_data:/root/.ollama"]
    # First run: docker compose exec ollama ollama pull nomic-embed-text
    #            docker compose exec ollama ollama pull llama3.2

volumes:
  postgres_dev_data:
  minio_data:
  ollama_data:
```

### Local service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Django API | http://localhost:8000 | Backend API |
| Next.js Web | http://localhost:3000 | Customer web app |
| Next.js Admin | http://localhost:3001 | Admin portal |
| pgAdmin | http://localhost:5050 | Database browser |
| MinIO Console | http://localhost:9001 | File storage browser |
| Mailpit | http://localhost:8025 | Email catcher (see all sent emails) |
| Ollama | http://localhost:11434 | Local AI models |

### 3.2 Environment Variables — .env.dev

```bash
# Django
DJANGO_ENV=development
DJANGO_SECRET_KEY=dev-secret-key-not-for-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=postgresql://sc_user:localpassword@db:5432/seaconnect_dev

# Redis
REDIS_URL=redis://redis:6379/0

# Storage (MinIO — S3 compatible)
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_STORAGE_BUCKET_NAME=seaconnect-dev
AWS_S3_ENDPOINT_URL=http://minio:9000

# Payments (Fawry sandbox)
FAWRY_MERCHANT_CODE=sandbox_merchant
FAWRY_SECURITY_KEY=sandbox_key
FAWRY_BASE_URL=https://atfawry.fawrystaging.com

# Email (Mailpit local catcher)
EMAIL_HOST=mailpit
EMAIL_PORT=1025
EMAIL_USE_TLS=False

# SMS (Twilio test)
TWILIO_ACCOUNT_SID=test_sid
TWILIO_AUTH_TOKEN=test_token
TWILIO_PHONE_NUMBER=+15005550006  # Twilio magic test number

# Analytics (disabled in dev)
MIXPANEL_TOKEN=
SENTRY_DSN=

# JWT
JWT_PRIVATE_KEY_PATH=/app/keys/jwt_private.pem
JWT_PUBLIC_KEY_PATH=/app/keys/jwt_public.pem
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=15
JWT_REFRESH_TOKEN_LIFETIME_DAYS=30
```

### 3.3 Seeding & Test Data

```bash
# Full reset + seed
docker compose exec api python manage.py reset_db --seed

# Seed commands (each idempotent)
python manage.py seed_regions          # Egypt + inactive UAE/KSA
python manage.py seed_ports            # 12 Egyptian ports
python manage.py seed_fish_species     # All Red Sea / Med species
python manage.py seed_fishing_seasons  # Full season matrix
python manage.py seed_commission_rates # Egypt rates
python manage.py seed_demo_users       # 5 customers, 3 owners, 2 vendors, 1 admin
python manage.py seed_demo_listings    # 10 yacht listings with photos
python manage.py seed_demo_bookings    # Mix of pending/confirmed/completed bookings
```

---

## 4. UAT Environment

### 4.1 Purpose

UAT is the human sign-off gate. All free services. Stakeholders review new features here before they become production-ready.

**Important about Render free tier:** The API service sleeps after 15 minutes of no traffic. It wakes in ~30 seconds on next request. This is acceptable for UAT — it is not a production issue.

### 4.2 UAT Infrastructure (All Free)

```
API:    Render Free Tier — "seaconnect-uat-api" web service
Celery: Render Free Tier — "seaconnect-uat-celery" background worker
Web:    Vercel Hobby — "seaconnect-uat-web" project
Admin:  Vercel Hobby — "seaconnect-uat-admin" project
DB:     Supabase Free — "seaconnect-uat" project (eu-west-1)
Redis:  Redis Cloud Free — 30MB database
Files:  Cloudflare R2 Free — "seaconnect-uat" bucket
Email:  Brevo Free — 300 emails/day
SMS:    Twilio Trial — $15.50 credit
Push:   Firebase FCM — free always
AI:     OpenAI — $5 free credits (new account)
Errors: Sentry Free — 5K errors/month
Uptime: UptimeRobot Free — monitors /health/ every 5 min
```

### 4.3 Render Deployment Config

```yaml
# render.yaml (in repo root — Render reads this automatically)
services:
  - type: web
    name: seaconnect-uat-api
    runtime: python
    buildCommand: pip install -r requirements/prod.txt && python manage.py collectstatic --noinput
    startCommand: gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 1
    envVars:
      - key: DJANGO_SETTINGS_MODULE
        value: config.settings.uat
      - key: DATABASE_URL
        sync: false   # set manually in Render dashboard
      - key: REDIS_URL
        sync: false
    plan: free
    healthCheckPath: /health/

  - type: worker
    name: seaconnect-uat-celery
    runtime: python
    buildCommand: pip install -r requirements/prod.txt
    startCommand: celery -A config worker -l info -c 1
    envVars:
      - key: DJANGO_SETTINGS_MODULE
        value: config.settings.uat
    plan: free
```

### 4.4 UAT Data Policy

- Database seeded fresh from seed commands (no real prod data — prod doesn't exist yet)
- Fawry sandbox credentials only — no real money ever
- Test users created manually by team for stakeholder demos

```bash
# Seed UAT database after deploy (run once, or after reset)
render run --service seaconnect-uat-api -- python manage.py migrate
render run --service seaconnect-uat-api -- python manage.py seed_regions
render run --service seaconnect-uat-api -- python manage.py seed_ports
render run --service seaconnect-uat-api -- python manage.py seed_fish_species
render run --service seaconnect-uat-api -- python manage.py seed_demo_users
render run --service seaconnect-uat-api -- python manage.py seed_demo_listings
```

### 4.4 UAT Sign-Off Process

Before any release to production:

```
[ ] Feature complete in develop branch
[ ] Auto-deployed to UAT (CI pipeline)
[ ] QA agent runs automated smoke tests on UAT
[ ] Human reviews new feature on UAT (mobile + web)
[ ] Arabic language verified
[ ] Payment flow tested with Fawry sandbox
[ ] Admin functions verified
[ ] Performance acceptable (no > 3s page loads)
[ ] Sign-off recorded in RELEASE-{version}.md
```

---

## 5. Production Environment

### 5.1 Production Infrastructure

```
API:    Railway (Phase 1) → Fly.io multi-region (Phase 3)
Web:    Vercel (global CDN)
Admin:  Vercel
DB:     Supabase "seaconnect-prod" (dedicated compute, daily backups, PITR 7 days)
Redis:  Upstash "seaconnect-prod" (pay-per-request)
Files:  Cloudflare R2 "seaconnect-prod"
CDN:    Cloudflare (DNS + WAF + DDoS protection)
```

### 5.2 Production Deployment Rules

- **No direct deploys.** Only via CI pipeline after UAT sign-off.
- **Zero-downtime deploys.** Railway rolling deploy (new container healthy before old removed).
- **Database migrations run separately** from code deploy (migration-safety-agent validates first).
- **Feature flags** for risky features — enable for 10% of users before full rollout.
- **Deploy window:** Tuesday–Thursday, 10:00–16:00 EGT. No Friday or weekend deploys.
- **Rollback:** One-click via Railway dashboard. Target: <5 minutes to rollback.

### 5.3 Production Secrets Management

All production secrets stored in Railway environment variables (encrypted at rest). Never in code, never in git.

```
Secret rotation schedule:
  JWT keys:          Every 90 days (automated)
  API keys:          On team member departure or annually
  DB password:       On team member departure or annually
  Payment keys:      On provider request or annually
  Sentry DSN:        Never expires (rotate on breach)
```

---

## 6. CI/CD Pipeline — Full Specification

### 6.1 Pipeline Overview

```
Agent pushes code to feature branch
        ↓
PR opened to develop
        ↓
Pipeline 1: PR Validation (runs on every PR)
  ├── Lint & type check
  ├── Unit tests
  ├── Integration tests
  ├── Security scan
  ├── ADR compliance check
  └── PASS / FAIL → blocks merge if FAIL
        ↓
Merge to develop
        ↓
Pipeline 2: UAT Deploy (auto, on merge to develop)
  ├── Build Docker images
  ├── Run database migrations (UAT)
  ├── Deploy to Railway UAT
  ├── Run smoke tests on UAT
  └── Notify team (Slack/email) — ready for review
        ↓
Human UAT sign-off (RELEASE-{version}.md updated)
        ↓
PR opened: develop → main
        ↓
Pipeline 3: Production Release (on PR to main)
  ├── All Pipeline 1 checks re-run
  ├── Migration safety check (migration-safety-agent)
  ├── Load test (k6 — 100 VU, 5 min)
  └── Requires human approval to merge
        ↓
Merge to main
        ↓
Pipeline 4: Production Deploy (auto, on merge to main)
  ├── Build production Docker images
  ├── Push to container registry (GitHub Container Registry)
  ├── Run migrations (production DB) — zero-downtime
  ├── Rolling deploy to Railway/Fly.io
  ├── Run production smoke tests
  ├── Notify team — deployed
  └── On failure → auto-rollback + alert
```

### 6.2 Pipeline 1 — PR Validation

**File:** `.github/workflows/pr-validation.yml`

```yaml
name: PR Validation
on:
  pull_request:
    branches: [develop, main]

jobs:
  backend-checks:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_DB: seaconnect_test
          POSTGRES_USER: sc_user
          POSTGRES_PASSWORD: testpassword
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
      redis:
        image: redis:7-alpine

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with: { python-version: '3.12' }

      - name: Install dependencies
        run: pip install -r backend/requirements.txt

      - name: Lint (ruff)
        run: ruff check backend/

      - name: Type check (mypy)
        run: mypy backend/apps/ --strict

      - name: Run migrations
        run: python backend/manage.py migrate
        env:
          DATABASE_URL: postgresql://sc_user:testpassword@localhost/seaconnect_test
          DJANGO_ENV: test

      - name: Run tests with coverage
        run: |
          pytest backend/ --cov=apps --cov-report=xml \
            --cov-fail-under=80 -x
        env:
          DATABASE_URL: postgresql://sc_user:testpassword@localhost/seaconnect_test
          REDIS_URL: redis://localhost:6379/0
          DJANGO_ENV: test

      - name: Security scan (Bandit)
        run: bandit -r backend/apps/ -ll --exit-zero

      - name: Dependency vulnerability check
        run: pip-audit --requirement backend/requirements.txt

      - name: Upload coverage
        uses: codecov/codecov-action@v4

  flutter-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with: { flutter-version: '3.x' }

      - name: Install dependencies
        run: flutter pub get
        working-directory: ./mobile

      - name: Analyze
        run: flutter analyze
        working-directory: ./mobile

      - name: Run tests
        run: flutter test --coverage
        working-directory: ./mobile

      - name: RTL audit (custom lint)
        run: dart run custom_lint
        working-directory: ./mobile

  web-checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }

      - name: Install dependencies
        run: npm ci
        working-directory: ./web

      - name: TypeScript check
        run: npx tsc --noEmit
        working-directory: ./web

      - name: ESLint
        run: npx eslint . --ext .ts,.tsx --max-warnings 0
        working-directory: ./web

      - name: Unit tests
        run: npm test -- --coverage --watchAll=false
        working-directory: ./web

      - name: Dependency audit
        run: npm audit --audit-level=high
        working-directory: ./web

  adr-compliance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: ADR compliance check (agent-powered)
        run: |
          # Custom script that validates:
          # - No raw SQL strings in changed .py files
          # - No hardcoded 'EGP' currency strings
          # - No left/right directional values in changed .dart files
          # - No hardcoded strings in Flutter widgets
          python scripts/adr_compliance_check.py --diff-base origin/develop
```

### 6.3 Pipeline 2 — UAT Deploy

**File:** `.github/workflows/deploy-uat.yml`

```yaml
name: Deploy to UAT
on:
  push:
    branches: [develop]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build API image
        run: |
          docker build -t ghcr.io/seaconnect/api:uat-${{ github.sha }} ./backend
          docker push ghcr.io/seaconnect/api:uat-${{ github.sha }}

      - name: Deploy API to Render UAT
        run: |
          curl -X POST \
            "https://api.render.com/v1/services/${{ secrets.RENDER_UAT_SERVICE_ID }}/deploys" \
            -H "Authorization: Bearer ${{ secrets.RENDER_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"clearCache": false}'
        # Render auto-deploys from GitHub, this just triggers it immediately

      - name: Deploy Web to Vercel UAT
        run: vercel deploy --env=preview
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}

      - name: Run smoke tests on UAT
        run: pytest tests/smoke/ --base-url=https://uat-api.seaconnect.eg

      - name: Notify team
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {"text": "✅ UAT deployed: ${{ github.sha }}\nReady for review: https://uat.seaconnect.eg"}
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### 6.4 Pipeline 3 — Production Release Gate

**File:** `.github/workflows/release-gate.yml`

```yaml
name: Production Release Gate
on:
  pull_request:
    branches: [main]

jobs:
  migration-safety:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Migration safety check
        run: |
          # Runs migration-safety-agent checks:
          # - No column drops without deprecation period
          # - No NOT NULL without default on large tables
          # - No index creation without CONCURRENTLY
          # - No table renames
          python scripts/migration_safety_check.py

  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install k6
        run: |
          curl -s https://dl.k6.io/key.gpg | apt-key add -
          apt-get install k6

      - name: Load test against UAT
        run: |
          k6 run --vus 100 --duration 5m \
            tests/load/booking_flow.js \
            --env BASE_URL=https://uat-api.seaconnect.eg
        # Fails if: p95 > 1s, error rate > 1%, or throughput < 50 RPS

  all-pr-checks:
    needs: [migration-safety, load-test]
    runs-on: ubuntu-latest
    steps:
      - name: Require human approval
        uses: trstringer/manual-approval@v1
        with:
          secret: ${{ secrets.GITHUB_TOKEN }}
          approvers: fady  # owner GitHub username
          minimum-approvals: 1
          issue-title: "Production deploy approval: ${{ github.sha }}"
```

### 6.5 Pipeline 4 — Production Deploy

**File:** `.github/workflows/deploy-prod.yml`

```yaml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build production image
        run: |
          docker build -t ghcr.io/seaconnect/api:${{ github.sha }} \
            --build-arg BUILD_ENV=production ./backend
          docker push ghcr.io/seaconnect/api:${{ github.sha }}

      - name: Run production migrations
        run: |
          railway run --environment=production \
            python manage.py migrate
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

      - name: Rolling deploy to Railway
        run: |
          railway up --environment=production --service=api \
            --image ghcr.io/seaconnect/api:${{ github.sha }}
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

      - name: Deploy web to Vercel
        run: vercel deploy --prod
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}

      - name: Production smoke tests
        run: |
          pytest tests/smoke/ \
            --base-url=https://api.seaconnect.eg \
            --critical-only
        # Critical = auth, booking creation, payment initiation

      - name: Tag release
        run: |
          git tag v$(date +%Y.%m.%d)-${{ github.run_number }}
          git push origin --tags

      - name: Notify success
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {"text": "🚀 Production deployed successfully: ${{ github.sha }}"}
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}

      - name: Auto-rollback on failure
        if: failure()
        run: |
          railway rollback --environment=production --service=api
          echo "🔴 Deploy failed — rolled back automatically" | \
            curl -X POST ${{ secrets.SLACK_WEBHOOK }} -d @-
```

---

## 7. Database Migration Strategy

### 7.1 Zero-Downtime Migration Rules

All migrations must be zero-downtime. This means:

| Operation | Safe? | How |
|-----------|-------|-----|
| Add nullable column | ✅ Yes | Direct |
| Add column with default | ✅ Yes | Direct (Django handles backfill) |
| Add NOT NULL column | ⚠️ Careful | Add nullable → backfill → add NOT NULL constraint |
| Drop column | ❌ Never directly | 3-step: deprecate in code → deploy → drop column |
| Rename column | ❌ Never directly | Add new column → copy data → update code → drop old |
| Add index | ✅ With CONCURRENTLY | `CREATE INDEX CONCURRENTLY` only |
| Drop index | ✅ Yes | Direct |
| Add FK constraint | ⚠️ Careful | Add column first → validate FK separately |
| Rename table | ❌ Never | Add new table → migrate data → update code → drop old |

### 7.2 Migration Naming Convention

```bash
# Django auto-generates: 0001_initial.py
# Override with meaningful names:
python manage.py makemigrations bookings --name="add_cancellation_reason_to_bookings"
python manage.py makemigrations accounts --name="add_region_fk_to_users"
```

### 7.3 Migration Execution Order (Environments)

```
Dev:  Auto-runs on `docker compose up`
UAT:  Runs automatically in Pipeline 2 before deploy
Prod: Runs in Pipeline 4 as separate step, before rolling deploy
      → If migration fails: deploy halts, no code change reaches prod
```

---

## 8. Feature Flags

Use feature flags for any feature that affects payments, auth, or >10% of user flows.

### 8.1 Feature Flag Implementation

```python
# core/flags.py — simple DB-backed feature flags
from django.core.cache import cache
from core.models import FeatureFlag

def flag_enabled(flag_name: str, user=None) -> bool:
    """
    Check if a feature flag is enabled.
    Supports: global on/off, percentage rollout, user-specific overrides.
    """
    cache_key = f'sc:flag:{flag_name}'
    flag = cache.get(cache_key)
    if flag is None:
        flag = FeatureFlag.objects.filter(name=flag_name).first()
        cache.set(cache_key, flag, timeout=300)  # 5 min cache
    if not flag or not flag.is_enabled:
        return False
    if flag.rollout_percentage < 100 and user:
        # Deterministic: same user always gets same result
        user_bucket = int(user.id.hex[:8], 16) % 100
        return user_bucket < flag.rollout_percentage
    return True
```

```sql
CREATE TABLE feature_flags (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(100) UNIQUE NOT NULL,
    description         TEXT,
    is_enabled          BOOLEAN DEFAULT FALSE,
    rollout_percentage  INTEGER DEFAULT 100 CHECK (rollout_percentage BETWEEN 0 AND 100),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Initial flags
INSERT INTO feature_flags (name, description, is_enabled, rollout_percentage) VALUES
  ('weather_advisory',     'Weather card on yacht detail', false, 100),
  ('fishing_guide',        'Fishing guide screen',         false, 100),
  ('ai_recommendations',   'AI-powered yacht matching',    false, 10),
  ('marketplace_orders',   'Marketplace checkout',         false, 100),
  ('competitions_module',  'Fishing competitions',         false, 0);
```

### 8.2 Flag Rollout Process

```
New feature → flag off → deploy to prod
                          ↓
               Enable for internal users (flag: user override)
                          ↓
               10% rollout → monitor error rate + latency
                          ↓
               50% → 100% → remove flag from code
```

---

## 9. Monitoring & Alerting

### 9.1 Monitoring Stack

| Tool | Purpose | Environment |
|------|---------|------------|
| Sentry | Error tracking (backend + mobile + web) | UAT + Prod |
| Grafana Cloud | Metrics, dashboards, uptime | Prod |
| UptimeRobot | External uptime checks every 1 min | Prod |
| Railway metrics | Container CPU/memory/network | UAT + Prod |
| Supabase dashboard | DB connections, query performance | UAT + Prod |

### 9.2 Alerts

| Alert | Threshold | Channel | Severity |
|-------|-----------|---------|---------|
| API error rate | >1% over 5 min | Slack #alerts | P1 |
| API P95 latency | >2s over 5 min | Slack #alerts | P1 |
| Celery queue depth | >100 tasks | Slack #alerts | P2 |
| DB connection pool | >80% used | Slack #alerts | P1 |
| Failed payment webhook | Any | Slack #payments | P1 |
| Prod deploy complete | Every deploy | Slack #deploys | Info |
| Prod deploy failed | Any | Slack #alerts + SMS | P0 |
| Uptime check failed | 2 consecutive | SMS + Slack | P0 |

### 9.3 Health Check Endpoint

```python
# core/views.py
@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """GET /health/ — used by Railway, UptimeRobot, smoke tests"""
    checks = {
        'db': _check_db(),
        'redis': _check_redis(),
        'celery': _check_celery(),
    }
    status = 'healthy' if all(checks.values()) else 'degraded'
    return Response({
        'status': status,
        'version': settings.APP_VERSION,
        'environment': settings.DJANGO_ENV,
        'checks': checks,
        'timestamp': datetime.utcnow().isoformat()
    }, status=200 if status == 'healthy' else 503)
```

---

## 10. Sprint 1 Infrastructure Checklist

Before writing any feature code:

**Repository:**
- [ ] GitHub repository created: `seaconnect/seaconnect-api` (backend)
- [ ] GitHub repository created: `seaconnect/seaconnect-web` (Next.js)
- [ ] GitHub repository created: `seaconnect/seaconnect-mobile` (Flutter)
- [ ] Branch protection rules on `main` and `develop`
- [ ] `.github/workflows/pr-validation.yml` created and tested
- [ ] `.github/workflows/deploy-uat.yml` created and tested
- [ ] `HANDOFFS.md` created in each repo root
- [ ] `AGENT-COSTS.md` created in each repo root

**Local dev:**
- [ ] `docker-compose.yml` created and `docker compose up` works
- [ ] All seed commands work: `seed_regions`, `seed_ports`, `seed_demo_users`
- [ ] `.env.dev.example` committed (no real secrets)
- [ ] Mailpit accessible at `http://localhost:8025`
- [ ] MinIO accessible at `http://localhost:9001`

**UAT:**
- [ ] Railway project created with `uat` environment
- [ ] Supabase project `seaconnect-uat` created, pgvector extension enabled
- [ ] Upstash Redis instance `seaconnect-uat` created
- [ ] Cloudflare R2 bucket `seaconnect-uat` created
- [ ] UAT domain configured: `uat-api.seaconnect.eg`
- [ ] Pipeline 2 tested: push to develop → auto-deploys to UAT

**Production:**
- [ ] Railway project `seaconnect-prod` created
- [ ] Supabase project `seaconnect-prod` created (dedicated compute)
- [ ] Upstash Redis `seaconnect-prod` created
- [ ] Cloudflare R2 `seaconnect-prod` created
- [ ] Cloudflare DNS configured for `api.seaconnect.eg`
- [ ] Sentry projects created (backend, mobile, web)
- [ ] Grafana Cloud workspace created
- [ ] UptimeRobot monitors created
- [ ] All production secrets loaded in Railway environment variables
