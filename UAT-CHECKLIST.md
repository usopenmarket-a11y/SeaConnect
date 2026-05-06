# SeaConnect UAT Deploy Checklist

Run through every item before declaring the UAT environment live.
Tick each box in a copy of this file or in a GitHub issue checklist.

---

## 1. Infrastructure provisioning

- [ ] Supabase project created (region: eu-west-1 to match Render Frankfurt)
- [ ] Supabase connection string (pooler mode, port 6543) copied to Render env var `DATABASE_URL`
- [ ] Redis Cloud free-tier instance created; `REDIS_URL` set in Render
- [ ] Cloudflare R2 bucket `seaconnect-uat` created with public access disabled
- [ ] R2 API token generated (Object Read & Write); `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` set in Render
- [ ] `AWS_S3_ENDPOINT_URL` set to `https://[account_id].r2.cloudflarestorage.com`
- [ ] Brevo account activated; SMTP key generated (Settings → SMTP & API)
- [ ] `EMAIL_HOST_USER` and `EMAIL_HOST_PASSWORD` set in Render
- [ ] Vercel projects created for web and admin; linked to `develop` branch

---

## 2. Pre-deploy — Django API (Render)

### Secrets and keys

- [ ] `SECRET_KEY` is a cryptographically random 50-character string
      Generate: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`
- [ ] JWT RS256 key pair generated and stored as Render Secret Files
      ```
      openssl genrsa -out jwt_private.pem 2048
      openssl rsa -in jwt_private.pem -pubout -out jwt_public.pem
      ```
      Upload both files to Render → Secret Files. Set paths in env vars:
      `JWT_PRIVATE_KEY_PATH=/etc/secrets/jwt_private.pem`
      `JWT_PUBLIC_KEY_PATH=/etc/secrets/jwt_public.pem`
- [ ] `FIREBASE_CREDENTIALS_JSON` set if push notifications are needed
      Encode: `base64 -w 0 firebase-service-account.json`

### Settings validation

- [ ] `DJANGO_SETTINGS_MODULE=config.settings.uat` confirmed in Render
- [ ] `DEBUG=False` confirmed in Render
- [ ] `ALLOWED_HOSTS=seaconnect-uat-api.onrender.com` confirmed
- [ ] `CORS_ALLOWED_ORIGINS` includes both Vercel URLs:
      `https://seaconnect-uat.vercel.app,https://seaconnect-uat-admin.vercel.app`

### Deployment steps (run via Render build command or shell)

- [ ] `pip install -r requirements/prod.txt` succeeds without errors
- [ ] `python manage.py migrate --noinput` applies all migrations (0 pending)
- [ ] `python manage.py collectstatic --noinput` succeeds; static files uploaded to R2 or served correctly
- [x] `python manage.py check --deploy` reports 0 issues — VERIFIED 2026-05-07 (Sprint 14D)

      Expected passing conditions (all set in `config/settings/uat.py`):
      - `DEBUG = False`
      - `SECURE_SSL_REDIRECT = True`
      - `SECURE_PROXY_SSL_HEADER` set (required for Render's reverse proxy)
      - `SESSION_COOKIE_SECURE = True`
      - `CSRF_COOKIE_SECURE = True`
      - `SECURE_HSTS_SECONDS = 31536000`
      - `SECURE_HSTS_INCLUDE_SUBDOMAINS = True`
      - `SECURE_CONTENT_TYPE_NOSNIFF = True`
      - `X_FRAME_OPTIONS = "DENY"`

      Command run:
      ```
      docker compose run --rm --entrypoint="" \
        -e DJANGO_SETTINGS_MODULE=config.settings.uat \
        -e SECRET_KEY=<random-50-char> \
        -e ALLOWED_HOSTS=localhost \
        -e DATABASE_URL=postgresql://seaconnect:seaconnect@db:5432/seaconnect \
        -e REDIS_URL=redis://redis:6379/0 \
        -e CORS_ALLOWED_ORIGINS=https://seaconnect.app \
        api python manage.py check --deploy
      ```
      Output: `System check identified no issues (0 silenced).`

- [ ] `FAWRY_BASE_URL` confirmed pointing to staging (`https://atfawry.fawrystaging.com`) for UAT — **do NOT use the live production URL in UAT**

### Celery worker (Render background worker)

- [ ] Celery worker service deployed and shows "Running" status in Render dashboard
- [ ] Worker logs show `ready` and no connection errors to Redis or PostgreSQL

---

## 3. Pre-deploy — Frontend (Vercel)

### Web (`seaconnect-uat.vercel.app`)

- [ ] `NEXT_PUBLIC_API_URL=https://seaconnect-uat-api.onrender.com` set in Vercel
- [ ] `API_INTERNAL_URL=https://seaconnect-uat-api.onrender.com` set in Vercel
- [ ] `NEXT_PUBLIC_SITE_URL=https://seaconnect-uat.vercel.app` set in Vercel
- [ ] `next build` succeeds locally against UAT API URL before pushing
- [ ] TypeScript check passes: `npx tsc --noEmit`
- [ ] ESLint passes: `npx eslint . --ext .ts,.tsx`

### Admin (`seaconnect-uat-admin.vercel.app`)

- [ ] `NEXT_PUBLIC_API_URL=https://seaconnect-uat-api.onrender.com` set in Vercel
- [ ] `API_INTERNAL_URL=https://seaconnect-uat-api.onrender.com` set in Vercel
- [ ] `next build` succeeds locally
- [ ] Admin portal accessible only to users with `role=admin`

---

## 4. Smoke tests (run after all services are live)

### API health

- [ ] `GET https://seaconnect-uat-api.onrender.com/health/` returns `{"status": "ok", "service": "seaconnect-api"}`

### Authentication flow

- [ ] `POST /api/v1/auth/register/` creates a new customer user (201 response)
- [ ] `POST /api/v1/auth/login/` returns `access` and `refresh` JWT tokens (200 response)
- [ ] `POST /api/v1/auth/token/refresh/` rotates refresh token correctly (200 response)

### Core API endpoints

- [ ] `GET /api/v1/yachts/` returns paginated list with `results` and `next_cursor` keys (200)
- [ ] `GET /api/v1/yachts/{id}/` returns yacht detail with images (200)
- [ ] `GET /api/v1/bookings/` requires auth; returns 401 without Bearer token
- [ ] `POST /api/v1/bookings/` creates a booking in `pending` state (201)
- [ ] `GET /api/v1/payments/escrow/` returns escrow balance for authenticated owner

### Storage

- [ ] Image upload via `POST /api/v1/yachts/{id}/photos/` stores file in R2
- [ ] Uploaded image URL is accessible (HTTP 200) from the R2 bucket or CDN domain

### Email

- [ ] Registration triggers welcome email (check Brevo sent items log)
- [ ] Booking confirmation email received in test inbox

### Frontend

- [ ] Home page loads at `https://seaconnect-uat.vercel.app/ar` (Arabic RTL)
- [ ] Home page loads at `https://seaconnect-uat.vercel.app/en` (English LTR)
- [ ] Yacht listing page displays results from live API
- [ ] Yacht detail page renders photos and pricing
- [ ] Booking wizard: select yacht → date → checkout → confirmation
- [ ] Owner dashboard accessible after login with owner account
- [ ] Admin portal accessible at `https://seaconnect-uat-admin.vercel.app/ar`

---

## 5. Performance baseline

- [ ] `GET /api/v1/yachts/` responds in < 500 ms (cold start excepted on free Render tier)
- [ ] Lighthouse score on home page: Performance >= 70, Accessibility >= 90
- [ ] No JavaScript console errors on first page load

---

## 6. Rollback plan

| Layer | How to roll back |
|-------|------------------|
| API (Render) | Render dashboard → seaconnect-uat-api → Events → click "Rollback" on previous deploy |
| Web / Admin (Vercel) | Vercel dashboard → project → Deployments → previous deployment → "Promote to Production" (Instant Rollback) |
| Database (Supabase) | Supabase dashboard → project → Database → Point-in-time recovery (PITR) — available on paid plans only; free tier: restore from last daily backup |
| Migrations | Django does not auto-reverse migrations. Run `python manage.py migrate <app> <prev_migration>` manually. Document reverse steps before every migration PR. |

---

## 7. Post-UAT sign-off

- [ ] QA engineer has walked through all smoke tests above
- [ ] Product owner has accepted UAT sign-off
- [ ] All open P0/P1 bugs resolved or deferred with documented rationale
- [ ] `HANDOFFS.md` updated: UAT environment marked READY
- [ ] `render.yaml` and `.env.example` committed to `develop` branch
