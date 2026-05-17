# Sprint 12 — Reviews System, Weather & Fishing, Payment Flows, Map View

**Sprint:** 12
**Date:** TBD
**Theme:** Reviews end-to-end, weather advisory, fishing season guide, payment success/failure flows, and the map view screen.

---

## Pre-Sprint State

Sprints 1–11 complete. Key gaps entering Sprint 12:
- Reviews exist in DB but no write endpoint — customers can't submit reviews
- Weather app has views but no frontend page
- Fishing season guide has API but no frontend page
- Payment flow pages (success/processing/failure) exist in design but not in Next.js
- Map view (`Design/map-view.jsx`) not converted
- `Design/reviews.jsx` ReviewsPage + WriteReviewPage not converted

---

## Goals

1. **12A — Reviews system** — Write review endpoint + ReviewsPage + WriteReviewPage frontend
2. **12B — Weather advisory page** — Convert `Design/weather-fishing.jsx WeatherPage()` to Next.js
3. **12C — Fishing guide page** — Convert `Design/weather-fishing.jsx FishingGuidePage()` to Next.js
4. **12D — Payment flow pages** — Convert `Design/payment-flows.jsx` (PayProcessing, PaySuccess, PayFailed) to Next.js
5. **12E — Map view** — Convert `Design/map-view.jsx` to Next.js (static map, no live GPS)
6. **12F — Product image upload** — `POST /api/v1/marketplace/products/{id}/images/` multipart endpoint

---

## Task Assignments

| Task | Agent | Priority |
|------|-------|----------|
| 12A — Reviews write endpoint + pages | api-endpoint-agent + design-conversion-agent | HIGH |
| 12B — Weather page | design-conversion-agent | MEDIUM |
| 12C — Fishing guide page | design-conversion-agent | MEDIUM |
| 12D — Payment flow pages | design-conversion-agent | HIGH |
| 12E — Map view | design-conversion-agent | LOW |
| 12F — Product image upload | api-endpoint-agent | MEDIUM |

---

## Sprint 12A — Reviews System

### Backend
**New endpoint:** `POST /api/v1/yachts/{id}/reviews/`
- Authenticated customer only
- Body: `{rating: 1-5, title: str, body: str}`
- Only allowed if customer has a `completed` booking for this yacht
- Creates `YachtReview` (check if model exists; create if not: `yacht FK, customer FK, rating IntegerField 1-5, title CharField, body TextField, created_at`)
- After write: update `Yacht.average_rating` (or trigger Celery task)
- Return created review

**New endpoint:** `GET /api/v1/yachts/{id}/reviews/`
- Public, paginated
- Returns reviews with `{id, rating, title, body, customer_name, created_at}`

**New endpoint:** `GET /api/v1/yachts/reviews/?page_size=3`
- Owner's received reviews (all yachts owned)
- Used in owner dashboard reviews widget

### Frontend
**Design:** `Design/reviews.jsx ReviewsPage()` + `WriteReviewPage()`

- `web/app/[locale]/(public)/yachts/[id]/reviews/page.tsx` — full review list for a yacht
- `web/app/[locale]/(public)/yachts/[id]/reviews/write/page.tsx` + `PageClient.tsx` — write review form (auth-gated, must have completed booking)
- Star rating input widget (1–5 stars, interactive)
- After submit: redirect back to yacht detail

---

## Sprint 12B — Weather Advisory Page

### Backend
`GET /api/v1/weather/` already exists — returns Open-Meteo data for a port.

### Frontend
**Design:** `Design/weather-fishing.jsx WeatherPage()`
**Target:** `web/app/[locale]/(public)/weather/page.tsx` + `PageClient.tsx`

- Port selector (Egypt ports list)
- Fetches `GET /api/v1/weather/?port_id={id}` via SWR
- Shows: current conditions (wind, wave height, temp), 5-day forecast cards
- Safety advisory banner (colour-coded: green/amber/red based on wind speed)
- Responsive grid layout matching design
- All strings i18n'd

---

## Sprint 12C — Fishing Guide Page

### Backend
`GET /api/v1/weather/fishing-seasons/` already exists.
`GET /api/v1/weather/whats-biting/` already exists.

### Frontend
**Design:** `Design/weather-fishing.jsx FishingGuidePage()`
**Target:** `web/app/[locale]/(public)/fishing-guide/page.tsx`

- Fish species cards with current season status (in-season / off-season)
- Best locations per species
- "What's biting" section (live from API)
- Month calendar showing season windows
- All strings i18n'd

---

## Sprint 12D — Payment Flow Pages

### Backend
Payment initiation already exists (`POST /api/v1/payments/initiate/`).
Fawry webhook already exists.

### Frontend
**Design:** `Design/payment-flows.jsx`

- `web/app/[locale]/(public)/yachts/[id]/book/payment/page.tsx` — PaymentPage (Fawry reference display)
- `web/app/[locale]/(public)/yachts/[id]/book/processing/page.tsx` — PayProcessing (polling spinner)
- `web/app/[locale]/(public)/bookings/[id]/confirmed/page.tsx` — PaySuccess (booking ticket)
- `web/app/[locale]/(public)/bookings/[id]/failed/page.tsx` — PayFailed (retry / contact)

PayProcessing polls `GET /api/v1/bookings/{id}/` every 3s until `status === 'confirmed'` then redirects to `/confirmed`.

---

## Sprint 12E — Map View

**Design:** `Design/map-view.jsx`
**Target:** `web/app/[locale]/(public)/map/page.tsx` + `PageClient.tsx`

- Static map using Leaflet.js (no API key required for OpenStreetMap tiles)
- Pins for each active yacht's departure port (fetched from `GET /api/v1/yachts/`)
- Click pin → shows yacht card popup with name, price, Book Now link
- Port filter sidebar matching design
- Mobile-responsive

---

## Sprint 12F — Product Image Upload

**New endpoint:** `POST /api/v1/marketplace/products/{id}/images/`
- Multipart upload, field name `file`
- Vendor must own the product (403 otherwise)
- Uploads to MinIO via `django-storages`
- Returns `{"image_url": str}`
- Link image URL to product (add `ProductImage` model if not exists)

---

## Definition of Done

- [ ] Customers can write reviews for completed bookings
- [ ] `GET /api/v1/yachts/{id}/reviews/` returns paginated reviews
- [ ] Weather advisory page live at `/{locale}/weather`
- [ ] Fishing guide page live at `/{locale}/fishing-guide`
- [ ] Payment flow pages (processing, success, failed) exist and wire to booking status
- [ ] Map view live at `/{locale}/map` with yacht pins
- [ ] Product image upload endpoint works end-to-end
- [ ] All new strings i18n'd in both message files
- [ ] `npx tsc --noEmit` — 0 errors
