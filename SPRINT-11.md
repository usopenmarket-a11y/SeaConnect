# Sprint 11 — KYC Upload Flow, Notifications API, Vendor Dashboard, File Upload

**Sprint:** 11
**Date:** TBD
**Theme:** Complete the owner onboarding loop, wire the notifications page to live data, build the vendor dashboard, and add file/image upload infrastructure.

---

## Pre-Sprint State

Sprints 1–10 complete. Key gaps entering Sprint 11:
- KYC onboarding page exists but "Mark as Complete" buttons are no-ops (deferred from Sprint 10D)
- Notifications page shows mock data — `GET /api/v1/notifications/` not yet wired
- Settings page shows mock profile — `GET /api/v1/accounts/users/me/` not yet wired
- Vendor dashboard has a stub (`vendor/DashboardClient.tsx`) but no real pages
- No file/image upload infrastructure (MinIO pre-signed URLs)
- `CompetitionsPage.tsx` TypeScript module resolution error (carry-over)

---

## Goals

1. **11A — KYC document upload** — MinIO pre-signed URL upload + `PATCH /api/v1/accounts/owner-profile/` step marking
2. **11B — Notifications API + wire** — `GET /api/v1/notifications/` endpoint + wire notifications page
3. **11C — Settings profile wire** — Wire settings page to `GET /api/v1/accounts/users/me/` + `PATCH /api/v1/accounts/profile/`
4. **11D — Vendor dashboard + product CRUD** — Vendor pages: product list, new product form, order management
5. **11E — CompetitionsPage.tsx TS fix** — Fix pre-existing module resolution error

---

## Task Assignments

| Task | Agent | Priority |
|------|-------|----------|
| 11A — KYC upload + PATCH step | api-endpoint-agent + nextjs-page-agent | HIGH |
| 11B — Notifications API + wire | api-endpoint-agent + nextjs-page-agent | HIGH |
| 11C — Settings profile wire | nextjs-page-agent | MEDIUM |
| 11D — Vendor dashboard + product CRUD | api-endpoint-agent + nextjs-page-agent | HIGH |
| 11E — CompetitionsPage TS fix | nextjs-page-agent | LOW |

---

## Sprint 11A — KYC Document Upload

### Backend
**New endpoint:** `POST /api/v1/accounts/owner-profile/upload/`
- Accept `multipart/form-data` with `file` and `doc_type` (identity/boat_docs/insurance/port_auth/safety_cert/bank_details)
- Upload to MinIO via `django-storages` — use existing MinIO config
- Create `KYCDocument` record linked to owner's profile
- After upload: set the corresponding `stepN_*_verified = True` on `BoatOwnerProfile` + save
- Return `{"document_url": str, "step": str, "completed_steps": int}`

**New endpoint:** `PATCH /api/v1/accounts/owner-profile/`
- Allow owners to update step booleans directly (for manual step marking without file upload)
- Only allow updating step fields, not `kyc_status` directly

### Frontend
**File:** `web/app/[locale]/owner/onboarding/PageClient.tsx`
- Replace "Contact support" toast with real file upload dialog
- Use `<input type="file">` → `POST /api/v1/accounts/owner-profile/upload/`
- Show upload progress, success state, error handling
- Re-fetch profile via SWR after successful upload

---

## Sprint 11B — Notifications API + Wire

### Backend
**Check:** `backend/apps/notifications/models.py` — verify `Notification` model has `recipient`, `title`, `body`, `is_read`, `notification_type`, `created_at`

**New endpoint:** `GET /api/v1/notifications/`
- Filter to `request.user` as recipient
- CursorPagination, ordering=`-created_at`
- Response: `{results:[{id, title, body, is_read, notification_type, created_at}], next_cursor, has_more}`

**New endpoint:** `POST /api/v1/notifications/{id}/read/`
- Mark single notification as read (`is_read = True`)

**New endpoint:** `POST /api/v1/notifications/read-all/`
- Mark all of user's notifications as read

### Frontend
**File:** `web/app/[locale]/(public)/notifications/PageClient.tsx`
- Replace mock data with `useSWR('/notifications/', get)` using authenticated fetcher
- Wire "Mark as read" per-item to `POST /api/v1/notifications/{id}/read/`
- Wire "Mark all as read" to `POST /api/v1/notifications/read-all/`
- Unread count badge in Nav (fetch count from notifications list)

---

## Sprint 11C — Settings Profile Wire

### Backend
**Check:** `GET /api/v1/users/me/` already exists (Sprint 2). Returns user profile.

**New endpoint:** `PATCH /api/v1/users/me/`
- Allow updating `first_name`, `last_name`, `phone` (not email — requires verification flow)
- Return updated user object

### Frontend
**File:** `web/app/[locale]/(public)/settings/PageClient.tsx`
- Fetch `GET /api/v1/users/me/` via SWR to populate profile section
- Make name/phone fields editable with save button
- Wire language switcher to Next.js locale routing (`router.push` to opposite locale)
- Wire logout button to `useAuth().logout()` → redirect to login

---

## Sprint 11D — Vendor Dashboard + Product CRUD

### Backend
Already exists (from Sprint 5/HANDOFFS):
- `GET /api/v1/marketplace/products/` — public product list ✅
- `GET /api/v1/marketplace/vendor/products/` — vendor's own products (check if exists)
- `POST /api/v1/marketplace/products/` — create product (check if exists)

**If missing, create:**
- `GET /api/v1/marketplace/vendor/products/` — vendor's products only, all statuses
- `POST /api/v1/marketplace/products/` — create (role=vendor required)
- `PATCH /api/v1/marketplace/products/{id}/` — update own product

### Frontend
**Files to create/update:**
- `web/app/[locale]/vendor/products/page.tsx` + `PageClient.tsx` — product list with edit/delete
- `web/app/[locale]/vendor/products/new/page.tsx` + `PageClient.tsx` — new product form
- `web/app/[locale]/vendor/products/[id]/page.tsx` + `PageClient.tsx` — edit product form
- `web/app/[locale]/vendor/orders/page.tsx` + `PageClient.tsx` — incoming orders

Design reference: `Design/seller-pages.jsx SellerListing()`

---

## Sprint 11E — CompetitionsPage TS Fix

**File:** `web/components/competitions/CompetitionsPage.tsx`
- Diagnose and fix the module resolution TypeScript error
- Pre-existing from earlier sprint — likely a missing import or type mismatch

---

## Definition of Done

- [ ] KYC step upload works end-to-end (file → MinIO → profile updated)
- [ ] `GET /api/v1/notifications/` returns user's notifications paginated
- [ ] Notifications page shows real data with read/unread state
- [ ] Settings page shows real user profile, name/phone editable
- [ ] Vendor product list/create/edit pages exist and call real API
- [ ] `CompetitionsPage.tsx` TypeScript error resolved
- [ ] All existing tests still pass + new tests for notifications API
- [ ] `npx tsc --noEmit` — 0 errors
