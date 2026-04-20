# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Status

SeaConnect is a three-sided maritime marketplace (boat owners, customers, vendors) targeting Egypt-first with MENA expansion. **Currently pre-development — all content in this repo is planning documentation and a design prototype. No production code exists yet.**

**Strategy:** Web-first (Next.js). Flutter mobile is deferred to Year 2+.

---

## Mandatory Pre-Session Reads

Before writing any code, read these files in order:

1. `03-Technical-Product/10-ADR-Log.md` — 20 binding architecture decisions. Never violate an Accepted ADR without explicit human approval.
2. `HANDOFFS.md` (repo root, created in Sprint 1) — pending work from previous agent sessions.
3. `03-Technical-Product/02-API-Specification.md` — authoritative request/response contracts.
4. `03-Technical-Product/04-Database-Schema.md` — existing table definitions and migration order.
5. `AGENT-COSTS.md` (repo root, created in Sprint 1) — daily token budget remaining.

---

## Planned Repository Structure

Code does not exist yet. When created, it will follow this layout:

```
backend/          # Django 5.x + DRF 3.15 (Python 3.12)
  apps/
    accounts/     # auth, users, KYC, JWT
    bookings/     # booking lifecycle, state machine
    marketplace/  # vendors, products, orders
    competitions/ # fishing events
    weather/      # Open-Meteo advisory, fishing seasons
    payments/     # PaymentProvider abstraction, Fawry, webhooks
    notifications/# FCM push, email, SMS
    analytics/    # event sourcing, Mixpanel, reporting
    core/         # Region model, config, shared base classes, health check
  seaconnect/     # Django project settings

web/              # Next.js 14 (TypeScript, App Router) — customer web app
  app/
    (public)/     # Server Components — SSR for SEO
    (auth)/       # Client Components — dashboard, bookings, profile
  messages/       # ar.json, en.json (next-intl)

admin/            # Next.js 14 — internal operations portal (admin role only)

Design/           # Existing HTML/JSX prototype — source of truth for UI design
  SeaConnect.html # Runnable prototype with all 10 screens
  styles.css      # Complete design system (oklch colors, Cairo+Amiri fonts)
  *.jsx           # Screen components (home, detail, booking, dashboards, etc.)
```

---

## Development Environment

Full local stack via Docker Compose — single command:

```bash
docker compose up --build
```

| Service | URL | Credentials |
|---------|-----|-------------|
| Django API | http://localhost:8000 | — |
| Next.js Web | http://localhost:3000 | — |
| Next.js Admin | http://localhost:3001 | — |
| pgAdmin | http://localhost:5050 | admin@local.dev / admin |
| MinIO Console | http://localhost:9001 | minioadmin / minioadmin |
| Mailpit (email catcher) | http://localhost:8025 | — |
| Ollama (local AI) | http://localhost:11434 | — |

Pull Ollama models on first run:
```bash
docker compose exec ollama ollama pull nomic-embed-text
docker compose exec ollama ollama pull llama3.2
```

---

## Common Commands

### Backend (Django)
```bash
cd backend
python manage.py runserver                        # dev server (outside Docker)
python manage.py makemigrations                   # generate migrations
python manage.py migrate                          # apply migrations
python manage.py check                            # Django system check
mypy apps/                                        # type check (strict)
pytest                                            # all tests
pytest apps/bookings/tests/ -v                    # single module tests
pytest -k "test_booking_create" -v               # single test by name
celery -A seaconnect worker -l info              # Celery worker
celery -A seaconnect beat -l info                # Celery beat scheduler
```

### Next.js (web / admin)
```bash
cd web   # or cd admin
npm run dev                                       # dev server
npm run build                                     # production build
npx tsc --noEmit                                  # TypeScript check
npx eslint . --ext .ts,.tsx                       # lint
```

### CI Validation Gates (run before any PR)
```bash
# Gate 1 — backend
cd backend && python manage.py check
cd backend && mypy apps/
cd backend && pytest --collect-only

# Gate 1 — web
cd web && npx tsc --noEmit
cd web && npx eslint . --ext .ts,.tsx
```

---

## Architecture Decisions (binding — never violate without ADR update)

All 20 ADRs are in `03-Technical-Product/10-ADR-Log.md`. Key ones:

| Rule | ADR |
|------|-----|
| No raw SQL — ORM only | ADR-001 |
| All PKs are UUID | ADR-001 |
| `PaymentProvider` abstract class — never call Fawry/Telr/Stripe directly | ADR-007 |
| JWT RS256: 15min access / 30day refresh tokens, never in localStorage | ADR-009 |
| Event sourcing for booking state — append-only `booking_events` table | ADR-012 |
| `CursorPagination` on all list endpoints — never offset pagination | ADR-013 |
| Arabic-first RTL — `EdgeInsetsDirectional` in Flutter, logical CSS in Next.js | ADR-014 |
| All UI strings via i18n keys — never hardcode Arabic or English in components | ADR-015 |
| `Region` FK on every location-specific model — currency never hardcoded as `'EGP'` | ADR-018 |
| pgvector for semantic search (768 dims Ollama dev / 1536 dims OpenAI UAT) | ADR-019 |

---

## Code Standards

### All agents — universal never/always

```
NEVER:
  - Raw SQL (use Django ORM)
  - Hardcode currency string 'EGP' — use region.currency
  - Store JWT in localStorage
  - Use EdgeInsets.only(left:, right:) in Flutter — use EdgeInsetsDirectional
  - Hardcode strings in Flutter widgets or JSX
  - Call payment SDKs directly — use PaymentProvider interface
  - Import directly between Django apps — use signals or service layer
  - Use offset pagination — use CursorPagination
  - Cache without explicit TTL
  - Mock the database in integration tests

ALWAYS:
  - Write Arabic string first, then English
  - UUID PKs on all models
  - NUMERIC(12,2) / DecimalField(max_digits=12, decimal_places=2) for money
  - UTC for all DB timestamps
  - Wrap booking state changes in transaction.atomic() + booking_events insert
  - Make Celery tasks idempotent (check state before acting)
  - Add Region FK or currency field to location-specific models
```

### Django model template
```python
import uuid
from django.db import models
from core.models import TimeStampedModel  # provides created_at, updated_at

class MyModel(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # monetary fields:
    price = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3)  # ISO 4217

    class Meta:
        db_table = 'app_modelname'
        ordering = ['-created_at']
```

### API response shapes
```python
# List endpoints
{'results': [...], 'next_cursor': '...', 'has_more': bool}

# Error format
{'error': {'code': 'ERR_CODE', 'message': 'Human readable', 'field': 'field_name'}}
```

### Django app structure
```
apps/{module}/
  models.py
  serializers.py     # read serializer + write serializer (separate if shapes differ)
  views.py           # ViewSet or APIView
  urls.py            # registered under /api/v1/
  permissions.py     # role-based permission classes
  services.py        # business logic (not in views)
  tasks.py           # Celery tasks
  tests/
    test_{module}.py
```

### Next.js rules
- Public listing pages: **Server Components** (SSR required for SEO — ADR-003)
- Admin/dashboard pages: Client Components OK
- Strings: `t('key')` via next-intl — never hardcoded
- Tailwind: use logical utilities — `ms-` `me-` `ps-` `pe-` not `ml-` `mr-` `pl-` `pr-`
- Direction: set `dir={locale === 'ar' ? 'rtl' : 'ltr'}` at layout level
- API calls: `fetch()` in Server Components, SWR in Client Components

### Payment provider pattern
```python
# Currency → provider resolved at runtime, never hardcoded:
PROVIDER_REGISTRY = {'EGP': FawryProvider, 'AED': TelrProvider, 'EUR': StripeProvider}
provider = PROVIDER_REGISTRY[currency]()
```

### Celery task template
```python
@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def my_task(self, record_id: str) -> None:
    obj = MyModel.objects.get(id=record_id)
    if obj.status != 'expected_state':
        return  # idempotency guard
    # ... do work ...
```

---

## Database Migration Rules (zero-downtime)

| Operation | Safe? | Required approach |
|-----------|-------|-------------------|
| Add nullable column | ✅ | Direct |
| Add index | ❌ | `CREATE INDEX CONCURRENTLY` via `RunSQL`, set `atomic = False` |
| Add NOT NULL column | ❌ | Add nullable → backfill → add constraint (3 separate migrations) |
| Drop column | ❌ | Deprecate in code first, drop in next release |

---

## Git & Commit Rules

Branch naming: `feature/TASK-N-short-name`, `fix/TASK-N-description`, `hotfix/PROD-description`

All commits follow Conventional Commits:
```
feat(bookings): add owner decline reason field
fix(payments): handle Fawry timeout on webhook retry
test(marketplace): add cart checkout integration tests
```

Types: `feat` | `fix` | `chore` | `test` | `docs` | `refactor` | `perf` | `ci`

Branch protection: no direct push to `main` or `develop`. All merges via PR.

---

## Design System Reference

The visual design lives in `Design/` as a runnable prototype. Open `Design/SeaConnect.html` in a browser to see all 10 screens with role-switcher (customer / owner / admin).

Key design tokens (from `Design/styles.css`):
```css
--ink: oklch(0.20 0.045 235)      /* primary text */
--sea: oklch(0.38 0.08 220)       /* brand primary */
--pearl: oklch(0.97 0.008 210)    /* page background */
--sand: oklch(0.955 0.015 85)     /* card background */
--ff-display: 'Amiri', serif      /* Arabic headings */
--ff-sans: 'Cairo', sans-serif    /* body text */
--ff-mono: 'Geist Mono', monospace /* numbers */
```

When converting `Design/*.jsx` to Next.js, preserve the visual design exactly — replace mock data with API fetches, inline styles with CSS Modules using the same variable names, and hardcoded strings with `t()` calls.

---

## Agent Coordination

- `HANDOFFS.md` (repo root) — append-only log of cross-agent work. Read at session start. Update status: READY → IN_PROGRESS → DONE.
- `AGENT-COSTS.md` (repo root) — track token usage per sprint.
- `SPRINT-{N}.md` (repo root) — current sprint tasks and agent assignments.
- Conflict resolution priority: API Spec → ADR Log → test coverage → recency.
- Escalate unresolvable conflicts to `technical-orchestrator-agent`.

---

## Environments

| | Dev | UAT |
|---|---|---|
| API | localhost:8000 | seaconnect-uat-api.onrender.com |
| Web | localhost:3000 | seaconnect-uat.vercel.app |
| DB | PostgreSQL Docker | Supabase Free |
| Storage | MinIO Docker | Cloudflare R2 Free |
| Email | Mailpit Docker | Brevo Free (300/day) |
| AI | Ollama local | OpenAI $5 credits |
| Cost | $0 | $0 |

UAT deploys automatically on merge to `develop`. Production is planned but not active.
