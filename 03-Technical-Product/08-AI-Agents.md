# Claude Code AI Agents — SeaConnect
**Version:** 1.0
**Date:** April 6, 2026
**Status:** ✅ Complete

---

## Overview

These are specialized Claude Code subagents to be configured and invoked during SeaConnect's development.
Each agent has a clear trigger, a defined scope, and knows exactly which files to read and what to produce.

Agents are organized by development domain. A developer invokes the relevant agent instead of writing boilerplate manually — the agent reads the project's own spec docs and generates consistent, project-aligned output.

---

## Agent List

| # | Agent Name | Trigger | Primary Output |
|---|-----------|---------|---------------|
| 1 | `django-model-agent` | New database table needed | Django model + migration + serializer + admin registration |
| 2 | `api-endpoint-agent` | New API endpoint needed | DRF ViewSet + URL route + serializer + tests |
| 3 | `flutter-screen-agent` | New Flutter screen needed | Stateful/Stateless widget + route + empty/loading/error states |
| 4 | `flutter-rtl-agent` | Any Flutter UI change | RTL audit + fix report for Arabic layout |
| 5 | `celery-task-agent` | New background job needed | Celery task + Beat schedule + error handling + retry logic |
| 6 | `fawry-integration-agent` | Payment flow work | Fawry API call + webhook handler + signature verification |
| 7 | `test-writer-agent` | After any backend feature | Pytest unit + integration tests for Django service/view |
| 8 | `migration-safety-agent` | Before any `makemigrations` | Migration safety audit — zero-downtime check |
| 9 | `security-audit-agent` | Before any PR merge | OWASP checklist scan on changed files |
| 10 | `admin-portal-agent` | New admin page needed | Next.js admin page + shadcn table/form + server action |
| 11 | `notification-agent` | New notification event needed | FCM push + SendGrid email template + DB record creation |
| 12 | `arabic-copy-agent` | Any new UI string | Arabic translation + RTL text direction rules |
| 13 | `db-query-agent` | Performance concerns on a query | Query analysis + index suggestion + ORM rewrite |
| 14 | `sprint-kickoff-agent` | Start of each sprint | Sprint scope summary + file checklist + task breakdown |
| 15 | `pr-review-agent` | Before merging any PR | Code review against SeaConnect standards + checklist |

---

## Agent 1: `django-model-agent`

**When to invoke:**
Any time a new database table is needed, or an existing model needs new fields.

**What it reads:**
- `03-Technical-Product/04-Database-Schema.md` — canonical schema definition
- `03-Technical-Product/02-API-Specification.md` — field names and types used in API
- Existing models in `seaconnect_api/*/models.py`

**What it produces:**
1. Django `models.py` class with all fields, `Meta`, `__str__`, and `indexes`
2. `admin.py` registration with `list_display`, `list_filter`, `search_fields`
3. DRF serializer (`serializers.py`) — read + write variants if needed
4. Migration file via `makemigrations` (runs the command)
5. Signals if `updated_at` auto-update is needed

**Example prompt:**
```
Invoke django-model-agent: Create the Booking model as defined in 04-Database-Schema.md section "bookings table". 
Include all fields, the composite index on (yacht_id, status, created_at), 
and register it in admin with booking_reference, customer, yacht, status, total_amount in list_display.
```

**Standards it enforces:**
- All models inherit from `TimeStampedModel` (created_at, updated_at)
- UUIDs as primary keys (not integer IDs)
- All choices as `TextChoices` enums (never raw strings)
- `__str__` always returns human-readable representation
- `Meta.ordering` defined on all models
- No `null=True` on string fields (use `blank=True` + default `""` instead)

---

## Agent 2: `api-endpoint-agent`

**When to invoke:**
Any time a new REST API endpoint is needed — create, list, retrieve, update, or delete.

**What it reads:**
- `03-Technical-Product/02-API-Specification.md` — exact request/response contract
- Existing `views.py`, `urls.py`, `serializers.py` in the relevant Django app
- `03-Technical-Product/09-Safety-Security.md` — auth and permission rules

**What it produces:**
1. DRF `ViewSet` or `APIView` with correct HTTP methods
2. Permission classes (`IsAuthenticated`, `IsOwner`, `IsAdmin` — role-based)
3. Serializer with all fields from the API spec
4. URL registration in `urls.py`
5. Throttle class applied (auth/user/admin rate per spec)
6. Docstring with the spec's request/response example
7. Stub test file (filled by `test-writer-agent`)

**Example prompt:**
```
Invoke api-endpoint-agent: Implement POST /api/v1/bookings/ as specified in 
02-API-Specification.md Module 4 "Create Booking". 
The endpoint requires IsAuthenticated + role=CUSTOMER. 
Validate party_size <= yacht.capacity and date is not in blocked availability.
```

**Standards it enforces:**
- Standardized response envelope: `{ "success": true, "data": {...} }`
- Standardized error envelope: `{ "success": false, "error": { "code": "...", "message": "..." } }`
- Cursor-based pagination on all list endpoints
- No business logic in views — all logic delegated to `services.py`
- All endpoints return the correct HTTP status codes from the spec

---

## Agent 3: `flutter-screen-agent`

**When to invoke:**
Any time a new screen needs to be built in the Flutter app.

**What it reads:**
- `03-Technical-Product/07-UX-Flows.md` — screen description, route, and flow context
- `03-Technical-Product/06-Brand-Design-System.md` — colors, typography, spacing, components
- Existing screens in `lib/features/*/screens/` for pattern consistency

**What it produces:**
1. Flutter widget file (`StatefulWidget` or `ConsumerWidget` for Riverpod)
2. Route registration in `router.dart` (GoRouter)
3. Three mandatory states: loading (shimmer), empty state, error state
4. Arabic/English string keys extracted to `app_en.arb` and `app_ar.arb`
5. Theme-aware styling (uses `AppTheme` tokens, never hardcoded hex)
6. RTL-safe layout (uses `EdgeInsetsDirectional`, `start`/`end` alignment)

**Example prompt:**
```
Invoke flutter-screen-agent: Build the Yacht Detail screen at route /explore/yacht/:id 
as described in 07-UX-Flows.md section "Yacht Detail". 
Use YachtDetailProvider (Riverpod) for state. 
Show shimmer skeleton while loading. 
Sticky "Book Now" bottom bar with price display.
```

**Standards it enforces:**
- All screens use `Scaffold` with consistent `AppBar`
- `SafeArea` on all screens
- Bottom nav hidden inside booking/checkout flows
- Pull-to-refresh on all list screens
- No hardcoded strings — all in `.arb` files
- Uses `AppTheme` color tokens, never raw hex

---

## Agent 4: `flutter-rtl-agent`

**When to invoke:**
After building or modifying any Flutter UI component. Run before every sprint demo.

**What it reads:**
- The modified Flutter widget files
- `03-Technical-Product/06-Brand-Design-System.md` — Section 10 (Arabic RTL Rules)

**What it produces:**
1. Audit report: list of RTL violations found in the widget tree
2. Fixed version of each violated widget
3. Checklist of what was verified

**Checks performed:**
- `EdgeInsets` → `EdgeInsetsDirectional` replacements
- `MainAxisAlignment.start` vs `end` correctness in RTL
- `CrossAxisAlignment` correctness
- Hardcoded `TextDirection.ltr` where Arabic text might appear
- `Row` children order (first child appears on right in RTL)
- Icon mirroring (directional icons like arrows must flip)
- Number/price formatting uses `intl` package, not raw `toString()`
- Date formatting uses `intl` package
- No `textAlign: TextAlign.left` — must be `TextAlign.start`

**Example prompt:**
```
Invoke flutter-rtl-agent: Audit lib/features/booking/screens/booking_detail_screen.dart
and lib/features/booking/widgets/booking_card.dart for RTL compliance.
Fix all violations in place.
```

---

## Agent 5: `celery-task-agent`

**When to invoke:**
Any time a background job is needed — scheduled tasks, async processing, or deferred operations.

**What it reads:**
- `03-Technical-Product/03-Tech-Stack.md` — Celery Beat schedule configuration
- `05-Payment-Financial/01-Payment-Gateway-Plan.md` — payout timing and auto-decline rules
- Existing tasks in `seaconnect_api/core/tasks.py`

**What it produces:**
1. Celery task function with `@shared_task` decorator
2. Proper retry logic (`autoretry_for`, `max_retries`, `countdown`)
3. Celery Beat schedule entry (`CELERY_BEAT_SCHEDULE`)
4. Sentry error capture on task failure
5. Idempotency guard (tasks must be safe to run twice)
6. Logging with structured log fields (task_id, relevant IDs)

**Example prompt:**
```
Invoke celery-task-agent: Create the auto_decline_expired_bookings task.
It runs every 10 minutes via Beat. 
It finds bookings WHERE status=PENDING_CONFIRMATION AND created_at < NOW() - INTERVAL '2 hours'.
For each: set status=AUTO_DECLINED, call Fawry refund API, send FCM push to customer.
Must be idempotent (safe to run twice on same booking).
```

**Standards it enforces:**
- All tasks are idempotent
- Retry with exponential backoff on external API failures
- Never retry on business logic failures (wrong state, missing data)
- Task runs logged to `audit_logs` table for payment-related tasks
- Max execution time enforced via `time_limit` parameter

---

## Agent 6: `fawry-integration-agent`

**When to invoke:**
Any time Fawry payment initiation, webhook handling, refund, or payout disbursement needs to be implemented or modified.

**What it reads:**
- `05-Payment-Financial/01-Payment-Gateway-Plan.md` — full Fawry integration spec including signature verification code
- `03-Technical-Product/04-Database-Schema.md` — `payments` and `transactions` tables
- Existing `seaconnect_api/payments/services.py`

**What it produces:**
1. Fawry API call function (initiate payment / refund / disbursement)
2. HMAC-SHA256 webhook signature verification
3. Idempotency check (duplicate webhook guard using `orderRefNum`)
4. Payment and Transaction DB record creation
5. Async Celery task for webhook processing (returns 200 immediately, processes async)
6. Sandbox test case with Fawry test card numbers

**Example prompt:**
```
Invoke fawry-integration-agent: Implement the refund flow.
When booking is auto-declined, call Fawry Refund API with the original orderRefNum.
Update Payment.status to REFUNDED.
Create a Transaction record with type=REFUND.
Send FCM push to customer: "تم استرداد مبلغ [amount] ج.م".
```

**Standards it enforces:**
- Webhook endpoint always returns HTTP 200 within 2 seconds
- All processing happens in Celery (never in the webhook view)
- Signature verified before any state change
- Duplicate orderRefNum rejected silently (already processed)
- All Fawry calls wrapped in try/except with Sentry capture

---

## Agent 7: `test-writer-agent`

**When to invoke:**
After implementing any Django service, view, or Celery task. Target: 80% coverage before launch.

**What it reads:**
- The feature file just written
- `03-Technical-Product/02-API-Specification.md` — expected request/response for the endpoint being tested
- `03-Technical-Product/05-MVP-Scope.md` — acceptance criteria for the feature under test

**What it produces:**
1. Pytest test file with `TestCase` classes
2. Unit tests for the service layer (pure logic, mocked DB)
3. Integration tests for API endpoints (using DRF's `APITestCase` with real test DB)
4. Edge case tests derived from the acceptance criteria
5. Factory functions (using `factory_boy`) for test data

**Example prompt:**
```
Invoke test-writer-agent: Write tests for seaconnect_api/bookings/services.py 
BookingService.create_booking() method.
Cover: happy path, party_size > capacity (should raise), 
date in blocked availability (should raise), 
duplicate booking same date (should raise).
Also write integration tests for POST /api/v1/bookings/ covering auth required (401), 
valid payload (201), and invalid party_size (400).
```

**Standards it enforces:**
- Tests use real PostgreSQL (no mocking the DB)
- External APIs (Fawry, FCM, SendGrid) are mocked
- Each test is independent (no shared state between tests)
- Test names follow `test_[method]_[scenario]_[expected_result]` pattern
- Fixtures created via `factory_boy`, never raw `Model.objects.create()` in tests

---

## Agent 8: `migration-safety-agent`

**When to invoke:**
Before running `python manage.py makemigrations` on any model change in production.

**What it reads:**
- The model change about to be made
- Existing migration files in `*/migrations/`
- Current table row count estimates (from previous load test results)

**What it produces:**
1. Safety classification: `SAFE` / `RISKY` / `DANGEROUS`
2. Explanation of why it's risky (e.g., full table rewrite, lock)
3. Zero-downtime alternative (if RISKY/DANGEROUS)
4. Recommended deployment strategy

**Classifications:**
| Change | Classification | Zero-Downtime Strategy |
|--------|---------------|------------------------|
| Add nullable column | SAFE | Deploy directly |
| Add non-nullable column without default | DANGEROUS | Add with `null=True` first, backfill, then add constraint |
| Add index | RISKY | Use `CREATE INDEX CONCURRENTLY` — add `db_index=False`, create manually |
| Drop column | RISKY | Deploy code that ignores column first, then drop |
| Rename column | DANGEROUS | Add new column, copy data, update code, drop old column in 3 steps |
| Change column type | DANGEROUS | New column approach — never `ALTER COLUMN TYPE` on live table |
| Add FK constraint | RISKY | Add with `NOT VALID`, validate separately |

**Example prompt:**
```
Invoke migration-safety-agent: I'm about to add a non-nullable field 
"cancellation_reason" (CharField max_length=200) to the Booking model.
The bookings table has approximately 5,000 rows.
What is the safest migration strategy?
```

---

## Agent 9: `security-audit-agent`

**When to invoke:**
Before merging any PR that touches auth, payments, file uploads, or admin endpoints.
Also run at the end of Sprint 14 (Security Hardening sprint).

**What it reads:**
- Changed files in the PR (`git diff main`)
- `09-Safety-Security/01-Safety-Requirements.md` — OWASP checklist and code rules
- `03-Technical-Product/02-API-Specification.md` — permission requirements per endpoint

**What it produces:**
1. Security findings report with severity (Critical / High / Medium / Low)
2. Line-by-line fixes for each finding
3. Pass/Fail verdict for merge readiness

**Checks performed:**
```
AUTH:
  - Every new endpoint has @permission_classes applied
  - Object-level ownership check (user can only access their own resources)
  - Admin endpoints check is_staff flag
  - JWT token validated, not just presence-checked

INPUT:
  - All user inputs go through DRF serializer validation
  - No raw SQL with user-supplied values
  - File uploads: type whitelist checked, size limit enforced
  - No user-controlled URL fetched via requests.get()

PAYMENTS:
  - Fawry webhook signature verified before processing
  - No amount derived from client input (always server-calculated)
  - Idempotency guard on webhook handlers

DATA:
  - No PII logged to Sentry (no passwords, tokens, card data in log calls)
  - No secrets in source code (regex scan for API_KEY=, SECRET=, PASSWORD=)
  - Sensitive fields excluded from serializer output by default

HEADERS:
  - New views don't disable CSRF
  - No Access-Control-Allow-Origin: * on auth endpoints
```

**Example prompt:**
```
Invoke security-audit-agent: Review the PR that adds the file upload endpoint 
at POST /api/v1/media/upload/. 
Files: seaconnect_api/media/views.py, seaconnect_api/media/serializers.py.
Focus on: file type validation, size limits, storage path traversal, auth.
```

---

## Agent 10: `admin-portal-agent`

**When to invoke:**
Any time a new page is needed in the Next.js admin portal (`admin.seaconnect.app`).

**What it reads:**
- `03-Technical-Product/07-UX-Flows.md` — Admin Portal screen descriptions
- `03-Technical-Product/02-API-Specification.md` — Admin API endpoints (Module 8)
- Existing admin pages in `seaconnect_admin/app/` for pattern consistency

**What it produces:**
1. Next.js page component (App Router, TypeScript)
2. shadcn/ui `DataTable` with `@tanstack/react-table` for list pages
3. shadcn/ui `Form` with `react-hook-form` + `zod` for action forms
4. Server Action for mutations (approve, reject, ban, refund)
5. Loading skeleton and empty state
6. Arabic/English labels (bilingual admin)

**Example prompt:**
```
Invoke admin-portal-agent: Build the Yacht Approvals page at /approvals/yachts.
Show a table: boat name, owner name, submitted date, photos count, documents count.
Each row has Approve and Reject buttons.
Reject opens a modal with a reason input field.
On approval: call PATCH /api/v1/admin/yachts/{id}/approve/.
On rejection: call PATCH /api/v1/admin/yachts/{id}/reject/ with { reason }.
```

**Standards it enforces:**
- All admin actions require re-confirmation (modal/dialog before destructive actions)
- Role guard: redirect to login if not authenticated as admin
- All mutations use server actions (not client-side fetch)
- Optimistic UI updates with rollback on error
- Arabic column headers and status labels

---

## Agent 11: `notification-agent`

**When to invoke:**
Any time a new notification event needs to be added to the platform (push, email, or in-app).

**What it reads:**
- `03-Technical-Product/05-MVP-Scope.md` — Notifications section (which events trigger which notifications)
- `03-Technical-Product/04-Database-Schema.md` — `notifications` table schema
- Existing notification handlers in `seaconnect_api/notifications/`

**What it produces:**
1. FCM push notification function (via Firebase Admin SDK)
2. SendGrid email template (HTML + plain text, bilingual AR/EN)
3. In-app `Notification` DB record creation
4. Celery task to send async (never send in the request cycle)
5. Notification preference check (user may have disabled push)

**Example prompt:**
```
Invoke notification-agent: Implement the "booking confirmed by owner" notification event.
Triggers when: Booking.status changes from PENDING_CONFIRMATION to CONFIRMED.
Send to: customer.
FCM push: "تم تأكيد رحلتك! ابحار سعيد 🎣" with booking_id in data payload.
Email: "Booking Confirmed" template with trip date, boat name, owner contact.
In-app record: type=BOOKING_CONFIRMED, linked to booking.
```

**Standards it enforces:**
- Notifications always sent async (Celery task)
- Preference check: skip FCM if user.push_enabled = False
- Email always has both Arabic and English versions
- In-app notification always created (regardless of push/email prefs)
- FCM failures logged but don't fail the parent transaction

---

## Agent 12: `arabic-copy-agent`

**When to invoke:**
Any time new UI strings are added to the Flutter app or Next.js web, or before any sprint demo.

**What it reads:**
- New string keys added to `app_en.arb`
- `03-Technical-Product/06-Brand-Design-System.md` — Section 1.3 (Tone of Voice)
- Existing `app_ar.arb` for style consistency

**What it produces:**
1. Arabic translation for every new English string key
2. RTL punctuation corrections (Arabic uses ؟ not ?, ، not ,)
3. Tone check: matches SeaConnect's voice (warm, local, energetic — not corporate)
4. Gender-neutral phrasing where applicable
5. Number formatting: Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩) in Arabic locale

**Example prompt:**
```
Invoke arabic-copy-agent: Translate these new strings to Arabic for app_ar.arb:
- "booking_confirmed_title": "Booking Confirmed!"
- "booking_confirmed_subtitle": "Your trip is all set. The owner will contact you before departure."
- "cancel_booking_warning": "Cancellations within 24 hours of the trip are non-refundable."
- "owner_response_timer": "Owner has {hours}h {minutes}m to respond"
```

**Standards it enforces:**
- Egyptian Arabic dialect (عامية مصرية) for casual messages, Modern Standard Arabic (فصحى) for legal/formal text
- Numbers in Arabic-Indic format in Arabic locale
- Dates in Arabic month names (أبريل, not April)
- Currency: "ج.م" not "EGP" in Arabic mode
- RTL punctuation used consistently

---

## Agent 13: `db-query-agent`

**When to invoke:**
When a Django ORM query is slow (> 100ms in Supabase metrics), before adding a new complex query, or during Sprint 17 (Load Testing) when bottlenecks are found.

**What it reads:**
- The slow query or ORM expression
- `03-Technical-Product/04-Database-Schema.md` — existing indexes
- `EXPLAIN ANALYZE` output (provided by developer)

**What it produces:**
1. Analysis of why the query is slow (missing index, full table scan, N+1)
2. Optimal ORM rewrite (using `select_related`, `prefetch_related`, `only`, `defer`)
3. Index definition to add (with migration)
4. Confirmation that the index uses `CONCURRENTLY` for zero-downtime
5. Before/after estimated query cost from `EXPLAIN`

**Example prompt:**
```
Invoke db-query-agent: This query is taking 800ms on the yachts search endpoint:
Yacht.objects.filter(
    location__icontains=location,
    capacity__gte=party_size,
    status='ACTIVE'
).order_by('-rating')

EXPLAIN ANALYZE output: [paste output here]
The yachts table has ~500 rows currently but will grow to 10,000+.
Suggest the optimal index and ORM rewrite.
```

**Standards it enforces:**
- No N+1 queries (use `select_related`/`prefetch_related`)
- No `__icontains` on large text columns without full-text search index
- Pagination enforced (no unbounded querysets)
- New indexes use `CONCURRENTLY`
- Complex filters moved to database-level using `Q()` objects

---

## Agent 14: `sprint-kickoff-agent`

**When to invoke:**
At the start of every sprint (Monday morning of each sprint week).

**What it reads:**
- `03-Technical-Product/05-MVP-Scope.md` — sprint deliverables for the upcoming sprint
- `03-Technical-Product/02-API-Specification.md` — endpoints relevant to this sprint
- `03-Technical-Product/04-Database-Schema.md` — tables relevant to this sprint
- Git log from last sprint: `git log --oneline --since="7 days ago"`

**What it produces:**
1. Sprint summary: what was delivered last sprint (from git log)
2. This sprint's scope: exact features from the MVP scope doc
3. File checklist: which files to create/modify this sprint
4. API endpoints to implement this sprint (with spec links)
5. DB tables/migrations needed this sprint
6. Flutter screens to build this sprint (with UX flow links)
7. Dependencies: what must be done first vs. can be parallelized
8. Definition of Done checklist for this sprint

**Example prompt:**
```
Invoke sprint-kickoff-agent: We are starting Sprint 4 (Booking Flow).
Last sprint (Sprint 3) focused on Yacht Listings.
Generate the full Sprint 4 kickoff brief.
```

---

## Agent 15: `pr-review-agent`

**When to invoke:**
Before merging any pull request. Run automatically in GitHub Actions (or manually).

**What it reads:**
- All changed files in the PR (`git diff main...HEAD`)
- `03-Technical-Product/03-Tech-Stack.md` — coding standards
- `09-Safety-Security/01-Safety-Requirements.md` — security checklist
- `03-Technical-Product/02-API-Specification.md` — response format standards

**What it produces:**
1. Summary of what the PR does
2. Standards compliance check (pass/fail per item)
3. Specific line-level feedback for failures
4. Overall verdict: `APPROVE` / `REQUEST CHANGES` / `NEEDS SECURITY REVIEW`

**Checklist it runs:**

```
BACKEND:
  [ ] No business logic in views.py (belongs in services.py)
  [ ] All endpoints have permission_classes
  [ ] Response envelope matches standard { success, data } format
  [ ] No raw SQL without parameterization
  [ ] No hardcoded secrets or credentials
  [ ] Serializer validates all user inputs
  [ ] Pagination applied to list endpoints
  [ ] Tests written (test file exists for new feature)

FLUTTER:
  [ ] No hardcoded hex colors (must use AppTheme tokens)
  [ ] No hardcoded strings (must use arb keys)
  [ ] EdgeInsetsDirectional used (not EdgeInsets with left/right)
  [ ] Loading, empty, and error states handled
  [ ] Screen registered in router.dart

GENERAL:
  [ ] No console.log / print statements left in code
  [ ] No TODO comments without an issue number
  [ ] No commented-out code blocks
  [ ] File names match conventions (snake_case.py, camelCase.dart, kebab-case.tsx)
  [ ] No package version changes without explanation in PR description
```

**Example prompt:**
```
Invoke pr-review-agent: Review the PR "feat: implement booking creation endpoint".
Changed files: seaconnect_api/bookings/views.py, serializers.py, services.py, urls.py, tests/test_bookings.py.
```

---

## How to Configure These Agents in Claude Code

Each agent is defined as a CLAUDE.md instruction file or a reusable prompt template. Recommended setup:

### Option A: Project CLAUDE.md (Simplest)
Add agent invocation instructions to `.claude/CLAUDE.md` at the project root:

```markdown
# SeaConnect Agent Instructions

When asked to create a Django model, always:
1. Read 03-Technical-Product/04-Database-Schema.md for the schema
2. Follow the standards in 03-Technical-Product/03-Tech-Stack.md
3. Produce: model + admin + serializer + migration command

When asked to build a Flutter screen, always:
1. Read 03-Technical-Product/07-UX-Flows.md for the screen spec
2. Read 03-Technical-Product/06-Brand-Design-System.md for theming
3. Include loading, empty, and error states
4. Use Cairo/Inter fonts, AppTheme color tokens only
```

### Option B: Slash Commands (Structured)
Create `/commands/` directory with one markdown file per agent:

```
.claude/
  commands/
    django-model.md        → /django-model [table-name]
    api-endpoint.md        → /api-endpoint [method] [path]
    flutter-screen.md      → /flutter-screen [screen-name]
    flutter-rtl-audit.md   → /rtl-audit [file-path]
    celery-task.md         → /celery-task [task-name]
    test-writer.md         → /test-writer [file-path]
    migration-safety.md    → /migration-safety [change-description]
    security-audit.md      → /security-audit [file-paths]
    sprint-kickoff.md      → /sprint-kickoff [sprint-number]
    pr-review.md           → /pr-review [pr-description]
```

### Option C: GitHub Actions Integration (Automated)
Certain agents run automatically via CI:

```yaml
# .github/workflows/claude-agents.yml
on: [pull_request]
jobs:
  security-audit:
    # Runs security-audit-agent on every PR
  pr-review:
    # Runs pr-review-agent on every PR targeting main
  rtl-audit:
    # Runs flutter-rtl-agent when Flutter files change
```

---

## Agent Priority by Sprint

| Sprint | Active Agents |
|--------|--------------|
| 1 (Setup) | `sprint-kickoff-agent`, `migration-safety-agent` |
| 2 (Auth) | `django-model-agent`, `api-endpoint-agent`, `test-writer-agent`, `security-audit-agent` |
| 3 (Yacht Listings) | `django-model-agent`, `api-endpoint-agent`, `flutter-screen-agent`, `flutter-rtl-agent`, `arabic-copy-agent` |
| 4 (Bookings) | `api-endpoint-agent`, `flutter-screen-agent`, `celery-task-agent`, `test-writer-agent` |
| 5 (Payments) | `fawry-integration-agent`, `celery-task-agent`, `notification-agent`, `security-audit-agent` |
| 6 (Marketplace) | `django-model-agent`, `api-endpoint-agent`, `flutter-screen-agent`, `notification-agent` |
| 7 (Admin Portal) | `admin-portal-agent`, `api-endpoint-agent` |
| 8 (Notifications) | `notification-agent`, `arabic-copy-agent` |
| 9 (Localization) | `flutter-rtl-agent`, `arabic-copy-agent` |
| 10-13 (Polish/Search/Dashboard) | `flutter-screen-agent`, `db-query-agent`, `flutter-rtl-agent` |
| 14 (Security) | `security-audit-agent` (full codebase scan) |
| 15-16 (Tests) | `test-writer-agent` (gap fill to 80% coverage) |
| 17 (Load Testing) | `db-query-agent`, `celery-task-agent` |
| 18-20 (Launch) | `pr-review-agent`, `migration-safety-agent` |

---

**Last Updated:** April 6, 2026
**Owner:** Technical Lead
