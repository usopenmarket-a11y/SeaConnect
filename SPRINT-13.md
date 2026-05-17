# Sprint 13 — Admin Portal Completion, Analytics API, Competitions Full Flow

**Sprint:** 13
**Date:** TBD
**Theme:** Complete the admin portal, ship the analytics API the admin dashboard already consumes, and build the competitions end-to-end flow.

---

## Pre-Sprint State

Sprints 1–12 complete. Key gaps entering Sprint 13:
- Admin portal has dashboard + KYC queue pages — needs disputes, payouts management, user management
- `GET /api/v1/analytics/stats/` is referenced by admin dashboard but does not exist (HANDOFFS entry)
- Competitions app has models but no complete booking/registration flow
- Admin portal missing: disputes page, payout approvals page, platform settings

---

## Goals

1. **13A — Analytics API** — `GET /api/v1/analytics/stats/` + `GET /api/v1/analytics/earnings/` admin endpoints
2. **13B — Admin disputes page** — Dispute model + admin dispute management UI
3. **13C — Admin payout approvals** — Payout approval/rejection workflow in admin portal
4. **13D — Admin user management** — User list, role change, suspend/unsuspend in admin portal
5. **13E — Competitions full flow** — Registration endpoint + competition booking + results page

---

## Task Assignments

| Task | Agent | Priority |
|------|-------|----------|
| 13A — Analytics API | api-endpoint-agent | HIGH |
| 13B — Admin disputes | django-model-agent + admin-portal-agent | HIGH |
| 13C — Admin payout approvals | admin-portal-agent | MEDIUM |
| 13D — Admin user management | admin-portal-agent | MEDIUM |
| 13E — Competitions flow | api-endpoint-agent + design-conversion-agent | HIGH |

---

## Sprint 13A — Analytics API

**File:** `backend/apps/analytics/views.py` (already has `AdminPlatformStatsView` stub — verify and complete)

**`GET /api/v1/analytics/stats/`** — admin-only (`IsAdminUser`)
Response:
```json
{
  "gtv_total": "284750.00",
  "gtv_currency": "EGP",
  "revenue_total": "34170.00",
  "bookings_total": 342,
  "active_yachts": 18,
  "active_vendors": 7,
  "mom_gtv_delta": 0.22
}
```
- GTV = sum of `PaymentStatus.CAPTURED` payments
- Revenue = GTV × 0.12 (platform take rate)
- MoM delta = (this month GTV − last month GTV) / last month GTV

**`GET /api/v1/analytics/earnings/`** — owner-only (`IsAuthenticated` + role check)
Response: monthly earnings breakdown for the authenticated owner
```json
{
  "results": [
    {"month": "2026-05", "earnings": "38420.00", "currency": "EGP", "bookings": 12}
  ]
}
```

**`GET /api/v1/analytics/audit-log/`** — already exists (check and verify)

Tests: 6 new tests covering stats accuracy, earnings filtering, auth gates.

---

## Sprint 13B — Admin Disputes

### Backend
**New model:** `Dispute` in `backend/apps/bookings/models.py`
```python
class Dispute(TimeStampedModel):
    id = UUIDField(primary_key=True)
    booking = ForeignKey(Booking, on_delete=PROTECT)
    raised_by = ForeignKey(User, related_name='disputes_raised')
    reason = CharField(max_length=500)
    status = CharField(choices=['open','investigating','resolved','closed'])
    resolution = TextField(blank=True)
    resolved_by = ForeignKey(User, null=True, related_name='disputes_resolved')
    resolved_at = DateTimeField(null=True)
```

**New endpoints:**
- `POST /api/v1/bookings/{id}/dispute/` — customer or owner raises dispute
- `GET /api/v1/admin/disputes/` — admin list, filterable by status
- `POST /api/v1/admin/disputes/{id}/resolve/` — admin resolves with resolution text

### Admin Portal
**New page:** `admin/app/[locale]/disputes/page.tsx` + `PageClient.tsx`
- Table: booking ref, raised by, reason, status, date
- Status filter tabs (open / investigating / resolved)
- Click row → dispute detail with resolution form
- Design reference: use same table pattern as KYC queue page

---

## Sprint 13C — Admin Payout Approvals

**File:** `admin/app/[locale]/payouts/` — create if not exists

**Backend:** `POST /api/v1/admin/payouts/{id}/approve/` — mark payout as `processing`
Already have payout model from Sprint 9B.

**Admin portal page:**
- List of `scheduled` payouts awaiting approval
- Approve button → marks as `processing`
- Shows owner name, amount, payment_method, scheduled_date
- Filter by status

---

## Sprint 13D — Admin User Management

**New page:** `admin/app/[locale]/users/page.tsx` + `PageClient.tsx`

**Backend:** `GET /api/v1/admin/users/` — admin list all users (CursorPagination)
Check if exists; create if not. Response: `{id, email, first_name, last_name, role, kyc_status, is_active, created_at}`

**New endpoints:**
- `PATCH /api/v1/admin/users/{id}/role/` — change user role
- `POST /api/v1/admin/users/{id}/suspend/` — set `is_active = False`
- `POST /api/v1/admin/users/{id}/unsuspend/` — set `is_active = True`

**Admin portal:**
- User table with role badge, status badge
- Search by email
- Role change dropdown
- Suspend/unsuspend action buttons

---

## Sprint 13E — Competitions Full Flow

### Backend
**Competition app** already has models. Verify and add if missing:
- `POST /api/v1/competitions/{id}/register/` — register authenticated user for competition
  - Creates `CompetitionEntry` (check model; create if needed: `competition FK, participant FK, registration_date, catch_weight Decimal null, rank Int null, status`)
  - Returns 409 if already registered, 400 if competition full or past registration deadline
- `GET /api/v1/competitions/{id}/results/` — final standings (public after competition ends)
- `GET /api/v1/competitions/{id}/my-entry/` — current user's entry and status

### Frontend
**Design:** `Design/altpages.jsx CompsPage()`

- `web/app/[locale]/(public)/competitions/page.tsx` already exists (check current state)
- Add "Register" button to competition cards (auth-gated)
- `web/app/[locale]/(public)/competitions/[id]/page.tsx` — competition detail
  - Entry requirements, prizes, location, dates
  - Register button → `POST /api/v1/competitions/{id}/register/`
  - Results table (after competition ends)
- `web/app/[locale]/(public)/competitions/[id]/results/page.tsx` — full results leaderboard

---

## Definition of Done

- [ ] `GET /api/v1/analytics/stats/` returns correct GTV/revenue/bookings
- [ ] Admin dashboard KPI cards show live stats (no more mock)
- [ ] Dispute model exists with raise + admin resolve endpoints
- [ ] Admin disputes page lists and resolves disputes
- [ ] Admin payout approvals page working
- [ ] Admin user management with suspend/role-change
- [ ] Competition registration endpoint + competition detail page
- [ ] `npx tsc --noEmit` — 0 errors in both `web/` and `admin/`
