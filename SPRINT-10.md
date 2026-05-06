# Sprint 10 — Owner Yacht CRUD, Live API Wiring, KYC Profile

**Sprint:** 10  
**Date:** 2026-05-06  
**Theme:** Close remaining end-to-end gaps: owner can create/edit yachts, payouts and availability show real data, KYC pipeline is fully wired.

---

## Goals

1. **10A — Owner Yacht CRUD** — `POST /api/v1/yachts/` + `PATCH /api/v1/yachts/{id}/` so the "new yacht" form and listing editor actually save
2. **10B — Live API Wiring** — Replace mock data in `PayoutsPageClient` and `AvailabilityCalendar` with real SWR calls
3. **10C — KYC Owner Profile** — `BoatOwnerProfile` model, submit endpoint, admin approve/reject endpoints

---

## Task Assignments

| Task | Agent | Status |
|------|-------|--------|
| 10A — Owner yacht CRUD API | api-endpoint-agent | RUNNING |
| 10B — Wire payouts + availability | nextjs-page-agent | RUNNING |
| 10C — KYC owner profile model + API | django-model-agent | RUNNING |

---

## Definition of Done

- [ ] `POST /api/v1/yachts/` creates draft yacht owned by authenticated owner
- [ ] `PATCH /api/v1/yachts/{id}/` updates own yacht, 403 for wrong owner
- [ ] `PayoutsPageClient` calls `/payments/payouts/` via SWR (mock as fallback)
- [ ] `AvailabilityCalendar` calls `/bookings/yachts/{id}/availability/` via SWR (mock as fallback)
- [ ] `BoatOwnerProfile` model with 6-step KYC boolean flags
- [ ] `GET /api/v1/accounts/owner-profile/` get-or-create for owner
- [ ] `POST /api/v1/accounts/owner-profile/submit/` transitions to SUBMITTED
- [ ] Admin approve/reject KYC endpoints
- [ ] All existing 314 tests still pass + new tests
- [ ] `cd web && npx tsc --noEmit` — 0 errors
