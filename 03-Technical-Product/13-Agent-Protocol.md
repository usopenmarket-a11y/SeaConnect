# AI Agent Protocol — SeaConnect
**Version:** 1.0  
**Date:** April 8, 2026  
**Status:** Active — All AI agents operating on this codebase must follow this protocol

---

## Purpose

SeaConnect is primarily developed by AI coding agents (Claude Code) with human oversight. This document defines the rules, formats, and guardrails that govern how agents operate, hand off work, resolve conflicts, stay within budget, and produce validated output.

**This document is mandatory reading for every agent session.** It exists because agents start cold — they have no memory of prior sessions — and need explicit rules to produce consistent, safe, mergeable code.

---

## 1. Agent Types & Responsibilities

| Agent | Primary Role | Activates When |
|-------|-------------|---------------|
| `backend-api-developer` | Django models, DRF serializers, views, Celery tasks | New API module, model change, endpoint spec |
| `frontend-react-developer` | Next.js pages, components, Tailwind styling | New web screen, UI component, admin page |
| `mobile-app-developer` | Flutter screens, widgets, state management | New Flutter screen, widget, navigation |
| `database-architect` | Schema design, migrations, indexes, query optimization | New table, schema change, performance issue |
| `security-specialist` | Auth, permissions, encryption, OWASP audit | Auth feature, payment handling, PII data |
| `devops-infrastructure-specialist` | Docker, CI/CD, Railway/Fly.io config, monitoring | Infrastructure change, deployment issue |
| `qa-automation-specialist` | pytest, Flutter tests, Playwright E2E, load tests | Before any merge to main |
| `integration-specialist` | Fawry, Twilio, SendGrid, Open-Meteo integrations | Third-party API work |
| `ui-ux-design-specialist` | Component design, RTL rules, accessibility | New screen design, RTL audit |
| `technical-orchestrator` | Cross-agent coordination, architecture review | Multi-agent sprint, conflicting implementations |

---

## 2. Mandatory Pre-Session Checklist

**Every agent must complete this before writing any code:**

```
[ ] Read 03-Technical-Product/10-ADR-Log.md (all 20 ADRs)
[ ] Read 03-Technical-Product/11-Expansion-Architecture.md (Sprint 1 checklist)
[ ] Read HANDOFFS.md in repo root (pending handoffs for this session)
[ ] Read relevant module spec in 03-Technical-Product/02-API-Specification.md
[ ] Check 03-Technical-Product/04-Database-Schema.md for affected tables
[ ] Verify AGENT-COSTS.md — check remaining daily token budget
```

If any of these files do not yet exist, create them using the templates in this document before proceeding.

---

## 3. Handoff Protocol

### 3.1 HANDOFFS.md Format

When an agent completes work that another agent depends on, it appends to `HANDOFFS.md` in the repo root:

```markdown
## HANDOFF-{YYYY-MM-DD}-{seq}

**Status:** READY | IN_PROGRESS | BLOCKED | DONE  
**From:** {agent-type}  
**To:** {agent-type}  
**Sprint:** {sprint-number}  
**Feature:** {feature name}

### What Was Completed
{1–3 bullet points of what was built}

### Contract
{Link to the API spec, ADR, or schema section this implements}

### How to Test
```
{command or curl to verify the completed work}
```

### Response/Output Shape
```json
{example response}
```

### Known Limitations
{Any known issues, edge cases not yet handled, or deferred work}

### Ready For
{Exactly what the receiving agent should do next}
```

### 3.2 Handoff Example — Backend to Frontend

```markdown
## HANDOFF-2026-04-15-001

**Status:** READY  
**From:** backend-api-developer  
**To:** mobile-app-developer  
**Sprint:** 3  
**Feature:** Weather Advisory

### What Was Completed
- GET /api/v1/weather/ endpoint live on staging
- GET /api/v1/weather/ports/ returns all 12 Egyptian ports
- Redis cache (6h TTL) implemented

### Contract
03-Technical-Product/02-API-Specification.md — Module 11: Weather

### How to Test
```
curl https://staging-api.seaconnect.eg/api/v1/weather/?port=hurghada&date=2026-04-15 \
  -H "Authorization: Bearer {token}"
```

### Response/Output Shape
```json
{
  "port": "hurghada",
  "date": "2026-04-15",
  "advisory": "good",
  "advisory_ar": "ممتاز للإبحار",
  "wave_height_m": 0.8,
  "wind_speed_kmh": 18,
  "weathercode": 1,
  "cached_at": "2026-04-15T06:00:00Z"
}
```

### Known Limitations
- Cache miss on first call takes ~800ms (Open-Meteo API latency)
- Tides not yet implemented (Phase 2)

### Ready For
Build the WeatherCard widget on the YachtDetail screen per 07-UX-Flows.md
```

### 3.3 HANDOFFS.md Lifecycle

- Append only — never delete entries
- Change `Status` from READY → IN_PROGRESS when starting work
- Change `Status` to DONE when fully integrated and tested
- Review all READY handoffs at the start of each session

---

## 4. Code Standards — Agent Rules

### 4.1 Universal Rules (All Agents)

```
NEVER:
  - Introduce raw SQL (use Django ORM — ADR-001)
  - Hardcode currency as 'EGP' (use region.currency — ADR-018)
  - Store JWT in localStorage (ADR-009)
  - Use EdgeInsets with left/right values in Flutter (ADR-014)
  - Hardcode strings in Flutter widgets or Next.js JSX (ADR-015)
  - Call Fawry/payment APIs directly (use PaymentProvider — ADR-007)
  - Import between Django apps directly (use signals or services layer — ADR-006)
  - Use offset pagination (use CursorPagination — ADR-013)
  - Cache without explicit TTL (ADR-005)
  - Write a test that mocks the database for integration tests

ALWAYS:
  - Write the Arabic string first, then English (ADR-014)
  - Add event tracking with every new user-facing feature (12-Data-Strategy.md)
  - Make Celery tasks idempotent (ADR-011)
  - Wrap booking state changes in transaction.atomic() + booking_events insert (ADR-012)
  - Use EdgeInsetsDirectional in Flutter (ADR-014)
  - Add a Region FK or currency field to any location-specific model (ADR-018)
  - Store dates as UTC in the database (ADR-018)
  - Use NUMERIC(12,2) for monetary amounts (12-Data-Strategy.md)
```

### 4.2 Backend Agent Rules

```python
# File naming
apps/
  accounts/       # user management, auth, KYC
  bookings/       # booking lifecycle, availability
  marketplace/    # vendors, products, orders
  competitions/   # fishing events
  weather/        # weather advisory, fishing seasons
  payments/       # payment providers, payouts
  notifications/  # FCM, email, SMS
  analytics/      # event tracking, reporting
  core/           # region, config, shared utilities

# Model rules
- All models inherit from TimeStampedModel (created_at, updated_at auto-managed)
- All PKs are UUID (not auto-increment integer)
- All monetary fields: DecimalField(max_digits=12, decimal_places=2)
- All currency fields: CharField(max_length=3)  # ISO 4217
- Soft delete pattern: is_active=False, deleted_at=DateTimeField(null=True)

# API rules
- All endpoints versioned: /api/v1/
- All responses: {'results': [...], 'next_cursor': '...', 'has_more': bool}
- Error format: {'error': {'code': 'ERR_CODE', 'message': 'Human readable', 'field': 'field_name'}}
- HTTP status codes: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Unprocessable, 429 Too Many Requests

# Test rules
- Every new endpoint: minimum 1 happy path test + 1 auth test + 1 validation test
- Use pytest-django with real PostgreSQL (no mocking the DB)
- Fixtures in conftest.py only
- Factory pattern for test data (factory_boy)
```

### 4.3 Flutter Agent Rules

```dart
// File structure
lib/
  core/
    theme/          // SeaConnect theme, text styles
    l10n/           // app_ar.arb, app_en.arb
    router/         // GoRouter configuration
    di/             // dependency injection (Riverpod)
  features/
    auth/
    explore/
    bookings/
    marketplace/
    competitions/
    weather/
    profile/
  shared/
    widgets/        // reusable components
    models/         // data models
    services/       // API client

// Widget rules
- All widgets StatelessWidget unless state is required
- State management: Riverpod (no setState except for local ephemeral state)
- Navigation: GoRouter only (no Navigator.push)
- String access: AppLocalizations.of(context)!.key — never hardcoded
- Spacing: EdgeInsetsDirectional.only(start: 16, end: 16) — never left/right
- Colors: Theme.of(context).colorScheme.* — never Color(0xFF...)
- Images: CachedNetworkImage for all remote images
- Loading: Shimmer skeleton — never CircularProgressIndicator in list views
- Error: Retry button + Arabic error message — never silent failures

// Naming conventions
- Screens: BookingDetailScreen
- Widgets: BookingStatusChip
- Providers: bookingDetailProvider
- Services: BookingService
- Models: BookingDetail
```

### 4.4 Next.js Agent Rules

```typescript
// File structure
app/
  (public)/         // public pages (SSR for SEO)
    page.tsx         // home
    yacht/[slug]/    // listing detail
    explore/         // search results
  (auth)/            // authenticated pages (client components OK)
    dashboard/
    bookings/
    profile/
  (admin)/           // admin portal
    listings/
    users/
    analytics/

// Component rules
- Public listing pages: Server Components (SEO requirement — ADR-003)
- Admin pages: Client Components OK
- Strings: use next-intl t('key') — never hardcoded
- Styling: Tailwind with logical properties (ms-, me-, ps-, pe-)
- Direction: set dir={locale === 'ar' ? 'rtl' : 'ltr'} at layout level
- API calls: server-side via fetch() in Server Components, SWR in Client Components
- Types: shared TypeScript types with backend via openapi-typescript codegen
```

---

## 5. Conflict Resolution Protocol

When two agents produce conflicting implementations:

### Priority Order (highest wins)

1. **API Specification** (`02-API-Specification.md`) — if one implementation matches spec and the other doesn't, spec-compliant wins
2. **ADR Log** (`10-ADR-Log.md`) — if one implementation follows an ADR and the other doesn't, ADR-compliant wins
3. **Test coverage** — if both match spec and ADRs, the implementation with higher test coverage wins
4. **Recency** — if everything else is equal, the more recent implementation wins

### Escalation

If agents cannot determine which implementation wins by the above rules:
1. Write a comment in `HANDOFFS.md` flagging the conflict
2. Tag it `Status: BLOCKED`
3. Human makes the decision and updates the ADR log if it represents a new architectural decision

---

## 6. Validation Gates

All agent-generated code must pass these gates before being considered complete.

### Gate 1 — Syntax & Type Safety (automated)

```bash
# Backend
cd backend && python -m pytest --collect-only  # ensure tests discoverable
cd backend && python manage.py check           # Django system check
cd backend && mypy apps/                       # type checking (strict mode)

# Flutter
flutter analyze                                # Dart static analysis
flutter test                                   # unit tests

# Next.js
npx tsc --noEmit                              # TypeScript check
npx eslint . --ext .ts,.tsx                   # linting
```

### Gate 2 — Tests (automated via CI)

```bash
# Backend — must achieve >80% coverage on new code
cd backend && pytest --cov=apps --cov-report=term-missing

# Flutter — all widget tests pass
flutter test --coverage

# Next.js — all component tests pass
npm test
```

### Gate 3 — Security Scan (automated via CI)

```bash
# Backend
bandit -r apps/ -ll                            # Python security scan

# Dependencies
pip-audit                                      # Python vulnerability check
npm audit --audit-level=high                   # JS vulnerability check

# Secrets scan
git secrets --scan                             # no credentials committed
```

### Gate 4 — ADR Compliance Check (manual, per PR)

Before merging, the agent or reviewer checks:

```
[ ] No raw SQL in new code
[ ] No hardcoded currency strings
[ ] No hardcoded UI strings (all via l10n)
[ ] No left/right directional values in Flutter
[ ] No direct payment API calls outside payments/providers/
[ ] All new models have UUID PK and TimeStampedModel
[ ] All monetary fields are NUMERIC/Decimal, not float
[ ] New user-facing feature has event tracking calls
[ ] Celery tasks have max_retries=3 and are idempotent
```

### Gate 5 — RTL Audit (manual, for UI changes)

```
[ ] All new Flutter widgets tested in RTL mode (device set to Arabic)
[ ] All new Next.js pages tested with dir="rtl"
[ ] No visual overlap or truncation in Arabic text
[ ] Numbers formatted with intl package (not hardcoded)
[ ] Date displayed in Arabic calendar format when locale=ar
```

---

## 7. Cost Budget & Tracking

### 7.1 Daily Token Budget

| Agent | Max Tokens/Day | Max Sessions/Day |
|-------|---------------|-----------------|
| backend-api-developer | 400K | 4 |
| mobile-app-developer | 400K | 4 |
| frontend-react-developer | 300K | 3 |
| database-architect | 200K | 2 |
| qa-automation-specialist | 200K | 2 |
| security-specialist | 150K | 2 |
| All other agents | 100K each | 1 each |
| **Daily total cap** | **~2M tokens** | — |

### 7.2 AGENT-COSTS.md Format

Create `AGENT-COSTS.md` in repo root. Update weekly:

```markdown
# Agent Cost Log

## Week of {date}

| Date | Agent | Task | Tokens Used | Cost (USD) |
|------|-------|------|-------------|-----------|
| 2026-04-15 | backend-api-developer | Booking endpoints | 180K | $0.54 |
| 2026-04-15 | mobile-app-developer | Booking screens | 220K | $0.66 |

**Week Total:** {X} tokens / ${Y}
**Month-to-date:** {X} tokens / ${Y}
**Budget remaining:** ${Z}
```

### 7.3 Cost Optimization Rules

- **Batch related tasks** into a single agent session (reduces cold-start overhead)
- **Pre-read relevant docs** at session start (cheaper than re-reading mid-session)
- **Use haiku model** for boilerplate code generation (80% cheaper, fine for CRUD)
- **Use sonnet model** for architectural decisions and complex logic
- **Use opus model** only for security review and ADR-level decisions
- Set `ANTHROPIC_MAX_TOKENS=4096` for simple tasks, `8192` for complex features

---

## 8. Sprint Workflow

### 8.1 Sprint Start Protocol

At the beginning of each sprint:

1. Human defines sprint goal and acceptance criteria
2. `technical-orchestrator` agent breaks goal into tasks and writes to `SPRINT-{N}.md`
3. Tasks assigned to specific agent types
4. `HANDOFFS.md` initialized for the sprint
5. `AGENT-COSTS.md` updated with sprint budget allocation

### 8.2 Sprint Task Format

```markdown
# Sprint {N} — {Sprint Goal}
**Start:** {date}  
**End:** {date}  
**Budget:** {token estimate}

## Tasks

### TASK-{N}-001 — {Task Name}
**Agent:** {agent-type}  
**Depends on:** TASK-{N}-00X (or "none")  
**Status:** TODO | IN_PROGRESS | DONE | BLOCKED  
**Acceptance Criteria:**
- [ ] {criterion 1}
- [ ] {criterion 2}
- [ ] Tests pass
- [ ] Gates 1–4 pass

**Output:** {file(s) to be created or modified}
```

### 8.3 Sprint End Protocol

1. All tasks marked DONE
2. All HANDOFFS marked DONE
3. QA agent runs full test suite
4. Security agent reviews any new auth/payment code
5. Human reviews and approves merge to main
6. `AGENT-COSTS.md` updated with actual vs. estimated tokens
7. Retrospective note appended to `SPRINT-{N}.md`

---

## 9. Sensitive Data Rules

Agents **must never**:
- Write real API keys, passwords, or credentials in code or comments
- Log PII (phone numbers, emails, national IDs) to application logs
- Print payment amounts or card details to logs
- Commit `.env` files or any file containing secrets
- Store session tokens in plaintext anywhere

All secrets go in environment variables. Local development uses `.env.example` with placeholder values. The `.env` file is in `.gitignore` always.

```python
# WRONG
FAWRY_MERCHANT_CODE = "12345678"  # ← never hardcode

# RIGHT
FAWRY_MERCHANT_CODE = env('FAWRY_MERCHANT_CODE')
```

---

## 10. Emergency Protocols

### 10.1 If an Agent Produces Breaking Code

1. Do NOT push to main
2. File a BLOCKED handoff in `HANDOFFS.md` describing what broke
3. human reviews the conflict
4. If production is affected: revert to last known-good commit immediately, fix in a branch

### 10.2 If a Security Vulnerability Is Found

1. Stop all related work immediately
2. Do NOT document the vulnerability in any public file or commit message
3. Notify the human directly
4. Human decides disclosure timeline
5. Fix in a private branch, review by security-specialist agent before merge

### 10.3 If Budget Is Exceeded

1. Stop new sessions for that agent type for the day
2. Log overage in `AGENT-COSTS.md`
3. Review what caused the excess (complex task? Re-reading docs too often?)
4. Adjust task scoping for next session

---

## 11. Files Agents Must Maintain

| File | Location | Agent Responsible | Update Frequency |
|------|----------|------------------|-----------------|
| `HANDOFFS.md` | repo root | Completing agent | Per task |
| `AGENT-COSTS.md` | repo root | Any agent | Weekly |
| `SPRINT-{N}.md` | repo root | technical-orchestrator | Per sprint |
| `10-ADR-Log.md` | 03-Technical-Product/ | technical-orchestrator | When new ADR needed |
| `CLAUDE.md` | repo root | technical-orchestrator | When agent rules change |

---

## 12. CLAUDE.md Template

Create `CLAUDE.md` in the repo root before Sprint 1. This file is automatically read by Claude Code at the start of every session.

```markdown
# CLAUDE.md — SeaConnect Agent Instructions

## Mandatory First Steps
1. Read 03-Technical-Product/10-ADR-Log.md (all ADRs)
2. Read 03-Technical-Product/13-Agent-Protocol.md (this protocol)
3. Read HANDOFFS.md (pending handoffs)
4. Check AGENT-COSTS.md (today's budget remaining)

## Never Do
- Raw SQL
- Hardcode currency (use region.currency)
- Hardcode strings (use l10n keys)
- EdgeInsets with left/right in Flutter
- Direct Fawry/payment SDK calls (use PaymentProvider)
- Import between Django apps directly
- Offset pagination
- Cache without TTL
- Commit .env or any secrets

## Always Do
- Arabic string first, then English
- UUID PKs on all models
- NUMERIC(12,2) for money
- UTC for all DB timestamps
- Event tracking on every new user action
- idempotent Celery tasks
- transaction.atomic() + booking_events on booking state change

## Key Contacts for Escalation
- Architecture: Human review required for new ADRs
- Security: Human review required for auth/payment changes
- Budget: Stop session if daily limit reached
```
