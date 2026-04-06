# UX Flows & Screen Map — SeaConnect
**Version:** 1.0
**Date:** April 6, 2026
**Status:** ✅ Complete

---

## 1. App Structure Overview

SeaConnect has three surfaces:
1. **Flutter Mobile App** — primary surface for customers, boat owners, and vendors
2. **Next.js Web (Public)** — SEO-optimized boat/product browsing, booking for non-app users
3. **Next.js Web (Admin Portal)** — internal tool at `admin.seaconnect.app`

The Flutter app carries the full feature set for MVP. The public web covers discovery + booking only.

---

## 2. Flutter App — Navigation Structure

### 2.1 Role-Based Bottom Navigation

Each role sees a different bottom navigation bar after login:

**Customer:**
```
[🔍 Explore] [📅 My Bookings] [🛒 Shop] [🔔 Alerts] [👤 Profile]
```

**Boat Owner:**
```
[📋 My Listings] [📅 Bookings] [📊 Earnings] [🔔 Alerts] [👤 Profile]
```

**Vendor:**
```
[🏪 My Store] [📦 Orders] [📊 Sales] [🔔 Alerts] [👤 Profile]
```

All roles share the same Alerts and Profile tabs. The first three tabs differ by role.

### 2.2 Global Navigation Rules
- Back button: always top-left (flips to top-right in Arabic RTL)
- App bar: show on screens with titles; hide on full-bleed map/photo screens
- Bottom nav: hidden inside booking flow, checkout flow (distraction-free)
- Safe area: respected on all screens (notch + home indicator padding)

---

## 3. Screen Inventory — Flutter App

### AUTH GROUP (no bottom nav)

| Screen | Route | Description |
|--------|-------|-------------|
| Splash | `/` | Logo on Deep Sea background, 2s, auto-navigate |
| Onboarding | `/onboard` | 3-step slides: Discover / Book / Earn. Skip button |
| Welcome | `/welcome` | "Log in" + "Create account" + Google button |
| Register — Step 1 | `/register/info` | Name, email, phone, password |
| Register — Step 2 | `/register/role` | Choose role: Customer / Boat Owner / Vendor (illustrated cards) |
| Register — Step 3 | `/register/verify` | OTP input (6 digits), resend timer |
| Login | `/login` | Email/phone + password. "Forgot password?" link |
| Google OAuth | (handled in WebView) | Firebase Google sign-in flow |
| Forgot Password | `/forgot-password` | Enter email → send reset link |
| Reset Password | `/reset-password` | New password + confirm (opened from email deep link) |

---

### CUSTOMER SCREENS

#### Explore Tab
| Screen | Route | Description |
|--------|-------|-------------|
| Home / Search | `/explore` | Search bar (location + date + party size), Featured boats carousel, Categories row (Fishing / Yacht / Speedboat / Sunset), Recent nearby listings |
| Search Results — List | `/explore/results` | Yacht cards in vertical list. Sort: Price / Rating / Distance. Filter FAB |
| Search Results — Map | `/explore/results/map` | Leaflet-style map with boat pins. Tap pin → mini card. Toggle between list/map |
| Filter Sheet | (bottom sheet) | Capacity slider, Price range slider, Trip type checkboxes, Boat type chips, Category chips. "Apply Filters" button |
| Yacht Detail | `/explore/yacht/:id` | Hero photo carousel, Title + price + rating + review count, Capacity + trip types chips, Description (expandable), Amenities grid, Owner card (avatar + name + response rate), Reviews section (last 5 + "See all"), Availability calendar preview, Sticky bottom bar: "Check Availability" → "Book Now" |
| Availability Calendar | `/explore/yacht/:id/availability` | Full-month calendar. Green = available, Red = booked, Grey = blocked. Date range selection |
| All Reviews | `/explore/yacht/:id/reviews` | Paginated list of reviews with star breakdown |
| Owner Public Profile | `/explore/owner/:id` | Owner avatar, bio, response rate, response time, all their active listings |

#### Booking Tab
| Screen | Route | Description |
|--------|-------|-------------|
| My Bookings | `/bookings` | Tabs: Upcoming / Past / Cancelled. BookingCard per row (photo + boat name + date + status chip) |
| Booking Detail | `/bookings/:id` | Full booking info, boat photo, dates, total paid, status timeline (Created → Paid → Confirmed → Completed), Owner contact info (shown after confirmation), Cancel button (if eligible), Review button (if completed) |
| Create Booking | `/book/:yachtId` | Step 1: Select dates + trip type + party size + special requests. Price summary. "Proceed to Payment" |
| Payment | `/book/:yachtId/pay` | Order summary, Promo code input, Fawry payment options (Card / Wallet / Cash), "Pay [amount] EGP" button |
| Payment Processing | `/book/:yachtId/processing` | Loading spinner: "جاري معالجة الدفع..." — do not navigate away |
| Booking Confirmed | `/book/:yachtId/confirmed` | Success illustration, booking reference, "Share Trip" button, "View Booking" button |
| Payment Failed | `/book/:yachtId/failed` | Error illustration, reason, "Try Again" button, "Use Different Method" button |
| Cancel Booking | (bottom sheet) | Reason selector, refund eligibility notice, "Confirm Cancellation" button |
| Write Review | `/bookings/:id/review` | Star rating (tap to select), text field (optional), Photo upload (optional), "Submit Review" |

#### Shop Tab
| Screen | Route | Description |
|--------|-------|-------------|
| Marketplace Home | `/shop` | Search bar, Categories horizontal scroll, Featured products, Recently added |
| Category | `/shop/category/:slug` | Product grid (2 columns), Sort: Price / Newest / Best Selling |
| Product Detail | `/shop/product/:id` | Hero image carousel, Name + price + stock status, Vendor card, Description, Specifications, Reviews, Quantity selector, "Add to Cart" button, "Buy Now" button |
| Search Results | `/shop/search` | Product grid with search results, empty state if no results |
| Cart | `/shop/cart` | Cart items list (photo + name + qty controls + subtotal), Subtotal + estimated shipping, "Checkout" button, Empty cart state with "Start Shopping" CTA |
| Checkout | `/shop/checkout` | Shipping address form (or saved address), Order summary, Promo code, Payment method, "Place Order" button |
| Order Confirmed | `/shop/order-confirmed` | Success animation, order reference, estimated delivery, "Track Order" button |
| Order Detail | `/shop/orders/:id` | Items, shipping address, status timeline (Placed → Processing → Shipped → Delivered), Tracking number (when available), "Report Issue" button |
| My Orders | (within Profile) | Order history list |
| Write Product Review | `/shop/orders/:id/review` | Product photo + name, Star rating, Text field, "Submit" |

#### Notifications Tab
| Screen | Route | Description |
|--------|-------|-------------|
| Notification Center | `/notifications` | List of all notifications, grouped by date. Unread shown with blue dot. Tap → navigate to relevant screen. "Mark all as read" |

#### Profile Tab
| Screen | Route | Description |
|--------|-------|-------------|
| Profile | `/profile` | Avatar + name + email, Quick stats (trips completed, reviews written), Menu: Edit Profile / My Orders / Saved Listings / Language / Help / Log Out |
| Edit Profile | `/profile/edit` | Name, phone, email, profile photo upload, Save button |
| Saved Listings | `/profile/saved` | Wishlist of saved yacht listings (heart button on listing cards) |
| Language Settings | `/profile/language` | Arabic / English toggle with flag icons |
| Help | `/profile/help` | FAQ accordion (Phase 2: full help center), Contact support button |

---

### BOAT OWNER SCREENS

#### My Listings Tab
| Screen | Route | Description |
|--------|-------|-------------|
| My Listings | `/owner/listings` | List of owner's boats with status chips (Active / Pending Review / Suspended). "Add New Listing" FAB |
| Listing Detail | `/owner/listings/:id` | Preview of how listing looks to customers, Edit button, Status indicator |
| Create/Edit Listing — Step 1 | `/owner/listings/create/info` | Boat name, type dropdown, description (Arabic + English), capacity, price per day/half-day/hour, departure port |
| Create/Edit Listing — Step 2 | `/owner/listings/create/media` | Photo upload (min 3, max 10), Video upload (optional), Drag to reorder photos |
| Create/Edit Listing — Step 3 | `/owner/listings/create/amenities` | Checkboxes: Life jackets / Fishing rods / Cooler / GPS / Toilet / Covered deck / Sound system / etc. |
| Create/Edit Listing — Step 4 | `/owner/listings/create/documents` | Upload: Vessel registration / Insurance / Captain's license / Tourism license. File picker with preview |
| Create/Edit Listing — Step 5 | `/owner/listings/create/calendar` | Availability calendar. Tap dates to block/unblock. "Submit for Review" button |
| Listing Submitted | `/owner/listings/submitted` | Success screen: "Under review — you'll be notified within 24 hours" |

#### Bookings Tab (Owner)
| Screen | Route | Description |
|--------|-------|-------------|
| Incoming Bookings | `/owner/bookings` | Tabs: Pending (needs action) / Confirmed / Completed / Declined. BookingCard with customer info + dates + amount |
| Booking Request Detail | `/owner/bookings/:id` | Customer avatar + name + phone, Trip details, Party size, Special requests, Amount (after commission shown), 2-hour countdown timer, "Accept" (green) / "Decline" (red) buttons |
| Decline Reason | (bottom sheet) | Reason selector (Boat unavailable / Maintenance / Capacity issue / Other), text field for custom reason, "Confirm Decline" |
| Confirmed Booking Detail | `/owner/bookings/:id` | Confirmed booking info, Customer contact, Trip checklist (show safety brief, confirm departure time), "Mark as Completed" button (available after trip date) |

#### Earnings Tab
| Screen | Route | Description |
|--------|-------|-------------|
| Earnings Dashboard | `/owner/earnings` | Total earned (all time), This month, Pending payout, Payout history list (date + amount + status), Bank account info (last 4 digits), "Request Payout" button (Phase 2 — auto for MVP) |

---

### VENDOR SCREENS

#### My Store Tab
| Screen | Route | Description |
|--------|-------|-------------|
| Store Dashboard | `/vendor/store` | Store logo + name, Active products count, Total sales this month, Quick actions: Add Product / View Orders |
| My Products | `/vendor/products` | Product list with status (Active / Pending Review / Out of Stock). Edit and Delete actions |
| Create/Edit Product — Step 1 | `/vendor/products/create/info` | Name (AR + EN), Category, Description, Price, Stock quantity |
| Create/Edit Product — Step 2 | `/vendor/products/create/media` | Photo upload (min 1, max 5) |
| Create/Edit Product — Step 3 | `/vendor/products/create/shipping` | Shipping cost (fixed), Estimated delivery days, "Submit for Review" |

#### Orders Tab (Vendor)
| Screen | Route | Description |
|--------|-------|-------------|
| My Orders | `/vendor/orders` | Tabs: New (needs action) / Shipped / Delivered. OrderCard: product photo + customer name + address + amount |
| Order Detail | `/vendor/orders/:id` | Order items, Customer shipping address, Order date, "Mark as Shipped" button + tracking number input |
| Mark Shipped | (bottom sheet) | Carrier name dropdown, Tracking number input, "Confirm" button |

#### Sales Tab
| Screen | Route | Description |
|--------|-------|-------------|
| Sales Summary | `/vendor/sales` | Revenue this month, Total orders, Payout history, Best-selling products (top 5) |

---

## 4. Next.js Public Web — Screen Map

The web covers discovery and booking for users who prefer not to use the app.

| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Hero section with search (location + date + party size), Featured boats, How it works (3 steps), App download CTA, Footer |
| Search Results | `/search` | Same as app: list + map toggle, filters sidebar (desktop) or filter modal (mobile) |
| Yacht Detail | `/yacht/[id]` | Full listing page, SEO-optimized with structured data, Booking widget (sticky on desktop, bottom drawer on mobile) |
| Checkout | `/checkout/[bookingId]` | Booking summary + Fawry payment embed |
| Booking Confirmed | `/booking/confirmed` | Success page with booking reference |
| Marketplace | `/shop` | Product browsing (SEO-optimized) |
| Product Detail | `/shop/[id]` | Product page |
| Login / Register | `/auth/login`, `/auth/register` | Web auth flows |
| My Bookings (web) | `/account/bookings` | Customer booking history |
| My Orders (web) | `/account/orders` | Customer order history |

---

## 5. Admin Portal (Next.js) — Screen Map

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/` | Key metrics cards, recent activity feed, pending actions count |
| Users | `/users` | Searchable table: all users, filter by role/status. Click → user detail |
| User Detail | `/users/[id]` | Profile info, role, bookings/orders history, Activate/Ban buttons |
| Yacht Approvals | `/approvals/yachts` | Queue of pending listings. Card shows photos + documents. Approve/Reject with reason |
| Product Approvals | `/approvals/products` | Queue of pending products. Photo grid. Approve/Reject |
| Vendor Approvals | `/approvals/vendors` | Pending vendor profiles. Approve/Reject |
| All Bookings | `/bookings` | Full booking table with filters. Override status. Initiate refund |
| All Orders | `/orders` | Full order table. Override status |
| Revenue | `/revenue` | Charts: GTV over time, revenue by stream, payout ledger table |
| Promo Codes | `/promos` | Create/manage promo codes (P2 — Sprint 8) |
| Settings | `/settings` | Platform config: commission rates (display only), admin accounts |

---

## 6. Key Interaction Patterns

### 6.1 Search & Discovery (Customer)
```
Home screen
  ↓ Tap search bar or "Find a boat"
Enter: Location (text or map pick) + Dates + Party Size
  ↓ "Search" button
Results list (default) — swipe up = more results
  ↓ Tap "Map" toggle
Results map — tap pin = mini card at bottom
  ↓ Tap mini card or list card
Yacht Detail — full screen
  ↓ Tap "Check Availability"
Calendar picker — select date range
  ↓ Tap "Book for [X] EGP"
Booking creation form
  ↓ Confirm
Payment screen
```

### 6.2 Booking Accept/Decline (Owner)
```
Push notification: "طلب حجز جديد من [اسم العميل]"
  ↓ Tap notification (or open Bookings tab)
Booking Request Detail screen — countdown timer visible
  ↓ Review: dates, party size, special requests, payout amount
[Accept] → Booking confirmed → Customer notified → Timer disappears
[Decline] → Reason sheet → Decline confirmed → Customer refunded → Notification sent
  ↓ If no action in 2h
Auto-decline runs → Both parties notified
```

### 6.3 Cart & Checkout (Customer, Marketplace)
```
Product Detail
  ↓ "Add to Cart" (with haptic feedback + cart icon badge +1)
Continue browsing OR tap cart icon
  ↓ Cart screen: review items + quantities
"Checkout" button
  ↓ Address screen (or pre-filled if saved)
Payment screen (same Fawry flow as bookings)
  ↓ Confirmed → Order created → Vendor notified
Order Confirmed screen
```

### 6.4 Admin Approval Flow
```
New listing submitted by owner
  ↓ Celery task sends email to admin: "New listing pending"
Admin opens portal → Approvals → Yachts
  ↓ Reviews photos, documents
[Approve] → Listing status = ACTIVE → Owner receives push + email: "Your listing is live!"
[Reject] → Reason required → Owner receives push + email: "Listing rejected: [reason]"
  ↓ Owner corrects and resubmits
Back to approval queue
```

---

## 7. Empty States

Every list screen needs a designed empty state. Do not show a blank white screen.

| Screen | Empty State Message (Arabic) | CTA |
|--------|------------------------------|-----|
| Search Results | "لا توجد قوارب متاحة في هذا التاريخ" | "غيّر التاريخ" |
| My Bookings | "لم تحجز أي رحلة بعد" | "استكشف القوارب" |
| My Orders | "لم تطلب أي منتج بعد" | "تسوق الآن" |
| Cart | "سلة التسوق فارغة" | "تصفح المنتجات" |
| Notifications | "لا توجد إشعارات" | — |
| Owner Bookings (Pending) | "لا توجد طلبات حجز جديدة" | — |
| Owner Listings | "لم تضف أي قارب بعد" | "أضف قاربك الأول" |
| Vendor Products | "لم تضف أي منتجات بعد" | "أضف أول منتج" |
| Vendor Orders | "لا توجد طلبات جديدة" | — |
| Saved Listings | "لم تحفظ أي قارب بعد" | "استكشف القوارب" |

---

## 8. Loading States

Use shimmer skeleton loading on all screens that fetch data. Never show a spinner alone for content-heavy screens.

```dart
// Shimmer skeleton for YachtCard
Widget yachtCardSkeleton() {
  return Shimmer.fromColors(
    baseColor: Color(0xFFECEFF1),
    highlightColor: Color(0xFFF5F7FA),
    child: Column(children: [
      Container(height: 180, decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      )),
      SizedBox(height: 8),
      Container(height: 16, width: 200, color: Colors.white),
      Container(height: 12, width: 120, color: Colors.white),
    ]),
  );
}
```

Loading rules:
- Initial page load: shimmer skeletons
- Refresh (pull-to-refresh): keep existing content, show thin progress bar at top
- Action (button tap): show loading indicator inside the button, disable it
- Payment processing: full-screen loading with message — never allow back navigation

---

## 9. Error States

| Error Type | Display | Recovery |
|-----------|---------|----------|
| No internet | Inline banner: "لا يوجد اتصال بالإنترنت" | Auto-retry on reconnect |
| API error (5xx) | Snackbar: "حدث خطأ. حاول مرة أخرى." | Retry button |
| Not found (404) | Empty state illustration + message | "Go Back" button |
| Auth expired | Navigate to login with message: "انتهت جلستك. سجّل دخولك مجدداً" | Auto on next API call |
| Payment failed | Full-screen error with specific reason | Try Again / Different Method |
| Upload failed | Toast notification with retry option | Retry upload |

---

## 10. Onboarding Screens (First Launch)

3-screen illustrated onboarding shown only on first app open (never again):

**Screen 1:**
- Illustration: fishing boat on the sea with location pin
- Title: "اكتشف أفضل القوارب" / "Discover the best boats"
- Subtitle: "آلاف القوارب والرحلات في مصر في مكان واحد"

**Screen 2:**
- Illustration: calendar with checkmark and payment card
- Title: "احجز في دقيقتين" / "Book in two minutes"
- Subtitle: "ادفع بأمان عبر فوري واستلم تأكيدك فوراً"

**Screen 3:**
- Illustration: boat owner receiving money notification
- Title: "أو اربح من قاربك" / "Or earn from your boat"
- Subtitle: "سجّل كمالك قارب وابدأ في استقبال الحجوزات"

Navigation: Dots indicator + Next button. Last screen: "ابدأ الآن" → Welcome screen.
Skip button always visible (top-right, flips to top-left in RTL).

---

## 11. Deep Link Map

| Trigger | Deep Link | Destination Screen |
|---------|----------|--------------------|
| Booking confirmation email | `seaconnect://bookings/{id}` | Booking Detail |
| Owner booking request push | `seaconnect://owner/bookings/{id}` | Booking Request Detail |
| Vendor new order push | `seaconnect://vendor/orders/{id}` | Order Detail |
| Password reset email | `seaconnect://reset-password?token={token}` | Reset Password screen |
| Listing approved push | `seaconnect://owner/listings/{id}` | Listing Detail |
| Product approved push | `seaconnect://vendor/products/{id}` | Product Detail |
| Shipment notification push | `seaconnect://orders/{id}` | Order Detail |

---

## 12. Screen Count Summary

| Platform | Role | Screen Count |
|---------|------|-------------|
| Flutter | Auth (shared) | 10 |
| Flutter | Customer | 28 |
| Flutter | Boat Owner | 15 |
| Flutter | Vendor | 12 |
| Flutter | Shared (notifications, profile) | 6 |
| **Flutter Total** | | **~71 screens** |
| Next.js Public | All | 12 pages |
| Next.js Admin | Admin | 10 pages |
| **Web Total** | | **~22 pages** |

This is the expected scope for the 20-sprint plan. Average of ~3–4 new screens per sprint.

---

**Last Updated:** April 6, 2026
**Owner:** Product Owner + Designer
**Next Action:** Share screen inventory with UI designer; prioritize Figma designs for Sprint 3 screens first (Yacht listing cards, Search, Yacht Detail)
