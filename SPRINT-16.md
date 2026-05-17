# Sprint 16 — AI Pricing Insight, Real-time Notifications, Cart & Checkout, Egypt Launch

**Sprint:** 16
**Date:** TBD
**Theme:** Ship AI-powered pricing recommendations, real-time notification delivery, complete the cart/checkout flow, and prepare the Egypt public launch.

---

## Pre-Sprint State

Sprints 1–15 complete. UAT passed. This is the final pre-launch sprint.

---

## Goals

1. **16A — AI pricing insight API** — Replace hardcoded AI insight text in owner dashboard with real Ollama/OpenAI recommendation
2. **16B — Real-time notifications** — Django Channels WebSocket for live notification delivery
3. **16C — Cart & checkout complete** — Complete cart flow: add to cart → checkout → Fawry payment
4. **16D — Owner dashboard analytics** — Real MoM delta data, revenue chart from live payouts
5. **16E — Launch prep** — Production deploy checklist, domain DNS, SSL, Google Analytics

---

## Task Assignments

| Task | Agent | Priority |
|------|-------|----------|
| 16A — AI pricing insight | backend-api-developer | MEDIUM |
| 16B — Real-time notifications | backend-api-developer | HIGH |
| 16C — Cart + checkout | api-endpoint-agent + nextjs-page-agent | HIGH |
| 16D — Owner analytics | api-endpoint-agent + nextjs-page-agent | MEDIUM |
| 16E — Launch prep | devops-infrastructure-specialist | HIGH |

---

## Sprint 16A — AI Pricing Insight

**New endpoint:** `GET /api/v1/yachts/{id}/pricing-insight/`
- Admin or owner only
- Calls Ollama `llama3.2` (dev) or OpenAI GPT-4o-mini (UAT/prod):
  ```
  Prompt: "Yacht: {name}, type: {type}, capacity: {capacity}, port: {port}.
  Current price: {price} EGP/day. Comparable yachts in the area: {comps}.
  Suggest an optimal price and explain in 2 sentences in Arabic."
  ```
- Compare against similar yachts (same type, ±20% capacity, same region) using pgvector
- Cache response for 24h in Redis (`CACHE_KEY = f'pricing_insight:{yacht_id}'`)
- Return `{"recommendation": "...", "suggested_price": "3200.00", "currency": "EGP", "generated_at": "..."}`

**Frontend:** Replace hardcoded AI insight text in `owner/dashboard/PageClient.tsx` with `useSWR('/yachts/{id}/pricing-insight/')` result.

---

## Sprint 16B — Real-time Notifications

**Package:** `channels[daphne]` + `channels-redis`

**Django Channels setup:**
- `ASGI_APPLICATION = 'config.asgi.application'`
- `CHANNEL_LAYERS = {"default": {"BACKEND": "channels_redis.core.RedisChannelLayer", "CONFIG": {"hosts": [REDIS_URL]}}}`

**Consumer:** `NotificationConsumer(AsyncWebsocketConsumer)`
- On connect: authenticate via JWT query param (`?token=...`), join user's group `notifications_{user_id}`
- On `send_push_notification` task success: `channel_layer.group_send` to user's group with notification payload

**Frontend:** Add WebSocket connection in `web/lib/notifications.ts`:
```ts
const ws = new WebSocket(`ws://api/ws/notifications/?token=${accessToken}`)
ws.onmessage = (e) => { // update SWR cache, show toast }
```

Add real-time notification toast component in root layout.

---

## Sprint 16C — Cart & Checkout Complete

### Backend
**Cart model** (if not exists): `Cart`, `CartItem` in marketplace app
- `GET /api/v1/marketplace/cart/` — get current user's cart
- `POST /api/v1/marketplace/cart/items/` — add item `{product_id, quantity}`
- `DELETE /api/v1/marketplace/cart/items/{id}/` — remove item
- `POST /api/v1/marketplace/cart/checkout/` — create order, initiate Fawry payment

**Order model:** `Order`, `OrderItem` (check if exists)

### Frontend
- `web/app/[locale]/(public)/cart/page.tsx` — cart review (check existing stub)
- `web/app/[locale]/(public)/checkout/page.tsx` — shipping + payment (check existing stub)
- Wire to cart API via SWR
- Cart item count badge in Nav
- Checkout → Fawry → order confirmation

---

## Sprint 16D — Owner Dashboard Analytics

**Enhancement to `GET /api/v1/analytics/earnings/`:**
Add `mom_delta` field: percentage change vs previous month.

**Frontend:** `owner/dashboard/PageClient.tsx`
- Replace mock delta labels (`+22% vs APR`) with real `mom_delta` from analytics API
- Wire revenue sparkline chart to real earnings data

---

## Sprint 16E — Launch Prep

**Production environment checklist:**
- [ ] Production Postgres on Supabase (upgrade to paid plan or self-host)
- [ ] Production Redis on Upstash
- [ ] Cloudflare R2 bucket with correct CORS policy
- [ ] Custom domain: seaconnect.eg (or .app) pointed to Vercel + Render
- [ ] SSL certificates auto-provisioned by Vercel + Render
- [ ] Firebase project created — production credentials added to env
- [ ] Fawry production credentials (merchant ID + API key) added
- [ ] Google Analytics GA4 tag added to Next.js (`@next/third-parties/google`)
- [ ] Sentry projects created for prod (separate from UAT)
- [ ] `DEBUG = False` in Django production settings
- [ ] `ALLOWED_HOSTS` set to production domain only
- [ ] Django `SECRET_KEY` rotated from dev default
- [ ] Database backup schedule configured (daily, 7-day retention)
- [ ] Run final UAT-CHECKLIST.md end-to-end on production

---

## Definition of Done

- [ ] AI pricing insight returns real LLM recommendation and caches in Redis
- [ ] Owner dashboard shows live AI insight
- [ ] WebSocket delivers notifications in real-time (< 1s latency)
- [ ] Cart → checkout → Fawry → order confirmation works end-to-end
- [ ] Owner earnings chart shows real MoM data
- [ ] Production domain live with SSL
- [ ] Google Analytics capturing page views
- [ ] All production env vars set and verified
- [ ] Final UAT-CHECKLIST.md 100% passed on production URL
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] Egypt public launch: seaconnect.eg is LIVE
