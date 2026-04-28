# Safety & Security Requirements — SeaConnect
**Version:** 1.0
**Date:** April 6, 2026
**Status:** ✅ Complete

---

## 1. Overview

This document covers three security domains:
1. **Maritime Safety** — physical safety of passengers on boats booked via SeaConnect
2. **Application Security** — protecting the platform from attacks and vulnerabilities
3. **Data Protection** — securing user data, payment data, and platform integrity

---

## 2. Maritime Safety Requirements

### 2.1 Boat Listing Safety Verification

Every yacht/boat submitted for listing must provide:

| Document | Verification Method | Expiry Check |
|---------|-------------------|-------------|
| Vessel Registration Certificate | Admin views uploaded document | Annual |
| Marine Insurance Certificate | Admin views uploaded document, checks coverage amount | Annual |
| Safety Equipment Certificate (life jackets, flares, fire extinguisher) | Admin views document OR photo checklist | Bi-annual |
| Captain's License (if owner operates) | Admin views document | As per license |
| Tourism Activity License (if applicable) | Admin views document | Annual |

**Celery Task: `check_license_expiry`**
- Runs: Every Sunday at 06:00 EGT
- Finds all listings with documents expiring within 30 days
- Sends email + in-app alert to owner: "Your [document name] expires on [date]. Please upload renewal."
- If expired: listing auto-suspended (status = SUSPENDED_PENDING_DOCS)
- Owner must upload renewed document + admin re-approves to reactivate

### 2.2 Safety Standards Required of Boat Owners

SeaConnect's Boat Charter Agreement (doc `02-Legal-Administrative/03-Boat-Charter-Agreement.md`) requires owners to:

- [ ] Carry one approved life jacket per passenger at all times
- [ ] Have a working VHF marine radio onboard
- [ ] Brief all passengers on emergency procedures before departure
- [ ] Not exceed the vessel's certified passenger capacity (enforced by platform — booking system blocks party_size > capacity)
- [ ] File a float plan with local marina for trips > 4 hours
- [ ] Not operate in conditions with wave height > 2.5m unless vessel is rated for it
- [ ] Maintain sobriety during operation
- [ ] Have emergency contact information visible in the vessel cabin

**Platform Enforcement:**
- Capacity limit: `booking.party_size <= yacht.capacity` enforced at API level
- Weather advisory (Phase 2): display weather alerts for departure dates

### 2.3 Emergency Contact Protocol

All customers receive in their booking confirmation:
- Emergency number: **Sea Rescue Egypt: 16000** (or local coast guard)
- SeaConnect emergency WhatsApp: [to be established before launch]
- Owner's phone number (shown after booking confirmation)

SeaConnect admin must have 24/7 emergency contact capability for:
- Reporting a vessel in distress
- Medical emergency on a booked trip
- Dispute requiring immediate intervention

### 2.4 Incident Reporting

If a maritime incident occurs on a SeaConnect-booked trip:
1. Customer reports via in-app "Report an Incident" (generates support ticket with HIGH priority)
2. Admin contacted within 15 minutes
3. Incident logged in audit_logs table
4. Insurance claim support provided to customer
5. Owner's listing suspended pending investigation
6. If confirmed safety violation: permanent ban + report to Egyptian Maritime Authority

---

## 3. Application Security

### 3.1 OWASP Top 10 Checklist (Sprint 14)

| # | Vulnerability | SeaConnect Mitigation |
|---|--------------|----------------------|
| A01 | Broken Access Control | RBAC on every endpoint (5 roles), `is_owner` checks on all mutation endpoints |
| A02 | Cryptographic Failures | Passwords: argon2 (Django default). JWT: RS256 with 15-min expiry. TLS 1.2+ enforced on Railway |
| A03 | Injection | Django ORM (parameterized queries). No raw SQL without explicit review. DRF serializers validate all input |
| A04 | Insecure Design | Booking payment hold model (no direct fund access). Payout only after trip completion |
| A05 | Security Misconfiguration | All secrets in env vars. `DEBUG=False` in production. Security headers via `django-csp` |
| A06 | Vulnerable Components | `pip audit` in CI/CD pipeline. `npm audit` for Next.js. Dependabot alerts enabled |
| A07 | Auth & Session Failures | Short JWT TTL (15 min). Refresh token rotation. Rate limiting on auth endpoints (10/min) |
| A08 | Software & Data Integrity | GitHub Actions signed commits. Docker images pinned to digest |
| A09 | Security Logging | All auth events, payment events, admin actions logged to audit_logs |
| A10 | SSRF | Whitelist external API calls (Fawry, Firebase, SendGrid only). No user-controlled URLs fetched |

### 3.2 Authentication Security

```python
# settings/security.py

# JWT Configuration
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=30),
    "ROTATE_REFRESH_TOKENS": True,         # New refresh token on each use
    "BLACKLIST_AFTER_ROTATION": True,      # Old refresh token invalidated
    "ALGORITHM": "HS256",                  # Use RS256 in production with key pair
    "AUTH_HEADER_TYPES": ("Bearer",),
    "JTI_CLAIM": "jti",                    # JWT ID for blacklisting
}

# Password Policy
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
     "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# OTP Security
OTP_EXPIRY_MINUTES = 10
OTP_MAX_ATTEMPTS = 5         # Lock after 5 wrong OTP attempts
OTP_COOLDOWN_MINUTES = 60    # Lock period after max attempts

# Rate Limiting (django-ratelimit or DRF throttling)
REST_FRAMEWORK = {
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "auth": "10/min",
        "otp": "3/min",
        "anon": "30/min",
        "user": "300/min",
        "admin": "600/min",
    },
}
```

### 3.3 Input Validation & Injection Prevention

```python
# All user inputs validated via DRF serializers
class BookingCreateSerializer(serializers.ModelSerializer):
    party_size = serializers.IntegerField(min_value=1, max_value=50)
    special_requests = serializers.CharField(max_length=500, allow_blank=True)
    
    def validate_party_size(self, value):
        yacht = self.context["yacht"]
        if value > yacht.capacity:
            raise serializers.ValidationError(
                f"Party size exceeds vessel capacity of {yacht.capacity}"
            )
        return value
```

**File Upload Security:**
- Only accept: JPEG, PNG, WebP for images; MP4, MOV for videos
- File size limits enforced (10MB images, 50MB videos)
- Files scanned with ClamAV (or equivalent) before storage — Phase 2
- Files stored in Cloudflare R2 (not served from app server)
- Randomize filenames (UUID) — never expose original filename
- Cloudflare R2 signed URLs for private documents (boat licenses)

### 3.4 Security Headers

```python
# settings/security.py
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
X_FRAME_OPTIONS = "DENY"
SECURE_CONTENT_TYPE_NOSNIFF = True

# Content Security Policy (django-csp)
CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'", "https://cdn.fawry.com")
CSP_IMG_SRC = ("'self'", "data:", "https://*.r2.cloudflarestorage.com")
CSP_CONNECT_SRC = ("'self'", "https://api.fawry.com")
```

### 3.5 SQL Injection Prevention

- **Always** use Django ORM — never raw SQL without parameterization
- Code review checklist item: "No `.raw()` calls without explicit security review"
- Exception: Full-text search with `SearchQuery` (parameterized by Django)
- pgvector operations use ORM extensions — no raw vector queries from user input

### 3.6 API Security

```
POST /api/v1/          All mutation endpoints require JWT
GET  /api/v1/yachts/   Public (no auth required)
GET  /api/v1/products/ Public (no auth required)
ANY  /api/v1/admin/    Admin JWT + is_staff check

Pagination: All list endpoints paginated (max 50 items per page)
Filtering: Whitelist approach — only declared filter fields accepted
```

### 3.7 Dependency Vulnerability Scanning

```yaml
# .github/workflows/security.yml
- name: Python security scan
  run: pip install pip-audit && pip-audit

- name: Django security check
  run: python manage.py check --deploy

- name: npm audit (Next.js)
  run: npm audit --audit-level=high

- name: Trivy Docker scan
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: seaconnect-backend:latest
    severity: HIGH,CRITICAL
    exit-code: 1
```

---

## 4. Data Protection & Privacy

### 4.1 Data Classification

| Data Category | Examples | Storage | Access |
|--------------|----------|---------|--------|
| PII — High Sensitivity | National ID, phone, email | PostgreSQL (encrypted at rest via Supabase) | Authenticated user + admin only |
| PII — Low Sensitivity | Name, profile photo | PostgreSQL + R2 | Public (name), auth (phone/email) |
| Financial Data | Payment amounts, payout records | PostgreSQL | User + admin only |
| Documents | Boat licenses (PDFs) | R2 (private, signed URLs) | Admin + owner only |
| Payment Card Data | Card numbers, CVV | **NOT STORED** — Fawry tokenization only | Never stored |
| Location Data | City, departure port | PostgreSQL | Public (city), auth (exact) |
| Analytics Data | Events, funnel data | Mixpanel (anonymized) | Analytics team |

### 4.2 Encryption

| Layer | Method |
|-------|-------|
| Data in transit | TLS 1.2+ (enforced by Railway + Cloudflare) |
| Data at rest | Supabase PostgreSQL encryption at rest |
| R2 storage | Cloudflare R2 server-side encryption (AES-256) |
| Passwords | Argon2 hashing (never stored in plaintext) |
| JWT secrets | Stored in Railway environment variables, rotated quarterly |
| Webhook secrets | Stored in Railway environment variables |

### 4.3 Data Retention & Deletion

| Data | Retention | Deletion Trigger |
|------|-----------|-----------------|
| User account data | Active + 3 years | User requests deletion |
| Booking records | 7 years | Tax law requirement |
| Payment/transaction records | 7 years | Tax law requirement |
| Audit logs | 5 years | AML requirement |
| Analytics events | 2 years | Mixpanel retention setting |
| Deleted user data | Anonymized immediately | Account deletion request |

**Right to Deletion (GDPR-equivalent under Egyptian Law 151/2020):**
- User submits deletion request via settings or support@seaconnect.app
- Processing time: 30 days
- Exceptions: records required for tax/AML compliance are retained (anonymized)
- Confirmation email sent to user after deletion

### 4.4 Access Control (Internal)

| Role | Database Access | Admin Portal | Source Code |
|------|---------------|-------------|------------|
| Co-founder | Full | Full | Full |
| Technical Lead | Full (dev/staging), Read (prod) | Full | Full |
| Developer | Dev/staging only | No | Feature branch only |
| Operations | No direct DB | Limited (approve/manage) | No |
| Support | No direct DB | Read-only | No |

Production database access requires:
- VPN or IP allowlist
- MFA on Supabase account
- Access reviewed quarterly

---

## 5. Incident Response Plan

### 5.1 Severity Classification

| Severity | Examples | Response Time | Resolution Time |
|---------|---------|--------------|----------------|
| P0 — Critical | Payment breach, data leak, platform down | 15 minutes | 4 hours |
| P1 — High | Auth bypass, significant data corruption | 1 hour | 24 hours |
| P2 — Medium | API degraded, single feature broken | 4 hours | 72 hours |
| P3 — Low | UI bug, minor feature issue | Next business day | 1 week |

### 5.2 Data Breach Response

If a data breach is detected:
1. **Immediate (0–1h):** Isolate affected systems, revoke compromised credentials
2. **1–4h:** Assess scope — what data was accessed, how many users affected
3. **4–24h:** Patch vulnerability, audit access logs
4. **24–72h:** Notify affected users (email + in-app), notify NTRA (required by Law 151/2020)
5. **72h+:** Full post-mortem, regulatory report if required
6. **30 days:** Independent security audit

### 5.3 Contacts

| Role | Contact |
|------|---------|
| Technical Lead (incidents) | [to be assigned] |
| Data Protection Contact | support@seaconnect.app |
| NTRA (Egypt Data Protection) | ntra.gov.eg |
| Fawry Security (payment issues) | security@fawry.com |
| Sentry (monitoring) | sentry.io dashboard |

---

## 6. Security Testing Requirements

### Sprint 14 — Security Hardening Checklist

- [ ] Django `manage.py check --deploy` — zero warnings
- [ ] OWASP ZAP automated scan — zero High/Critical findings
- [ ] Manual pen test: auth bypass attempts on all 5 roles
- [ ] Manual pen test: IDOR on booking, order, user profile endpoints
- [ ] SQL injection tests on all search/filter endpoints
- [ ] File upload security: attempt upload of PHP, EXE, script files — all rejected
- [ ] Rate limiting verified: > 10 auth attempts/min → 429 returned
- [ ] JWT expiry verified: expired token → 401 returned
- [ ] Payment webhook: invalid signature → 403 returned, nothing processed
- [ ] Admin endpoints: customer JWT → 403 returned
- [ ] XSS: inject `<script>` in listing descriptions — sanitized/escaped on display
- [ ] CSRF: all state-changing endpoints reject requests without valid CSRF token (or JWT for API)
- [ ] Secrets audit: `grep -r "SECRET\|PASSWORD\|API_KEY" .` in codebase — nothing hardcoded

### Load & Penetration Testing (Sprint 17)

- Locust load test: 500 concurrent users, 15-minute sustained load
- Target: p95 response < 400ms, 0 errors
- Simulate: search queries (heaviest), booking creation, payment initiation
- After load test: review slow query log, add indexes if needed

---

## 7. Security in Development Process

### Code Review Security Checklist (for every PR)
- [ ] No hardcoded secrets or credentials
- [ ] All user inputs validated in serializers
- [ ] Object-level permissions checked (can user access this resource?)
- [ ] No new raw SQL without review
- [ ] File uploads validated for type and size
- [ ] No new external HTTP calls to user-supplied URLs
- [ ] Auth decorator applied to all new endpoints
- [ ] Pagination applied to all new list endpoints

### Branch Protection Rules
- `main` branch: require PR review (1 approver minimum)
- `main` branch: all CI checks must pass
- No force push to main
- Security scanning must pass before merge

---

**Last Updated:** April 6, 2026
**Owner:** Technical Lead
**Review Cycle:** Quarterly, or after any security incident
