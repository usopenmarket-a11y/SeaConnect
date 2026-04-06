
# **Database Schema — Booking Module**

This schema covers the **Yacht Booking Module**, including Customers, Owners, Yachts, Trips, Availability, Payments, and Matching Logic.

---

## **1. Entity Relationship Diagram (ERD) — Mermaid**

```mermaid
erDiagram

    USERS ||--o{ YACHTS : "owns"
    USERS ||--o{ BOOKINGS : "makes"
    USERS ||--o{ PAYMENTS : "initiates"
    USERS ||--o{ MATCH_REQUESTS : "requests"

    YACHTS ||--o{ AVAILABILITY : "has"
    YACHTS ||--o{ BOOKINGS : "assigned to"

    BOOKINGS ||--|| PAYMENTS : "payment record"
    BOOKINGS ||--o{ MATCH_RESULTS : "matching suggestions"

    MATCH_REQUESTS ||--o{ MATCH_RESULTS : "produces"
    MATCH_RESULTS ||--|| YACHTS : "suggested yacht"

    %% Entities
    USERS {
        uuid id PK
        string full_name
        string phone
        string email
        enum role ("customer","owner","admin")
        datetime created_at
    }

    YACHTS {
        uuid id PK
        uuid owner_id FK
        string yacht_name
        text description
        int capacity
        json media
        float base_price_per_day
        datetime created_at
    }

    AVAILABILITY {
        uuid id PK
        uuid yacht_id FK
        date available_date
        enum status ("available","blocked","booked")
    }

    BOOKINGS {
        uuid id PK
        uuid user_id FK
        uuid yacht_id FK
        date start_date
        date end_date
        enum trip_type ("day","long")
        enum category ("fishing","picnic")
        int number_of_people
        enum booking_mode ("customer_choice","system_match")
        enum status ("pending","confirmed","declined","cancelled")
        datetime created_at
    }

    MATCH_REQUESTS {
        uuid id PK
        uuid user_id FK
        enum trip_type ("day","long")
        int number_of_people
        enum category ("fishing","picnic")
        float budget_min
        float budget_max
        datetime created_at
    }

    MATCH_RESULTS {
        uuid id PK
        uuid request_id FK
        uuid yacht_id FK
        float match_score
        enum status ("offered","accepted","declined")
        datetime created_at
    }

    PAYMENTS {
        uuid id PK
        uuid booking_id FK
        uuid user_id FK
        float amount
        enum method ("card","wallet","cash")
        enum status ("pending","paid","refunded")
        datetime created_at
    }
```

---

## **2. Table Definitions**

### **2.1 USERS**
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary Key |
| full_name | string | |
| phone | string | unique |
| email | string | unique |
| role | enum(customer/owner/admin) | |
| created_at | datetime | |

---

### **2.2 YACHTS**
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| owner_id | UUID | FK → USERS.id |
| yacht_name | string | |
| description | text | |
| capacity | int | |
| media | json | images/videos |
| base_price_per_day | float | |
| created_at | datetime | |

---

### **2.3 AVAILABILITY**
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| yacht_id | UUID | FK → YACHTS.id |
| available_date | date | |
| status | enum(available/blocked/booked) | |

---

### **2.4 BOOKINGS**
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| user_id | UUID | FK → USERS.id |
| yacht_id | UUID | FK → YACHTS.id |
| start_date | date | |
| end_date | date | |
| trip_type | enum(day/long) | |
| category | enum(fishing/picnic) | |
| number_of_people | int | |
| booking_mode | enum(customer_choice/system_match) | |
| status | enum(pending/confirmed/declined/cancelled) | |
| created_at | datetime | |

---

### **2.5 MATCH_REQUESTS**
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| user_id | UUID | FK → USERS.id |
| trip_type | enum(day/long) | |
| number_of_people | int | |
| category | enum(fishing/picnic) | |
| budget_min | float | optional |
| budget_max | float | optional |
| created_at | datetime | |

---

### **2.6 MATCH_RESULTS**
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| request_id | UUID | FK → MATCH_REQUESTS.id |
| yacht_id | UUID | FK → YACHTS.id |
| match_score | float | AI scoring |
| status | enum(offered/accepted/declined) | |
| created_at | datetime | |

---

### **2.7 PAYMENTS**
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| booking_id | UUID | FK → BOOKINGS.id |
| user_id | UUID | FK → USERS.id |
| amount | float | |
| method | enum(card/wallet/cash) | |
| status | enum(pending/paid/refunded) | |
| created_at | datetime | |

---

## **3. Notes**

- Database is **fully normalized**.  
- Supports both **direct booking** and **system matching** scenarios.  
- Can scale for future modules (marketplace, competitions).  
- UUID preferred for cross-system compatibility.

---

If you'd like, I can also generate:
✔ SQL migration files  
✔ Prisma schema  
✔ Laravel migration set  
✔ PostgreSQL full DDL dump  

