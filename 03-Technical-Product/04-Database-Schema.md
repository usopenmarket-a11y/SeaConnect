# Database Schema — SeaConnect (Complete)
**Version:** 1.0
**Date:** April 6, 2026
**Database:** PostgreSQL 16 (Supabase)
**Document Status:** ✅ Complete

---

## Migration Order

Run migrations in this order to respect foreign key dependencies:

```
1.  extensions
2.  users
3.  boat_owner_profiles
4.  vendor_profiles
5.  departure_ports          ← NEW
6.  fish_species             ← NEW
7.  fishing_seasons          ← NEW
8.  yachts                   (now references departure_ports)
9.  availability
10. weather_cache            ← NEW
11. match_requests
12. match_results
13. bookings
14. payments
15. transactions
16. product_categories
17. products
18. carts + cart_items
19. orders + order_items + shipments
20. competitions
21. competition_entries
22. catch_logs
23. reviews
24. notifications
25. notification_preferences
26. audit_logs
27. promo_codes
28. indexes
25. materialized views
```

---

## 0. Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
```

---

## 1. Users & Profiles

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE,
    phone           VARCHAR(20) UNIQUE,
    full_name       VARCHAR(255) NOT NULL,
    avatar_url      TEXT,
    role            VARCHAR(20) NOT NULL DEFAULT 'customer'
                    CHECK (role IN ('customer','owner','vendor','organizer','admin')),
    auth_provider   VARCHAR(20) NOT NULL DEFAULT 'email'
                    CHECK (auth_provider IN ('email','google','apple','phone')),
    password_hash   TEXT,                     -- NULL for OAuth users
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    preferred_lang  VARCHAR(5) NOT NULL DEFAULT 'ar'
                    CHECK (preferred_lang IN ('ar','en')),
    fcm_token       TEXT,                     -- Firebase push token
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT users_email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256 of the token
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE otp_codes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone       VARCHAR(20) NOT NULL,
    code_hash   VARCHAR(64) NOT NULL,         -- SHA-256 of 6-digit code
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE boat_owner_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    national_id         VARCHAR(20),
    national_id_verified BOOLEAN DEFAULT FALSE,
    license_number      VARCHAR(50),          -- Coast guard license
    license_verified    BOOLEAN DEFAULT FALSE,
    license_expiry      DATE,
    bank_account_encrypted TEXT,              -- AES-256 encrypted
    rating_avg          DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    total_bookings      INT NOT NULL DEFAULT 0,
    biography           TEXT,
    biography_ar        TEXT,
    verified_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vendor_profiles (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    store_name              VARCHAR(255) NOT NULL,
    store_name_ar           VARCHAR(255),
    description             TEXT,
    description_ar          TEXT,
    logo_url                TEXT,
    banner_url              TEXT,
    subscription_tier       VARCHAR(20) NOT NULL DEFAULT 'starter'
                            CHECK (subscription_tier IN ('starter','professional','enterprise')),
    subscription_started_at TIMESTAMPTZ,
    subscription_expires_at TIMESTAMPTZ,
    bank_account_encrypted  TEXT,             -- AES-256 encrypted
    commercial_register     VARCHAR(50),
    tax_id                  VARCHAR(30),
    rating_avg              DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    total_sales             INT NOT NULL DEFAULT 0,
    is_approved             BOOLEAN NOT NULL DEFAULT FALSE,
    approved_by             UUID REFERENCES users(id),
    approved_at             TIMESTAMPTZ,
    rejection_reason        TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 2. Booking Module

```sql
CREATE TABLE yachts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name                VARCHAR(255) NOT NULL,
    name_ar             VARCHAR(255),
    description         TEXT,
    description_ar      TEXT,
    yacht_type          VARCHAR(30) NOT NULL
                        CHECK (yacht_type IN ('fishing_boat','speedboat','sailboat','motor_yacht','luxury_yacht')),
    capacity            INT NOT NULL CHECK (capacity > 0),
    location_name       VARCHAR(255),
    location_name_ar    VARCHAR(255),
    location_lat        DECIMAL(10,8),
    location_lng        DECIMAL(11,8),
    base_price_per_day  DECIMAL(10,2) NOT NULL CHECK (base_price_per_day > 0),
    currency            VARCHAR(3) NOT NULL DEFAULT 'EGP',
    media               JSONB NOT NULL DEFAULT '[]',   -- [{url, type, order}]
    amenities           JSONB NOT NULL DEFAULT '[]',   -- string array
    rules               TEXT,
    rules_ar            TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    is_approved         BOOLEAN NOT NULL DEFAULT FALSE,
    approved_by         UUID REFERENCES users(id),
    approved_at         TIMESTAMPTZ,
    rejection_reason    TEXT,
    is_featured         BOOLEAN NOT NULL DEFAULT FALSE,
    featured_until      TIMESTAMPTZ,
    rating_avg          DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    reviews_count       INT NOT NULL DEFAULT 0,
    total_bookings      INT NOT NULL DEFAULT 0,
    embedding           vector(1536),                  -- OpenAI embedding for semantic search
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE availability (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    yacht_id    UUID NOT NULL REFERENCES yachts(id) ON DELETE CASCADE,
    date        DATE NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'available'
                CHECK (status IN ('available','blocked','booked')),
    UNIQUE (yacht_id, date)
);

CREATE TABLE match_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trip_type       VARCHAR(20) CHECK (trip_type IN ('half_day','full_day','multi_day')),
    trip_category   VARCHAR(20) CHECK (trip_category IN ('fishing','picnic','private','corporate')),
    num_people      INT NOT NULL CHECK (num_people > 0),
    budget_min      DECIMAL(10,2),
    budget_max      DECIMAL(10,2),
    preferred_dates JSONB,             -- array of date strings
    preferences     JSONB DEFAULT '{}',
    status          VARCHAR(20) NOT NULL DEFAULT 'processing'
                    CHECK (status IN ('processing','completed','expired')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

CREATE TABLE match_results (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id      UUID NOT NULL REFERENCES match_requests(id) ON DELETE CASCADE,
    yacht_id        UUID NOT NULL REFERENCES yachts(id),
    match_score     DECIMAL(5,4) NOT NULL CHECK (match_score BETWEEN 0 AND 1),
    ai_reasoning    TEXT,
    ai_reasoning_ar TEXT,
    suggested_date  DATE,
    quoted_price    DECIMAL(10,2),
    status          VARCHAR(20) NOT NULL DEFAULT 'offered'
                    CHECK (status IN ('offered','accepted','declined','expired')),
    offered_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    responded_at    TIMESTAMPTZ
);

CREATE TABLE bookings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id         UUID NOT NULL REFERENCES users(id),
    yacht_id            UUID NOT NULL REFERENCES yachts(id),
    match_request_id    UUID REFERENCES match_requests(id),  -- NULL for direct bookings
    start_date          DATE NOT NULL,
    end_date            DATE NOT NULL,
    trip_type           VARCHAR(20) NOT NULL
                        CHECK (trip_type IN ('half_day','full_day','multi_day')),
    trip_category       VARCHAR(20) NOT NULL
                        CHECK (trip_category IN ('fishing','picnic','private','corporate')),
    num_people          INT NOT NULL CHECK (num_people > 0),
    booking_mode        VARCHAR(20) NOT NULL DEFAULT 'direct'
                        CHECK (booking_mode IN ('direct','system_match')),
    status              VARCHAR(20) NOT NULL DEFAULT 'pending_payment'
                        CHECK (status IN ('pending_payment','pending_owner','confirmed','declined','cancelled','completed','disputed')),
    total_amount        DECIMAL(10,2) NOT NULL,
    platform_fee        DECIMAL(10,2) NOT NULL,    -- 12% of total_amount
    owner_payout        DECIMAL(10,2) NOT NULL,    -- total_amount - platform_fee
    special_requests    TEXT,
    cancellation_reason TEXT,
    cancelled_by        UUID REFERENCES users(id),
    confirmed_at        TIMESTAMPTZ,
    cancelled_at        TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    owner_response_deadline TIMESTAMPTZ,           -- 2h after booking created
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT bookings_date_order CHECK (end_date >= start_date)
);
```

---

## 3. Payments & Transactions

```sql
CREATE TABLE payments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id          UUID REFERENCES bookings(id),
    order_id            UUID,                       -- FK added after orders table created
    competition_entry_id UUID,                      -- FK added after entries table created
    user_id             UUID NOT NULL REFERENCES users(id),
    amount              DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    currency            VARCHAR(3) NOT NULL DEFAULT 'EGP',
    method              VARCHAR(20)
                        CHECK (method IN ('fawry','stripe','vodafone_cash','instapay','cash','manual')),
    gateway             VARCHAR(20)
                        CHECK (gateway IN ('fawry','stripe','manual')),
    gateway_ref         VARCHAR(255),               -- Gateway transaction ID
    gateway_response    JSONB,                      -- Full gateway response (for debugging)
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','paid','failed','refunded','partial_refund','disputed')),
    refund_amount       DECIMAL(10,2),
    refund_reason       TEXT,
    refunded_by         UUID REFERENCES users(id),
    paid_at             TIMESTAMPTZ,
    refunded_at         TIMESTAMPTZ,
    expires_at          TIMESTAMPTZ,                -- Payment link expiry
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT payments_single_reference CHECK (
        (CASE WHEN booking_id IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN order_id IS NOT NULL THEN 1 ELSE 0 END +
         CASE WHEN competition_entry_id IS NOT NULL THEN 1 ELSE 0 END) = 1
    )
);

CREATE TABLE transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id      UUID NOT NULL REFERENCES payments(id),
    recipient_id    UUID NOT NULL REFERENCES users(id),  -- Owner or vendor receiving payout
    amount          DECIMAL(10,2) NOT NULL,
    type            VARCHAR(20) NOT NULL
                    CHECK (type IN ('owner_payout','vendor_payout','platform_commission','refund','adjustment')),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','scheduled','processing','completed','failed')),
    scheduled_for   TIMESTAMPTZ,                    -- When payout should be processed
    processed_at    TIMESTAMPTZ,
    failure_reason  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 4. Marketplace Module

```sql
CREATE TABLE product_categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(100) NOT NULL,
    name_ar     VARCHAR(100),
    slug        VARCHAR(100) NOT NULL UNIQUE,
    parent_id   UUID REFERENCES product_categories(id),
    icon_url    TEXT,
    sort_order  INT NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id       UUID NOT NULL REFERENCES vendor_profiles(id) ON DELETE CASCADE,
    category_id     UUID REFERENCES product_categories(id),
    name            VARCHAR(255) NOT NULL,
    name_ar         VARCHAR(255),
    description     TEXT,
    description_ar  TEXT,
    sku             VARCHAR(100),
    price           DECIMAL(10,2) NOT NULL CHECK (price > 0),
    sale_price      DECIMAL(10,2) CHECK (sale_price > 0 AND sale_price < price),
    currency        VARCHAR(3) NOT NULL DEFAULT 'EGP',
    stock_qty       INT NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
    low_stock_threshold INT NOT NULL DEFAULT 5,
    media           JSONB NOT NULL DEFAULT '[]',    -- [{url, type, order, alt_ar}]
    attributes      JSONB NOT NULL DEFAULT '{}',    -- {weight, color, size, brand, etc.}
    weight_kg       DECIMAL(6,3),                   -- for shipping calculation
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_approved     BOOLEAN NOT NULL DEFAULT FALSE,
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    rejection_reason TEXT,
    is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
    featured_until  TIMESTAMPTZ,
    rating_avg      DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    reviews_count   INT NOT NULL DEFAULT 0,
    total_sold      INT NOT NULL DEFAULT 0,
    embedding       vector(1536),                   -- Semantic search
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE carts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cart_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id     UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id  UUID NOT NULL REFERENCES products(id),
    quantity    INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (cart_id, product_id)
);

CREATE TABLE orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id         UUID NOT NULL REFERENCES users(id),
    status              VARCHAR(20) NOT NULL DEFAULT 'pending_payment'
                        CHECK (status IN ('pending_payment','paid','processing','partially_shipped','shipped','delivered','cancelled','refunded','disputed')),
    subtotal            DECIMAL(10,2) NOT NULL,
    platform_fee        DECIMAL(10,2) NOT NULL,    -- 10% of subtotal
    shipping_fee        DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount        DECIMAL(10,2) NOT NULL,
    shipping_address    JSONB NOT NULL,            -- {full_name, phone, street, city, governorate, postal_code}
    promo_code          VARCHAR(50),
    discount_amount     DECIMAL(10,2) DEFAULT 0,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK now that orders exists
ALTER TABLE payments ADD CONSTRAINT fk_payments_order
    FOREIGN KEY (order_id) REFERENCES orders(id);

CREATE TABLE order_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id  UUID NOT NULL REFERENCES products(id),
    vendor_id   UUID NOT NULL REFERENCES vendor_profiles(id),
    quantity    INT NOT NULL CHECK (quantity > 0),
    unit_price  DECIMAL(10,2) NOT NULL,            -- price at time of order
    subtotal    DECIMAL(10,2) NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','processing','shipped','delivered','cancelled','refunded'))
);

CREATE TABLE shipments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID NOT NULL REFERENCES orders(id),
    vendor_id           UUID NOT NULL REFERENCES vendor_profiles(id),
    tracking_number     VARCHAR(100),
    carrier             VARCHAR(100),
    carrier_ar          VARCHAR(100),
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','picked_up','in_transit','out_for_delivery','delivered','returned','failed')),
    estimated_delivery  DATE,
    shipped_at          TIMESTAMPTZ,
    delivered_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 5. Competition Module

```sql
CREATE TABLE competitions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id            UUID NOT NULL REFERENCES users(id),
    title                   VARCHAR(255) NOT NULL,
    title_ar                VARCHAR(255),
    description             TEXT,
    description_ar          TEXT,
    location_name           VARCHAR(255),
    location_name_ar        VARCHAR(255),
    location_lat            DECIMAL(10,8),
    location_lng            DECIMAL(11,8),
    start_date              TIMESTAMPTZ NOT NULL,
    end_date                TIMESTAMPTZ NOT NULL,
    registration_deadline   TIMESTAMPTZ,
    max_participants        INT,
    current_participants    INT NOT NULL DEFAULT 0,
    entry_fee               DECIMAL(10,2) NOT NULL DEFAULT 0,
    currency                VARCHAR(3) NOT NULL DEFAULT 'EGP',
    prize_pool              DECIMAL(10,2),
    prize_details           JSONB,                 -- [{place, prize_type, value, description_ar}]
    rules                   TEXT,
    rules_ar                TEXT,
    scoring_method          VARCHAR(30) NOT NULL DEFAULT 'total_weight'
                            CHECK (scoring_method IN ('total_weight','largest_catch','total_count','points')),
    status                  VARCHAR(20) NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','pending_approval','open','registration_closed','active','scoring','completed','cancelled')),
    media                   JSONB NOT NULL DEFAULT '[]',
    is_featured             BOOLEAN NOT NULL DEFAULT FALSE,
    platform_fee_pct        DECIMAL(5,2) NOT NULL DEFAULT 15.00,  -- Platform's % of entry fees
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT competitions_date_order CHECK (end_date > start_date)
);

CREATE TABLE competition_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id  UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id),
    team_name       VARCHAR(100),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending_payment'
                    CHECK (status IN ('pending_payment','pending_approval','approved','rejected','disqualified','withdrawn')),
    entry_fee_paid  BOOLEAN NOT NULL DEFAULT FALSE,
    bib_number      INT,                            -- Assigned after approval
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    rejection_reason TEXT,
    registered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (competition_id, user_id)
);

-- Add FK now that entries exists
ALTER TABLE payments ADD CONSTRAINT fk_payments_entry
    FOREIGN KEY (competition_entry_id) REFERENCES competition_entries(id);

CREATE TABLE catch_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id        UUID NOT NULL REFERENCES competition_entries(id) ON DELETE CASCADE,
    fish_species    VARCHAR(100) NOT NULL,
    fish_species_ar VARCHAR(100),
    weight_kg       DECIMAL(7,3) NOT NULL CHECK (weight_kg > 0),
    length_cm       DECIMAL(7,2),
    photo_url       TEXT NOT NULL,
    gps_lat         DECIMAL(10,8),
    gps_lng         DECIMAL(11,8),
    logged_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes           TEXT,
    verified        BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by     UUID REFERENCES users(id),
    verified_at     TIMESTAMPTZ,
    disqualified    BOOLEAN NOT NULL DEFAULT FALSE,
    disqualified_reason TEXT
);
```

---

## 6. Reviews

```sql
CREATE TABLE reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_id     UUID NOT NULL REFERENCES users(id),
    target_type     VARCHAR(20) NOT NULL
                    CHECK (target_type IN ('yacht','product','vendor')),
    target_id       UUID NOT NULL,
    booking_id      UUID REFERENCES bookings(id),   -- For yacht reviews — enforces one review per booking
    order_item_id   UUID REFERENCES order_items(id), -- For product reviews
    rating          INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment         TEXT,
    comment_ar      TEXT,
    reply           TEXT,                            -- Owner/vendor can reply
    reply_at        TIMESTAMPTZ,
    is_visible      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (reviewer_id, booking_id),               -- One review per booking
    UNIQUE (reviewer_id, order_item_id)             -- One review per order item
);
```

---

## 7. Notifications

```sql
CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(50) NOT NULL,               -- 'booking_confirmed', 'order_shipped', etc.
    title       VARCHAR(255),
    title_ar    VARCHAR(255),
    body        TEXT,
    body_ar     TEXT,
    data        JSONB NOT NULL DEFAULT '{}',        -- deep link, related IDs
    channel     VARCHAR(20) NOT NULL
                CHECK (channel IN ('push','email','sms','in_app')),
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    read_at     TIMESTAMPTZ,
    sent_at     TIMESTAMPTZ,
    failed_at   TIMESTAMPTZ,
    error       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_preferences (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    booking_push    BOOLEAN NOT NULL DEFAULT TRUE,
    booking_email   BOOLEAN NOT NULL DEFAULT TRUE,
    booking_sms     BOOLEAN NOT NULL DEFAULT TRUE,
    order_push      BOOLEAN NOT NULL DEFAULT TRUE,
    order_email     BOOLEAN NOT NULL DEFAULT TRUE,
    order_sms       BOOLEAN NOT NULL DEFAULT FALSE,
    competition_push BOOLEAN NOT NULL DEFAULT TRUE,
    competition_email BOOLEAN NOT NULL DEFAULT TRUE,
    marketing_push  BOOLEAN NOT NULL DEFAULT FALSE,
    marketing_email BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 8. Audit & Promotions

```sql
CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    UUID REFERENCES users(id),          -- NULL for system actions
    action      VARCHAR(100) NOT NULL,              -- 'booking.created', 'product.approved', etc.
    target_type VARCHAR(50),
    target_id   UUID,
    old_value   JSONB,
    new_value   JSONB,
    ip_address  INET,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE promo_codes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(50) NOT NULL UNIQUE,
    description     TEXT,
    discount_type   VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage','fixed')),
    discount_value  DECIMAL(10,2) NOT NULL,
    min_order_value DECIMAL(10,2) DEFAULT 0,
    max_discount    DECIMAL(10,2),                  -- cap for percentage discounts
    applies_to      VARCHAR(20) NOT NULL DEFAULT 'all'
                    CHECK (applies_to IN ('all','bookings','marketplace')),
    usage_limit     INT,                            -- NULL = unlimited
    usage_count     INT NOT NULL DEFAULT 0,
    per_user_limit  INT NOT NULL DEFAULT 1,
    valid_from      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until     TIMESTAMPTZ,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE promo_code_usages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promo_id    UUID NOT NULL REFERENCES promo_codes(id),
    user_id     UUID NOT NULL REFERENCES users(id),
    order_id    UUID REFERENCES orders(id),
    booking_id  UUID REFERENCES bookings(id),
    discount_applied DECIMAL(10,2) NOT NULL,
    used_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 9. Indexes

```sql
-- Users
CREATE INDEX idx_users_role ON users(role) WHERE is_active = TRUE;
CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;

-- Yachts
CREATE INDEX idx_yachts_owner ON yachts(owner_id) WHERE is_active = TRUE;
CREATE INDEX idx_yachts_approved_active ON yachts(is_approved, is_active, created_at DESC);
CREATE INDEX idx_yachts_location ON yachts USING gist(
    ll_to_earth(location_lat::float8, location_lng::float8)
) WHERE is_active = TRUE AND is_approved = TRUE;
CREATE INDEX idx_yachts_price ON yachts(base_price_per_day) WHERE is_active = TRUE AND is_approved = TRUE;
CREATE INDEX idx_yachts_featured ON yachts(is_featured, featured_until) WHERE is_featured = TRUE;
CREATE INDEX idx_yachts_embedding ON yachts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Full text search (Arabic)
CREATE INDEX idx_yachts_fts ON yachts
    USING gin(to_tsvector('simple', unaccent(COALESCE(name_ar,'') || ' ' || COALESCE(description_ar,''))));

-- Availability
CREATE UNIQUE INDEX idx_availability_unique ON availability(yacht_id, date);
CREATE INDEX idx_availability_date_status ON availability(date, status, yacht_id);

-- Bookings
CREATE INDEX idx_bookings_customer ON bookings(customer_id, status, created_at DESC);
CREATE INDEX idx_bookings_yacht ON bookings(yacht_id, status, start_date);
CREATE INDEX idx_bookings_status_deadline ON bookings(status, owner_response_deadline)
    WHERE status = 'pending_owner';

-- Payments
CREATE INDEX idx_payments_user ON payments(user_id, status, created_at DESC);
CREATE INDEX idx_payments_booking ON payments(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX idx_payments_order ON payments(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_payments_pending ON payments(status, expires_at) WHERE status = 'pending';

-- Products
CREATE INDEX idx_products_vendor ON products(vendor_id) WHERE is_active = TRUE;
CREATE INDEX idx_products_category ON products(category_id, is_active, is_approved, price);
CREATE INDEX idx_products_featured ON products(is_featured, featured_until) WHERE is_featured = TRUE;
CREATE INDEX idx_products_stock ON products(stock_qty) WHERE stock_qty > 0 AND is_active = TRUE;
CREATE INDEX idx_products_embedding ON products USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_products_fts ON products
    USING gin(to_tsvector('simple', unaccent(COALESCE(name_ar,'') || ' ' || COALESCE(description_ar,''))));

-- Orders
CREATE INDEX idx_orders_customer ON orders(customer_id, status, created_at DESC);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_vendor ON order_items(vendor_id, status);

-- Competitions
CREATE INDEX idx_competitions_status ON competitions(status, start_date);
CREATE INDEX idx_competition_entries_competition ON competition_entries(competition_id, status);
CREATE INDEX idx_competition_entries_user ON competition_entries(user_id);
CREATE INDEX idx_catch_logs_entry ON catch_logs(entry_id, verified) WHERE disqualified = FALSE;

-- Notifications
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC)
    WHERE is_read = FALSE;

-- Reviews
CREATE INDEX idx_reviews_target ON reviews(target_type, target_id, is_visible);

-- Audit
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_type, target_id, created_at DESC);
```

---

## 10. Materialized Views

```sql
-- Leaderboard (refreshed every hour by Celery)
CREATE MATERIALIZED VIEW competition_leaderboard AS
SELECT
    ce.competition_id,
    ce.id AS entry_id,
    ce.user_id,
    u.full_name,
    u.avatar_url,
    ce.team_name,
    COALESCE(SUM(cl.weight_kg) FILTER (WHERE cl.verified = TRUE AND cl.disqualified = FALSE), 0) AS total_weight_kg,
    COUNT(cl.id) FILTER (WHERE cl.verified = TRUE AND cl.disqualified = FALSE) AS total_catches,
    MAX(cl.weight_kg) FILTER (WHERE cl.verified = TRUE AND cl.disqualified = FALSE) AS largest_catch_kg,
    RANK() OVER (
        PARTITION BY ce.competition_id
        ORDER BY
            SUM(cl.weight_kg) FILTER (WHERE cl.verified = TRUE AND cl.disqualified = FALSE) DESC NULLS LAST
    ) AS rank
FROM competition_entries ce
JOIN users u ON u.id = ce.user_id
LEFT JOIN catch_logs cl ON cl.entry_id = ce.id
WHERE ce.status = 'approved'
GROUP BY ce.competition_id, ce.id, ce.user_id, u.full_name, u.avatar_url, ce.team_name;

CREATE UNIQUE INDEX idx_leaderboard_unique ON competition_leaderboard(competition_id, entry_id);
CREATE INDEX idx_leaderboard_competition ON competition_leaderboard(competition_id, rank);

-- Refresh command (run by Celery Beat hourly):
-- REFRESH MATERIALIZED VIEW CONCURRENTLY competition_leaderboard;
```

---

## 11. Automatic `updated_at` Trigger

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'users','boat_owner_profiles','vendor_profiles','yachts',
        'bookings','payments','marketplace_orders','products',
        'carts','shipments','competitions','notifications',
        'notification_preferences','reviews'
    ]
    LOOP
        EXECUTE format('
            CREATE TRIGGER trg_update_%s_timestamp
            BEFORE UPDATE ON %s
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        ', t, t);
    END LOOP;
END;
$$;
```

---

**Last Updated:** April 6, 2026
**Owner:** CTO / Tech Lead
