# AI Agent Startup Guide — SeaConnect
**Version:** 1.0  
**Date:** April 14, 2026  
**Audience:** Anyone starting or managing AI agent work on this project — technical or non-technical  
**Status:** Active — Read this before doing anything

---

## What This Guide Is

This guide tells you exactly how to start, run, and manage AI agents on SeaConnect — whether you're a developer typing prompts in a terminal, or a non-technical founder directing the project from a high level.

SeaConnect is built primarily by AI agents (Claude Code). You are the **decision maker and reviewer**. The agents are the **builders**. This guide explains how to make that partnership work.

---

## Part 1: The Big Picture (Non-Technical)

### What an "AI Agent" Actually Is

An AI agent is Claude Code — an AI you talk to in plain language that can read files, write code, run commands, and build software. You describe what you want; it builds it.

Think of each agent as a specialist contractor:
- You wouldn't ask your plumber to rewire the electricity
- You wouldn't ask your electrician to tile the bathroom
- Each AI agent has a specialty — you call the right one for the right job

### What You Do vs What Agents Do

| You Do | Agents Do |
|--------|-----------|
| Decide what to build next | Write the code |
| Review what was built | Run the tests |
| Approve before production | Create database tables |
| Handle business decisions | Build API endpoints |
| Talk to legal, suppliers, investors | Build Flutter screens |
| Manage the Kanban board | Follow your architecture rules |

### The 3 Rules That Make This Work

1. **One task at a time.** Give each agent one clear task. Not "build the whole app." Say "build the booking creation endpoint as defined in the API spec Module 4."

2. **Always reference the spec docs.** Every task prompt should say "as defined in [document name]." Agents use those docs as their instructions.

3. **Review before merge.** No agent output goes to production without a human reading it. You don't need to understand every line — you need to confirm it does what you asked.

---

## Part 2: Before You Start Anything

### Step 1 — Read These 3 Documents First

Before giving agents any task, you must understand what's in these documents. They are the "constitution" of the project — agents are bound by them.

| Document | Location | What It Is |
|----------|----------|-----------|
| ADR Log | `03-Technical-Product/10-ADR-Log.md` | 20 binding architecture decisions. Agents must not violate these. |
| Agent Protocol | `03-Technical-Product/13-Agent-Protocol.md` | Rules for how agents work, hand off, and validate code. |
| Modules & Agents | `03-Technical-Product/15-Modules-and-Agents.md` | Full list of all 13 system modules and 20 agents — what each does. |

You don't need to memorize them. You need to know they exist and where they are.

---

### Step 2 — Set Up the 3 Required Files in the Repo Root

Before Sprint 1 starts, create these 3 files manually. They don't have code — they're coordination files that agents read and write.

**File 1: `CLAUDE.md`** — Auto-read by Claude Code at the start of every session

```markdown
# CLAUDE.md — SeaConnect Agent Instructions

## Mandatory First Steps (read before any code)
1. Read 03-Technical-Product/10-ADR-Log.md
2. Read 03-Technical-Product/13-Agent-Protocol.md
3. Read HANDOFFS.md (pending work from previous agents)
4. Read AGENT-COSTS.md (today's budget remaining)

## Never Do
- Raw SQL (use Django ORM)
- Hardcode currency as 'EGP' (use region.currency)
- Hardcode UI strings (use l10n keys)
- EdgeInsets with left/right in Flutter (use EdgeInsetsDirectional)
- Direct Fawry/Stripe calls (use PaymentProvider interface)
- Import between Django apps directly
- Offset pagination (use CursorPagination)
- Cache without explicit TTL
- Commit .env or secrets

## Always Do
- Arabic string first, then English
- UUID PKs on all models
- NUMERIC(12,2) for all money fields
- UTC for all database timestamps
- Event tracking on every new user-facing feature
- Idempotent Celery tasks (check state before acting)
- transaction.atomic() + booking_events on booking state changes
```

**File 2: `HANDOFFS.md`** — Tracks work between agents

```markdown
# HANDOFFS

This file tracks work completed by one agent that another agent depends on.
Append entries at the bottom. Never delete entries. Update Status as work progresses.

## Format
HANDOFF-{date}-{seq} | Status: READY/IN_PROGRESS/DONE/BLOCKED | From: X → To: Y

---

(empty — no handoffs yet, Sprint 1 not started)
```

**File 3: `AGENT-COSTS.md`** — Tracks AI usage costs

```markdown
# Agent Cost Log

## Budget
Monthly budget: $200 USD (adjust based on actuals)

## Log

| Date | Agent | Task | Tokens | Cost (USD) |
|------|-------|------|--------|-----------|
| (empty) | | | | |

## Monthly Summary
April 2026: $0 / $200 budget used
```

---

### Step 3 — Set Up Claude Code CLI

This is what you type commands into. One-time setup.

```bash
# Install Claude Code CLI (requires Node.js 18+)
npm install -g @anthropic/claude-code

# Authenticate
claude auth login
# → Follow the browser prompt to connect your Anthropic account

# Verify it works
claude --version

# Navigate to your project folder
cd /path/to/seaconnect

# Start a session
claude
```

You're now in a Claude Code session. The `CLAUDE.md` file you created is automatically read.

---

### Step 4 — Set Up Your GitHub Repository

Agents push code to GitHub. You need this ready before Sprint 1.

```bash
# Create repos (do this once, manually on GitHub.com)
# Repository names:
#   seaconnect-api      (Django backend)
#   seaconnect-mobile   (Flutter app)
#   seaconnect-web      (Next.js web + admin)

# Clone locally
git clone https://github.com/YOUR_ORG/seaconnect-api
git clone https://github.com/YOUR_ORG/seaconnect-mobile
git clone https://github.com/YOUR_ORG/seaconnect-web

# Set up branch protection (in GitHub Settings → Branches):
# Branch: main → Require PR, require status checks, no direct push
# Branch: develop → Require PR, require status checks, no direct push
```

---

## Part 3: The 20 Agents — When to Call Each One

### Quick Reference Card

Print this or keep it open. When you need something built, find the right agent.

```
┌─────────────────────────────────────────────────────────────────────┐
│                     AGENT QUICK REFERENCE                            │
├──────────────────────────────┬──────────────────────────────────────┤
│  I need...                   │  Call this agent                      │
├──────────────────────────────┼──────────────────────────────────────┤
│  A new database table        │  django-model-agent                   │
│  A new API endpoint          │  api-endpoint-agent                   │
│  A new Flutter screen        │  flutter-screen-agent                 │
│  A new web page (Next.js)    │  nextjs-page-agent                    │
│  A background job/task       │  celery-task-agent                    │
│  Payment integration         │  payment-integration-agent            │
│  Push/email notification     │  notification-agent                   │
│  Tests for backend code      │  test-writer-agent                    │
│  Security review             │  security-audit-agent                 │
│  DB migration check          │  migration-safety-agent               │
│  RTL / Arabic layout check   │  rtl-audit-agent                      │
│  PR review before merge      │  pr-review-agent                      │
│  Arabic copy/strings         │  arabic-copy-agent                    │
│  Slow query fix              │  db-query-agent                       │
│  Weather/fishing data        │  weather-fishing-agent                │
│  New country expansion       │  expansion-agent                      │
│  New admin page              │  admin-portal-agent                   │
│  Sprint planning             │  sprint-kickoff-agent                 │
│  Agent conflict / blocker    │  technical-orchestrator-agent         │
│  Production release          │  release-agent                        │
└──────────────────────────────┴──────────────────────────────────────┘
```

---

## Part 4: How to Write a Good Agent Prompt

### The Formula

Every agent prompt has 4 parts:

```
[1] WHAT to build (specific, not vague)
[2] WHERE the spec is (document + section)
[3] WHERE to put the output (file path)
[4] WHAT to check (constraints from ADRs)
```

### Bad Prompt vs Good Prompt

**Bad (too vague):**
```
Build the booking system.
```

**Good (specific, referenced, bounded):**
```
You are the api-endpoint-agent for SeaConnect.

Build the booking creation endpoint as defined in:
  - 03-Technical-Product/02-API-Specification.md → Module 4: Bookings → POST /bookings/
  - 03-Technical-Product/04-Database-Schema.md → bookings table

Output files:
  - apps/bookings/views.py (add BookingCreateView)
  - apps/bookings/serializers.py (add BookingCreateSerializer)
  - apps/bookings/urls.py (register route)
  - tests/bookings/test_create_booking.py (happy path + auth + validation tests)

Constraints from ADR Log:
  - Use CursorPagination (ADR-013)
  - Write to booking_events in the same transaction.atomic() as booking creation (ADR-012)
  - Do not hardcode currency — use booking.listing.region.currency (ADR-018)
  - Amount field must be NUMERIC/Decimal, not float

After writing, run: pytest tests/bookings/test_create_booking.py
```

---

## Part 5: Sprint-by-Sprint Walkthrough

### How a Sprint Works

```
Monday:    Sprint kickoff — you define goal, sprint-kickoff-agent makes the plan
Tue–Thu:   Agents build features — you review handoffs
Friday:    QA agent runs tests, pr-review-agent reviews PRs
Weekend:   Nothing deploys on weekends
Next Mon:  UAT review — you check features on staging
```

### Sprint 1 — Infrastructure Setup

**Your goal:** "Make the dev environment work and the CI pipeline run."

**Step 1 — Call sprint-kickoff-agent:**

```
You are the sprint-kickoff-agent for SeaConnect.

Sprint 1 goal: Set up the full development infrastructure.

Read these documents:
  - 03-Technical-Product/05-MVP-Scope.md (Sprint 1 tasks)
  - 03-Technical-Product/14-Environments-Pipelines.md (full pipeline spec)
  - 03-Technical-Product/11-Expansion-Architecture.md (Sprint 1 checklist)

Produce: SPRINT-1.md with a full task list, agent assignments, 
dependencies, and estimated token budget.
```

**Step 2 — Follow SPRINT-1.md.** It tells you which agent to call in which order.

**Step 3 — Call devops-infrastructure-specialist for Docker setup:**

```
You are the devops-infrastructure-specialist for SeaConnect.

Task: TASK-1-001 — Create docker-compose.yml for local development.

Spec: 03-Technical-Product/14-Environments-Pipelines.md → Section 3.1

Services to include:
  api (Django), web (Next.js), db (pgvector/pg16), redis (7-alpine),
  celery, celery-beat, minio (S3-compatible storage), mailpit (email catcher)

Also create:
  - .env.dev.example (no real secrets — placeholders only)
  - .env.dev (gitignored, with working local values)
  - Makefile with: make up, make down, make seed, make test

After: Run `docker compose up` and confirm all services start healthy.
```

---

### Sprint 2 — Authentication Module

**Your goal:** "Users can register, verify their phone, and log in."

**Call sequence:**

```
1. django-model-agent    → Create User, UserProfile, OTPVerification models
2. api-endpoint-agent    → Build auth endpoints (register, login, OTP, refresh)
3. security-audit-agent  → Review all auth code before anything else
4. test-writer-agent     → Write auth test suite
5. pr-review-agent       → Review PR before merge to develop
```

**Sample prompt for Step 1:**

```
You are the django-model-agent for SeaConnect.

Task: TASK-2-001 — Create the accounts module models.

Read:
  - 03-Technical-Product/04-Database-Schema.md → accounts section
  - 03-Technical-Product/10-ADR-Log.md → ADR-009 (JWT), ADR-018 (Region FK)

Create in apps/accounts/models.py:
  - User model (extends AbstractBaseUser)
  - UserProfile model
  - OTPVerification model
  - UserEvent model (append-only — no update/delete rules at DB level)

Requirements:
  - All PKs: UUIDField(default=uuid.uuid4, editable=False, primary_key=True)
  - User has a region FK to core.Region
  - All timestamps in UTC (USE_TZ=True already in settings)
  - UserEvent table: add DB-level rule to prevent UPDATE and DELETE

After: Run python manage.py makemigrations accounts --name="initial_accounts_models"
       Run python manage.py migrate
       Confirm: python manage.py check returns no errors
```

---

### How to Handle a Blocked Agent

Sometimes an agent will say it's blocked or confused. Here's what to do:

**If the agent says it doesn't know what to do:**
→ You gave it too vague a task. Re-read Part 4 (Good Prompt formula) and try again with specific document references.

**If the agent says there's a conflict:**
→ Call `technical-orchestrator-agent` and describe the conflict. It will read the ADR log and make a decision.

**If tests fail:**
→ Don't skip tests. Ask the agent: "The tests failed with this error: [paste error]. Fix the code, not the tests."

**If you're not sure which agent to call:**
→ Describe what you want to build in plain language to `technical-orchestrator-agent`. It will tell you which agent(s) to use and in what order.

---

## Part 6: Non-Technical Owner Tasks

You don't need to write prompts for everything. Some things are your job, not the agents' job.

### Your Weekly Checklist

```
MONDAY
  [ ] Review SPRINT-{N}.md — confirm task list makes sense
  [ ] Check AGENT-COSTS.md — are we within budget?
  [ ] Check HANDOFFS.md — any blocked items that need a decision?

TUESDAY–THURSDAY
  [ ] Review any PRs the agents opened (GitHub pull requests)
  [ ] Test new features on UAT (staging environment)
  [ ] Confirm: does the Arabic text look right?
  [ ] Confirm: does the feature work as you expected?

FRIDAY
  [ ] Sign off on UAT — update RELEASE-{version}.md with your approval
  [ ] Review next sprint scope (does it match business priorities?)
  [ ] Check AGENT-COSTS.md — log actuals

ONGOING (as needed)
  [ ] Talk to boat owners / vendors / customers → feed feedback into sprint scope
  [ ] Update legal documents when lawyers provide revisions
  [ ] Manage social media and supply acquisition (agents can't do this)
  [ ] Handle Fawry merchant agreement + payment setup (requires human signature)
```

### Decisions Only You Can Make

These require human judgment — do not delegate to agents:

| Decision | Why You Must Do It |
|----------|--------------------|
| Which features go in next sprint | Business priority is yours |
| UI feels wrong / doesn't match the brand | Aesthetic judgment |
| Is this legally compliant? | Ask your lawyer, not the agent |
| Is this the right price? | Market knowledge |
| Which boat owners to prioritize | Relationship and trust judgment |
| Approve production deploy | You are accountable |
| Handle a user complaint | Empathy and relationship |
| Negotiate with suppliers / investors | Human trust required |

---

## Part 7: Reading Agent Output

When an agent finishes a task, here's what to look at:

### For Backend Code (Django)

```
1. Does it match the API Specification?
   → Open 02-API-Specification.md, find the endpoint, compare field names

2. Did tests pass?
   → Agent should show "X passed" — if it shows failures, it's not done

3. Is there anything hardcoded that shouldn't be?
   → Look for literal 'EGP', left/right directions, or plain strings in code

4. Did it write to HANDOFFS.md?
   → If another agent needs this output, there should be a HANDOFF entry
```

### For Flutter Screens

```
1. Is there an Arabic version of every string?
   → Open app_ar.arb — every key used in the screen should be there

2. Does it use EdgeInsetsDirectional (not EdgeInsets)?
   → Quick search in the file: "EdgeInsets." should not exist without "Directional"

3. Are there loading + empty + error states?
   → Every screen should have all 3

4. Did rtl-audit-agent run?
   → Check if rtl-audit-agent was called after the screen was built
```

### For Database Migrations

```
1. Did migration-safety-agent approve it?
   → There should be a migration safety report before any production deploy

2. Is it reversible?
   → Agent should have confirmed the migration has a reverse operation

3. Does the field naming match the DB Schema document?
   → Open 04-Database-Schema.md and compare field names
```

---

## Part 8: The Master Prompt Template

Copy this and fill in the blanks for any new task:

```
You are the [AGENT-NAME] for SeaConnect.

## Task
TASK-[SPRINT]-[SEQ] — [Short task name]

## What to Build
[Describe in 2–4 sentences what needs to be built]

## Specification Documents
Read these before writing any code:
  - [Document path] → [Section name]
  - [Document path] → [Section name]
  - 03-Technical-Product/10-ADR-Log.md → [Relevant ADR numbers]

## Output Files
Create or modify:
  - [file path] — [what goes here]
  - [file path] — [what goes here]

## Constraints
  - [Constraint from ADR or spec]
  - [Constraint from ADR or spec]

## Definition of Done
  - [ ] [Specific measurable outcome]
  - [ ] Tests pass: [test command]
  - [ ] [Other verification step]

## Handoff (if needed)
After completion, write a HANDOFF entry in HANDOFFS.md for:
  - Receiving agent: [agent name]
  - What they need to know: [what was built + how to test it]
```

---

## Part 9: Quick-Start Checklist

Do these in order, one time only, before Sprint 1:

### Week -1 (Before Development Starts)

**Non-technical (you):**
- [ ] Create GitHub organization / account for SeaConnect
- [ ] Create 3 GitHub repositories: `seaconnect-api`, `seaconnect-mobile`, `seaconnect-web`
- [ ] Set branch protection on `main` and `develop` in each repo
- [ ] Create `CLAUDE.md` in each repo root (copy from Part 2, Step 2)
- [ ] Create `HANDOFFS.md` in each repo root (empty template)
- [ ] Create `AGENT-COSTS.md` in each repo root (empty template)
- [ ] Install Claude Code CLI: `npm install -g @anthropic/claude-code`
- [ ] Sign up for: Supabase, Upstash, Railway, Vercel, Cloudflare, Sentry, Mixpanel
- [ ] Create Fawry sandbox merchant account (merchant portal)
- [ ] Create Twilio account (for SMS OTP testing)
- [ ] Create SendGrid account (for email)
- [ ] Buy domain: seaconnect.eg (via Egyptian registrar) + seaconnect.com

**Technical (agent-assisted):**
- [ ] Call `devops-infrastructure-specialist` → Create `docker-compose.yml`
- [ ] Call `devops-infrastructure-specialist` → Create `.github/workflows/pr-validation.yml`
- [ ] Call `devops-infrastructure-specialist` → Create `.github/workflows/deploy-uat.yml`
- [ ] Call `django-model-agent` → Create `core` module (Region, Port, FeatureFlag models)
- [ ] Confirm: `docker compose up` runs with no errors
- [ ] Confirm: `http://localhost:8000/health/` returns `{"status": "healthy"}`
- [ ] Confirm: `http://localhost:8025` shows Mailpit email catcher
- [ ] Confirm: GitHub Actions PR pipeline runs and passes on a test PR

### Sprint 1 Starts Here

- [ ] Call `sprint-kickoff-agent` → Generate `SPRINT-1.md`
- [ ] Review `SPRINT-1.md` — does the task list match your expectations?
- [ ] Approve → begin Sprint 1 tasks in order

---

## Part 10: Reference — All 20 Agents with Full Prompts

### Code Generation Agents

---

#### Agent 1 — `django-model-agent`
**Call when:** You need a new database table or model  
**Uses:** `database-architect` subagent type

**Starter prompt:**
```
You are the django-model-agent for SeaConnect.

Task: Create the [MODEL_NAME] model.

Read:
  - 03-Technical-Product/04-Database-Schema.md → [section]
  - 03-Technical-Product/10-ADR-Log.md → ADR-001, ADR-004, ADR-018

Create:
  - apps/[module]/models.py → [ModelName] class
  - apps/[module]/admin.py → admin registration
  - apps/[module]/serializers.py → read + write serializers
  - Run: python manage.py makemigrations [module] --name="add_[model_name]"

Required:
  - UUID primary key
  - Extends TimeStampedModel
  - NUMERIC(12,2) for any money fields
  - Region FK if this is location-specific data
```

---

#### Agent 2 — `api-endpoint-agent`
**Call when:** You need a new API endpoint  
**Uses:** `backend-api-developer` subagent type

**Starter prompt:**
```
You are the api-endpoint-agent for SeaConnect.

Task: Build the [ENDPOINT] endpoint.

Read:
  - 03-Technical-Product/02-API-Specification.md → Module [N]: [name]
  - 03-Technical-Product/10-ADR-Log.md → ADR-013 (pagination), ADR-001 (no raw SQL)

Create:
  - apps/[module]/views.py → [ViewName]
  - apps/[module]/serializers.py → [SerializerName]
  - apps/[module]/urls.py → URL registration
  - tests/[module]/test_[endpoint].py → 3 tests minimum

After: pytest tests/[module]/test_[endpoint].py
```

---

#### Agent 3 — `flutter-screen-agent`
**Call when:** You need a new Flutter screen  
**Uses:** `mobile-app-developer` subagent type

**Starter prompt:**
```
You are the flutter-screen-agent for SeaConnect.

Task: Build the [SCREEN_NAME] screen.

Read:
  - 03-Technical-Product/07-UX-Flows.md → [screen section]
  - 03-Technical-Product/06-Brand-Design-System.md → colors, typography
  - 03-Technical-Product/10-ADR-Log.md → ADR-014 (RTL), ADR-015 (i18n)

Create:
  - lib/features/[module]/screens/[screen_name]_screen.dart
  - lib/features/[module]/providers/[screen_name]_provider.dart
  - lib/l10n/app_ar.arb → add all new strings (Arabic first)
  - lib/l10n/app_en.arb → add all new strings (English)
  - Register route in lib/core/router/app_router.dart

Required:
  - Loading state: shimmer skeleton
  - Empty state: Arabic message + illustration
  - Error state: retry button + Arabic error message
  - No hardcoded strings, no EdgeInsets (use EdgeInsetsDirectional)

After: flutter analyze && flutter test
```

---

#### Agent 4 — `nextjs-page-agent`
**Call when:** You need a new Next.js web page  
**Uses:** `frontend-react-developer` subagent type

**Starter prompt:**
```
You are the nextjs-page-agent for SeaConnect.

Task: Build the [PAGE_NAME] page.

Read:
  - 03-Technical-Product/07-UX-Flows.md → [page section]
  - 03-Technical-Product/06-Brand-Design-System.md
  - 03-Technical-Product/10-ADR-Log.md → ADR-003 (SSR), ADR-014 (RTL), ADR-015 (i18n)

Create:
  - app/[route]/page.tsx → [Server Component for public, Client for dashboard]
  - messages/ar.json → add all new string keys (Arabic first)
  - messages/en.json → add all new string keys (English)

Required:
  - SEO metadata export (title, description, og:image) for public pages
  - Logical CSS properties (ms-, me- not ml-, mr-)
  - next-intl for all strings (no hardcoded text)
  - dir attribute set from locale

After: npx tsc --noEmit && npx eslint .
```

---

#### Agent 5 — `celery-task-agent`
**Call when:** You need a background or scheduled job  
**Uses:** `backend-api-developer` subagent type

**Starter prompt:**
```
You are the celery-task-agent for SeaConnect.

Task: Create the [TASK_NAME] task.

Read:
  - 03-Technical-Product/10-ADR-Log.md → ADR-011 (Celery rules)

Create:
  - apps/[module]/tasks.py → @app.task with bind=True, max_retries=3
  - If recurring: add to seaconnect/celery.py Beat schedule

Required:
  - max_retries=3, default_retry_delay=60
  - Idempotency guard at start of task (check current state)
  - Task unit test with mocked external calls

After: pytest tests/[module]/test_tasks.py
```

---

#### Agent 6 — `payment-integration-agent`
**Call when:** Payment flow work or new payment provider  
**Uses:** `integration-specialist` subagent type

**Starter prompt:**
```
You are the payment-integration-agent for SeaConnect.

Task: [Describe payment task].

Read:
  - 05-Payment-Financial/01-Payment-Gateway-Plan.md
  - 03-Technical-Product/10-ADR-Log.md → ADR-007 (PaymentProvider), ADR-008 (Fawry)
  - payments/providers/base.py (existing interface)

Create/Modify:
  - payments/providers/[provider].py → implements PaymentProvider interface
  - payments/webhooks/[provider].py → webhook handler + HMAC verification
  - payments/providers/registry.py → add to PROVIDER_MAP if new provider

Required:
  - Only implement PaymentProvider interface methods — no direct SDK calls in business logic
  - HMAC webhook signature verification (never skip)
  - Amount in Decimal, never float

After: pytest tests/payments/
```

---

#### Agent 7 — `notification-agent`
**Call when:** New notification event needed  
**Uses:** `backend-api-developer` subagent type

**Starter prompt:**
```
You are the notification-agent for SeaConnect.

Task: Add notification for [EVENT_NAME] event.

Read:
  - 03-Technical-Product/15-Modules-and-Agents.md → Module 10 (notifications)
  - 03-Technical-Product/07-UX-Flows.md → deep link map

Create:
  - apps/notifications/templates.py → add NotificationTemplate for this event
  - apps/notifications/tasks.py → async delivery task
  - Strings in app_ar.arb and app_en.arb for push title + body

Required:
  - FCM push payload: title_ar, title_en, body_ar, body_en, deep_link
  - SendGrid email template in Arabic + English
  - Never send notification synchronously — always via Celery task
```

---

### Quality & Safety Agents

---

#### Agent 8 — `test-writer-agent`
**Call when:** After any backend feature, before opening PR  
**Uses:** `qa-automation-specialist` subagent type

**Starter prompt:**
```
You are the test-writer-agent for SeaConnect.

Task: Write tests for [FEATURE_NAME].

Read:
  - 03-Technical-Product/02-API-Specification.md → [relevant module]
  - The code files written by the previous agent: [list files]

Create:
  - tests/[module]/test_[feature].py

Required tests (minimum):
  1. Happy path — expected input produces expected output
  2. Auth required — unauthenticated request returns 401
  3. Wrong role — wrong role returns 403
  4. Validation error — invalid input returns 400 with error detail
  5. State conflict — e.g., double-booking attempt returns 409

Rules:
  - Use real PostgreSQL (no DB mocking)
  - Fixtures via factory_boy in conftest.py
  - No test should depend on another test's data

After: pytest tests/[module]/test_[feature].py --cov=apps/[module] --cov-fail-under=80
```

---

#### Agent 9 — `security-audit-agent`
**Call when:** Before any PR touching auth, payments, KYC, or user data  
**Uses:** `security-specialist` subagent type

**Starter prompt:**
```
You are the security-audit-agent for SeaConnect.

Task: Security review of [FEATURE/PR].

Read:
  - 09-Safety-Security/01-Safety-Requirements.md
  - 03-Technical-Product/10-ADR-Log.md → ADR-009 (JWT)
  - Changed files: [list files]

Produce a security report covering:
  1. SQL injection risk (even via ORM)
  2. Authentication/authorization bypass
  3. Insecure direct object reference (IDOR)
  4. Sensitive data in logs
  5. Hardcoded secrets
  6. Missing rate limiting on sensitive endpoints
  7. Webhook signature verification present?
  8. JWT stored correctly?

Output: PASS or BLOCK with specific line-number findings.
BLOCK if: SQL injection, auth bypass, hardcoded credentials, missing webhook verification.
```

---

#### Agent 10 — `migration-safety-agent`
**Call when:** Before any production deploy with new migrations  
**Uses:** `database-architect` subagent type

**Starter prompt:**
```
You are the migration-safety-agent for SeaConnect.

Task: Review migrations before production deploy.

Read:
  - 03-Technical-Product/14-Environments-Pipelines.md → Section 7.1 (zero-downtime rules)
  - Pending migration files: [list paths]

For each migration, check:
  1. Any column dropped? (Must have deprecation period first)
  2. NOT NULL column added without default? (Breaks on large tables)
  3. Index created without CONCURRENTLY? (Locks table)
  4. Table renamed? (Never allowed without migration plan)
  5. Large table full scan required?

Output: SAFE or UNSAFE per migration with specific issue and fix.
BLOCK deploy if: any UNSAFE migration present.
```

---

#### Agent 11 — `rtl-audit-agent`
**Call when:** After any Flutter or Next.js UI change  
**Uses:** `ui-ux-design-specialist` subagent type

**Starter prompt:**
```
You are the rtl-audit-agent for SeaConnect.

Task: RTL audit of [SCREEN/PAGE NAME].

Read:
  - 03-Technical-Product/06-Brand-Design-System.md → RTL rules section
  - 03-Technical-Product/10-ADR-Log.md → ADR-014

Review the file(s): [list files]

Check for violations:
  Flutter:
  - EdgeInsets used instead of EdgeInsetsDirectional
  - Hardcoded left/right alignment
  - Hardcoded string literals (not using AppLocalizations)
  - Numbers not formatted with intl package
  
  Next.js:
  - ml-/mr- instead of ms-/me-
  - Hardcoded strings instead of t('key')
  - Missing dir attribute at layout level

Output: List of violations with line numbers and corrected code.
Auto-fix if possible, flag for human review if ambiguous.
```

---

#### Agent 12 — `pr-review-agent`
**Call when:** Before merging any PR  
**Uses:** `technical-orchestrator` subagent type

**Starter prompt:**
```
You are the pr-review-agent for SeaConnect.

Task: Review PR #[NUMBER] before merge to develop.

Read:
  - 03-Technical-Product/10-ADR-Log.md (all ADRs)
  - 03-Technical-Product/13-Agent-Protocol.md → Gate 4 checklist
  - PR diff: [paste diff or list changed files]

Produce a structured review:
  Gate 4 Checklist (pass/fail each):
  [ ] No raw SQL
  [ ] No hardcoded currency
  [ ] No hardcoded UI strings
  [ ] No left/right directional in Flutter
  [ ] No direct payment SDK calls
  [ ] All new models have UUID PK + TimeStampedModel
  [ ] Money fields are Decimal not float
  [ ] New user features have event tracking
  [ ] Celery tasks are idempotent with max_retries=3

Output: APPROVE or REQUEST CHANGES with specific findings.
```

---

### Domain-Specific Agents

---

#### Agent 13 — `arabic-copy-agent`
**Call when:** New UI strings, notifications, or marketing copy needed  
**Uses:** `general-purpose` agent

**Starter prompt:**
```
You are the arabic-copy-agent for SeaConnect.

Task: Write Arabic copy for [FEATURE/SCREEN].

Context:
  - Platform: maritime booking, fishing gear marketplace in Egypt
  - Tone: professional but friendly, Arabic-first
  - Audience: Egyptian fishermen, boat owners, tourists
  - Register: Modern Standard Arabic (MSA) for formal text, accessible language

Read:
  - 03-Technical-Product/06-Brand-Design-System.md → Brand voice section
  - 03-Technical-Product/10-ADR-Log.md → ADR-015 (key naming)

For each string, provide:
  1. Key name: {screen}.{component}.{element}
  2. Arabic text (MSA)
  3. English equivalent
  4. Any RTL notes (mixed content, numbers, punctuation direction)

Format as ready-to-paste .arb / .json entries.
```

---

#### Agent 14 — `db-query-agent`
**Call when:** Slow query detected or query touches >10K rows  
**Uses:** `database-architect` subagent type

**Starter prompt:**
```
You are the db-query-agent for SeaConnect.

Task: Optimize this slow query.

Read:
  - 03-Technical-Product/04-Database-Schema.md → [affected table(s)]
  - Query plan: [paste EXPLAIN ANALYZE output]
  - Current ORM code: [paste code]

Produce:
  1. Interpretation of EXPLAIN ANALYZE (what's slow and why)
  2. Index recommendation (exact CREATE INDEX CONCURRENTLY statement)
  3. ORM rewrite using select_related/prefetch_related/annotate
  4. Estimated improvement (sequential scan → index scan, rows affected)

After: Test rewritten query on dev DB with EXPLAIN ANALYZE.
```

---

#### Agent 15 — `weather-fishing-agent`
**Call when:** Adding ports, species, or updating fishing season data  
**Uses:** `backend-api-developer` subagent type

**Starter prompt:**
```
You are the weather-fishing-agent for SeaConnect.

Task: [Add new port / Add new species / Update season ratings].

Read:
  - 03-Technical-Product/09-Weather-FishingSeasons.md (full spec)

Create/Update:
  - apps/weather/fixtures/ports.json (if new port)
  - apps/weather/fixtures/species.json (if new species)
  - apps/weather/fixtures/seasons.json (season rating matrix)

Required format for port:
  { slug, name_ar, name_en, latitude, longitude, sea_region, is_active }

Required format for season rating:
  { species_slug, port_slug, month (1-12), rating: peak/good/possible/off }
```

---

#### Agent 16 — `expansion-agent`
**Call when:** Entering a new country market  
**Uses:** `backend-api-developer` + `integration-specialist`

**Starter prompt:**
```
You are the expansion-agent for SeaConnect.

Task: Set up [COUNTRY] market (Phase [N]).

Read:
  - 03-Technical-Product/11-Expansion-Architecture.md → Section 3 ([country] profile)
  - 08-Growth-Strategy/01-Expansion-Playbook.md → Section 3.[X] ([country])
  - 03-Technical-Product/10-ADR-Log.md → ADR-007 (PaymentProvider), ADR-018 (Region)

Create:
  1. Region seed data in apps/core/fixtures/regions.json
  2. payments/providers/[provider].py → new PaymentProvider subclass
  3. payments/providers/registry.py → add currency → provider mapping
  4. apps/weather/fixtures/ports_[country].json → local ports
  5. 06-Geographic-Regulatory/02-[Country]-Compliance.md scaffold

Do NOT activate the region (is_active=False) — human approves activation at launch.
```

---

#### Agent 17 — `admin-portal-agent`
**Call when:** New internal admin management page needed  
**Uses:** `frontend-react-developer` subagent type

**Starter prompt:**
```
You are the admin-portal-agent for SeaConnect.

Task: Build the [PAGE_NAME] admin page.

Read:
  - 03-Technical-Product/07-UX-Flows.md → admin pages section
  - 03-Technical-Product/15-Modules-and-Agents.md → Module 13 (admin_portal)

Create:
  - web/app/(admin)/[route]/page.tsx → Client Component with shadcn DataTable
  - web/app/(admin)/[route]/actions.ts → Server Actions for mutations
  - apps/admin_portal/views.py → corresponding API endpoint (admin role only)
  - apps/admin_portal/urls.py → URL registration

Required:
  - Route guard: redirect if not admin role
  - Pagination on all data tables
  - Confirmation dialog before destructive actions
```

---

### Process & Orchestration Agents

---

#### Agent 18 — `sprint-kickoff-agent`
**Call when:** Start of each sprint  
**Uses:** `technical-orchestrator` subagent type

**Starter prompt:**
```
You are the sprint-kickoff-agent for SeaConnect.

Task: Plan Sprint [N].

Read:
  - 03-Technical-Product/05-MVP-Scope.md → Sprint [N] tasks
  - SPRINT-[N-1].md → carry-overs from last sprint
  - HANDOFFS.md → unresolved handoffs
  - AGENT-COSTS.md → remaining budget

Produce SPRINT-[N].md containing:
  1. Sprint goal (one sentence)
  2. Complete task list with: ID, description, agent, dependencies, status
  3. Dependency graph (which tasks must come before others)
  4. Token budget estimate per task
  5. Total sprint budget
  6. List of documents each task will read
  7. List of files each task will produce
```

---

#### Agent 19 — `technical-orchestrator-agent`
**Call when:** Agent conflict, architectural question, or you're not sure which agent to use  
**Uses:** `technical-orchestrator` subagent type

**Starter prompt:**
```
You are the technical-orchestrator-agent for SeaConnect.

Situation: [Describe the conflict or question]

Read:
  - 03-Technical-Product/10-ADR-Log.md (all ADRs)
  - 03-Technical-Product/13-Agent-Protocol.md → Section 5 (conflict resolution)
  - HANDOFFS.md → blocked items
  - [Any relevant spec documents]

Determine:
  1. Does any existing ADR resolve this? If yes, cite it and apply it.
  2. If no ADR exists, recommend a decision and propose a new ADR (ADR-02X).
  3. Update HANDOFFS.md: unblock any BLOCKED items if now resolved.
  4. If new ADR is proposed, write it in ADR Log format for human approval.
```

---

#### Agent 20 — `release-agent`
**Call when:** Preparing a production release  
**Uses:** `devops-infrastructure-specialist` subagent type

**Starter prompt:**
```
You are the release-agent for SeaConnect.

Task: Prepare release v[VERSION] for production.

Read:
  - 03-Technical-Product/14-Environments-Pipelines.md → Section 5.2 + 6.5
  - SPRINT-[N].md → completed tasks in this release
  - HANDOFFS.md → confirm all DONE

Produce RELEASE-v[VERSION].md containing:
  1. What's included (feature list from sprint tasks)
  2. Migrations list (all pending migrations, in order)
  3. Migration safety report (delegate to migration-safety-agent)
  4. Feature flags changed in this release
  5. Smoke test checklist (manual + automated)
  6. Rollback plan (exact steps if deploy fails)
  7. Go / No-go recommendation

After: Await human approval before pipeline runs `deploy-prod.yml`.
```

---

## Appendix: Glossary for Non-Technical Readers

| Term | What it means |
|------|--------------|
| **Agent** | An AI (Claude Code) given a specific task in a specific domain |
| **Sprint** | A 1–2 week chunk of work with a defined goal |
| **PR (Pull Request)** | A request to merge code changes — requires review before merging |
| **Pipeline** | An automated sequence of checks that runs whenever code is pushed |
| **Migration** | A script that changes the database structure safely |
| **UAT** | User Acceptance Testing — the staging environment where you review features |
| **ADR** | Architecture Decision Record — a binding rule about how code is built |
| **Handoff** | When one agent finishes something another agent needs |
| **Endpoint** | A specific URL in the API that does one thing (e.g., create a booking) |
| **Token** | The unit of text that AI processes — determines cost |
| **Feature flag** | An on/off switch for a feature, controllable without code changes |
| **Seed data** | Pre-loaded data (ports, species, regions) needed before the app works |
| **Rollback** | Reverting to a previous working version after a failed deploy |
| **Zero-downtime** | Deploying without the app going offline for users |
