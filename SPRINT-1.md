# Sprint 1 — Project Scaffolding & Infrastructure
**Sprint:** 1  
**Goal:** Project scaffolding, Docker infrastructure, CI/CD pipelines, and core Django foundation — everything needed BEFORE feature code starts.  
**Start Date:** 2026-04-20  
**Target End Date:** 2026-04-27 (7 days)  
**Status:** READY TO EXECUTE  
**Primary Agents:** devops-infrastructure-specialist, backend-api-developer, frontend-react-developer  
**Orchestrator:** technical-orchestrator-agent  

---

## Sprint Summary

This sprint produces zero user-facing features. It produces the platform every future sprint builds on: repo structure, Docker Compose stack, CI/CD pipelines, Django project skeleton, Next.js project skeleton, and all verification that the stack runs end-to-end.

**Definition of Done for the Sprint:**
- `docker compose up --build` starts all 10 services with no errors
- `GET http://localhost:8000/health/` returns `{"status": "ok"}`
- `GET http://localhost:3000/` returns a Next.js page (Arabic RTL, no 500 errors)
- All 30 checklist items below are marked complete
- CI pipeline runs green on a test PR
- `HANDOFFS.md` and `AGENT-COSTS.md` exist in repo root with Sprint 1 entries

---

## Pre-Execution Checklist (Every Agent Must Complete)

Before writing any file, the assigned agent must read:

```
[ ] 03-Technical-Product/10-ADR-Log.md
[ ] 03-Technical-Product/13-Agent-Protocol.md
[ ] 03-Technical-Product/14-Environments-Pipelines.md
[ ] 03-Technical-Product/11-Expansion-Architecture.md
[ ] HANDOFFS.md (this file once created, for subsequent agents)
[ ] AGENT-COSTS.md (check token budget before starting)
```

---

## Repository Structure After Sprint 1

```
SeaConnect/                          ← repo root
├── backend/                         ← Django project
│   ├── Dockerfile
│   ├── manage.py
│   ├── requirements/
│   │   ├── base.txt
│   │   ├── dev.txt
│   │   └── prod.txt
│   ├── config/
│   │   ├── __init__.py
│   │   ├── settings/
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   ├── dev.py
│   │   │   ├── uat.py
│   │   │   └── prod.py
│   │   ├── urls.py
│   │   ├── celery.py
│   │   └── wsgi.py
│   ├── apps/
│   │   ├── accounts/
│   │   ├── core/
│   │   ├── listings/
│   │   ├── bookings/
│   │   ├── payments/
│   │   ├── marketplace/
│   │   ├── competitions/
│   │   ├── weather/
│   │   ├── notifications/
│   │   ├── search/
│   │   ├── analytics/
│   │   └── admin_portal/
│   ├── keys/
│   │   ├── jwt_private.pem          ← generated, git-ignored
│   │   └── jwt_public.pem           ← generated, git-ignored
│   └── tests/
│       └── conftest.py
├── web/                             ← Next.js 14 project
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── src/
│   │   ├── app/
│   │   │   ├── [locale]/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── messages/
│   │   │   ├── ar.json
│   │   │   └── en.json
│   │   └── styles/
│   │       └── globals.css
│   └── public/
├── .github/
│   └── workflows/
│       ├── ci.yml                   ← PR validation (lint + test)
│       ├── deploy-uat-api.yml       ← merge to develop → Render
│       └── deploy-uat-web.yml       ← merge to develop → Vercel
├── docker-compose.yml
├── .env.dev                         ← template (no real secrets)
├── .env.uat                         ← template (no real secrets)
├── render.yaml
├── HANDOFFS.md
├── AGENT-COSTS.md
└── SPRINT-1.md                      ← this file
```

---

## Phase A — Infrastructure
**Agent:** devops-infrastructure-specialist  
**Estimated tokens:** 35,000–45,000  
**Can start:** Immediately (no dependencies)  
**Blocks:** Phase D  

### Task A-1: docker-compose.yml
**Priority:** P0 — everything else depends on it  
**File:** `/mnt/e/Work/Projects/SeaConnect/docker-compose.yml`

Create the complete Docker Compose file with all 10 services. The file must match exactly the service definitions from `03-Technical-Product/14-Environments-Pipelines.md` section 3.1, with these additional details:

```yaml
services:

  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    env_file: .env.dev
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    volumes:
      - ./backend:/app
    command: python manage.py runserver 0.0.0.0:8000
    restart: unless-stopped

  web:
    build:
      context: ./web
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    env_file: .env.dev
    volumes:
      - ./web:/app
      - /app/node_modules
      - /app/.next
    command: npm run dev
    restart: unless-stopped

  db:
    image: pgvector/pgvector:pg16
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: seaconnect_dev
      POSTGRES_USER: sc_user
      POSTGRES_PASSWORD: localpassword
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sc_user -d seaconnect_dev"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
    restart: unless-stopped

  celery:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: celery -A config worker -l info -c 2
    env_file: .env.dev
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    volumes:
      - ./backend:/app
    restart: unless-stopped

  celery-beat:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
    env_file: .env.dev
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    volumes:
      - ./backend:/app
    restart: unless-stopped

  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
    restart: unless-stopped

  mailpit:
    image: axllent/mailpit:latest
    ports:
      - "1025:1025"
      - "8025:8025"
    restart: unless-stopped

  pgadmin:
    image: dpage/pgadmin4:latest
    ports:
      - "5050:80"
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@local.dev
      PGADMIN_DEFAULT_PASSWORD: admin
    depends_on:
      - db
    volumes:
      - pgadmin_data:/var/lib/pgadmin
    restart: unless-stopped

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    restart: unless-stopped

volumes:
  postgres_dev_data:
  minio_data:
  pgadmin_data:
  ollama_data:
```

**Definition of Done:**
- File parses with `docker compose config` (no YAML errors)
- All 10 services listed: api, web, db, redis, celery, celery-beat, minio, mailpit, pgadmin, ollama
- `db` service has a healthcheck block so dependent services wait for Postgres to be ready

---

### Task A-2: .env.dev template
**Priority:** P0  
**File:** `/mnt/e/Work/Projects/SeaConnect/.env.dev`  
**Note:** This is a template with placeholder values. No real secrets. Committed to git as a reference.

```bash
# ============================================================
# SeaConnect — Development Environment Variables
# Template only. Copy to .env.dev.local and fill real values.
# This file IS committed to git (all values are placeholders).
# ============================================================

# Django
DJANGO_ENV=development
DJANGO_SETTINGS_MODULE=config.settings.dev
DJANGO_SECRET_KEY=dev-secret-key-change-this-in-your-local-copy
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

# Database
DATABASE_URL=postgresql://sc_user:localpassword@db:5432/seaconnect_dev

# Redis
REDIS_URL=redis://redis:6379/0

# Celery
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/1

# Storage (MinIO — S3 compatible)
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_STORAGE_BUCKET_NAME=seaconnect-dev
AWS_S3_ENDPOINT_URL=http://minio:9000
AWS_S3_USE_SSL=False

# Payments (Fawry sandbox)
FAWRY_MERCHANT_CODE=sandbox_merchant
FAWRY_SECURITY_KEY=sandbox_key
FAWRY_BASE_URL=https://atfawry.fawrystaging.com

# Email (Mailpit local catcher)
EMAIL_HOST=mailpit
EMAIL_PORT=1025
EMAIL_USE_TLS=False
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
DEFAULT_FROM_EMAIL=noreply@seaconnect.local

# SMS (Twilio test magic numbers)
TWILIO_ACCOUNT_SID=test_sid
TWILIO_AUTH_TOKEN=test_token
TWILIO_PHONE_NUMBER=+15005550006

# JWT (RS256)
JWT_PRIVATE_KEY_PATH=/app/keys/jwt_private.pem
JWT_PUBLIC_KEY_PATH=/app/keys/jwt_public.pem
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=15
JWT_REFRESH_TOKEN_LIFETIME_DAYS=30

# Analytics (disabled in dev)
MIXPANEL_TOKEN=
SENTRY_DSN=

# AI / Embeddings
OLLAMA_BASE_URL=http://ollama:11434
OPENAI_API_KEY=

# Feature flags
FEATURE_FLAGS_ENABLED=True

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

**Definition of Done:**
- File exists at repo root
- All variable names match what `config/settings/dev.py` will read
- No real credentials in the file

---

### Task A-3: .env.uat template
**Priority:** P1  
**File:** `/mnt/e/Work/Projects/SeaConnect/.env.uat`  
**Note:** Template only — all values are placeholders. Real values set in Render + Vercel dashboards.

```bash
# ============================================================
# SeaConnect — UAT Environment Variables Template
# Real values are set in Render / Vercel environment dashboards.
# NEVER commit real UAT secrets to git.
# This template shows which variables are needed.
# ============================================================

# Django
DJANGO_ENV=uat
DJANGO_SETTINGS_MODULE=config.settings.uat
DJANGO_SECRET_KEY=REPLACE_WITH_STRONG_RANDOM_KEY
DEBUG=False
ALLOWED_HOSTS=seaconnect-uat-api.onrender.com

# Database (Supabase Free Tier — eu-west-1)
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres

# Redis (Redis Cloud Free)
REDIS_URL=redis://default:[password]@[host]:[port]

# Celery
CELERY_BROKER_URL=redis://default:[password]@[host]:[port]/0
CELERY_RESULT_BACKEND=redis://default:[password]@[host]:[port]/1

# Storage (Cloudflare R2 Free)
AWS_ACCESS_KEY_ID=REPLACE_WITH_R2_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=REPLACE_WITH_R2_SECRET_KEY
AWS_STORAGE_BUCKET_NAME=seaconnect-uat
AWS_S3_ENDPOINT_URL=https://[account_id].r2.cloudflarestorage.com
AWS_S3_USE_SSL=True

# Payments (Fawry sandbox — same as dev)
FAWRY_MERCHANT_CODE=sandbox_merchant
FAWRY_SECURITY_KEY=sandbox_key
FAWRY_BASE_URL=https://atfawry.fawrystaging.com

# Email (Brevo Free — 300/day)
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=REPLACE_WITH_BREVO_SMTP_USER
EMAIL_HOST_PASSWORD=REPLACE_WITH_BREVO_SMTP_KEY
DEFAULT_FROM_EMAIL=noreply@seaconnect.eg

# SMS (Twilio Trial)
TWILIO_ACCOUNT_SID=REPLACE_WITH_TWILIO_SID
TWILIO_AUTH_TOKEN=REPLACE_WITH_TWILIO_TOKEN
TWILIO_PHONE_NUMBER=REPLACE_WITH_TWILIO_NUMBER

# JWT (RS256)
JWT_PRIVATE_KEY_PATH=/etc/secrets/jwt_private.pem
JWT_PUBLIC_KEY_PATH=/etc/secrets/jwt_public.pem
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=15
JWT_REFRESH_TOKEN_LIFETIME_DAYS=30

# Analytics
MIXPANEL_TOKEN=REPLACE_WITH_MIXPANEL_TOKEN
SENTRY_DSN=REPLACE_WITH_SENTRY_DSN

# AI
OPENAI_API_KEY=REPLACE_WITH_OPENAI_KEY

# Feature flags
FEATURE_FLAGS_ENABLED=True

# CORS
CORS_ALLOWED_ORIGINS=https://seaconnect-uat.vercel.app,https://seaconnect-uat-admin.vercel.app
```

**Definition of Done:**
- File exists at repo root
- Contains all variables from .env.dev plus UAT-specific overrides
- All values are clearly labeled as `REPLACE_WITH_*`

---

### Task A-4: Backend Dockerfile
**Priority:** P0  
**File:** `/mnt/e/Work/Projects/SeaConnect/backend/Dockerfile`

```dockerfile
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY requirements/ requirements/
RUN pip install --no-cache-dir -r requirements/dev.txt

# Copy project
COPY . .

# Create keys directory
RUN mkdir -p /app/keys

EXPOSE 8000
```

**Definition of Done:**
- `docker build -t seaconnect-api ./backend` succeeds

---

### Task A-5: Web Dockerfile
**Priority:** P0  
**File:** `/mnt/e/Work/Projects/SeaConnect/web/Dockerfile`

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy project
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

**Definition of Done:**
- `docker build -t seaconnect-web ./web` succeeds

---

### Task A-6: GitHub Actions — CI Pipeline
**Priority:** P1  
**File:** `/mnt/e/Work/Projects/SeaConnect/.github/workflows/ci.yml`  
**Trigger:** Pull requests to `develop` or `main`

```yaml
name: CI — Lint & Test

on:
  pull_request:
    branches: [develop, main]

jobs:
  backend:
    name: Backend checks
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_DB: seaconnect_test
          POSTGRES_USER: sc_user
          POSTGRES_PASSWORD: testpassword
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    env:
      DJANGO_ENV: test
      DJANGO_SETTINGS_MODULE: config.settings.dev
      DJANGO_SECRET_KEY: ci-test-secret-key
      DEBUG: "False"
      DATABASE_URL: postgresql://sc_user:testpassword@localhost:5432/seaconnect_test
      REDIS_URL: redis://localhost:6379/0
      CELERY_BROKER_URL: redis://localhost:6379/0
      JWT_PRIVATE_KEY_PATH: /tmp/jwt_private.pem
      JWT_PUBLIC_KEY_PATH: /tmp/jwt_public.pem
      AWS_ACCESS_KEY_ID: test
      AWS_SECRET_ACCESS_KEY: test
      AWS_STORAGE_BUCKET_NAME: test-bucket
      AWS_S3_ENDPOINT_URL: http://localhost:9000

    steps:
      - uses: actions/checkout@v4

      - name: Generate JWT test keys
        run: |
          openssl genrsa -out /tmp/jwt_private.pem 2048
          openssl rsa -in /tmp/jwt_private.pem -pubout -out /tmp/jwt_public.pem

      - name: Set up Python 3.12
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip
          cache-dependency-path: backend/requirements/dev.txt

      - name: Install dependencies
        run: pip install -r backend/requirements/dev.txt
        working-directory: .

      - name: Lint (ruff)
        run: ruff check apps/ config/
        working-directory: backend/

      - name: Format check (ruff format)
        run: ruff format --check apps/ config/
        working-directory: backend/

      - name: Type check (mypy)
        run: mypy apps/ config/ --strict
        working-directory: backend/

      - name: Run migrations
        run: python manage.py migrate --noinput
        working-directory: backend/

      - name: Run tests with coverage
        run: |
          pytest tests/ apps/ \
            --cov=apps \
            --cov-report=xml \
            --cov-report=term-missing \
            --cov-fail-under=80 \
            -x -v
        working-directory: backend/

      - name: Security scan (Bandit)
        run: bandit -r apps/ -ll --exit-zero
        working-directory: backend/

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          file: backend/coverage.xml
          fail_ci_if_error: false

  web:
    name: Web checks
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Node 20
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
          cache-dependency-path: web/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: web/

      - name: TypeScript check
        run: npx tsc --noEmit
        working-directory: web/

      - name: ESLint
        run: npx eslint . --ext .ts,.tsx --max-warnings 0
        working-directory: web/

      - name: Build check
        run: npm run build
        working-directory: web/
        env:
          NEXT_PUBLIC_API_URL: http://localhost:8000
```

**Definition of Done:**
- YAML is valid (no syntax errors)
- Pipeline triggers on PRs to `develop` and `main`
- Both `backend` and `web` jobs present
- JWT keys are generated as part of CI setup

---

### Task A-7: GitHub Actions — UAT API Deploy
**Priority:** P1  
**File:** `/mnt/e/Work/Projects/SeaConnect/.github/workflows/deploy-uat-api.yml`  
**Trigger:** Push (merge) to `develop` branch

```yaml
name: Deploy UAT — API (Render)

on:
  push:
    branches: [develop]
    paths:
      - "backend/**"
      - "render.yaml"

jobs:
  deploy-api:
    name: Deploy API to Render
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Trigger Render deploy
        run: |
          curl -X POST \
            "https://api.render.com/v1/services/${{ secrets.RENDER_UAT_API_SERVICE_ID }}/deploys" \
            -H "Authorization: Bearer ${{ secrets.RENDER_API_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"clearCache": false}'

      - name: Wait for deploy to complete
        run: |
          echo "Waiting 90 seconds for Render deploy..."
          sleep 90

      - name: Smoke test health endpoint
        run: |
          curl --fail --retry 5 --retry-delay 10 \
            https://seaconnect-uat-api.onrender.com/health/

      - name: Notify on failure
        if: failure()
        run: |
          echo "UAT API deploy failed — check Render dashboard"
          echo "https://dashboard.render.com"
```

**Required GitHub Secrets:**
- `RENDER_API_KEY` — Render API key (set in GitHub repo settings)
- `RENDER_UAT_API_SERVICE_ID` — Render service ID for the UAT API

**Definition of Done:**
- File exists with valid YAML
- Only triggers when `backend/` or `render.yaml` changes
- Health check smoke test confirms deploy succeeded

---

### Task A-8: GitHub Actions — UAT Web Deploy
**Priority:** P1  
**File:** `/mnt/e/Work/Projects/SeaConnect/.github/workflows/deploy-uat-web.yml`  
**Trigger:** Push (merge) to `develop` branch

```yaml
name: Deploy UAT — Web (Vercel)

on:
  push:
    branches: [develop]
    paths:
      - "web/**"

jobs:
  deploy-web:
    name: Deploy Web to Vercel
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Node 20
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install Vercel CLI
        run: npm install -g vercel@latest

      - name: Deploy to Vercel (preview/UAT)
        run: |
          vercel deploy \
            --token ${{ secrets.VERCEL_TOKEN }} \
            --prod \
            --yes \
            --cwd web/
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_WEB_PROJECT_ID }}

      - name: Smoke test web deployment
        run: |
          curl --fail --retry 3 --retry-delay 5 \
            https://seaconnect-uat.vercel.app/
```

**Required GitHub Secrets:**
- `VERCEL_TOKEN` — Vercel personal access token
- `VERCEL_ORG_ID` — Vercel organization ID
- `VERCEL_WEB_PROJECT_ID` — Vercel project ID for the web app

**Definition of Done:**
- File exists with valid YAML
- Only triggers when `web/` changes
- Smoke test verifies deployment is accessible

---

### Task A-9: render.yaml
**Priority:** P1  
**File:** `/mnt/e/Work/Projects/SeaConnect/render.yaml`

```yaml
# Render Blueprint — SeaConnect UAT
# Render reads this file automatically when connected to the repo.
# Docs: https://render.com/docs/blueprint-spec

services:
  - type: web
    name: seaconnect-uat-api
    runtime: python
    region: frankfurt
    plan: free
    branch: develop
    rootDir: backend
    buildCommand: |
      pip install -r requirements/prod.txt &&
      python manage.py collectstatic --noinput
    startCommand: gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 1 --timeout 120
    healthCheckPath: /health/
    envVars:
      - key: DJANGO_SETTINGS_MODULE
        value: config.settings.uat
      - key: DJANGO_ENV
        value: uat
      - key: DEBUG
        value: "False"
      - key: DJANGO_SECRET_KEY
        sync: false
      - key: DATABASE_URL
        sync: false
      - key: REDIS_URL
        sync: false
      - key: ALLOWED_HOSTS
        value: seaconnect-uat-api.onrender.com
      - key: CORS_ALLOWED_ORIGINS
        value: https://seaconnect-uat.vercel.app,https://seaconnect-uat-admin.vercel.app
      - key: FAWRY_MERCHANT_CODE
        value: sandbox_merchant
      - key: FAWRY_SECURITY_KEY
        sync: false
      - key: FAWRY_BASE_URL
        value: https://atfawry.fawrystaging.com
      - key: EMAIL_HOST
        value: smtp-relay.brevo.com
      - key: EMAIL_PORT
        value: "587"
      - key: EMAIL_USE_TLS
        value: "True"
      - key: EMAIL_HOST_USER
        sync: false
      - key: EMAIL_HOST_PASSWORD
        sync: false
      - key: DEFAULT_FROM_EMAIL
        value: noreply@seaconnect.eg
      - key: JWT_ACCESS_TOKEN_LIFETIME_MINUTES
        value: "15"
      - key: JWT_REFRESH_TOKEN_LIFETIME_DAYS
        value: "30"
      - key: SENTRY_DSN
        sync: false
      - key: OPENAI_API_KEY
        sync: false

  - type: worker
    name: seaconnect-uat-celery
    runtime: python
    region: frankfurt
    plan: free
    branch: develop
    rootDir: backend
    buildCommand: pip install -r requirements/prod.txt
    startCommand: celery -A config worker -l info -c 1 --without-heartbeat
    envVars:
      - key: DJANGO_SETTINGS_MODULE
        value: config.settings.uat
      - key: DJANGO_ENV
        value: uat
      - key: DATABASE_URL
        sync: false
      - key: REDIS_URL
        sync: false
      - key: DJANGO_SECRET_KEY
        sync: false
```

**Definition of Done:**
- File validates as correct YAML
- Two services defined: web API + Celery worker
- All `sync: false` vars are documented in the team wiki (ops runbook)
- `healthCheckPath: /health/` matches the endpoint created in Task B-8

---

### Task A-10: .gitignore additions
**Priority:** P0  
**File:** `/mnt/e/Work/Projects/SeaConnect/.gitignore`  
**Action:** Create or append with these entries if the file doesn't exist.

```gitignore
# Python
__pycache__/
*.py[cod]
*.so
.Python
*.egg-info/
dist/
build/
.eggs/
*.egg
.env
.venv
venv/
ENV/

# Django
*.log
db.sqlite3
media/
staticfiles/
.env.dev.local
.env.uat.local
.env.prod

# JWT keys (NEVER commit real keys)
backend/keys/*.pem
*.pem

# Node
node_modules/
.next/
out/
npm-debug.log*
.npm

# Testing
.coverage
coverage.xml
htmlcov/
.pytest_cache/
.mypy_cache/
.ruff_cache/

# IDEs
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Docker volumes (generated locally)
postgres_dev_data/
minio_data/

# Vercel
.vercel/
```

**Definition of Done:**
- `.pem` files are in `.gitignore` so JWT keys cannot be accidentally committed
- `.env.dev.local` and `.env.prod` are ignored (local overrides with real secrets)

---

## Phase B — Backend Scaffold
**Agent:** backend-api-developer  
**Estimated tokens:** 50,000–65,000  
**Depends on:** Task A-1 (docker-compose.yml), Task A-2 (.env.dev) must exist  
**Blocks:** Phase D  

### Task B-1: Django project initialization
**Priority:** P0  

Run these commands inside the `backend/` directory to bootstrap the project structure:

```bash
mkdir -p /mnt/e/Work/Projects/SeaConnect/backend
cd /mnt/e/Work/Projects/SeaConnect/backend

# Initialize Django project (named 'config' — not 'seaconnect' to avoid confusion)
django-admin startproject config .

# Create all apps
python manage.py startapp accounts apps/accounts
python manage.py startapp core apps/core
python manage.py startapp listings apps/listings
python manage.py startapp bookings apps/bookings
python manage.py startapp payments apps/payments
python manage.py startapp marketplace apps/marketplace
python manage.py startapp competitions apps/competitions
python manage.py startapp weather apps/weather
python manage.py startapp notifications apps/notifications
python manage.py startapp search apps/search
python manage.py startapp analytics apps/analytics
python manage.py startapp admin_portal apps/admin_portal
```

**Directory structure to create manually:**
```
backend/
├── apps/
│   └── __init__.py          ← empty file to make apps/ a package
├── keys/
│   └── .gitkeep             ← empty, keeps the directory in git
└── tests/
    └── __init__.py
```

Each app directory must have its `AppConfig.name` updated to `apps.<appname>`.

**Definition of Done:**
- `python manage.py check` passes with no errors
- All 12 app directories exist under `backend/apps/`
- Each app has `apps.py` with correct `name = 'apps.<appname>'`

---

### Task B-2: requirements files
**Priority:** P0  
**Files:**
- `/mnt/e/Work/Projects/SeaConnect/backend/requirements/base.txt`
- `/mnt/e/Work/Projects/SeaConnect/backend/requirements/dev.txt`
- `/mnt/e/Work/Projects/SeaConnect/backend/requirements/prod.txt`

**base.txt:**
```
django==5.1.*
djangorestframework==3.15.*
djangorestframework-simplejwt==5.3.*
django-cors-headers==4.3.*
django-filter==24.*
django-storages[s3]==1.14.*
celery==5.3.*
django-celery-beat==2.6.*
redis==5.0.*
psycopg[binary]==3.1.*
pgvector==0.2.*
dj-database-url==2.1.*
python-decouple==3.8.*
Pillow==10.*
cryptography==42.*
```

**dev.txt:**
```
-r base.txt
django-debug-toolbar==4.4.*
factory-boy==3.3.*
pytest==8.*
pytest-django==4.8.*
pytest-cov==5.*
pytest-factoryboy==2.7.*
ruff==0.4.*
mypy==1.10.*
django-stubs[compatible-mypy]==5.0.*
djangorestframework-stubs==3.15.*
bandit==1.7.*
pip-audit==2.7.*
```

**prod.txt:**
```
-r base.txt
gunicorn==22.*
sentry-sdk[django]==2.5.*
whitenoise==6.7.*
```

**Definition of Done:**
- `pip install -r requirements/dev.txt` completes without errors
- All packages resolve without version conflicts

---

### Task B-3: Settings split (base / dev / uat / prod)
**Priority:** P0  
**Files:**
- `/mnt/e/Work/Projects/SeaConnect/backend/config/settings/__init__.py` (empty)
- `/mnt/e/Work/Projects/SeaConnect/backend/config/settings/base.py`
- `/mnt/e/Work/Projects/SeaConnect/backend/config/settings/dev.py`
- `/mnt/e/Work/Projects/SeaConnect/backend/config/settings/uat.py`
- `/mnt/e/Work/Projects/SeaConnect/backend/config/settings/prod.py`

**base.py must include:**
- `INSTALLED_APPS` with all 12 apps listed as `apps.<name>` plus Django built-ins plus DRF, CORS, celery-beat, django-filter
- `AUTH_USER_MODEL = 'accounts.User'`
- Database configured via `dj_database_url.parse(os.environ['DATABASE_URL'])`
- REST_FRAMEWORK defaults: `DEFAULT_PAGINATION_CLASS = 'rest_framework.pagination.CursorPagination'`, `PAGE_SIZE = 20`, `DEFAULT_AUTHENTICATION_CLASSES` with JWT, `DEFAULT_PERMISSION_CLASSES = ['rest_framework.permissions.IsAuthenticated']`
- Standard error response format via `EXCEPTION_HANDLER`
- JWT settings from `SIMPLE_JWT` dict: algorithm `RS256`, read keys from paths in env vars, access lifetime 15 min, refresh lifetime 30 days
- CORS settings reading from `CORS_ALLOWED_ORIGINS` env var
- Celery settings pointing to `CELERY_BROKER_URL` and `CELERY_RESULT_BACKEND`
- Storage backend: `django-storages` S3 using env vars
- `TIME_ZONE = 'Africa/Cairo'` (Egypt default — expansion-safe via Region model)
- `LANGUAGE_CODE = 'ar'`
- `USE_I18N = True`

**dev.py must include:**
- `from .base import *`
- `DEBUG = True`
- `django-debug-toolbar` in INSTALLED_APPS
- `INTERNAL_IPS = ['127.0.0.1']`
- Email backend: `django.core.mail.backends.smtp.EmailBackend` pointing to Mailpit

**uat.py must include:**
- `from .base import *`
- `DEBUG = False`
- Sentry initialization via `sentry_sdk.init(dsn=os.environ.get('SENTRY_DSN', ''))`
- `SECURE_HSTS_SECONDS = 0` (UAT, not production)
- WhiteNoise middleware for static files

**prod.py must include:**
- `from .base import *`
- `DEBUG = False`
- Full security headers (HSTS, secure cookies, etc.)
- WhiteNoise for static
- Sentry initialized

**Definition of Done:**
- `DJANGO_SETTINGS_MODULE=config.settings.dev python manage.py check` passes
- All 12 apps recognized by Django
- No `ImproperlyConfigured` errors

---

### Task B-4: CursorPagination + standard error format
**Priority:** P0  
**File:** `/mnt/e/Work/Projects/SeaConnect/backend/apps/core/pagination.py`

```python
from rest_framework.pagination import CursorPagination


class StandardCursorPagination(CursorPagination):
    """
    Global cursor pagination for all list endpoints.
    Uses created_at as the ordering field — all models inherit
    TimeStampedModel which provides this field.
    """
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100
    ordering = "-created_at"
```

**File:** `/mnt/e/Work/Projects/SeaConnect/backend/apps/core/exceptions.py`

```python
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


def standard_exception_handler(exc, context):
    """
    Wraps DRF's default exception handler to return a consistent
    error envelope across all endpoints.

    Success:   { "data": {...}, "meta": {...} }
    Error:     { "error": { "code": "...", "message": "...", "details": {...} } }
    """
    response = exception_handler(exc, context)

    if response is not None:
        error_payload = {
            "error": {
                "code": _get_error_code(response.status_code),
                "message": _flatten_errors(response.data),
                "details": response.data if isinstance(response.data, dict) else {},
            }
        }
        response.data = error_payload

    return response


def _get_error_code(status_code: int) -> str:
    codes = {
        400: "VALIDATION_ERROR",
        401: "AUTHENTICATION_REQUIRED",
        403: "PERMISSION_DENIED",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        429: "RATE_LIMIT_EXCEEDED",
        500: "INTERNAL_SERVER_ERROR",
    }
    return codes.get(status_code, f"HTTP_{status_code}")


def _flatten_errors(data) -> str:
    if isinstance(data, str):
        return data
    if isinstance(data, list):
        return " ".join(str(e) for e in data)
    if isinstance(data, dict):
        messages = []
        for key, val in data.items():
            if isinstance(val, list):
                messages.extend(str(v) for v in val)
            else:
                messages.append(str(val))
        return " ".join(messages)
    return str(data)
```

In `base.py` settings, add:
```python
REST_FRAMEWORK = {
    ...
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardCursorPagination",
    "EXCEPTION_HANDLER": "apps.core.exceptions.standard_exception_handler",
    ...
}
```

**Definition of Done:**
- `StandardCursorPagination` is the global default
- All error responses use the `{"error": {"code": ..., "message": ...}}` envelope
- Unit test confirms the error format for a 404

---

### Task B-5: TimeStampedModel base class
**Priority:** P0  
**File:** `/mnt/e/Work/Projects/SeaConnect/backend/apps/core/models.py`

```python
import uuid
from django.db import models


class TimeStampedModel(models.Model):
    """
    Abstract base class for all SeaConnect models.

    Provides:
    - UUID primary key (prevents enumeration attacks, expansion-safe)
    - created_at / updated_at auto timestamps
    - is_active soft-delete flag

    All models MUST inherit from this. Direct use of models.Model
    is forbidden (enforced by ADR-018).
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]
```

**Definition of Done:**
- `TimeStampedModel` is `abstract = True`
- UUID primary key, `created_at`, `updated_at`, `is_active` fields present
- No migration generated (abstract model)

---

### Task B-6: Region model with Egypt seeded
**Priority:** P0  
**File:** `/mnt/e/Work/Projects/SeaConnect/backend/apps/core/models.py` (append to same file)

```python
class Region(TimeStampedModel):
    """
    Supported markets. Egypt is active at launch.
    UAE, KSA etc. exist in DB as inactive — expansion-ready.
    """
    code = models.CharField(max_length=10, unique=True)   # 'EG', 'AE', 'SA'
    name_ar = models.CharField(max_length=100)             # 'مصر'
    name_en = models.CharField(max_length=100)             # 'Egypt'
    currency_code = models.CharField(max_length=3)         # 'EGP'
    currency_symbol_ar = models.CharField(max_length=10)   # 'ج.م'
    currency_symbol_en = models.CharField(max_length=10)   # 'EGP'
    timezone = models.CharField(max_length=50)             # 'Africa/Cairo'
    is_launched = models.BooleanField(default=False)       # True only when live for real users
    launch_date = models.DateField(null=True, blank=True)

    class Meta(TimeStampedModel.Meta):
        verbose_name = "Region"
        verbose_name_plural = "Regions"

    def __str__(self) -> str:
        return f"{self.name_en} ({self.code})"
```

**Management command for seeding:**  
**File:** `/mnt/e/Work/Projects/SeaConnect/backend/apps/core/management/commands/seed_regions.py`

```python
from django.core.management.base import BaseCommand
from apps.core.models import Region


REGIONS = [
    {
        "code": "EG",
        "name_ar": "مصر",
        "name_en": "Egypt",
        "currency_code": "EGP",
        "currency_symbol_ar": "ج.م",
        "currency_symbol_en": "EGP",
        "timezone": "Africa/Cairo",
        "is_launched": True,
        "is_active": True,
    },
    {
        "code": "AE",
        "name_ar": "الإمارات العربية المتحدة",
        "name_en": "United Arab Emirates",
        "currency_code": "AED",
        "currency_symbol_ar": "د.إ",
        "currency_symbol_en": "AED",
        "timezone": "Asia/Dubai",
        "is_launched": False,
        "is_active": False,
    },
    {
        "code": "SA",
        "name_ar": "المملكة العربية السعودية",
        "name_en": "Saudi Arabia",
        "currency_code": "SAR",
        "currency_symbol_ar": "ر.س",
        "currency_symbol_en": "SAR",
        "timezone": "Asia/Riyadh",
        "is_launched": False,
        "is_active": False,
    },
]


class Command(BaseCommand):
    help = "Seed Region table with Egypt (active) and future markets (inactive)."

    def handle(self, *args, **options):
        created_count = 0
        for data in REGIONS:
            region, created = Region.objects.update_or_create(
                code=data["code"],
                defaults=data,
            )
            if created:
                created_count += 1
                self.stdout.write(f"  Created region: {region.name_en}")
            else:
                self.stdout.write(f"  Updated region: {region.name_en}")

        self.stdout.write(
            self.style.SUCCESS(
                f"seed_regions complete. {created_count} new, "
                f"{len(REGIONS) - created_count} updated."
            )
        )
```

**Definition of Done:**
- `python manage.py seed_regions` runs without errors
- Egypt row: `is_launched=True`, `is_active=True`
- UAE and KSA rows: `is_launched=False`, `is_active=False`
- Command is idempotent (run twice produces same result)

---

### Task B-7: DeparturePort model with 7 Egyptian ports seeded
**Priority:** P0  
**File:** `/mnt/e/Work/Projects/SeaConnect/backend/apps/core/models.py` (append)

```python
class DeparturePort(TimeStampedModel):
    """
    Physical departure points for boat trips.
    Seeded with 7 key Egyptian ports at launch.
    Expansion: add UAE ports when Region AE is launched.
    """
    region = models.ForeignKey(
        Region,
        on_delete=models.PROTECT,
        related_name="departure_ports",
    )
    code = models.CharField(max_length=20, unique=True)    # 'HRG', 'SHA', 'CAI'
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200)
    city_ar = models.CharField(max_length=100)
    city_en = models.CharField(max_length=100)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    sea_body = models.CharField(
        max_length=50,
        choices=[
            ("red_sea", "Red Sea"),
            ("mediterranean", "Mediterranean Sea"),
            ("nile", "Nile River"),
            ("suez_canal", "Suez Canal"),
        ],
    )
    is_featured = models.BooleanField(default=False)

    class Meta(TimeStampedModel.Meta):
        verbose_name = "Departure Port"
        verbose_name_plural = "Departure Ports"

    def __str__(self) -> str:
        return f"{self.name_en} ({self.code})"
```

**Management command:**  
**File:** `/mnt/e/Work/Projects/SeaConnect/backend/apps/core/management/commands/seed_ports.py`

The 7 Egyptian ports to seed:

| code | name_en | city_en | lat | lon | sea_body | featured |
|------|---------|---------|-----|-----|----------|----------|
| HRG | Hurghada Marina | Hurghada | 27.2579 | 33.8116 | red_sea | True |
| SHA | Sharm El-Sheikh Marina | Sharm El-Sheikh | 27.8600 | 34.2800 | red_sea | True |
| DAH | Dahab Harbour | Dahab | 28.4950 | 34.5130 | red_sea | False |
| MER | Marsa Alam Port | Marsa Alam | 25.0660 | 34.8860 | red_sea | False |
| ALX | Alexandria Eastern Harbour | Alexandria | 31.2156 | 29.8953 | mediterranean | True |
| ELG | El-Gouna Marina | El-Gouna | 27.3900 | 33.6800 | red_sea | False |
| PSD | Port Said Harbour | Port Said | 31.2653 | 32.3019 | mediterranean | False |

Each port's Arabic name is the standard Arabic transliteration. The seeding command must:
- Look up the Egypt `Region` object first
- Use `update_or_create` on the `code` field
- Be idempotent

**Definition of Done:**
- `python manage.py seed_ports` runs without errors
- 7 ports created with correct coordinates and sea_body values
- Hurghada, Sharm, Alexandria marked `is_featured=True`

---

### Task B-8: FeatureFlag model
**Priority:** P1  
**File:** `/mnt/e/Work/Projects/SeaConnect/backend/apps/core/models.py` (append)

```python
class FeatureFlag(TimeStampedModel):
    """
    Runtime feature flags — no deploy required to enable/disable features.
    Used for controlled rollouts, A/B tests, and region-specific features.
    Admin-configurable via Django admin.
    """
    key = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_enabled = models.BooleanField(default=False)
    enabled_for_regions = models.ManyToManyField(
        Region,
        blank=True,
        related_name="feature_flags",
        help_text="If empty, applies globally. If set, only for listed regions.",
    )
    rollout_percentage = models.PositiveSmallIntegerField(
        default=100,
        help_text="0-100. Percentage of users who see this feature. 100 = everyone.",
    )

    class Meta(TimeStampedModel.Meta):
        verbose_name = "Feature Flag"
        verbose_name_plural = "Feature Flags"

    def __str__(self) -> str:
        status = "ON" if self.is_enabled else "OFF"
        return f"{self.key} [{status}]"
```

**Definition of Done:**
- Model migrates without errors
- Visible in Django admin
- `is_enabled=False` default means new flags are safely off until explicitly activated

---

### Task B-9: Custom User model
**Priority:** P0  
**File:** `/mnt/e/Work/Projects/SeaConnect/backend/apps/accounts/models.py`

```python
import uuid
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from apps.core.models import TimeStampedModel


class User(TimeStampedModel, AbstractBaseUser, PermissionsMixin):
    """
    Custom User model. Must be set before first migration.
    AUTH_USER_MODEL = 'accounts.User'

    Uses phone number as the primary login identifier (Egypt market).
    Email is optional but used for account recovery.
    """
    phone_number = models.CharField(max_length=20, unique=True)
    email = models.EmailField(blank=True, null=True)
    full_name = models.CharField(max_length=255)
    role = models.CharField(
        max_length=20,
        choices=[
            ("customer", "Customer"),
            ("owner", "Boat Owner"),
            ("vendor", "Vendor"),
            ("admin", "Admin"),
            ("superadmin", "Super Admin"),
        ],
        default="customer",
    )
    region = models.ForeignKey(
        "core.Region",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
    )
    preferred_language = models.CharField(
        max_length=5,
        default="ar",
        choices=[("ar", "Arabic"), ("en", "English")],
    )
    phone_verified = models.BooleanField(default=False)
    email_verified = models.BooleanField(default=False)

    is_staff = models.BooleanField(default=False)

    USERNAME_FIELD = "phone_number"
    REQUIRED_FIELDS = ["full_name"]

    class Meta(TimeStampedModel.Meta):
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self) -> str:
        return f"{self.full_name} ({self.phone_number})"
```

**Definition of Done:**
- `AUTH_USER_MODEL = 'accounts.User'` set in `base.py` settings
- First migration for `accounts` app created and applied
- `python manage.py createsuperuser` works

---

### Task B-10: JWT auth configured (RS256)
**Priority:** P0  
**File:** `/mnt/e/Work/Projects/SeaConnect/backend/config/settings/base.py` (JWT section)

Add to `base.py`:

```python
from pathlib import Path
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend

def _load_key(path: str):
    """Load PEM key from file path. Returns None if file doesn't exist (CI-safe)."""
    try:
        with open(path, "rb") as f:
            return f.read()
    except FileNotFoundError:
        return None

_JWT_PRIVATE_KEY_PATH = env("JWT_PRIVATE_KEY_PATH", default="")
_JWT_PUBLIC_KEY_PATH = env("JWT_PUBLIC_KEY_PATH", default="")

SIMPLE_JWT = {
    "ALGORITHM": "RS256",
    "SIGNING_KEY": _load_key(_JWT_PRIVATE_KEY_PATH),
    "VERIFYING_KEY": _load_key(_JWT_PUBLIC_KEY_PATH),
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=int(env("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", default="15"))
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=int(env("JWT_REFRESH_TOKEN_LIFETIME_DAYS", default="30"))
    ),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    "TOKEN_TYPE_CLAIM": "token_type",
}
```

**Key generation command (run once locally, not committed):**
```bash
cd backend/keys/
openssl genrsa -out jwt_private.pem 2048
openssl rsa -in jwt_private.pem -pubout -out jwt_public.pem
```

Add these paths to `.gitignore` (done in Task A-10).

**Definition of Done:**
- `SIMPLE_JWT` dict uses `RS256` algorithm
- Keys loaded from env-specified paths
- Key files are in `.gitignore`
- `python manage.py check` passes even when key files don't exist (CI-safe with `default=""`)

---

### Task B-11: Health check endpoint
**Priority:** P0  
**File:** `/mnt/e/Work/Projects/SeaConnect/backend/apps/core/views.py`

```python
from django.db import connection
from django.core.cache import cache
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
import time


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    """
    GET /health/

    Returns 200 if the service is healthy.
    Returns 503 if any critical dependency is down.
    Used by: Docker healthcheck, Render healthcheck, UptimeRobot.
    """
    checks = {}
    overall_status = "ok"

    # Database check
    try:
        start = time.monotonic()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        checks["database"] = {
            "status": "ok",
            "latency_ms": round((time.monotonic() - start) * 1000, 2),
        }
    except Exception as e:
        checks["database"] = {"status": "error", "detail": str(e)}
        overall_status = "degraded"

    # Cache check
    try:
        start = time.monotonic()
        cache.set("health_check_probe", "1", timeout=5)
        cache.get("health_check_probe")
        checks["cache"] = {
            "status": "ok",
            "latency_ms": round((time.monotonic() - start) * 1000, 2),
        }
    except Exception as e:
        checks["cache"] = {"status": "error", "detail": str(e)}
        # Cache down is degraded, not down — non-fatal

    http_status = status.HTTP_200_OK if overall_status == "ok" else status.HTTP_503_SERVICE_UNAVAILABLE

    return Response(
        {"status": overall_status, "checks": checks},
        status=http_status,
    )
```

**File:** `/mnt/e/Work/Projects/SeaConnect/backend/config/urls.py`

```python
from django.contrib import admin
from django.urls import path, include
from apps.core.views import health_check

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health_check, name="health-check"),
    path("api/v1/", include("apps.accounts.urls")),
    # Additional app URL includes added by subsequent sprints
]
```

**Definition of Done:**
- `curl http://localhost:8000/health/` returns `{"status": "ok", "checks": {...}}`
- Returns 200 when DB + cache are up
- Returns 503 when DB is unreachable
- Render `healthCheckPath: /health/` will use this endpoint

---

### Task B-12: mypy configuration
**Priority:** P1  
**File:** `/mnt/e/Work/Projects/SeaConnect/backend/mypy.ini`

```ini
[mypy]
python_version = 3.12
strict = True
warn_return_any = True
warn_unused_configs = True
disallow_untyped_defs = True
disallow_any_generics = True
check_untyped_defs = True
disallow_untyped_calls = True
ignore_missing_imports = False
plugins =
    mypy_django_plugin.main,
    mypy_drf_plugin.main

[mypy.plugins.django-stubs]
django_settings_module = config.settings.dev

[mypy-celery.*]
ignore_missing_imports = True

[mypy-factory.*]
ignore_missing_imports = True

[mypy-pgvector.*]
ignore_missing_imports = True

[mypy-dj_database_url.*]
ignore_missing_imports = True
```

**Definition of Done:**
- `mypy apps/ config/ --strict` completes without unresolvable errors
- Django stubs and DRF stubs installed (in dev.txt)
- CI pipeline runs mypy (configured in Task A-6)

---

### Task B-13: pytest configuration
**Priority:** P1  
**File:** `/mnt/e/Work/Projects/SeaConnect/backend/pytest.ini`

```ini
[pytest]
DJANGO_SETTINGS_MODULE = config.settings.dev
python_files = test_*.py *_test.py
python_classes = Test*
python_functions = test_*
addopts =
    --strict-markers
    --tb=short
    -v
markers =
    unit: Unit tests (no database, no network)
    integration: Integration tests (uses real database)
    slow: Tests that take > 2 seconds
```

**File:** `/mnt/e/Work/Projects/SeaConnect/backend/tests/conftest.py`

```python
import pytest
from django.test import TestCase


@pytest.fixture(scope="session")
def django_db_setup():
    """Session-scoped DB setup — runs migrations once per session."""
    pass


@pytest.fixture
def api_client():
    """DRF test client, unauthenticated."""
    from rest_framework.test import APIClient
    return APIClient()


@pytest.fixture
def authenticated_client(api_client, user_factory):
    """DRF test client, authenticated as a regular customer."""
    from rest_framework_simplejwt.tokens import RefreshToken
    user = user_factory(role="customer")
    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return api_client, user
```

**Definition of Done:**
- `pytest --collect-only` discovers tests without errors
- `pytest tests/` runs (even with no tests) without configuration errors
- `factory_boy` and `pytest-factoryboy` installed

---

### Task B-14: Initial migrations
**Priority:** P0 (must come after B-5 through B-9)

```bash
cd backend/

# Create initial migrations for all apps with models
python manage.py makemigrations core
python manage.py makemigrations accounts
python manage.py makemigrations listings
python manage.py makemigrations bookings
python manage.py makemigrations payments
python manage.py makemigrations marketplace
python manage.py makemigrations competitions
python manage.py makemigrations weather
python manage.py makemigrations notifications
python manage.py makemigrations search
python manage.py makemigrations analytics
python manage.py makemigrations admin_portal

# Apply all migrations
python manage.py migrate
```

**Also create the PostgreSQL extensions migration:**  
**File:** `/mnt/e/Work/Projects/SeaConnect/backend/apps/core/migrations/0001_extensions.py`

```python
from django.db import migrations


class Migration(migrations.Migration):
    """
    Install PostgreSQL extensions required by SeaConnect.
    Must run before any other migration.
    """

    initial = True
    dependencies = []

    operations = [
        migrations.RunSQL(
            sql="""
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
            CREATE EXTENSION IF NOT EXISTS "pgvector";
            CREATE EXTENSION IF NOT EXISTS "pg_trgm";
            CREATE EXTENSION IF NOT EXISTS "unaccent";
            """,
            reverse_sql="""
            DROP EXTENSION IF EXISTS "unaccent";
            DROP EXTENSION IF EXISTS "pg_trgm";
            DROP EXTENSION IF EXISTS "pgvector";
            DROP EXTENSION IF EXISTS "uuid-ossp";
            """,
        )
    ]
```

**Definition of Done:**
- `python manage.py migrate` applies without errors
- `\dx` in psql shows all 4 extensions installed
- No circular migration dependencies

---

## Phase C — Web Scaffold
**Agent:** frontend-react-developer  
**Estimated tokens:** 35,000–45,000  
**Depends on:** Phase A (Dockerfile + docker-compose must exist), can run in parallel with Phase B  
**Blocks:** Phase D  

### Task C-1: Next.js 14 project initialization
**Priority:** P0  
**Directory:** `/mnt/e/Work/Projects/SeaConnect/web/`

```bash
cd /mnt/e/Work/Projects/SeaConnect

# Bootstrap Next.js with the exact options needed
npx create-next-app@14 web \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --no-experimental-app \
  --import-alias "@/*"
```

After bootstrapping, the `web/` directory will contain the standard Next.js 14 structure. Do not remove or reorganize the default structure — modify it in subsequent tasks.

**Definition of Done:**
- `npm run dev` starts on port 3000 without errors
- TypeScript compiles with `npx tsc --noEmit`
- App Router structure exists at `web/src/app/`

---

### Task C-2: next-intl configuration (ar + en, RTL default)
**Priority:** P0  
**Dependencies:** Task C-1 complete

Install:
```bash
cd web/
npm install next-intl
```

**File:** `/mnt/e/Work/Projects/SeaConnect/web/next.config.ts`

```typescript
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "9000" },
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
    ],
  },
};

export default withNextIntl(nextConfig);
```

**File:** `/mnt/e/Work/Projects/SeaConnect/web/src/i18n/request.ts`

```typescript
import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`../messages/${locale}.json`)).default,
}));
```

**File:** `/mnt/e/Work/Projects/SeaConnect/web/src/middleware.ts`

```typescript
import createMiddleware from "next-intl/middleware";

export default createMiddleware({
  locales: ["ar", "en"],
  defaultLocale: "ar",
  localePrefix: "always",
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

**Restructure app directory:**  
Move `web/src/app/page.tsx` and `web/src/app/layout.tsx` to support the locale segment:

```
web/src/app/
├── layout.tsx           ← root layout (no locale here)
├── [locale]/
│   ├── layout.tsx       ← locale-aware layout (sets dir, lang)
│   └── page.tsx         ← home page
```

**File:** `/mnt/e/Work/Projects/SeaConnect/web/src/app/[locale]/layout.tsx`

```typescript
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { Cairo, Amiri } from "next/font/google";
import "../globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

const amiri = Amiri({
  subsets: ["arabic", "latin"],
  variable: "--font-amiri",
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SeaConnect — احجز رحلتك البحرية",
  description: "أكبر منصة لحجز الرحلات البحرية في مصر",
};

const locales = ["ar", "en"] as const;
type Locale = (typeof locales)[number];

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const messages = await getMessages();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} className={`${cairo.variable} ${amiri.variable}`}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

**Definition of Done:**
- `http://localhost:3000/ar` loads (Arabic, RTL)
- `http://localhost:3000/en` loads (English, LTR)
- `http://localhost:3000/` redirects to `/ar` (default locale)
- No TypeScript errors

---

### Task C-3: ar.json and en.json message files
**Priority:** P0  
**File:** `/mnt/e/Work/Projects/SeaConnect/web/src/messages/ar.json`

```json
{
  "common": {
    "loading": "جاري التحميل...",
    "error": "حدث خطأ",
    "retry": "أعد المحاولة",
    "save": "حفظ",
    "cancel": "إلغاء",
    "confirm": "تأكيد",
    "back": "رجوع",
    "next": "التالي",
    "search": "بحث",
    "filter": "تصفية",
    "close": "إغلاق"
  },
  "nav": {
    "home": "الرئيسية",
    "explore": "استكشف",
    "bookings": "حجوزاتي",
    "marketplace": "المتجر",
    "profile": "حسابي",
    "login": "تسجيل الدخول",
    "logout": "تسجيل الخروج",
    "register": "إنشاء حساب"
  },
  "home": {
    "hero_title": "احجز رحلتك البحرية",
    "hero_subtitle": "أكثر من ١٠٠ يخت وقارب في مصر",
    "search_placeholder": "ابحث عن رحلة..."
  },
  "listings": {
    "title": "الرحلات المتاحة",
    "per_hour": "في الساعة",
    "per_day": "في اليوم",
    "book_now": "احجز الآن",
    "capacity": "السعة",
    "persons": "شخص"
  },
  "auth": {
    "phone_label": "رقم الهاتف",
    "phone_placeholder": "01xxxxxxxxx",
    "otp_label": "رمز التحقق",
    "otp_sent": "تم إرسال رمز التحقق",
    "login_title": "تسجيل الدخول",
    "register_title": "إنشاء حساب جديد",
    "name_label": "الاسم الكامل"
  },
  "errors": {
    "network": "لا يمكن الاتصال بالخادم",
    "unauthorized": "يجب تسجيل الدخول",
    "not_found": "الصفحة غير موجودة",
    "server_error": "خطأ في الخادم، حاول مرة أخرى"
  }
}
```

**File:** `/mnt/e/Work/Projects/SeaConnect/web/src/messages/en.json`

```json
{
  "common": {
    "loading": "Loading...",
    "error": "An error occurred",
    "retry": "Try again",
    "save": "Save",
    "cancel": "Cancel",
    "confirm": "Confirm",
    "back": "Back",
    "next": "Next",
    "search": "Search",
    "filter": "Filter",
    "close": "Close"
  },
  "nav": {
    "home": "Home",
    "explore": "Explore",
    "bookings": "My Bookings",
    "marketplace": "Marketplace",
    "profile": "Profile",
    "login": "Log In",
    "logout": "Log Out",
    "register": "Create Account"
  },
  "home": {
    "hero_title": "Book Your Sea Trip",
    "hero_subtitle": "100+ yachts and boats across Egypt",
    "search_placeholder": "Search for a trip..."
  },
  "listings": {
    "title": "Available Trips",
    "per_hour": "per hour",
    "per_day": "per day",
    "book_now": "Book Now",
    "capacity": "Capacity",
    "persons": "persons"
  },
  "auth": {
    "phone_label": "Phone Number",
    "phone_placeholder": "01xxxxxxxxx",
    "otp_label": "Verification Code",
    "otp_sent": "Verification code sent",
    "login_title": "Log In",
    "register_title": "Create Account",
    "name_label": "Full Name"
  },
  "errors": {
    "network": "Cannot connect to server",
    "unauthorized": "Please log in",
    "not_found": "Page not found",
    "server_error": "Server error, please try again"
  }
}
```

**Definition of Done:**
- Both files are valid JSON
- All top-level keys identical in both files (same structure, different values)
- Arabic strings are human-readable, not placeholder text

---

### Task C-4: Tailwind CSS with logical properties + CSS variables from Design
**Priority:** P0  
**Dependencies:** Task C-1 complete, Design/styles.css exists

**File:** `/mnt/e/Work/Projects/SeaConnect/web/tailwind.config.ts`

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // SeaConnect brand palette (from Design/styles.css)
        primary: {
          DEFAULT: "var(--color-primary)",
          foreground: "var(--color-primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
          foreground: "var(--color-secondary-foreground)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          foreground: "var(--color-accent-foreground)",
        },
        background: "var(--color-background)",
        foreground: "var(--color-foreground)",
        muted: {
          DEFAULT: "var(--color-muted)",
          foreground: "var(--color-muted-foreground)",
        },
        card: {
          DEFAULT: "var(--color-card)",
          foreground: "var(--color-card-foreground)",
        },
        border: "var(--color-border)",
        input: "var(--color-input)",
        destructive: {
          DEFAULT: "var(--color-destructive)",
          foreground: "var(--color-destructive-foreground)",
        },
      },
      fontFamily: {
        sans: ["var(--font-cairo)", "Cairo", "system-ui", "sans-serif"],
        serif: ["var(--font-amiri)", "Amiri", "serif"],
      },
      borderRadius: {
        lg: "var(--radius-lg)",
        md: "var(--radius-md)",
        sm: "var(--radius-sm)",
      },
    },
  },
  plugins: [],
};

export default config;
```

**File:** `/mnt/e/Work/Projects/SeaConnect/web/src/app/globals.css`

```css
@import "tailwindcss/base";
@import "tailwindcss/components";
@import "tailwindcss/utilities";

/* ============================================================
   SeaConnect Design Tokens
   Source: Design/styles.css (read that file and copy variables here)
   ============================================================ */

:root {
  /* These variables MUST be populated by reading Design/styles.css
     and copying the exact CSS custom properties defined there.
     The frontend agent MUST read /mnt/e/Work/Projects/SeaConnect/Design/styles.css
     before creating this file. */
  
  /* Placeholder values — replace with actual values from Design/styles.css */
  --color-primary: #0ea5e9;
  --color-primary-foreground: #ffffff;
  --color-secondary: #0f172a;
  --color-secondary-foreground: #ffffff;
  --color-accent: #f59e0b;
  --color-accent-foreground: #000000;
  --color-background: #ffffff;
  --color-foreground: #0f172a;
  --color-muted: #f1f5f9;
  --color-muted-foreground: #64748b;
  --color-card: #ffffff;
  --color-card-foreground: #0f172a;
  --color-border: #e2e8f0;
  --color-input: #e2e8f0;
  --color-destructive: #ef4444;
  --color-destructive-foreground: #ffffff;
  
  --radius-lg: 0.75rem;
  --radius-md: 0.5rem;
  --radius-sm: 0.25rem;
}

/* RTL logical properties — always use logical properties in components */
/* Example: use padding-inline-start instead of padding-left */
/* This ensures layout works correctly in both LTR and RTL */

html[dir="rtl"] {
  font-feature-settings: "kern" 1;
}

body {
  font-family: var(--font-cairo), Cairo, system-ui, sans-serif;
  background-color: var(--color-background);
  color: var(--color-foreground);
}
```

**IMPORTANT:** The frontend agent MUST read `/mnt/e/Work/Projects/SeaConnect/Design/styles.css` and replace the placeholder color values with the actual design token values from that file.

**Definition of Done:**
- `globals.css` imports the Design/styles.css CSS variables (exact values, not placeholders)
- Tailwind config references CSS variables
- Cairo and Amiri fonts loaded from Google Fonts
- RTL layout works on `/ar` route

---

### Task C-5: Minimal home page (scaffold, not feature)
**Priority:** P1  
**File:** `/mnt/e/Work/Projects/SeaConnect/web/src/app/[locale]/page.tsx`

```typescript
import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations("home");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-2xl">
        <h1 className="text-4xl font-bold text-primary mb-4">
          {t("hero_title")}
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          {t("hero_subtitle")}
        </p>
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground border border-border rounded-md px-4 py-2">
          <span>🚢</span>
          <span>Sprint 1 scaffold — feature pages coming in Sprint 2</span>
        </div>
      </div>
    </main>
  );
}
```

**Definition of Done:**
- Page renders without errors
- Uses translations from ar.json / en.json
- Arabic text displays correctly on `/ar`

---

## Phase D — Verification
**Agent:** technical-orchestrator-agent (or the human reviewer)  
**Estimated tokens:** 5,000–10,000  
**Depends on:** Phases A + B + C complete  

### Task D-1: Full stack smoke test
**Priority:** P0

Run the following commands and verify each succeeds:

```bash
cd /mnt/e/Work/Projects/SeaConnect

# 1. Validate docker-compose.yml syntax
docker compose config

# 2. Build all images
docker compose build

# 3. Start the stack
docker compose up -d

# 4. Wait for DB to be healthy
docker compose ps
# Expected: db shows "healthy", all others show "running"

# 5. Run Django migrations
docker compose exec api python manage.py migrate --noinput

# 6. Seed reference data
docker compose exec api python manage.py seed_regions
docker compose exec api python manage.py seed_ports

# 7. Health check
curl -f http://localhost:8000/health/
# Expected: {"status": "ok", "checks": {"database": {"status": "ok", ...}, "cache": {"status": "ok", ...}}}

# 8. Web smoke test
curl -f http://localhost:3000/ar
# Expected: 200 response with HTML containing Arabic text

# 9. Check admin
curl -f http://localhost:8000/admin/
# Expected: 302 redirect to /admin/login/

# 10. Service URL inventory
echo "pgAdmin:    http://localhost:5050   (admin@local.dev / admin)"
echo "MinIO:      http://localhost:9001   (minioadmin / minioadmin)"
echo "Mailpit:    http://localhost:8025"
echo "Ollama:     http://localhost:11434"
```

**Definition of Done:**
- All `curl -f` commands return HTTP 200 (or expected redirects)
- `docker compose ps` shows all 10 services running (not restarting)
- No `ERROR` in `docker compose logs api` output
- No `Error` in `docker compose logs web` output

---

### Task D-2: CI pipeline smoke test
**Priority:** P1

```bash
# Create a test branch and verify CI runs
git checkout -b feature/TASK-1-001-sprint1-scaffold
git add .
git commit -m "chore(scaffold): Sprint 1 — project scaffolding and infrastructure"
git push origin feature/TASK-1-001-sprint1-scaffold

# Then open a PR to develop
# Expected: CI pipeline triggers and all jobs pass
```

**Definition of Done:**
- PR triggers the `ci.yml` workflow
- `backend` job passes (ruff, mypy, pytest)
- `web` job passes (tsc, eslint, build)
- No red jobs on the PR

---

### Task D-3: Update HANDOFFS.md and AGENT-COSTS.md
**Priority:** P1  
**Agent:** The last agent to complete work (or technical-orchestrator)

After Phase D passes, append to `HANDOFFS.md`:

```markdown
## HANDOFF-2026-04-27-001

**Status:** READY  
**From:** devops-infrastructure-specialist + backend-api-developer + frontend-react-developer  
**To:** backend-api-developer  
**Sprint:** 1 → 2  
**Feature:** Sprint 2 — Authentication & User Registration

### What Was Completed
- Full Docker Compose stack running (10 services)
- Django project with 12 apps, TimeStampedModel, Region/Port/FeatureFlag models
- JWT RS256 auth configured, health check endpoint live
- Next.js 14 with next-intl (ar/en), RTL default, design tokens imported
- CI/CD pipelines for PR validation and UAT deploy

### Contract
- Backend API spec: 03-Technical-Product/02-API-Specification.md § Authentication
- DB schema: 03-Technical-Product/04-Database-Schema.md § accounts

### How to Test
```bash
curl http://localhost:8000/health/
# → {"status": "ok"}

curl http://localhost:3000/ar
# → 200, Arabic RTL page
```

### Next Sprint Reads
- Sprint 2 will add: OTP auth, user registration, JWT token endpoints
- User model is in apps/accounts/models.py — extend it, do not replace it
```

Update `AGENT-COSTS.md` Sprint 1 row with actual token counts after work completes.

---

## Sprint 1 Task Summary

| ID | Task | Phase | Agent | Tokens (est) | Priority | Depends On |
|----|------|-------|-------|-------------|----------|------------|
| A-1 | docker-compose.yml | A | devops | 3,000 | P0 | — |
| A-2 | .env.dev template | A | devops | 1,000 | P0 | — |
| A-3 | .env.uat template | A | devops | 1,000 | P1 | A-2 |
| A-4 | backend/Dockerfile | A | devops | 500 | P0 | — |
| A-5 | web/Dockerfile | A | devops | 500 | P0 | — |
| A-6 | .github/workflows/ci.yml | A | devops | 4,000 | P1 | A-4, A-5 |
| A-7 | deploy-uat-api.yml | A | devops | 2,000 | P1 | A-9 |
| A-8 | deploy-uat-web.yml | A | devops | 2,000 | P1 | — |
| A-9 | render.yaml | A | devops | 2,000 | P1 | — |
| A-10 | .gitignore | A | devops | 500 | P0 | — |
| B-1 | Django project init | B | backend | 3,000 | P0 | A-1, A-2 |
| B-2 | requirements/*.txt | B | backend | 1,500 | P0 | B-1 |
| B-3 | Settings split | B | backend | 5,000 | P0 | B-1, B-2 |
| B-4 | Pagination + errors | B | backend | 3,000 | P0 | B-3 |
| B-5 | TimeStampedModel | B | backend | 1,500 | P0 | B-3 |
| B-6 | Region model + seed | B | backend | 3,000 | P0 | B-5 |
| B-7 | DeparturePort + seed | B | backend | 3,000 | P0 | B-6 |
| B-8 | FeatureFlag model | B | backend | 2,000 | P1 | B-5 |
| B-9 | Custom User model | B | backend | 4,000 | P0 | B-5 |
| B-10 | JWT auth configured | B | backend | 3,000 | P0 | B-3, B-9 |
| B-11 | Health check endpoint | B | backend | 2,500 | P0 | B-3 |
| B-12 | mypy config | B | backend | 1,500 | P1 | B-2 |
| B-13 | pytest config | B | backend | 2,000 | P1 | B-2 |
| B-14 | Initial migrations | B | backend | 2,000 | P0 | B-5 to B-9 |
| C-1 | Next.js init | C | frontend | 3,000 | P0 | A-5 |
| C-2 | next-intl (ar+en RTL) | C | frontend | 5,000 | P0 | C-1 |
| C-3 | ar.json + en.json | C | frontend | 2,000 | P0 | C-2 |
| C-4 | Tailwind + CSS vars | C | frontend | 4,000 | P0 | C-1 |
| C-5 | Scaffold home page | C | frontend | 2,000 | P1 | C-2, C-3 |
| D-1 | Full stack smoke test | D | orchestrator | 3,000 | P0 | A+B+C done |
| D-2 | CI pipeline test | D | orchestrator | 2,000 | P1 | D-1 |
| D-3 | Update HANDOFFS + COSTS | D | orchestrator | 1,000 | P1 | D-1 |

**Estimated total tokens:** 75,000–90,000  
**Estimated wall-clock time:** 3–5 hours of agent execution  

---

## Execution Order (Dependency Graph)

```
Phase A (parallel, no dependencies):
  A-10 → A-1 → A-4 → A-6
                A-5 → A-8
         A-2 → A-3
         A-9 → A-7

Phase B (sequential, starts after A-1 + A-2):
  B-1 → B-2 → B-3 → B-4
                    B-5 → B-6 → B-7
                          B-8
                          B-9 → B-10
                    B-11
                    B-12
                    B-13
              B-14 (after B-5 through B-9)

Phase C (parallel with Phase B, starts after A-5):
  C-1 → C-2 → C-3 → C-5
         C-4 → C-5

Phase D (after all phases complete):
  D-1 → D-2 → D-3
```

---

## Blockers & Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Docker Desktop not running on Windows WSL | Medium | Ensure Docker Desktop is running with WSL2 backend enabled |
| pgvector image pull slow | Low | Pre-pull with `docker pull pgvector/pgvector:pg16` |
| Ollama image is large (~5GB) | High | Ollama starts last; don't block sprint completion on it |
| next-intl v3 API differs from v2 | Low | Use `next-intl@latest` — Task C-2 uses v3 API |
| RSA key gen fails on Windows | Low | Use WSL2 for `openssl` commands |
| GitHub Actions free minutes | Low | Repo is private — use 2000 free minutes/month |

---

## Definition of Done — Sprint 1 Complete

All of the following must be true before Sprint 1 is considered complete:

```
[ ] docker compose up --build starts all 10 services without errors
[ ] docker compose ps shows all services "running" (db shows "healthy")
[ ] GET http://localhost:8000/health/ → {"status": "ok"}
[ ] GET http://localhost:3000/ar → 200, Arabic RTL page with Cairo font
[ ] GET http://localhost:3000/en → 200, English LTR page
[ ] python manage.py seed_regions → Egypt active, UAE/KSA inactive
[ ] python manage.py seed_ports → 7 Egyptian ports seeded
[ ] python manage.py migrate → all migrations applied, 4 PG extensions installed
[ ] mypy apps/ config/ --strict → 0 errors (or documented exceptions only)
[ ] pytest tests/ → runs, no configuration errors (tests may be empty)
[ ] CI pipeline (ci.yml) runs green on a test PR
[ ] render.yaml exists and passes YAML validation
[ ] HANDOFFS.md exists with Sprint 1 → Sprint 2 handoff entry
[ ] AGENT-COSTS.md exists with Sprint 1 token budget row
[ ] .gitignore prevents committing *.pem, .env.prod, .env.dev.local
```
