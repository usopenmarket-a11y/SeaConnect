# API Specification — SeaConnect
**Version:** 1.0
**Date:** April 6, 2026
**Document Status:** ✅ Complete
**Format:** REST / JSON — OpenAPI 3.1 compatible

---

## Base Configuration

```
Production:  https://api.seaconnect.app/v1
Staging:     https://staging-api.seaconnect.app/v1
Development: http://localhost:8000/v1
```

### Authentication
All authenticated endpoints require:
```
Authorization: Bearer <access_token>
Content-Type: application/json
Accept-Language: ar  (or 'en')
```

### Standard Response Envelope
```json
// Success
{
  "status": "success",
  "data": { ... },
  "meta": { "page": 1, "total": 45, "per_page": 20 }
}

// Error
{
  "status": "error",
  "code": "BOOKING_NOT_FOUND",
  "message": "الحجز غير موجود",
  "message_en": "Booking not found",
  "details": { }
}
```

### Standard Error Codes
| HTTP Status | Code | Meaning |
|-------------|------|---------|
| 400 | `VALIDATION_ERROR` | Invalid input data |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Insufficient role/permissions |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Resource state conflict |
| 422 | `UNPROCESSABLE` | Business rule violation |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `SERVER_ERROR` | Internal server error |

### Pagination
All list endpoints use cursor-based pagination:
```
GET /yachts?cursor=eyJpZCI6MTAwfQ==&limit=20
Response includes: { "next_cursor": "...", "has_more": true }
```

---

## Module 1: Authentication (`/auth`)

### POST `/auth/register`
Register a new user account.
```json
// Request
{
  "full_name": "محمد أحمد",
  "email": "user@example.com",        // optional if phone provided
  "phone": "+201012345678",           // optional if email provided
  "password": "SecurePass123!",
  "role": "customer",                 // customer | owner | vendor | organizer
  "preferred_lang": "ar"              // ar | en
}

// Response 201
{
  "status": "success",
  "data": {
    "user": { "id": "uuid", "full_name": "محمد أحمد", "role": "customer" },
    "tokens": {
      "access": "eyJ...",
      "refresh": "eyJ...",
      "access_expires_in": 900         // seconds
    }
  }
}
```

### POST `/auth/login`
Login with email + password.
```json
// Request
{ "email": "user@example.com", "password": "SecurePass123!" }

// Response 200
{
  "status": "success",
  "data": {
    "user": { "id": "uuid", "full_name": "محمد", "role": "customer", "is_verified": true },
    "tokens": { "access": "eyJ...", "refresh": "eyJ..." }
  }
}
```

### POST `/auth/otp/send`
Send SMS OTP to phone number.
```json
// Request
{ "phone": "+201012345678" }

// Response 200
{ "status": "success", "data": { "expires_in": 300 } }
```

### POST `/auth/otp/verify`
Verify OTP and issue JWT.
```json
// Request
{ "phone": "+201012345678", "otp": "123456" }

// Response 200
{
  "status": "success",
  "data": {
    "user": { ... },
    "tokens": { "access": "eyJ...", "refresh": "eyJ..." },
    "is_new_user": false
  }
}
```

### POST `/auth/oauth/google`
```json
// Request
{ "id_token": "google_id_token_string" }

// Response 200 or 201 (new user)
{ "status": "success", "data": { "user": {...}, "tokens": {...} } }
```

### POST `/auth/refresh`
```json
// Request
{ "refresh": "eyJ..." }

// Response 200
{ "status": "success", "data": { "access": "eyJ...", "refresh": "eyJ..." } }
```

### POST `/auth/logout`
```json
// Request (authenticated)
{ "refresh": "eyJ..." }  // refresh token to blacklist

// Response 204 No Content
```

### POST `/auth/password/reset`
```json
// Request
{ "email": "user@example.com" }

// Response 200
{ "status": "success", "data": { "message": "Reset link sent to email" } }
```

---

## Module 2: Users (`/users`)

### GET `/users/me`
Returns current authenticated user's profile.
```json
// Response 200
{
  "status": "success",
  "data": {
    "id": "uuid",
    "full_name": "محمد أحمد",
    "email": "user@example.com",
    "phone": "+201012345678",
    "avatar_url": "https://r2.seaconnect.app/avatars/uuid.jpg",
    "role": "customer",
    "is_verified": true,
    "preferred_lang": "ar",
    "created_at": "2026-05-01T10:00:00Z"
  }
}
```

### PATCH `/users/me`
Update profile. All fields optional.
```json
// Request
{
  "full_name": "محمد أحمد السيد",
  "preferred_lang": "en",
  "avatar_url": "https://..."
}
```

### GET `/users/me/notifications`
```json
// Query params: ?is_read=false&limit=20&cursor=...

// Response 200
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "type": "booking_confirmed",
      "title": "تم تأكيد حجزك",
      "body": "تم تأكيد رحلتك في 15 مايو مع القبطان أحمد",
      "is_read": false,
      "data": { "booking_id": "uuid" },
      "created_at": "2026-05-10T09:00:00Z"
    }
  ],
  "meta": { "unread_count": 3, "has_more": false }
}
```

### PATCH `/users/me/notifications/{id}/read`
Mark single notification as read. Response 204.

### PATCH `/users/me/notifications/read-all`
Mark all as read. Response 204.

---

## Module 3: Yachts (`/yachts`)

### GET `/yachts`
Search and list yachts with filters.
```
Query params:
  location_lat    float     — Center latitude
  location_lng    float     — Center longitude
  radius_km       int       — Search radius (default: 50km)
  start_date      date      — Required for availability filter (YYYY-MM-DD)
  end_date        date      — Required for availability filter
  capacity_min    int       — Minimum guest capacity
  capacity_max    int       — Maximum guest capacity
  price_min       float     — Min price per day (EGP)
  price_max       float     — Max price per day (EGP)
  trip_type       string    — half_day | full_day | multi_day
  category        string    — fishing | picnic | private | corporate
  yacht_type      string    — fishing_boat | speedboat | sailboat | motor_yacht | luxury_yacht
  sort            string    — price_asc | price_desc | rating_desc | newest
  featured        bool      — Show featured listings first
  limit           int       — Default 20, max 50
  cursor          string    — Pagination cursor
```

```json
// Response 200
{
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "النسر الذهبي",
      "name_ar": "النسر الذهبي",
      "yacht_type": "motor_yacht",
      "capacity": 12,
      "location_name": "مارينا هرجاده",
      "base_price_per_day": 3500.00,
      "currency": "EGP",
      "rating_avg": 4.7,
      "total_bookings": 48,
      "media": [{ "url": "https://r2.seaconnect.app/...", "type": "image" }],
      "owner": { "id": "uuid", "full_name": "الكابتن أحمد" },
      "is_featured": true,
      "available_on_dates": true   // given search dates
    }
  ],
  "meta": { "total": 47, "has_more": true, "next_cursor": "eyJ..." }
}
```

### GET `/yachts/{id}`
Full yacht detail.
```json
// Response 200
{
  "status": "success",
  "data": {
    "id": "uuid",
    "name": "النسر الذهبي",
    "description_ar": "يخت فاخر مجهز لرحلات الصيد والنزهة...",
    "yacht_type": "motor_yacht",
    "capacity": 12,
    "location_name": "مارينا هرجاده",
    "location_lat": 27.2579,
    "location_lng": 33.8116,
    "base_price_per_day": 3500.00,
    "amenities": ["wifi", "air_conditioning", "fishing_rods", "life_jackets"],
    "rules": "يُمنع التدخين. الحيوانات الأليفة مسموح بها.",
    "media": [
      { "url": "...", "type": "image", "order": 1 },
      { "url": "...", "type": "video", "order": 2 }
    ],
    "rating_avg": 4.7,
    "reviews_count": 23,
    "owner": {
      "id": "uuid",
      "full_name": "الكابتن أحمد",
      "rating_avg": 4.8,
      "total_bookings": 120,
      "verified": true
    },
    "recent_reviews": [ ... ]
  }
}
```

### GET `/yachts/{id}/availability`
```
Query params: ?month=2026-07  (YYYY-MM)

// Response 200
{
  "status": "success",
  "data": {
    "yacht_id": "uuid",
    "month": "2026-07",
    "dates": {
      "2026-07-01": "available",
      "2026-07-02": "available",
      "2026-07-03": "booked",
      "2026-07-04": "blocked",
      ...
    }
  }
}
```

### PUT `/yachts/{id}/availability`
Owner only. Set availability for multiple dates.
```json
// Request
{
  "dates": [
    { "date": "2026-07-15", "status": "blocked" },
    { "date": "2026-07-16", "status": "available" }
  ]
}
```

### POST `/yachts`
Owner only. Create yacht listing.
```json
// Request
{
  "name": "Golden Eagle",
  "name_ar": "النسر الذهبي",
  "description": "Luxury motor yacht...",
  "description_ar": "يخت موتوري فاخر...",
  "yacht_type": "motor_yacht",
  "capacity": 12,
  "location_name": "Hurghada Marina",
  "location_name_ar": "مارينا هرجاده",
  "location_lat": 27.2579,
  "location_lng": 33.8116,
  "base_price_per_day": 3500.00,
  "amenities": ["wifi", "air_conditioning", "fishing_rods"],
  "rules": "No smoking."
}
// Response 201: yacht object with is_approved: false (pending admin review)
```

### PATCH `/yachts/{id}`
Owner only. Update listing fields.

### POST `/yachts/{id}/media`
Owner only. Upload boat image/video (multipart/form-data).
```
// Returns: { "url": "https://r2.seaconnect.app/..." }
```

### POST `/yachts/{id}/reviews`
Authenticated customer who completed a booking. Create review.
```json
// Request
{
  "booking_id": "uuid",   // must be a completed booking for this yacht
  "rating": 5,
  "comment": "رحلة رائعة! الكابتن محترف جداً"
}
```

### GET `/yachts/{id}/reviews`
Public. List reviews for a yacht.

---

## Module 4: Bookings (`/bookings`)

### POST `/bookings`
Create a new booking (direct mode).
```json
// Request
{
  "yacht_id": "uuid",
  "start_date": "2026-07-15",
  "end_date": "2026-07-15",       // same as start for half/full day
  "trip_type": "full_day",        // half_day | full_day | multi_day
  "trip_category": "fishing",     // fishing | picnic | private | corporate
  "num_people": 6,
  "special_requests": "نريد أعواد صيد إضافية"
}

// Response 201
{
  "status": "success",
  "data": {
    "id": "uuid",
    "status": "pending",
    "total_amount": 3500.00,
    "platform_fee": 420.00,         // 12%
    "owner_payout": 3080.00,
    "payment_url": "https://www.atfawry.com/ECommerceWeb/...",  // redirect customer here
    "payment_expires_at": "2026-04-06T12:30:00Z"  // 30 min to pay
  }
}
```

### POST `/bookings/match`
Request AI smart matching.
```json
// Request
{
  "trip_type": "full_day",
  "trip_category": "fishing",
  "num_people": 8,
  "budget_min": 2000,
  "budget_max": 5000,
  "preferred_dates": ["2026-07-15", "2026-07-16", "2026-07-20"],
  "preferences": {
    "location": "Hurghada",
    "amenities": ["fishing_rods", "life_jackets"],
    "notes": "نريد يخت هادئ للصيد"
  }
}

// Response 202 Accepted (async — result sent via push notification)
{
  "status": "success",
  "data": {
    "match_request_id": "uuid",
    "message": "جاري البحث عن أفضل يخت مناسب لك...",
    "estimated_time_seconds": 15
  }
}
```

### GET `/bookings/match/{match_request_id}`
Poll or get match results after push notification received.
```json
// Response 200
{
  "status": "success",
  "data": {
    "request_id": "uuid",
    "status": "completed",
    "results": [
      {
        "match_id": "uuid",
        "yacht": { ... },  // full yacht object
        "match_score": 0.94,
        "ai_reasoning": "يتطابق هذا اليخت مع ميزانيتك وعدد الأشخاص ويحتوي على جميع المعدات المطلوبة",
        "available_date": "2026-07-15",
        "quoted_price": 4200.00,
        "status": "offered"
      }
    ]
  }
}
```

### GET `/bookings`
Customer: returns their own bookings. Owner: returns bookings for their yachts.
```
Query params: ?status=pending&limit=20&cursor=...
```

### GET `/bookings/{id}`
Booking detail. Customer sees their booking. Owner sees bookings for their yachts.

### PATCH `/bookings/{id}/confirm`
Owner only. Confirm a pending booking.
```json
// Response 200
{ "status": "success", "data": { "id": "uuid", "status": "confirmed", "confirmed_at": "..." } }
```

### PATCH `/bookings/{id}/decline`
Owner only. Decline a pending booking (triggers refund automatically).
```json
// Request
{ "reason": "اليخت محجوز في هذا التاريخ" }
```

### PATCH `/bookings/{id}/cancel`
Customer or Owner. Cancel booking (refund per cancellation policy).
```json
// Request
{ "reason": "ظروف طارئة" }
```

---

## Module 5: Marketplace (`/marketplace`)

### GET `/marketplace/categories`
Public. List product categories.
```json
// Response 200
{
  "data": [
    { "id": "uuid", "name": "أعواد وبكرات", "name_ar": "أعواد وبكرات", "slug": "rods-reels", "icon_url": "..." },
    { "id": "uuid", "name": "خيوط وخطاطيف", "slug": "lines-hooks" }
  ]
}
```

### GET `/marketplace/products`
Public. Search and filter products.
```
Query params:
  category_id     uuid
  vendor_id       uuid
  q               string    — Search query
  price_min       float
  price_max       float
  in_stock        bool      — Default true
  sort            string    — price_asc | price_desc | rating_desc | newest | best_selling
  featured        bool
  limit           int
  cursor          string
```

### GET `/marketplace/products/{id}`
Public. Full product detail.
```json
{
  "id": "uuid",
  "name": "بكرة صيد شيمانو",
  "name_ar": "بكرة صيد شيمانو",
  "description_ar": "بكرة صيد احترافية...",
  "price": 850.00,
  "sale_price": 720.00,
  "currency": "EGP",
  "stock_qty": 15,
  "attributes": { "weight": "280g", "gear_ratio": "6.2:1" },
  "media": [ { "url": "...", "type": "image" } ],
  "vendor": { "id": "uuid", "store_name": "متجر الصياد", "rating_avg": 4.6 },
  "rating_avg": 4.5,
  "reviews_count": 18
}
```

### POST `/marketplace/products`
Vendor only. Create product. Returns product with `is_approved: false`.

### PATCH `/marketplace/products/{id}`
Vendor only. Update product.

### GET `/marketplace/cart`
Authenticated. Get current user's cart.
```json
{
  "id": "uuid",
  "items": [
    {
      "id": "uuid",
      "product": { "id": "uuid", "name": "...", "price": 850.00, "sale_price": 720.00, "stock_qty": 15 },
      "quantity": 2,
      "line_total": 1440.00
    }
  ],
  "subtotal": 1440.00,
  "item_count": 2
}
```

### POST `/marketplace/cart/items`
```json
// Request
{ "product_id": "uuid", "quantity": 2 }
```

### PATCH `/marketplace/cart/items/{id}`
```json
// Request
{ "quantity": 3 }
```

### DELETE `/marketplace/cart/items/{id}`
Response 204.

### POST `/marketplace/orders`
Checkout — convert cart to order and initiate payment.
```json
// Request
{
  "shipping_address": {
    "full_name": "محمد أحمد",
    "phone": "+201012345678",
    "street": "شارع التحرير، ش 5",
    "city": "القاهرة",
    "governorate": "القاهرة"
  },
  "notes": "يرجى التغليف الجيد"
}

// Response 201
{
  "data": {
    "order_id": "uuid",
    "total_amount": 1540.00,   // subtotal + shipping
    "payment_url": "https://www.atfawry.com/...",
    "payment_expires_at": "..."
  }
}
```

### GET `/marketplace/orders`
Customer: own orders. Vendor: orders containing their products.

### GET `/marketplace/orders/{id}`
Order detail with line items and shipment status.

### PATCH `/marketplace/orders/{id}/ship`
Vendor only. Mark as shipped.
```json
{ "tracking_number": "ARX12345678", "carrier": "Aramex" }
```

### POST `/marketplace/products/{id}/reviews`
Authenticated customer who purchased the product.
```json
{ "order_id": "uuid", "rating": 4, "comment": "جودة ممتازة" }
```

---

## Module 6: Competitions (`/competitions`)

### GET `/competitions`
Public. List active/upcoming competitions.
```
Query params: ?status=open&location=hurghada&limit=20
```

### GET `/competitions/{id}`
Full competition detail including prize structure, registration status, rules.

### POST `/competitions`
Organizer role only. Create competition.
```json
{
  "title": "بطولة صيد البحر الأحمر",
  "title_ar": "بطولة صيد البحر الأحمر",
  "description_ar": "بطولة سنوية لعشاق الصيد...",
  "location_name": "هرجاده",
  "location_lat": 27.2579,
  "location_lng": 33.8116,
  "start_date": "2026-08-01T08:00:00Z",
  "end_date": "2026-08-01T18:00:00Z",
  "registration_deadline": "2026-07-25T23:59:59Z",
  "max_participants": 100,
  "entry_fee": 300.00,
  "prize_pool": 15000.00,
  "prize_details": [
    { "place": 1, "prize_type": "cash", "value": 8000 },
    { "place": 2, "prize_type": "cash", "value": 4000 },
    { "place": 3, "prize_type": "gear", "value": 3000 }
  ],
  "rules": "يُحسب الفوز بإجمالي الوزن. يجب الإفراج عن الأسماك المحمية."
}
```

### POST `/competitions/{id}/register`
Authenticated user. Register as participant.
```json
// Request
{ "team_name": "فريق الصقور" }  // optional

// Response 201
{
  "data": {
    "entry_id": "uuid",
    "status": "pending",          // pending payment
    "payment_url": "https://..."  // if entry_fee > 0
  }
}
```

### GET `/competitions/{id}/entries`
Organizer only. List all registered participants.

### PATCH `/competitions/{id}/entries/{entry_id}/approve`
Organizer only. Approve a pending entry.

### POST `/competitions/{id}/catches`
Participant only (during active competition). Log a catch.
```json
{
  "entry_id": "uuid",
  "fish_species": "بلطي",
  "weight_kg": 2.35,
  "length_cm": 48.5,
  "photo_url": "https://r2.seaconnect.app/catches/...",
  "gps_lat": 27.2450,
  "gps_lng": 33.8050
}
```

### GET `/competitions/{id}/leaderboard`
Public. Live leaderboard.
```json
{
  "data": {
    "competition_id": "uuid",
    "last_updated": "2026-08-01T14:30:00Z",
    "rankings": [
      {
        "rank": 1,
        "entry_id": "uuid",
        "user": { "full_name": "أحمد محمد", "avatar_url": "..." },
        "team_name": "فريق الصقور",
        "total_weight_kg": 12.45,
        "total_catches": 5
      }
    ]
  }
}
```

---

## Module 7: Payments (`/payments`)

### POST `/payments/initiate`
Internal — called automatically by booking/checkout flows. Direct use for manual retries.
```json
// Request
{
  "type": "booking",          // booking | order | competition_entry
  "reference_id": "uuid",     // booking_id, order_id, or entry_id
  "method": "fawry"           // fawry | stripe
}

// Response 200
{
  "data": {
    "payment_id": "uuid",
    "payment_url": "https://...",
    "reference_number": "FAW-20260406-12345",
    "expires_at": "2026-04-06T12:30:00Z"
  }
}
```

### POST `/payments/webhook/fawry`
Public (Fawry calls this). Verifies HMAC signature, updates payment status.

### POST `/payments/webhook/stripe`
Public (Stripe calls this). Verifies Stripe signature, updates payment status.

### GET `/payments/history`
Authenticated. Current user's payment history.
```json
{
  "data": [
    {
      "id": "uuid",
      "amount": 3500.00,
      "currency": "EGP",
      "method": "fawry",
      "status": "paid",
      "description": "حجز رحلة يوم كامل - النسر الذهبي",
      "paid_at": "2026-06-15T10:30:00Z"
    }
  ]
}
```

### POST `/payments/{id}/refund`
Admin only.
```json
{ "amount": 3500.00, "reason": "Owner cancelled trip" }
```

---

## Module 8: Admin (`/admin`)

> All endpoints require `role: admin`. Rate-limited separately.

### Users
- `GET /admin/users` — List users with filters (role, status, search)
- `GET /admin/users/{id}` — User detail + all activity
- `PATCH /admin/users/{id}` — Update user (activate/ban, change role)

### Approvals
- `GET /admin/yachts/pending` — Yachts awaiting approval
- `PATCH /admin/yachts/{id}/approve` — Approve yacht listing
- `PATCH /admin/yachts/{id}/reject` — Reject with reason
- `GET /admin/products/pending` — Products awaiting approval
- `PATCH /admin/products/{id}/approve` — Approve product
- `PATCH /admin/products/{id}/reject` — Reject with reason
- `GET /admin/vendors/pending` — Vendor profiles awaiting approval
- `PATCH /admin/vendors/{id}/approve` — Approve vendor

### Bookings & Orders
- `GET /admin/bookings` — All bookings with filters
- `GET /admin/orders` — All marketplace orders
- `POST /admin/bookings/{id}/override` — Force-confirm or cancel (dispute resolution)

### Financial
- `GET /admin/transactions` — Payout ledger
- `GET /admin/revenue` — Revenue by period, by stream
- `POST /admin/payouts/batch` — Trigger manual payout batch

### Analytics
```
GET /admin/analytics/overview
Response:
{
  "data": {
    "period": "2026-06",
    "total_revenue": 92519.00,
    "total_bookings": 216,
    "total_orders": 189,
    "new_users": 312,
    "active_users": 847,
    "gmv": 865000.00,
    "top_yachts": [...],
    "top_products": [...],
    "revenue_by_day": [...]
  }
}
```

### Promotions
- `GET /admin/promotions` — List promo codes
- `POST /admin/promotions` — Create promo code
- `PATCH /admin/promotions/{id}` — Update/deactivate

---

## Module 9: Search (`/search`)

### GET `/search`
Universal search across yachts, products, competitions.
```
Query params: ?q=صيد&types=yachts,products&limit=5

// Response 200
{
  "data": {
    "yachts": [ ... ],     // up to 5 results
    "products": [ ... ],   // up to 5 results
    "competitions": [ ... ] // up to 5 results
  }
}
```

Backed by:
1. PostgreSQL full-text search (`tsvector`) for exact/fuzzy matching
2. pgvector semantic search for natural language queries (Arabic)

---

## Module 10: File Upload (`/media`)

### POST `/media/upload`
Authenticated. Upload a file, get back a URL.
```
Content-Type: multipart/form-data
Body: file (image/jpeg, image/png, image/webp, video/mp4) + type (avatar|yacht|product|competition|catch)
Max size: 10MB images, 50MB videos

// Response 201
{ "data": { "url": "https://r2.seaconnect.app/media/uuid.jpg", "type": "image" } }
```

---

## Rate Limits

| Endpoint Group | Limit | Window |
|---------------|-------|--------|
| `/auth/*` | 10 requests | 1 minute per IP |
| `/auth/otp/send` | 3 requests | 10 minutes per phone |
| Authenticated endpoints | 300 requests | 1 minute per user |
| Unauthenticated browsing | 100 requests | 1 minute per IP |
| `/admin/*` | 600 requests | 1 minute per admin |
| Webhook endpoints | Unlimited | (verified by signature) |

---

## Versioning Policy

- Current version: `v1`
- Breaking changes require a new version (`v2`)
- Non-breaking additions (new optional fields, new endpoints) do not require new version
- `v1` will be supported for minimum 12 months after `v2` launch
- Deprecation notice: 90 days via email + `Deprecation` response header

---

**Last Updated:** April 6, 2026
**Owner:** CTO / Tech Lead
