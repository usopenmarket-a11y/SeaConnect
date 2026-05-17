# Sprint 10 — Owner Yacht CRUD, Live API Wiring, KYC Profile

**Sprint:** 10  
**Date:** 2026-05-17 (started)  
**Theme:** Close remaining end-to-end gaps: owner can create/edit yachts, payouts and availability show real data, KYC pipeline is fully wired.

---

## Pre-Sprint Audit (2026-05-17)

Before this sprint began, the following were already fully implemented from prior sessions:

| Item | Status |
|------|--------|
| `POST /api/v1/yachts/` — owner creates draft yacht | ✅ DONE |
| `PATCH /api/v1/yachts/{id}/` — owner partial update, 403 wrong owner | ✅ DONE |
| `BoatOwnerProfile` model (6 KYC steps + status) | ✅ DONE |
| `GET /api/v1/accounts/owner-profile/` | ✅ DONE |
| `POST /api/v1/accounts/owner-profile/submit/` | ✅ DONE |
| Admin KYC approve/reject endpoints | ✅ DONE |
| `Payout` model + `/api/v1/payments/payouts/` | ✅ DONE (Sprint 9B) |
| `BlockedDate` + `/api/v1/bookings/yachts/{id}/availability/` | ✅ DONE (Sprint 9C) |
| FCM push singleton (firebase.py) | ✅ DONE (Sprint 9A) |

---

## Goals

1. **10A — Owner Yacht CRUD** — `POST /api/v1/yachts/` + `PATCH /api/v1/yachts/{id}/` ✅ pre-existing
2. **10B — Live API Wiring** — Replace mock data in `PayoutsPageClient` with real SWR calls to `/api/v1/payments/payouts/` + wire `AvailabilityCalendar` to `/api/v1/bookings/yachts/{id}/availability/`
3. **10C — KYC Owner Profile** — Model + endpoints ✅ pre-existing; wire KYC onboarding UI to real API
4. **10D — KYC onboarding page** — Convert `Design/system-pages.jsx KYCPage()` to production Next.js
5. **10E — Marketplace product filter params** — Add `?price_min`, `?price_max`, `?rating` support to `GET /api/v1/marketplace/products/`
6. **10F — Owner yacht form** — Wire `owner/yachts/new` + `owner/yachts/[id]` edit form to real `POST`/`PATCH` API
7. **10G — Design pages** — KYC page, notifications page, settings page, search page

---

## Task Assignments

| Task | Agent | Status |
|------|-------|--------|
| 10B — Wire payouts + availability calendar | nextjs-page-agent | DONE |
| 10C/D — KYC onboarding UI wire | nextjs-page-agent | RUNNING |
| 10E — Marketplace product filter params API | api-endpoint-agent | RUNNING |
| 10F — Owner yacht form wire | nextjs-page-agent | DONE |
| 10G — Design: KYC, notifications, settings, search | design-conversion-agent | RUNNING |

---

## Definition of Done

- [x] `POST /api/v1/yachts/` creates draft yacht owned by authenticated owner
- [x] `PATCH /api/v1/yachts/{id}/` updates own yacht, 403 for wrong owner
- [x] `PayoutsPageClient` SWR calls live API (mock fallback in dev)
- [x] `AvailabilityCalendar` SWR calls live API (mock fallback)
- [x] `BoatOwnerProfile` model with 6-step KYC boolean flags
- [x] `GET /api/v1/accounts/owner-profile/` get-or-create for owner
- [x] `POST /api/v1/accounts/owner-profile/submit/` transitions to SUBMITTED
- [x] Admin approve/reject KYC endpoints
- [ ] KYC onboarding page matches Design/system-pages.jsx KYCPage()
- [ ] Marketplace API supports price_min/price_max/rating filters
- [ ] Owner yacht new/edit form POSTs/PATCHes to real API
- [ ] Notifications page converted from design
- [ ] Settings page converted from design
- [ ] Search page converted from design
- [ ] All existing tests still pass + new tests written
- [ ] `cd web && npx tsc --noEmit` — 0 errors
