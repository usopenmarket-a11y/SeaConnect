# Payment Gateway Plan — SeaConnect
**Version:** 1.0
**Date:** April 6, 2026
**Status:** ✅ Complete

---

## 1. Overview

SeaConnect processes two distinct payment streams:
1. **Booking payments** — Customer pays for a boat trip (held, then released to owner after trip completion)
2. **Marketplace payments** — Customer pays for fishing gear (held, then released to vendor after delivery)

All MVP payments are processed via **Fawry** (Egypt's dominant payment aggregator). Stripe is queued for Phase 2 (international expansion).

---

## 2. Fawry Integration

### 2.1 Fawry Products Used

| Product | Use Case | Fee |
|---------|----------|-----|
| Fawry Pay (Card) | Visa/Mastercard online checkout | ~2.5% per transaction |
| Fawry Pay (Wallet) | MyFawry wallet balance | ~1.5% per transaction |
| Fawry Reference Number | Offline cash payment at Fawry kiosk | ~2.0% flat |

### 2.2 Merchant Account Requirements

To activate a Fawry merchant account:
- [ ] Egyptian commercial registration (سجل تجاري)
- [ ] Tax registration card (بطاقة ضريبية)
- [ ] Bank account in Egypt (EGP account)
- [ ] Business bank letter confirming account ownership
- [ ] Fawry merchant agreement signed
- [ ] Technical integration review by Fawry team
- [ ] Sandbox testing sign-off (minimum 50 test transactions)
- [ ] Production go-live approval from Fawry

**Estimated activation time:** 2–4 weeks from document submission.
**Contact:** merchant.support@fawry.com or designated Fawry account manager.

### 2.3 API Integration Flow

#### Booking Payment Flow
```
Customer selects trip + party size
    ↓
POST /api/v1/payments/initiate/
    → Backend calculates total (trip_price × days)
    → Applies promo code if present
    → Creates Payment record (status=PENDING)
    → Calls Fawry Create Order API
    → Returns { payment_url, reference_number, expires_at }
    ↓
Customer pays on Fawry-hosted page OR via wallet
    ↓
Fawry sends webhook to POST /api/v1/payments/webhook/fawry/
    → Signature verified (HMAC-SHA256)
    → Payment status updated (PAID / FAILED)
    → If PAID: Booking status → PENDING_OWNER_CONFIRMATION
    → FCM push to owner: "New booking request"
    ↓
Owner accepts (within 2 hours)
    → Booking status → CONFIRMED
    → Payment status → HELD
    ↓
Trip completion date passes + no dispute
    → Celery task: release_payout (24h after trip end)
    → Payment status → RELEASED
    → Payout initiated to owner (via Fawry Disbursement API)
```

#### Auto-Decline + Refund Flow
```
Owner doesn't respond within 2 hours
    ↓
Celery Beat task: check_pending_booking_confirmations (runs every 10 min)
    → Finds bookings past 2h window
    → Booking status → AUTO_DECLINED
    → Calls Fawry Refund API
    → Payment status → REFUNDED
    → FCM push to customer: "Booking auto-declined, refund issued"
```

### 2.4 Fawry Webhook Security

```python
import hmac
import hashlib

def verify_fawry_webhook(payload: dict, signature: str, merchant_secret: str) -> bool:
    """
    Fawry signs webhooks using HMAC-SHA256 of:
    merchantCode + orderRefNum + paymentAmount + orderStatus + signature_key
    """
    message = (
        payload["merchantCode"] +
        payload["orderRefNum"] +
        str(payload["paymentAmount"]) +
        payload["orderStatus"] +
        merchant_secret
    ).encode("utf-8")
    
    expected = hashlib.sha256(message).hexdigest()
    return hmac.compare_digest(expected, signature)
```

All webhook endpoints must:
- Verify signature before processing
- Return HTTP 200 within 5 seconds (process async via Celery)
- Be idempotent (duplicate webhooks must not double-process)
- Log every webhook receipt to audit_logs table

### 2.5 Fawry Environment Configuration

```env
# .env (never commit this file)
FAWRY_MERCHANT_CODE=your_merchant_code
FAWRY_MERCHANT_SECRET=your_merchant_secret
FAWRY_BASE_URL=https://www.atfawry.com/ECommerceWeb/Fawry/payments  # production
FAWRY_BASE_URL_SANDBOX=https://atfawry.fawrystaging.com/ECommerceWeb/Fawry/payments
FAWRY_WEBHOOK_SECRET=your_webhook_secret
```

---

## 3. Payout Architecture

### 3.1 Payout Schedule

| Role | Trigger | Timing | Method |
|------|---------|--------|--------|
| Boat Owner | Trip completion confirmed | T+24 hours | Fawry Disbursement API |
| Vendor | Order delivered (customer confirmed or 7 days elapsed) | T+7 days | Fawry Disbursement API |

### 3.2 Payout Calculation

**Booking Payout:**
```
Customer pays:    1,000 EGP
SeaConnect fee:   - 120 EGP (12% commission)
Fawry fee:        - 25 EGP (~2.5%)
Owner receives:   855 EGP
```

**Marketplace Payout:**
```
Customer pays:    500 EGP
SeaConnect fee:   - 50 EGP (10% commission)
Fawry fee:        - 12.5 EGP (~2.5%)
Vendor receives:  437.5 EGP
```

### 3.3 Payout Ledger (transactions table)

Every payout creates two ledger entries:
1. `PLATFORM_FEE` — SeaConnect revenue (debit from held balance)
2. `OWNER_PAYOUT` or `VENDOR_PAYOUT` — disbursement to partner

See `04-Database-Schema.md` → `transactions` table for full schema.

### 3.4 Dispute & Refund Rules

| Scenario | Resolution | Timeline |
|----------|-----------|---------|
| Owner declines booking | Full refund to customer | Immediate (auto) |
| Owner no-response (2h) | Full refund to customer | Auto at 2h |
| Customer cancels (>24h before trip) | Full refund | Within 24h |
| Customer cancels (<24h before trip) | No refund | Policy enforced |
| Trip doesn't happen (force majeure) | Full refund | Admin-issued manually |
| Product arrives damaged | Admin reviews, issues refund | Within 5 business days |
| Product not delivered (14 days) | Auto-refund | Celery task at T+14d |

---

## 4. Stripe Integration (Phase 2)

For UAE/KSA expansion and international bookings:

| Feature | Details |
|---------|---------|
| Products | Stripe Payment Intents + Stripe Connect (for marketplace payouts) |
| Currencies | USD, AED, SAR (with EGP conversion display) |
| Cards | Visa, Mastercard, Amex |
| Apple/Google Pay | Via Stripe Elements |
| Webhook | `stripe.Webhook.construct_event()` with signing secret |

**Not in MVP.** Add Stripe merchant account to Phase 2 planning.

---

## 5. Financial Controls

### 5.1 Reconciliation
- Daily automated reconciliation: Fawry settlement report vs. SeaConnect transactions table
- Celery Beat task: `daily_reconciliation` runs at 02:00 EGT
- Discrepancies flagged to admin dashboard and sent via email alert

### 5.2 Fraud Prevention
- Maximum booking value: 50,000 EGP (configurable in admin)
- Maximum daily spend per customer: 100,000 EGP
- IP-based rate limiting on payment initiation: 3 attempts per 15 minutes
- Phone + card velocity checks via Fawry's built-in fraud scoring

### 5.3 Tax Compliance
- VAT (14% in Egypt) is included in all displayed prices (not added at checkout)
- SeaConnect is responsible for VAT on its commission income only
- Boat owners and vendors are responsible for their own tax declarations
- All transaction records retained for 7 years (Egyptian tax law requirement)

---

## 6. Testing Plan

### Sandbox Testing Checklist
- [ ] Successful card payment flow (Fawry test card: 4111111111111111)
- [ ] Successful wallet payment flow
- [ ] Failed payment (insufficient funds) → booking stays PENDING
- [ ] Webhook signature verification passes
- [ ] Duplicate webhook (same orderRefNum) processed only once
- [ ] Owner accepts → payout released correctly
- [ ] Owner declines → refund issued correctly
- [ ] Auto-decline at 2h → refund issued correctly
- [ ] Customer cancel (>24h) → full refund
- [ ] Customer cancel (<24h) → no refund
- [ ] Promo code applies correct discount before payment
- [ ] Marketplace checkout + vendor payout at T+7 days

**All sandbox tests must pass before switching to production Fawry credentials.**

---

**Last Updated:** April 6, 2026
**Owner:** Technical Lead + Finance
