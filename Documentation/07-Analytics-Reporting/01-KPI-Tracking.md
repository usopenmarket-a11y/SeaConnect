# KPI & Analytics Tracking Plan — SeaConnect
**Version:** 1.0
**Date:** April 6, 2026
**Status:** ✅ Complete

---

## 1. North Star Metric

> **Completed Trips per Month**

This single metric captures supply health (boats listed and available), demand health (customers booking), and platform trust (payments working, owners confirming). Everything else is a lever that moves this number.

---

## 2. KPI Hierarchy

### Tier 1 — CEO/Board Level (Weekly Review)

| KPI | Formula | MVP Target (Month 6) |
|-----|---------|---------------------|
| Completed Trips (MTD) | COUNT(bookings WHERE status=COMPLETED, month=current) | 200/month |
| Gross Transaction Value (GTV) | SUM(booking_amounts) + SUM(order_amounts) | 500,000 EGP/month |
| Net Revenue | GTV × commission rates - payment fees | 55,000 EGP/month |
| Active Boat Listings | COUNT(yachts WHERE status=ACTIVE) | 100 boats |
| Registered Customers | COUNT(users WHERE role=CUSTOMER) | 2,000 users |

### Tier 2 — Product/Operations Level (Daily Review)

#### Supply (Boat Owners)
| KPI | Formula | Target |
|-----|---------|--------|
| New Owner Signups | COUNT(owners registered, day) | 2/day in growth phase |
| Owner Approval Rate | approved / submitted listings | > 80% |
| Owner Approval Time | AVG(approved_at - submitted_at) | < 24 hours |
| Listing Quality Score | % listings with 5+ photos + description > 100 chars | > 90% |
| Owner Response Rate | bookings confirmed or declined within 2h / total | > 85% |
| Owner Auto-Decline Rate | bookings auto-declined / total | < 10% |
| Active Owners (30d) | owners with ≥1 confirmed booking in 30 days | > 60% of registered |

#### Demand (Customers)
| KPI | Formula | Target |
|-----|---------|--------|
| New Customer Registrations | COUNT(customers registered, day) | 20/day in growth phase |
| Search → Booking Conversion | bookings created / search sessions | > 8% |
| Booking Completion Rate | COMPLETED / (CONFIRMED) | > 95% |
| Customer Repeat Rate | customers with ≥2 bookings / total customers | > 20% at 6 months |
| Cart Abandonment Rate (marketplace) | abandoned carts / carts with items | < 40% |
| App DAU/MAU Ratio | daily active users / monthly active users | > 25% |

#### Marketplace (Vendors)
| KPI | Formula | Target |
|-----|---------|--------|
| Active Vendor Products | COUNT(products WHERE status=ACTIVE) | 300 products at launch |
| Product Approval Rate | approved / submitted | > 85% |
| Order Fulfillment Rate | shipped within 3 days / total orders | > 90% |
| On-Time Delivery Rate | delivered by promised date / total orders | > 85% |
| Vendor Revenue (MTD) | SUM(vendor payouts, month) | 45,000 EGP/month at M6 |

### Tier 3 — Engineering Level (Real-time Monitoring)

| KPI | Tool | Alert Threshold |
|-----|------|----------------|
| API p95 Response Time | Sentry Performance | > 400ms |
| API Error Rate | Sentry | > 1% |
| Payment Success Rate | Internal dashboard | < 95% (alert immediately) |
| FCM Delivery Rate | Firebase Console | < 90% |
| Webhook Processing Time | Sentry | > 2s |
| Database Query p95 | Supabase Metrics | > 100ms |
| Background Task Failure Rate | Celery Flower / Sentry | > 2% |
| Uptime | UptimeRobot | < 99.5% monthly |

---

## 3. Funnel Analytics

### Booking Funnel
```
App Open / Website Visit
    ↓ [Track: session_start]
Search (location + date)
    ↓ [Track: search_performed, params: location, date, party_size]
View Yacht Listing
    ↓ [Track: listing_viewed, yacht_id]
View Availability Calendar
    ↓ [Track: calendar_viewed, yacht_id]
Initiate Booking
    ↓ [Track: booking_initiated, yacht_id, trip_type, amount]
Payment Page
    ↓ [Track: payment_page_reached, amount]
Payment Completed
    ↓ [Track: payment_completed, booking_id, amount]
Owner Confirms
    ↓ [Track: booking_confirmed, booking_id]
Trip Completed
    ↓ [Track: trip_completed, booking_id]
Review Submitted
    ↓ [Track: review_submitted, rating]
```

**Key drop-off points to monitor:**
- Search → Listing View (< 30% means search results are poor)
- Listing → Booking Initiation (< 10% means photos/pricing not compelling)
- Payment Page → Completion (< 70% means payment UX or Fawry issues)
- Confirmation → Trip Completion (< 90% means owner reliability issue)

### Marketplace Funnel
```
Browse Products
    ↓ [Track: product_browsed, category]
Product Detail View
    ↓ [Track: product_viewed, product_id]
Add to Cart
    ↓ [Track: add_to_cart, product_id, quantity]
Checkout Start
    ↓ [Track: checkout_started, cart_total]
Payment Completed
    ↓ [Track: order_placed, order_id, total]
```

---

## 4. Analytics Implementation

### 4.1 Tools Stack

| Tool | Purpose | Cost |
|------|---------|------|
| **Mixpanel** (free tier) | Product analytics, funnels, cohorts, retention | Free up to 100k MTU |
| **Sentry** | Error tracking, performance monitoring | Free tier sufficient for MVP |
| **Firebase Analytics** | Mobile app events (Flutter) | Free |
| **Google Analytics 4** | Web traffic (Next.js) | Free |
| **Supabase Dashboard** | Database-level query metrics | Included |
| **UptimeRobot** | Uptime monitoring + alerts | Free tier |
| **Custom Admin Dashboard** | Business KPIs, revenue, booking stats | Built in Sprint 7 |

### 4.2 Event Tracking Implementation (Flutter)

```dart
// lib/services/analytics_service.dart
class AnalyticsService {
  static Future<void> track(String event, {Map<String, dynamic>? properties}) async {
    // Send to Mixpanel
    await Mixpanel.track(event, properties: properties);
    // Also send to Firebase Analytics
    await FirebaseAnalytics.instance.logEvent(
      name: event.replaceAll(' ', '_').toLowerCase(),
      parameters: properties?.map((k, v) => MapEntry(k, v.toString())),
    );
  }
}

// Usage example
await AnalyticsService.track('booking_initiated', properties: {
  'yacht_id': yacht.id,
  'trip_type': tripType,
  'amount': totalAmount,
  'party_size': partySize,
});
```

### 4.3 Event Tracking Implementation (Django Backend)

```python
# seaconnect/core/analytics.py
import mixpanel

mp = mixpanel.Mixpanel(settings.MIXPANEL_TOKEN)

def track_server_event(distinct_id: str, event: str, properties: dict = None):
    """Track server-side events (payments, webhooks, etc.)"""
    props = properties or {}
    props["source"] = "server"
    mp.track(distinct_id, event, props)

# Usage in payment service
track_server_event(
    distinct_id=str(user.id),
    event="payment_completed",
    properties={
        "booking_id": booking.id,
        "amount": float(payment.amount),
        "gateway": "fawry",
    }
)
```

### 4.4 User Identification

```python
# On login/registration — identify user in Mixpanel
mp.people_set(str(user.id), {
    "$email": user.email,
    "$phone": user.phone,
    "role": user.role,
    "registration_date": user.created_at.isoformat(),
    "location": user.city,
})
```

---

## 5. Reporting Cadence

### Daily (Automated Email — 8:00 AM EGT)
Recipients: Co-founders, Operations Lead

Contents:
- Bookings created yesterday (count + total value)
- Bookings completed yesterday (count)
- New registrations (customers / owners / vendors)
- Orders placed (marketplace)
- Payment success rate
- Any P0 errors from Sentry (count)
- Pending admin approvals (boats / products awaiting review)

### Weekly (Monday — Internal Team Meeting)
- Full funnel metrics (search → booking conversion)
- Owner response rate and auto-decline rate
- Marketplace order fulfillment rate
- Top-performing listings (most booked boats, best-selling products)
- Top search queries with no results (content gaps)
- Customer support tickets by category

### Monthly (Business Review)
- Revenue vs. projections (from `02-Commission-Schedule.md`)
- Cohort retention (% of M1 customers still booking in M3, M6)
- Supply growth (new boat listings approved)
- Unit economics: CAC, LTV, payback period
- NPS (Net Promoter Score) — collected via post-trip email survey

---

## 6. Custom Admin Dashboard (Sprint 7)

The admin portal (Next.js web) will display:

### Revenue Tab
- Total GTV (all time / this month / this week)
- Revenue breakdown: booking commissions vs. marketplace commissions vs. featured listings
- Payout ledger: total paid out, pending payouts
- Average booking value trend

### Supply Tab
- Total active listings (boats / products)
- New listings this week (pending / approved / rejected)
- Owner approval queue (sorted by wait time)
- Listings with expiring licenses (next 30 days)

### Demand Tab
- DAU / MAU chart
- New registrations trend
- Booking funnel conversion rates
- Top locations searched
- Top departure ports

### Operations Tab
- Pending admin actions (approvals, refund requests)
- Open disputes
- Flagged reviews
- Failed payments (last 24h)

---

## 7. KPI Targets by Launch Milestone

| Milestone | Target Date | Key KPI |
|-----------|------------|---------|
| Documentation complete | April 2026 | All 15 planning docs done |
| Dev environment ready | End of Sprint 1 | CI/CD green, Docker running |
| Auth MVP done | End of Sprint 2 | 3 login methods working |
| First booking end-to-end | End of Sprint 5 | Payment → confirmation working |
| Marketplace live | End of Sprint 6 | Cart → checkout → order |
| Admin portal live | End of Sprint 7 | All approval queues working |
| Soft launch (internal) | End of Sprint 19 | 10 test bookings completed |
| Public launch | End of Sprint 20 | 50 active boats, 30 vendor products |
| Month 1 post-launch | M+1 | 50 completed trips |
| Month 3 post-launch | M+3 | 120 completed trips/month |
| Month 6 post-launch | M+6 | 200 completed trips/month, 55k EGP revenue |
| Break-even | M+12 | Monthly revenue covers monthly costs |

---

**Last Updated:** April 6, 2026
**Owner:** Product Owner / Co-Founders
