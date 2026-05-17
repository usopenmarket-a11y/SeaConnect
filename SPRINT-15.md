# Sprint 15 — Security Hardening, Rate Limiting, Monitoring, UAT Readiness

**Sprint:** 15
**Date:** TBD
**Theme:** Production readiness — harden security, add rate limiting, wire Sentry/Datadog, run a full penetration test checklist, and confirm UAT deployment passes all checks.

---

## Pre-Sprint State

Sprints 1–14 complete. The platform is functionally complete for Egypt launch. This sprint makes it production-safe.

---

## Goals

1. **15A — Rate limiting** — Add `django-ratelimit` to auth endpoints, payment initiation, and file upload
2. **15B — Security hardening** — OWASP audit: input validation, SQL injection, XSS, IDOR, auth bypass
3. **15C — Error monitoring** — Wire Sentry to Django backend and Next.js frontend
4. **15D — Health checks + alerting** — Structured health endpoint, uptime checks, Celery worker health
5. **15E — UAT deployment** — Deploy to Render (backend) + Vercel (frontend), run UAT checklist
6. **15F — Load testing** — Locust load test: 100 concurrent users on booking flow

---

## Task Assignments

| Task | Agent | Priority |
|------|-------|----------|
| 15A — Rate limiting | backend-api-developer | HIGH |
| 15B — Security audit | security-audit-agent | HIGH |
| 15C — Error monitoring | devops-infrastructure-specialist | HIGH |
| 15D — Health checks | devops-infrastructure-specialist | MEDIUM |
| 15E — UAT deployment | devops-infrastructure-specialist | HIGH |
| 15F — Load testing | qa-automation-specialist | MEDIUM |

---

## Sprint 15A — Rate Limiting

**Package:** `django-ratelimit` (add to `requirements/base.txt`)

Apply rate limits:
| Endpoint | Rate | Scope |
|----------|------|-------|
| `POST /api/v1/auth/login/` | 10/minute | per IP |
| `POST /api/v1/auth/register/` | 5/minute | per IP |
| `POST /api/v1/payments/initiate/` | 3/minute | per user |
| `POST /api/v1/accounts/owner-profile/upload/` | 20/hour | per user |
| `GET /api/v1/yachts/` | 60/minute | per IP |
| `GET /api/v1/marketplace/products/` | 60/minute | per IP |

Return `429 Too Many Requests` with `{"error": {"code": "RATE_LIMITED", "message": "Too many requests. Try again in N seconds.", "retry_after": N}}`.

Add rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

---

## Sprint 15B — Security Hardening

Run `security-audit-agent` across all auth, payment, KYC, and admin endpoints.

**Checklist:**
- [ ] IDOR: Can user A read/modify user B's bookings, payouts, or profile? Test by swapping UUIDs.
- [ ] JWT: Verify RS256 signing, 15-min access token expiry, refresh rotation, blacklist on logout
- [ ] SQL injection: All querysets use ORM (no raw SQL) — verify with `grep -rn "raw\|execute"` in views
- [ ] XSS: All user-supplied strings escaped in Next.js (React does this by default — verify no `dangerouslySetInnerHTML`)
- [ ] CSRF: DRF exempt via JWT (no cookie auth) — verify
- [ ] File upload: Validate MIME type + size on KYC upload endpoint — reject non-PDF/JPG/PNG and files > 10MB
- [ ] Payment webhook: Fawry webhook signature verification — verify HMAC check is in place
- [ ] Admin endpoints: All `/api/v1/admin/` routes require `IsAdminUser` — verify no permission misconfiguration

**Fix all HIGH and CRITICAL findings before UAT.**

---

## Sprint 15C — Error Monitoring

### Django (Sentry)
Add `sentry-sdk[django]` to requirements. In `settings/base.py`:
```python
import sentry_sdk
sentry_sdk.init(dsn=env('SENTRY_DSN', default=''), traces_sample_rate=0.1, environment=env('DJANGO_ENV', default='dev'))
```
Add `SENTRY_DSN` to `.env.dev.example` and Render env vars.

### Next.js (Sentry)
Add `@sentry/nextjs`. Run `npx @sentry/wizard@latest -i nextjs`. Configure `sentry.client.config.ts` and `sentry.server.config.ts`. Source maps uploaded on build.

### Celery worker errors
Sentry Django integration captures Celery task failures automatically — verify with a test task that raises an exception.

---

## Sprint 15D — Health Checks + Alerting

**Enhance `GET /health/`** to return structured health:
```json
{
  "status": "ok",
  "database": "ok",
  "redis": "ok",
  "celery": "ok",
  "storage": "ok",
  "version": "0.10.0"
}
```

Each check:
- `database`: `SELECT 1` via Django connection
- `redis`: `redis_client.ping()`
- `celery`: Check `inspect().active()` or ping the broker
- `storage`: MinIO/R2 `head_object` on a known sentinel file

Return `503` if any check fails.

**Uptime monitoring:** Add UptimeRobot or Better Uptime webhook ping every 5 minutes to `GET /health/`.

---

## Sprint 15E — UAT Deployment

**Backend (Render):**
- Push to `develop` branch → auto-deploy to `seaconnect-uat-api.onrender.com`
- Run `python manage.py migrate` as release command
- Set all env vars: `DATABASE_URL`, `REDIS_URL`, `FIREBASE_CREDENTIALS_JSON`, `SENTRY_DSN`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `AWS_*` (Cloudflare R2)

**Frontend (Vercel):**
- Push to `develop` → auto-deploy to `seaconnect-uat.vercel.app`
- Set env vars: `NEXT_PUBLIC_API_URL`, `API_INTERNAL_URL`, `SENTRY_DSN`

**UAT Checklist** (see `UAT-CHECKLIST.md`):
- [ ] Register as customer → browse yachts → book → pay (Fawry test mode) → confirmation
- [ ] Register as owner → complete KYC → add yacht → receive booking → confirm → view payout
- [ ] Register as vendor → add product → customer adds to cart → checkout
- [ ] Admin login → approve KYC → view dispute → resolve → approve payout
- [ ] AR ↔ EN locale switch works on all pages
- [ ] Mobile viewport (375px) — all pages usable

---

## Sprint 15F — Load Testing

**Tool:** Locust (`pip install locust`)

**File:** `backend/tests/locustfile.py`

Scenarios:
1. Browse home + yachts list (anonymous, 60 req/s)
2. Yacht detail view (anonymous, 30 req/s)
3. Booking creation (authenticated, 10 req/s)
4. Payment initiation (authenticated, 5 req/s)

Run for 5 minutes at 100 concurrent users. Target:
- p95 response time < 500ms for list endpoints
- p95 < 1000ms for detail endpoints
- p95 < 2000ms for booking creation
- Error rate < 0.1%

Fix any bottlenecks found (likely: missing DB indexes, N+1 queries on list endpoints).

---

## Definition of Done

- [ ] Rate limiting active on auth + payment endpoints
- [ ] No HIGH/CRITICAL security findings from audit
- [ ] File upload validates MIME type and size
- [ ] Sentry receiving errors from both Django and Next.js in UAT
- [ ] `/health/` returns structured status with all 4 subsystem checks
- [ ] UAT deployment live at Render + Vercel
- [ ] UAT checklist 100% passed
- [ ] Load test passes at 100 concurrent users (p95 < 500ms list, < 2s booking)
