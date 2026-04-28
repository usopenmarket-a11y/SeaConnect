# Commission Schedule & Revenue Model — SeaConnect
**Version:** 1.0
**Date:** April 6, 2026
**Status:** ✅ Complete — Rates are LOCKED for MVP launch

---

## 1. Commission Rates Summary

| Stream | Take Rate | Applied To | Paid By |
|--------|-----------|-----------|---------|
| Boat/Yacht Charter | **12%** | Gross booking value | Deducted from owner payout |
| Fishing Gear Marketplace | **10%** | Product sale price (excl. shipping) | Deducted from vendor payout |
| Competition Entry Fee | **15%** | Entry fee collected | Deducted from prize pool |
| Featured Listing (optional) | Fixed fee | Boost fee paid by owner/vendor | Owner or Vendor |

---

## 2. Booking Commission Detail

### 2.1 Rate Justification
- **12%** is competitive for Egypt maritime charters
- Airbnb charges 14–16% from hosts; we undercut to drive early supply
- Comparable: Viator charges 20–30% for activities; we are significantly cheaper
- This rate covers: platform operations, payment processing fees (~2.5%), customer support, marketing

### 2.2 Booking Revenue Example

| Trip Price | SeaConnect 12% | Fawry Fee ~2.5% | Owner Receives |
|-----------|----------------|-----------------|---------------|
| 500 EGP | 60 EGP | 12.5 EGP | 427.5 EGP |
| 1,000 EGP | 120 EGP | 25 EGP | 855 EGP |
| 3,000 EGP | 360 EGP | 75 EGP | 2,565 EGP |
| 5,000 EGP | 600 EGP | 125 EGP | 4,275 EGP |
| 10,000 EGP | 1,200 EGP | 250 EGP | 8,550 EGP |

### 2.3 Booking Commission Logic (Code Reference)

```python
# seaconnect/payments/services.py

BOOKING_COMMISSION_RATE = Decimal("0.12")
MARKETPLACE_COMMISSION_RATE = Decimal("0.10")
COMPETITION_COMMISSION_RATE = Decimal("0.15")

def calculate_booking_payout(gross_amount: Decimal, fawry_fee_rate: Decimal = Decimal("0.025")) -> dict:
    commission = (gross_amount * BOOKING_COMMISSION_RATE).quantize(Decimal("0.01"))
    payment_fee = (gross_amount * fawry_fee_rate).quantize(Decimal("0.01"))
    net_payout = gross_amount - commission - payment_fee
    return {
        "gross": gross_amount,
        "commission": commission,
        "payment_fee": payment_fee,
        "net_payout": net_payout,
    }
```

---

## 3. Marketplace Commission Detail

### 3.1 Rate Justification
- **10%** is below Amazon Egypt (8–15%) and Noon (10–20%) to attract vendors early
- Vendors set their own prices; our fee is transparent and deducted automatically
- Shipping costs are NOT subject to commission (vendor declares shipping cost separately)

### 3.2 Marketplace Revenue Example

| Sale Price | Shipping | SeaConnect 10% | Fawry Fee ~2.5% | Vendor Receives |
|-----------|----------|----------------|-----------------|----------------|
| 200 EGP | 25 EGP | 20 EGP | 5 EGP | 200 EGP |
| 500 EGP | 40 EGP | 50 EGP | 12.5 EGP | 477.5 EGP |
| 1,500 EGP | 50 EGP | 150 EGP | 37.5 EGP | 1,425 EGP |

Note: Commission applies to **product price only**, not shipping. Shipping is passed through 100%.

---

## 4. Featured Listing (Optional Boost)

Boat owners and vendors can pay to boost visibility. This is an optional, non-mandatory upsell.

| Product | Price | Duration | Visibility Boost |
|---------|-------|----------|-----------------|
| Featured Yacht Listing | 150 EGP | 7 days | Top of search results + "Featured" badge |
| Featured Yacht Listing | 400 EGP | 30 days | Top of search + homepage carousel slot |
| Featured Product | 75 EGP | 7 days | Top of category page |
| Featured Product | 200 EGP | 30 days | Top of category + marketplace homepage |

**Revenue recognition:** Immediate upon payment (not held/released like commissions).
**Refund policy:** No refunds once a featured listing has gone live.

---

## 5. Competition Module Commission (Phase 2)

When competitions launch:
- SeaConnect collects **15%** of total entry fees collected
- Remainder (85%) funds the prize pool
- Example: 100 entries × 100 EGP = 10,000 EGP collected → 1,500 EGP to SeaConnect, 8,500 EGP to prize pool
- Competition sponsor fees (brands sponsoring prizes) are pure revenue — no deduction

---

## 6. Payout Timing Summary

| Role | Event | Payout Timing |
|------|-------|--------------|
| Boat Owner | Trip completed (date passed, no dispute) | T+24 hours |
| Vendor | Order delivered or 7 days since shipped | T+7 days from shipping |
| Competition Winner | Competition closed + verified | T+72 hours |

---

## 7. Commission Rate Change Policy

- Commission rates are locked for the first 12 months post-launch
- Any rate change requires:
  1. 30-day advance notice to all active owners/vendors (in-app + email)
  2. Co-founder approval
  3. Update to this document + T&C
- Existing confirmed bookings at time of rate change honor the old rate

---

## 8. Revenue Projections (MVP Year 1)

| Quarter | Bookings GMV | Marketplace GMV | Booking Rev (12%) | Marketplace Rev (10%) | Featured | Total Revenue |
|---------|-------------|----------------|------------------|----------------------|---------|--------------|
| Q1 (months 1-3) | 120,000 EGP | 30,000 EGP | 14,400 EGP | 3,000 EGP | 2,000 EGP | 19,400 EGP |
| Q2 (months 4-6) | 350,000 EGP | 80,000 EGP | 42,000 EGP | 8,000 EGP | 5,000 EGP | 55,000 EGP |
| Q3 (months 7-9) | 700,000 EGP | 150,000 EGP | 84,000 EGP | 15,000 EGP | 10,000 EGP | 109,000 EGP |
| Q4 (months 10-12) | 1,200,000 EGP | 250,000 EGP | 144,000 EGP | 25,000 EGP | 18,000 EGP | 187,000 EGP |
| **Year 1 Total** | **2,370,000 EGP** | **510,000 EGP** | **284,400 EGP** | **51,000 EGP** | **35,000 EGP** | **370,400 EGP** |

Assumptions:
- Q1: Soft launch, 50 boats, 30 vendor products, word-of-mouth only
- Q2: Influencer push, social ads, Ramadan/summer season begins
- Q3: Peak summer fishing season (Red Sea, Mediterranean coast)
- Q4: Sustained growth, repeat customers, competition module pre-launch

---

**Last Updated:** April 6, 2026
**Owner:** Finance / Co-Founders
