# MVP Scope & Feature Matrix — SeaConnect
**Version:** 1.0
**Date:** April 6, 2026
**Document Status:** ✅ Complete — Scope is LOCKED. No additions before launch.

---

## MVP Definition

The MVP (v1.0) ships the minimum feature set that:
1. Allows real boat owners to list and get paid for trips
2. Allows real customers to discover, book, and pay for trips
3. Allows real vendors to sell fishing gear
4. Gives admins tools to manage the above safely

The competition module, AI matching, and all advanced features ship in Phase 2.

---

## Feature Matrix

### ✅ IN MVP (v1.0)

#### Auth & Users
| Feature | Priority | Sprint |
|---------|----------|--------|
| Email + password registration | P0 | 1 |
| Phone + SMS OTP registration/login | P0 | 1 |
| Google OAuth | P0 | 1 |
| JWT authentication (access + refresh tokens) | P0 | 1 |
| Role selection at registration (customer/owner/vendor) | P0 | 1 |
| User profile view + edit | P0 | 2 |
| Password reset via email | P1 | 2 |
| Notification center (in-app) | P1 | 8 |

#### Boat Listing Module (Owner)
| Feature | Priority | Sprint |
|---------|----------|--------|
| Create yacht listing (name, description, type, capacity, location, price) | P0 | 3 |
| Upload boat photos (up to 10) | P0 | 3 |
| Upload boat video (up to 1, 50MB) | P1 | 3 |
| Set amenities list | P1 | 3 |
| Set availability calendar (block/unblock dates) | P0 | 3 |
| Admin approval queue for new listings | P0 | 7 |
| View own bookings (pending/confirmed/completed) | P0 | 4 |
| Accept / decline booking requests | P0 | 4 |
| Owner earnings dashboard (simple: total earned, pending payout) | P1 | 7 |

#### Booking Module (Customer)
| Feature | Priority | Sprint |
|---------|----------|--------|
| Browse yachts (list view + map view) | P0 | 3 |
| Search by location + date range | P0 | 3 |
| Filter by: capacity, price, type, category | P0 | 3 |
| Yacht detail page (photos, description, reviews, owner info) | P0 | 3 |
| Availability calendar view | P0 | 3 |
| Create booking (date, trip type, party size, special requests) | P0 | 4 |
| Pay via Fawry (card + wallet) | P0 | 5 |
| Booking confirmation (email + push) | P0 | 5 |
| View my bookings (history + status) | P0 | 4 |
| Cancel booking | P1 | 4 |
| Submit review after completed trip | P1 | 6 |

#### Marketplace Module
| Feature | Priority | Sprint |
|---------|----------|--------|
| Vendor onboarding (store name, description, logo) | P0 | 5 |
| Create product listing (name, description, category, price, stock, photos) | P0 | 5 |
| Admin approval queue for products | P0 | 7 |
| Browse products (list + category filter) | P0 | 6 |
| Product search (Arabic text search) | P0 | 6 |
| Product detail page | P0 | 6 |
| Add to cart / update quantity / remove | P0 | 6 |
| Checkout with shipping address | P0 | 6 |
| Pay via Fawry | P0 | 6 |
| Order confirmation (email + push) | P0 | 6 |
| Vendor: mark order as shipped (with tracking number) | P1 | 6 |
| Customer: view order status | P1 | 6 |
| Customer: submit product review | P1 | 8 |

#### Admin Portal (Web)
| Feature | Priority | Sprint |
|---------|----------|--------|
| User management (list, view, activate/ban) | P0 | 7 |
| Yacht approval (approve/reject with reason) | P0 | 7 |
| Product approval (approve/reject with reason) | P0 | 7 |
| Vendor approval | P0 | 7 |
| All bookings view + override | P1 | 7 |
| All orders view | P1 | 7 |
| Revenue dashboard (total revenue, GTV, by stream) | P1 | 7 |
| Refund issuance | P1 | 7 |
| Promo code creation | P2 | 8 |

#### Notifications
| Feature | Priority | Sprint |
|---------|----------|--------|
| FCM push: booking created (to owner) | P0 | 5 |
| FCM push: booking confirmed/declined (to customer) | P0 | 5 |
| FCM push: order shipped (to customer) | P0 | 6 |
| SendGrid email: booking receipt | P0 | 5 |
| SendGrid email: order receipt | P0 | 6 |
| SendGrid email: password reset | P0 | 2 |
| In-app notification center | P1 | 8 |

#### Localization
| Feature | Priority | Sprint |
|---------|----------|--------|
| Arabic (RTL) throughout Flutter app | P0 | 9 |
| Arabic throughout Next.js web | P0 | 9 |
| English fallback for all UI strings | P0 | 9 |
| Arabic/English language switcher | P0 | 9 |
| Arabic date/currency/number formatting | P0 | 9 |

#### Weather Advisory
| Feature | Priority | Sprint |
|---------|----------|--------|
| Departure port dropdown on listing creation (12 Egyptian ports) | P0 | 3 |
| Weather advisory card on yacht detail (updates with selected date) | P0 | 3 |
| Weather advisory on booking creation screen | P0 | 4 |
| Weather advisory on booking confirmation + booking detail | P1 | 5 |
| Pre-seeded departure ports table (all 12 ports with coordinates) | P0 | 1 |
| Weather cache table + Redis cache (6h TTL) | P0 | 3 |
| Celery Beat: prefetch weather for upcoming bookings (daily 06:00 EGT) | P1 | 5 |

#### Fishing Seasons
| Feature | Priority | Sprint |
|---------|----------|--------|
| Fish species database (pre-seeded, 25+ species, AR+EN) | P0 | 1 |
| Fishing seasons table (species × port × month × rating) | P0 | 1 |
| Target species tags on yacht listing creation | P1 | 3 |
| "What's biting now" section on Explore home | P0 | 3 |
| Season rating chips on yacht detail screen | P0 | 3 |
| Fishing Guide screen (full interactive calendar) | P1 | 10 |
| Admin: manage fish species + season ratings | P1 | 7 |

---

### ❌ NOT IN MVP (Phase 2+)

| Feature | Phase | Reason |
|---------|-------|--------|
| Competition module (create, register, leaderboard) | 2 | Separate sprint; no supply yet |
| AI smart matching (GPT-4o) | 2 | Requires booking data to train on first |
| AI chatbot support | 2 | Requires FAQ/documentation base |
| Semantic search (pgvector) | 2 | Plain text search sufficient for MVP |
| Apple Sign-In | 2 | Low priority; Google covers OAuth |
| Stripe payment | 2 | Fawry covers Egyptian market at launch |
| SMS notifications (Twilio) | 2 | Push + email sufficient at MVP scale |
| Live GPS tracking during trip | 3 | Complex, requires real-time infra |
| Loyalty points / rewards | 3 | Retention mechanic for established user base |
| Vendor analytics dashboard | 2 | Basic order view sufficient initially |
| Group payment splitting | 2 | Nice-to-have for group bookings |
| Dynamic pricing suggestions | 2 | Needs booking history data |
| Filter search results by target fish species | 2 | Needs enough tagged listings first |
| Weather-triggered owner notification (rough seas forecast) | 2 | Needs push notification expansion |
| Tidal information (high/low tide times) | 2 | Useful but not critical for MVP |
| Fishing regulations by area (protected zones) | 2 | Needs legal research per location |
| ML-powered season predictions from catch logs | 3 | Needs competition module data |
| UAE / KSA expansion | 3 | After Egypt profitability proved |
| B2B API (white-label) | 3 | Requires established platform |
| Sponsorship / advertising system | 3 | Needs traffic volume first |
| n8n workflow automation | 2 | Manual ops acceptable at MVP scale |
| Offline mode (Flutter) | 2 | Online-first acceptable for MVP |

---

## User Stories (Core Flows)

### Customer — Book a Boat
```
AS A customer
I WANT TO search for available fishing boats in Hurghada for July 15
SO THAT I can book a full-day trip for 6 people and pay via Fawry

Acceptance Criteria:
✅ I can enter location, date, party size and see matching yachts
✅ I can see real photos, price, capacity, owner rating, and reviews
✅ I can check date availability in a calendar view
✅ I can create a booking and be taken to Fawry payment
✅ After payment, I receive a push notification and email receipt
✅ The owner receives a push notification within 60 seconds
✅ If owner confirms, I get a confirmation notification
✅ If owner declines (within 2 hours), I get a refund automatically
✅ If owner doesn't respond in 2 hours, booking auto-declines + refund
```

### Boat Owner — List and Manage
```
AS A boat owner
I WANT TO create a listing for my yacht and receive bookings
SO THAT I can earn income from trips I would otherwise miss

Acceptance Criteria:
✅ I can create a listing with photos, description, capacity, and price
✅ My listing is submitted for admin review
✅ After admin approval, my listing is visible to customers
✅ I receive a push notification when a customer requests a booking
✅ I can accept or decline within 2 hours via the app
✅ I can block dates on my availability calendar
✅ I can see my upcoming confirmed bookings in a dashboard
✅ I receive payment (minus 12% commission) within 24h of trip completion
```

### Vendor — Sell Fishing Gear
```
AS A fishing gear vendor
I WANT TO list my products and receive orders
SO THAT I can reach customers outside my local area

Acceptance Criteria:
✅ I can create a store profile and submit products for approval
✅ After admin approves products, customers can find and buy them
✅ When an order is placed, I receive a push + email notification
✅ I can mark the order as shipped and enter a tracking number
✅ Customer is notified when I ship
✅ I receive payout (minus 10% commission) 7 days after delivery
```

### Admin — Approve and Manage
```
AS AN admin
I WANT TO review and approve boats, products, and vendors
SO THAT only verified, quality listings go live on the platform

Acceptance Criteria:
✅ I can see a queue of pending yacht listings with all details + photos
✅ I can approve (listing goes live) or reject (with reason sent to owner)
✅ Same for products and vendor profiles
✅ I can see all active bookings and force-resolve disputes
✅ I can see a revenue summary for any date range
✅ I receive a daily digest email at 8 AM with key metrics
```

---

## Sprint Plan (20 Sprints × 1 Week Each)

| Sprint | Focus | Key Deliverables |
|--------|-------|-----------------|
| 1 | Project setup | Django boilerplate, Flutter scaffold, Next.js scaffold, Docker, GitHub Actions CI |
| 2 | Auth | Registration, login, OTP, Google OAuth, JWT, password reset |
| 3 | Yacht listings | CRUD, photo upload to R2, availability calendar, map view (Flutter + Web) |
| 4 | Booking flow | Create booking, owner accept/decline, booking status, cancellation |
| 5 | Payments | Fawry integration, webhook handler, receipt emails, FCM push |
| 6 | Marketplace | Vendor onboarding, products CRUD, cart, checkout, order tracking |
| 7 | Admin portal | Approvals dashboard, user management, revenue view, booking overrides |
| 8 | Notifications | Full push + email system, in-app notification center, promo codes |
| 9 | Localization | Full Arabic RTL (Flutter + Next.js), language switcher, AR content for all fields |
| 10 | Reviews | Post-trip reviews for yachts, post-order reviews for products |
| 11 | Polish & UX | Loading states, error states, empty states, offline messages |
| 12 | Search | Yacht text search, product text search, filters, sorting |
| 13 | Owner dashboard | Earnings summary, upcoming bookings, calendar |
| 14 | Security hardening | Rate limiting, input validation audit, OWASP checklist |
| 15 | Unit tests | 80% coverage on Django services, Flutter widget tests |
| 16 | Integration tests | All API endpoints tested with real DB |
| 17 | Load testing | Locust scenarios, 500 concurrent users, fix bottlenecks |
| 18 | Bug fixes | Fix all P0/P1 bugs from testing |
| 19 | Staging release | Deploy to staging, internal team testing, UX review |
| 20 | Production launch | Launch on Railway + Vercel + App Store/Play Store |

---

## Launch Readiness Checklist

### Technical
- [ ] All P0 and P1 features implemented and tested
- [ ] Unit test coverage ≥ 80%
- [ ] All API endpoints pass integration tests
- [ ] Load test passed: 500 concurrent users, < 400ms p95 response
- [ ] OWASP top 10 security checklist completed
- [ ] Sentry configured and tested (errors appearing)
- [ ] UptimeRobot monitor configured
- [ ] Database backups confirmed working (restore test done)
- [ ] All secrets in environment variables (not in code)
- [ ] Fawry webhook verified in production
- [ ] FCM push notifications tested on real devices (Android + iOS)
- [ ] Arabic RTL verified on all screens on real devices

### Business
- [ ] 50+ verified boat owners listed (pre-launch supply)
- [ ] 30+ approved vendor product listings (pre-launch supply)
- [ ] Terms & Conditions finalized and legal-reviewed
- [ ] Privacy Policy finalized and legal-reviewed
- [ ] Boat Charter Agreement signed by all listed owners
- [ ] Fawry merchant account active and verified
- [ ] Google Play Store app published
- [ ] Apple App Store app approved
- [ ] Domain seaconnect.app live and SSL active
- [ ] Customer support email/phone staffed

### Marketing
- [ ] Launch social media posts scheduled (Facebook, Instagram, TikTok)
- [ ] First 5 fishing influencers briefed
- [ ] Google Ads campaigns ready
- [ ] Launch press release prepared

---

**Last Updated:** April 6, 2026
**Owner:** Product Owner
**Scope freeze date:** End of Sprint 1 — no new features added after this date
