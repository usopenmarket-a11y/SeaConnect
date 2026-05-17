# SeaConnect — Full Product Roadmap

**Last updated:** 2026-05-17  
**Strategy:** Egypt-first web launch → MENA expansion in Year 2  
**Stack:** Django 5 + DRF (backend) · Next.js 14 App Router (web) · Next.js 14 (admin portal)  
**Infra:** Docker Compose (dev) · Render + Vercel + Supabase (UAT/prod)

---

## Sprint Status Overview

| Sprint | Theme | Status | Key Deliverables |
|--------|-------|--------|-----------------|
| **1** | Infrastructure & Scaffold | ✅ DONE | Docker stack, Django apps, Next.js i18n, CI/CD |
| **2** | Auth + Listings Foundation | ✅ DONE | JWT auth, Yacht model, listing pages, register/login |
| **3** | Booking Flow + State Machine | ✅ DONE | Booking CRUD, state machine, availability, Celery |
| **4** | Payments + Owner Dashboard | ✅ DONE | Fawry integration, PaymentProvider, owner UI |
| **5** | Marketplace + Vendor Foundation | ✅ DONE | Product model, vendor pages, marketplace listing |
| **9** | FCM Push, Payouts, Availability | ✅ DONE | Firebase push, Payout model, BlockedDate, availability API |
| **10** | CRUD Wiring, KYC, New Pages | ✅ DONE | KYC onboarding, marketplace filters, notifications/settings/search pages |
| **11** | KYC Upload, Notifications API, Vendor CRUD | ✅ DONE | KYC upload endpoint, notifications live+badge, settings wired, vendor product/orders/calendar/payouts pages |
| **12** | Reviews, Weather, Payment Flows, Map | ✅ DONE | YachtReview system, weather + fishing guide, payment flows, Leaflet map, product image upload |
| **13** | Admin Portal Complete, Competitions, Analytics | ✅ DONE | Disputes model+API+page, payout approvals, user mgmt, competitions registration+results, analytics wired |
| **14** | Search & SEO, pgvector, Performance | ✅ DONE | pgvector semantic search, SEO metadata+JSON-LD+sitemap+robots, Image component, search tabs/facets/sort |
| **15** | Security, Rate Limiting, Sentry | ✅ DONE | DRF throttling, OWASP audit (webhook idempotency + KYC filename fixes), Sentry Django+Next.js, enhanced /health/ |
| **16** | AI Pricing, Cart, Analytics, Launch Prep | ✅ DONE | AI pricing insight (Ollama+Redis), cart+checkout complete, owner earnings chart live, GA4, prod.py settings |

---

## What Is Built (Sprints 1–10)

### Backend API (Django)
- ✅ JWT RS256 auth — register, login, refresh, logout, `/users/me/`
- ✅ Yacht CRUD — list (public), detail (public), create/update (owner-only)
- ✅ Booking lifecycle — create, confirm, decline, cancel, complete (state machine + events)
- ✅ Availability endpoint — `GET /api/v1/bookings/yachts/{id}/availability/?month=YYYY-MM`
- ✅ Payments — Fawry initiate + webhook, PaymentProvider abstraction, `Payment` model
- ✅ Payouts — `Payout` model, `GET /api/v1/payments/payouts/`, `GET /api/v1/payments/escrow/`
- ✅ Marketplace — Product model, vendor CRUD, public listing with filters (price/rating/category)
- ✅ KYC — `BoatOwnerProfile`, 6-step flags, submit/approve/reject endpoints
- ✅ Notifications — `Notification` model, FCM push via Firebase Admin SDK (singleton, dev no-op)
- ✅ Weather — Open-Meteo integration, fishing seasons, whats-biting
- ✅ Analytics — `AdminPlatformStatsView`, `OwnerEarningsSummaryListView`, audit log
- ✅ pgvector — installed, `Yacht.embedding` field, embedding generation Celery task
- ✅ BlockedDate model for calendar blocking
- ✅ CursorPagination on all list endpoints
- ✅ 823+ passing tests

### Web Frontend (Next.js)
- ✅ Home page with sea canvas background + hero
- ✅ Yacht listing + detail pages (full design match)
- ✅ Booking form (3-step wizard), booking list, booking detail
- ✅ Marketplace listing with category/price/rating filters
- ✅ Competitions listing page
- ✅ Login + Register (auth-card design, full i18n)
- ✅ Search page (yacht search)
- ✅ Notifications page (mock data)
- ✅ Settings page (mock profile)
- ✅ Owner dashboard (KPIs, calendar, payout card, reviews, AI insight)
- ✅ Owner calendar (live availability via SWR)
- ✅ Owner payouts page (live SWR to `/api/v1/payments/payouts/`)
- ✅ Owner KYC onboarding page (6 steps, submit flow)
- ✅ Owner yacht new/edit forms (wired to POST/PATCH API)
- ✅ AR/EN full i18n — 600+ keys, zero parity gaps
- ✅ RTL-correct logical CSS throughout

### Admin Portal (Next.js)
- ✅ Admin dashboard with KPI cards + revenue chart (live analytics API)
- ✅ KYC queue page — approve/reject owners
- ✅ Admin sidebar navigation

---

## What Remains (Sprints 11–16)

### Sprint 11 — KYC Upload, Notifications, Vendor
- KYC step file upload to MinIO
- `GET /api/v1/notifications/` API + mark-as-read
- Notifications page wired to live data
- Settings page wired to real user profile
- Vendor product CRUD pages
- CompetitionsPage.tsx TS fix

### Sprint 12 — Reviews, Weather, Payment Flows, Map
- Review write/read endpoints + ReviewsPage + WriteReviewPage
- Weather advisory page (`/weather`)
- Fishing guide page (`/fishing-guide`)
- Payment flow pages (processing → success / failure)
- Map view with yacht pins (Leaflet + OpenStreetMap)
- Product image upload endpoint

### Sprint 13 — Admin Complete, Competitions, Analytics API
- `GET /api/v1/analytics/stats/` — GTV, revenue, MoM delta
- Dispute model + admin disputes page
- Admin payout approvals page
- Admin user management (suspend, role change)
- Competition registration + results full flow

### Sprint 14 — Search & SEO
- pgvector semantic search on yachts and products
- `generateMetadata` + OpenGraph + JSON-LD on all public pages
- `sitemap.xml` + `robots.txt`
- `<Image>` component everywhere
- Lighthouse LCP < 2.5s, CLS < 0.1
- Search page: gear + yacht tabs, region facet, sort

### Sprint 15 — Security & UAT
- Rate limiting on auth/payment/upload endpoints
- OWASP security audit + fixes
- Sentry (Django + Next.js)
- Structured `/health/` endpoint
- UAT deployment (Render + Vercel) + full checklist
- Locust load test at 100 concurrent users

### Sprint 16 — AI, Real-time, Cart, Launch
- `GET /api/v1/yachts/{id}/pricing-insight/` (Ollama/GPT-4o-mini)
- Django Channels WebSocket for real-time notifications
- Cart → checkout → Fawry → order confirmation complete
- Owner earnings MoM delta live
- Production domain + SSL + Google Analytics
- **Egypt public launch**

---

## Year 2 Scope (Post-Launch)

These items are deliberately deferred to after Egypt PMF is confirmed:

| Feature | Notes |
|---------|-------|
| Flutter mobile app | ADR decision: web-first, Flutter in Year 2 |
| UAE expansion | Telr payment provider (AED), region flag in models ready |
| KSA expansion | Stripe for international, new Region seed data |
| Morocco / Turkey | Additional regions, language support |
| Captain marketplace | Third party captains for non-owner-operated yachts |
| Live GPS tracking | Real-time vessel position during trips |
| Subscription/membership | Annual pass for frequent customers |
| B2B corporate bookings | Group bookings, invoicing, net-30 payments |
| Affiliate program | Referral links, commission tracking |
| Insurance integration | On-demand trip insurance via API partner |

---

## Architecture Constraints (Non-Negotiable ADRs)

| Rule | ADR |
|------|-----|
| No raw SQL — ORM only | ADR-001 |
| All PKs are UUID | ADR-001 |
| PaymentProvider abstraction — never call Fawry/Telr/Stripe directly | ADR-007 |
| JWT RS256: 15min access / 30day refresh, never in localStorage | ADR-009 |
| Event sourcing for booking state — append-only booking_events | ADR-012 |
| CursorPagination on all list endpoints | ADR-013 |
| Arabic-first RTL — logical CSS in Next.js | ADR-014 |
| All UI strings via i18n keys | ADR-015 |
| Region FK on every location-specific model | ADR-018 |
| pgvector for semantic search (768 dims Ollama / 1536 OpenAI) | ADR-019 |

---

## Key File Locations

| What | Where |
|------|-------|
| Sprint plans | `SPRINT-{N}.md` in repo root |
| Agent handoffs | `HANDOFFS.md` in repo root |
| Architecture decisions | `CLAUDE.md` (binding ADRs) |
| UAT checklist | `UAT-CHECKLIST.md` |
| Design prototype | `Design/SeaConnect.html` (open in browser) |
| Docker stack | `docker-compose.yml` |
| Backend | `backend/apps/{module}/` |
| Web frontend | `web/app/[locale]/` |
| Admin portal | `admin/app/[locale]/` |
