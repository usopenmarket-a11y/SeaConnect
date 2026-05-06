# Sprint 9 — Push Notifications, Payouts API, Availability API

**Sprint:** 9  
**Date:** 2026-05-06  
**Theme:** Close the loop on FCM push notifications, owner payouts ledger, and yacht availability calendar

---

## Goals

1. **FCM Push** — Replace stub `send_push_notification` task with real Firebase Admin SDK call
2. **Payouts API** — `GET /api/v1/payments/payouts/` so PayoutsPageClient can drop mock data  
3. **Availability API** — `GET /api/v1/bookings/yachts/{id}/availability/` for the calendar widget
4. **Booking checkout i18n** — Wire remaining `t()` keys into `book/PageClient.tsx`
5. **Owner payout model** — Add `Payout` model (missing from payments app — mock data only today)

---

## Task Assignments

| Task | Agent | Priority |
|------|-------|----------|
| 9A — FCM push implementation | notification-agent | HIGH |
| 9B — Payout model + API | payment-integration-agent | HIGH |
| 9C — Availability endpoint | api-endpoint-agent | HIGH |
| 9D — Checkout i18n wire | nextjs-page-agent | MEDIUM |

---

## Sprint 9A — FCM Push Notifications

**File:** `backend/apps/notifications/tasks.py`

Replace TODO stub with real Firebase Admin SDK:
```python
# requirements/base.txt: add firebase-admin==6.5.0
# FIREBASE_CREDENTIALS_JSON env var (base64 JSON service account)

import firebase_admin
from firebase_admin import credentials, messaging
```

- Init app once (singleton pattern, check if already initialised)
- `send_push_notification` task: build `messaging.Message`, call `messaging.send()`
- Handle `FirebaseError`: log and mark notification `failed`, do NOT retry FCM errors
- `FIREBASE_CREDENTIALS_JSON` env var → decode base64 → `credentials.Certificate(json.loads(...))`

---

## Sprint 9B — Payout Model + API

**New model:** `apps/payments/models.py` — add `Payout` model

```python
class Payout(TimeStampedModel):
    id = UUIDField(primary_key=True, ...)
    owner = ForeignKey(settings.AUTH_USER_MODEL, ...)
    amount = DecimalField(max_digits=12, decimal_places=2)
    currency = CharField(max_length=3)
    status = CharField(choices=['scheduled','processing','paid','failed'])
    reference = CharField(max_length=50, unique=True)
    payment_method = CharField(max_length=50)  # bank name + last 4
    scheduled_date = DateField()
    paid_at = DateTimeField(null=True, blank=True)
    escrow_booking_ids = JSONField(default=list)  # UUIDs of bookings included
```

**New endpoint:** `GET /api/v1/payments/payouts/`
- Filter to `request.user` owner
- CursorPagination, ordering=`-scheduled_date`
- Response shape: `{results: [...], next_cursor, has_more}`

**Escrow endpoint:** `GET /api/v1/payments/escrow/`
- Returns bookings in `completed` status within 24h hold window

---

## Sprint 9C — Availability Endpoint

**New endpoint:** `GET /api/v1/bookings/yachts/{id}/availability/?month=2026-05`

Response:
```json
{
  "yacht_id": "uuid",
  "month": "2026-05",
  "days": {
    "2026-05-01": "open",
    "2026-05-02": "booked",
    "2026-05-14": "blocked",
    "2026-05-21": "limited"
  },
  "pricing": {
    "base_price": "2280.00",
    "currency": "EGP"
  }
}
```

Logic:
- `booked`: any confirmed/completed booking covering that date
- `blocked`: `BlockedDate` model (new, simple: yacht FK + date + reason)
- `limited`: 1 slot remaining (capacity − confirmed bookings that day)
- `open`: otherwise

---

## Sprint 9D — Checkout i18n

**File:** `web/app/[locale]/yachts/[id]/book/PageClient.tsx`

Add `useTranslations('booking.checkout')` to `BookingCheckoutPage` (main export), then:
- Replace STEPS array hardcoded strings with `t('steps.tripDetails')` etc.
- Replace SummaryPanel hardcoded labels with `t('summary.*')`
- Replace step-level subhead strings with `t('tripType')`, `t('departureTime')` etc.
- Replace submit/processing button labels

---

## Definition of Done

- [ ] `pytest backend/apps/notifications/tests/ -v` — all pass with FCM mock
- [ ] `GET /api/v1/payments/payouts/` returns 200 with cursor pagination
- [ ] `GET /api/v1/bookings/yachts/{id}/availability/` returns correct day states
- [ ] `cd web && npx tsc --noEmit` — 0 errors
- [ ] AR/EN message counts still equal after checkout i18n
