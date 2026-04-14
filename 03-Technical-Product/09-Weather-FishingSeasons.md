# Weather Advisory & Fishing Seasons — Feature Spec
**Version:** 1.0
**Date:** April 7, 2026
**Status:** ✅ Complete — Decisions locked

---

## Overview

Two closely related features that make SeaConnect genuinely useful, not just a booking form:

1. **Weather Advisory** — Real-time weather for the departure date and location, with a go/no-go recommendation displayed on the yacht detail and booking screens.
2. **Fishing Seasons** — Curated, Egypt-specific database of fish species by season and location, surfaced on the explore screen and boat listings to help customers pick the right trip at the right time.

---

## Feature 1: Weather Advisory

### 1.1 Decision: Display-Only Advisory (MVP), No Hard Block

Weather is shown as an **informational advisory** — it never blocks a booking.
Reasons:
- SeaConnect is not responsible for weather decisions (boat owner's call)
- A hard block would trigger refund disputes we can't automate fairly
- Owners already decide based on weather — we just help customers understand
- Display-only is safe, useful, and legally clean

**Phase 2 upgrade:** Allow owners to set a "weather safety threshold" on their listing — if wind exceeds X knots, booking creation shows a strong warning banner.

### 1.2 Weather API: Open-Meteo

**Decision: [Open-Meteo](https://open-meteo.com/)** — free, no API key required, accurate marine forecasts.

| Option | Cost | Marine Data | No Key | Decision |
|--------|------|------------|--------|---------|
| Open-Meteo | Free | ✅ Wave height, wind, precipitation | ✅ | **CHOSEN** |
| OpenWeatherMap | Free tier limited | ✅ | ❌ key required | Rejected |
| WeatherAPI | Paid above 1M calls | ✅ | ❌ key required | Rejected |
| Tomorrow.io | Paid | ✅ Excellent | ❌ key required | Phase 2 upgrade |

**Open-Meteo Marine API endpoint:**
```
https://marine-api.open-meteo.com/v1/marine
  ?latitude={lat}
  &longitude={lon}
  &daily=wave_height_max,wind_speed_10m_max,precipitation_sum,weathercode
  &timezone=Africa/Cairo
  &start_date={YYYY-MM-DD}
  &end_date={YYYY-MM-DD}
```

No API key. Free. Up to 10,000 calls/day. Each call covers up to 16 days.

### 1.3 Caching Strategy

Weather data is fetched once and cached in Redis — not called on every page view.

```
Cache key:   weather:{location_slug}:{YYYY-MM-DD}
TTL:         6 hours (weather for a specific date/location doesn't change fast)
Fallback:    If Redis miss → fetch from Open-Meteo → store → return
```

Celery Beat task `prefetch_weather_for_upcoming_bookings` runs daily at 06:00 EGT:
- Finds all confirmed bookings in the next 7 days
- Pre-fetches and caches weather for each (location + date)
- Customers see instant weather on their booking detail — no API wait

### 1.4 Go / No-Go Logic

```python
# seaconnect/weather/advisory.py

def get_weather_advisory(wave_height_m: float, wind_speed_kmh: float, 
                          weathercode: int) -> dict:
    """
    Returns a go/no-go recommendation with color and message.
    
    WMO weathercode reference:
      0       = Clear sky
      1,2,3   = Mainly clear, partly cloudy, overcast
      45,48   = Fog
      51-67   = Drizzle/rain
      71-77   = Snow (irrelevant for Egypt)
      80-82   = Rain showers
      95-99   = Thunderstorm
    """
    
    # Dangerous conditions — strong NO GO
    if wave_height_m > 2.5 or wind_speed_kmh > 50 or weathercode in range(95, 100):
        return {
            "status": "danger",
            "color": "#C62828",        # Error red
            "icon": "WarningOctagon",
            "label_ar": "غير موصى به — أحوال بحرية خطرة",
            "label_en": "Not Recommended — Dangerous sea conditions",
            "detail_ar": f"ارتفاع الأمواج {wave_height_m:.1f}م، رياح {wind_speed_kmh:.0f} كم/س",
            "detail_en": f"Wave height {wave_height_m:.1f}m, Wind {wind_speed_kmh:.0f} km/h",
        }
    
    # Rough conditions — caution
    if wave_height_m > 1.5 or wind_speed_kmh > 35 or weathercode in range(80, 95):
        return {
            "status": "caution",
            "color": "#F9A825",        # Warning amber
            "icon": "Warning",
            "label_ar": "توخَّ الحذر — أحوال بحرية متقلبة",
            "label_en": "Caution — Rough sea conditions",
            "detail_ar": f"ارتفاع الأمواج {wave_height_m:.1f}م، رياح {wind_speed_kmh:.0f} كم/س",
            "detail_en": f"Wave height {wave_height_m:.1f}m, Wind {wind_speed_kmh:.0f} km/h",
        }
    
    # Good conditions — go
    return {
        "status": "good",
        "color": "#2E7D32",            # Success green
        "icon": "SunHorizon",
        "label_ar": "مناخ مثالي للإبحار",
        "label_en": "Great conditions for a trip",
        "detail_ar": f"ارتفاع الأمواج {wave_height_m:.1f}م، رياح {wind_speed_kmh:.0f} كم/س",
        "detail_en": f"Wave height {wave_height_m:.1f}m, Wind {wind_speed_kmh:.0f} km/h",
    }
```

### 1.5 Where Weather Is Shown

| Surface | When | What's shown |
|---------|------|-------------|
| Yacht Detail screen | Below availability calendar | Weather card for selected date (updates when user picks a date) |
| Booking creation Step 1 | Below date picker | Weather advisory for selected date(s) |
| Booking Confirmed screen | In trip details section | Weather for trip date |
| Booking Detail (upcoming) | Trip info section | Live weather card (refreshes every 6h) |
| Owner's upcoming bookings | Per booking card | Small colored dot (green/amber/red) |

**It is never shown on:** search results list (too cluttered), product pages, past bookings.

### 1.6 Departure Location → Coordinates Mapping

Each yacht has a `departure_port` field. We maintain a lookup table mapping port names to coordinates:

```python
# seaconnect/weather/ports.py
EGYPT_PORTS = {
    "hurghada":        {"lat": 27.2574, "lon": 33.8116, "name_ar": "الغردقة"},
    "sharm_el_sheikh": {"lat": 27.9158, "lon": 34.3300, "name_ar": "شرم الشيخ"},
    "dahab":           {"lat": 28.4923, "lon": 34.5160, "name_ar": "دهب"},
    "marsa_alam":      {"lat": 25.0697, "lon": 34.8956, "name_ar": "مرسى علم"},
    "safaga":          {"lat": 26.7444, "lon": 33.9361, "name_ar": "سفاجا"},
    "ain_sokhna":      {"lat": 29.5925, "lon": 32.3519, "name_ar": "العين السخنة"},
    "alexandria":      {"lat": 31.2001, "lon": 29.9187, "name_ar": "الإسكندرية"},
    "port_said":       {"lat": 31.2653, "lon": 32.3019, "name_ar": "بورسعيد"},
    "nuweiba":         {"lat": 29.0344, "lon": 34.6613, "name_ar": "نويبع"},
    "el_gouna":        {"lat": 27.3939, "lon": 33.6769, "name_ar": "الجونة"},
    "soma_bay":        {"lat": 26.8667, "lon": 33.9833, "name_ar": "سوما باي"},
    "abu_tig_marina":  {"lat": 27.3753, "lon": 33.6783, "name_ar": "مارينا أبو تيج"},
}
```

When a boat owner creates a listing, they select from these ports (dropdown). No free-text port entry in MVP.

---

## Feature 2: Fishing Seasons

### 2.1 Decision: Admin-Managed Static Content (MVP), ML-Powered (Phase 3)

In MVP, fishing seasons are a **curated content database** managed by admin:
- SeaConnect's ops team populates and maintains season data
- Data is Egypt-specific and location-specific
- Displayed on explore screen, yacht detail, and a dedicated "Fishing Guide" section

**Phase 3:** Enrich with catch log data from the competitions module — real catch data by species/location/month replaces editorial content.

### 2.2 Egypt Fishing Calendar (Pre-Seeded Data)

This is the initial dataset to seed into the database. Sourced from Egyptian fishing communities, Red Sea authority publications, and Mediterranean fishing records.

#### Red Sea (Hurghada, Sharm, Marsa Alam, Safaga, El Gouna, Dahab, Nuweiba)

| Species (EN) | Species (AR) | Peak Season | Secondary Season | Notes |
|-------------|-------------|------------|-----------------|-------|
| Dorado (Mahi-Mahi) | دورادو | Apr – Jun, Sep – Nov | Mar, Dec | Top sport fish. Open water, use lures |
| Wahoo | واهو | Oct – Jan | Feb – Apr | Very fast; trolling only |
| Yellowfin Tuna | تونة صفراء الزعانف | Oct – Jan | Apr – Jun | Offshore, 30+ km from shore |
| Barracuda | باراكودا | Year-round | Peak: Nov – Feb | Reef edges; trolling & jigging |
| Giant Trevally (GT) | ترفالي عملاق | Oct – Mar | — | Top target for sport fishers |
| Grouper (Hamour) | هامور | Oct – Mar | — | Reef bottom fishing; very popular |
| Red Snapper | دنيس أحمر | Nov – Feb | Sep – Oct | Reef fishing; great eating |
| Emperor Fish | قاروص | Oct – Mar | — | Deep reef; jigging |
| Kingfish (Spanish Mackerel) | كنعد | Sep – Feb | Mar – Apr | Inshore & offshore trolling |
| Sailfish | أبو سيف | Nov – Jan | Oct, Feb | Rare but prized; offshore |
| Marlin (Blue/Black) | مارلين | Oct – Dec | Jan – Feb | Very rare; deep offshore |
| Caranx (Horse Mackerel) | كرنكس | Year-round | — | Common; good for beginners |
| Lionfish | أسد البحر | Year-round | — | Invasive species; legal to catch |
| Coral Trout | تراوت المرجان | Year-round | Peak: Nov – Mar | Reef fishing |

#### Mediterranean (Alexandria, Port Said)

| Species (EN) | Species (AR) | Peak Season | Notes |
|-------------|-------------|------------|-------|
| Sea Bass (Qabas) | قباس / لوت | Oct – Mar | Most popular in Alex |
| Sea Bream (Denise) | دنيس | Sep – Feb | Shore & boat fishing |
| Mullet (Bouri) | بوري | Nov – Mar | Very common, good eating |
| Bluefish (Lufar) | لوفار | Sep – Nov | Seasonal, prized |
| Flathead Grey Mullet | بياض | Year-round | Lagoon areas |
| Red Mullet (Sultan Ibrahim) | سلطان إبراهيم | Oct – Apr | Bottom fishing |
| European Anchovy | أنشوجة | May – Jul | Night fishing with lights |
| Swordfish | سيف البحر | Jun – Sep | Offshore; rare but prized |
| Eel | ثعبان البحر | Year-round | Night fishing, rocky shores |
| Dentex | دنتاكس | Oct – Mar | Deep water; offshore |

#### Suez Canal / Gulf of Suez (Ain Sokhna, Suez)

| Species (EN) | Species (AR) | Peak Season | Notes |
|-------------|-------------|------------|-------|
| Catfish (Qarmout) | قرموط | Year-round | Very common |
| Tilapia (Bolti) | بلطي | Year-round | Freshwater/brackish |
| Mullet | بوري | Nov – Mar | Channel fishing |

### 2.3 Season Rating System

Each species-location-month combination has a rating:

| Rating | Icon | Meaning |
|--------|------|---------|
| 🔥 Peak | `Fire` | Best time of year for this species here |
| ✅ Good | `CheckCircle` | Active season, good chances |
| 🔔 Possible | `Bell` | Off-season but sometimes caught |
| ❌ Off | `X` | Not this season |

### 2.4 Where Fishing Seasons Are Shown

| Surface | Content |
|---------|---------|
| **Explore Home** | "What's biting now" section — top 3 fish currently in peak season near selected location |
| **Yacht Detail** | "Best catches from this port" section — species cards with season rating for the listing's departure port |
| **Fishing Guide screen** (new screen) | Full interactive fishing calendar — filter by location, browse by fish, filter by month |
| **Booking creation** | Small banner: "🔥 Dorado season! Great time to book" if peak species match the selected date |
| **Search results** | Optional filter: "Show boats suited for [species]" — matched by trip_type tags on listings |

### 2.5 Linking Listings to Target Species

Boat owners can tag their listing with the fish species they typically target:

```
Listing tags (multi-select):
☐ Dorado  ☐ Wahoo  ☐ Tuna  ☐ Barracuda  ☐ GT  ☐ Grouper
☐ Snapper  ☐ Kingfish  ☐ Sea Bass  ☐ Sea Bream  ☐ Mullet
☐ General Fishing  ☐ Trolling  ☐ Bottom Fishing  ☐ Jigging  ☐ Shore Casting
```

This enables:
- Search filter: "I want to catch Dorado → show boats that target Dorado"
- Season-aware badge on listing: "Peak season for Dorado!" when applicable
- Admin analytics: most-requested species by location

---

## Database Schema Additions

### New Table: `departure_ports`

```sql
CREATE TABLE departure_ports (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        VARCHAR(50) NOT NULL UNIQUE,     -- 'hurghada', 'sharm_el_sheikh'
    name_en     VARCHAR(100) NOT NULL,
    name_ar     VARCHAR(100) NOT NULL,
    latitude    DECIMAL(9,6) NOT NULL,
    longitude   DECIMAL(9,6) NOT NULL,
    sea_region  VARCHAR(20) NOT NULL             -- 'red_sea', 'mediterranean', 'gulf_of_suez'
                CHECK (sea_region IN ('red_sea','mediterranean','gulf_of_suez','nile')),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### New Table: `fish_species`

```sql
CREATE TABLE fish_species (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en         VARCHAR(100) NOT NULL,
    name_ar         VARCHAR(100) NOT NULL,
    slug            VARCHAR(50) NOT NULL UNIQUE,
    description_en  TEXT,
    description_ar  TEXT,
    photo_url       TEXT,
    difficulty      VARCHAR(20) CHECK (difficulty IN ('beginner','intermediate','expert')),
    min_weight_kg   DECIMAL(5,2),               -- typical catch size
    max_weight_kg   DECIMAL(5,2),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### New Table: `fishing_seasons`

```sql
CREATE TABLE fishing_seasons (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    species_id      UUID NOT NULL REFERENCES fish_species(id) ON DELETE CASCADE,
    port_id         UUID NOT NULL REFERENCES departure_ports(id) ON DELETE CASCADE,
    month           SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
    rating          VARCHAR(10) NOT NULL
                    CHECK (rating IN ('peak','good','possible','off')),
    notes_en        TEXT,
    notes_ar        TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (species_id, port_id, month)
);

CREATE INDEX idx_fishing_seasons_port_month ON fishing_seasons(port_id, month);
CREATE INDEX idx_fishing_seasons_species ON fishing_seasons(species_id);
```

### New Table: `weather_cache`

```sql
CREATE TABLE weather_cache (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    port_id         UUID NOT NULL REFERENCES departure_ports(id) ON DELETE CASCADE,
    forecast_date   DATE NOT NULL,
    wave_height_m   DECIMAL(4,2),
    wind_speed_kmh  DECIMAL(5,1),
    precipitation_mm DECIMAL(5,1),
    weathercode     SMALLINT,
    advisory_status VARCHAR(10) CHECK (advisory_status IN ('good','caution','danger')),
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (port_id, forecast_date)
);

CREATE INDEX idx_weather_cache_port_date ON weather_cache(port_id, forecast_date);
```

### Modified Table: `yachts` — add columns

```sql
-- Add to existing yachts table:
ALTER TABLE yachts ADD COLUMN departure_port_id UUID REFERENCES departure_ports(id);
ALTER TABLE yachts ADD COLUMN target_species     TEXT[];  -- array of species slugs
ALTER TABLE yachts ADD COLUMN fishing_techniques TEXT[];  -- 'trolling','jigging','bottom','casting'
```

---

## API Endpoints Additions

### Module 11: Weather

```
GET /api/v1/weather/
  Query params: port_slug, date (YYYY-MM-DD)
  Auth: None (public)
  Response:
  {
    "port": { "slug": "hurghada", "name_ar": "الغردقة" },
    "date": "2026-07-15",
    "wave_height_m": 0.8,
    "wind_speed_kmh": 18,
    "precipitation_mm": 0,
    "weathercode": 1,
    "advisory": {
      "status": "good",
      "color": "#2E7D32",
      "label_ar": "مناخ مثالي للإبحار",
      "label_en": "Great conditions for a trip",
      "detail_ar": "ارتفاع الأمواج 0.8م، رياح 18 كم/س",
      "detail_en": "Wave height 0.8m, Wind 18 km/h"
    },
    "cached_at": "2026-07-14T06:00:00Z"
  }

GET /api/v1/weather/ports/
  Auth: None (public)
  Response: list of all active departure ports with coordinates
```

### Module 12: Fishing Seasons

```
GET /api/v1/fishing/seasons/
  Query params: port_slug (optional), month (1-12, optional, defaults to current month)
  Auth: None (public)
  Response: list of species with their rating for the given port+month
  {
    "port": "hurghada",
    "month": 11,
    "month_name_ar": "نوفمبر",
    "species": [
      {
        "slug": "dorado",
        "name_ar": "دورادو",
        "name_en": "Dorado (Mahi-Mahi)",
        "photo_url": "...",
        "rating": "peak",
        "notes_ar": "أفضل موسم للدورادو في المياه المفتوحة"
      },
      ...
    ]
  }

GET /api/v1/fishing/species/
  Auth: None (public)
  Response: full list of all fish species with photos and descriptions

GET /api/v1/fishing/species/:slug/
  Auth: None (public)
  Response: species detail + full 12-month season calendar across all ports

GET /api/v1/fishing/whats-biting/
  Query params: port_slug
  Auth: None (public)
  Response: top 5 "peak" or "good" species RIGHT NOW at this port
  (uses current month automatically)
```

---

## MVP vs Phase 2 Scope

### ✅ IN MVP

| Feature | Sprint |
|---------|--------|
| Departure port selection on listing creation (dropdown) | 3 |
| Weather advisory on yacht detail screen (selected date) | 3 |
| Weather advisory on booking creation screen | 4 |
| Weather advisory on booking confirmation + detail | 5 |
| "What's biting now" section on Explore home | 3 |
| Fishing season rating on yacht detail | 3 |
| Fishing Guide screen (full calendar) | 10 |
| Target species tags on yacht listings | 3 |
| Admin: manage fish species + season ratings | 7 |
| Pre-seeded data: all species + seasons above | Sprint 1 (fixture) |

### ❌ Phase 2+

| Feature | Phase | Reason |
|---------|-------|--------|
| Filter search by target species | 2 | Needs enough tagged listings first |
| Weather-triggered owner notification ("rough seas forecast for your booking") | 2 | Needs push notification expansion |
| Tomorrow.io upgrade for more accurate marine data | 2 | Cost justified at scale |
| ML-powered season predictions from catch logs | 3 | Needs competition module data |
| Tidal information (high/low tide times) | 2 | Useful but not critical |
| Fishing regulations by area (protected zones) | 2 | Needs legal research per location |

---

## UX Additions

### New Screen: Fishing Guide

```
Route: /explore/fishing-guide
Tab: Accessible from Explore tab → "Fishing Guide" chip / icon button

Layout:
  Top: Location picker (port dropdown, defaults to user's last searched location)
  Month strip: Jan Feb Mar Apr ... Dec (horizontal scroll, current month selected)
  
  Section 1: "Biting Now" — horizontal scroll of peak/good species cards
    Each card: fish photo, name_ar, season rating badge
    Tap → species detail sheet
  
  Section 2: Full species list — vertical, filterable by rating
    Filter chips: 🔥 Peak | ✅ Good | 🔔 Possible
  
  Species Detail Sheet (bottom sheet on tap):
    Large fish photo
    Name (AR + EN)
    Description
    12-month rating strip (color-coded bars, Jan→Dec)
    Technique tips (trolling / bottom / jigging)
    "Find boats targeting [species]" button → search results filtered by species tag
```

### Modified Screen: Yacht Detail

Add below the availability calendar:

```
─────────────────────────────────
🌊 Weather for [selected date]
  ✅ Great conditions — Waves 0.8m, Wind 18 km/h    (green card)
─────────────────────────────────
🎣 What you might catch from [port]
  [Dorado 🔥] [Barracuda ✅] [GT ✅] [Grouper 🔔]
  (species chips with season rating color)
  "View full fishing guide →"
─────────────────────────────────
```

### Modified Screen: Explore Home

Add between "Categories" row and "Recent listings":

```
🎣 What's biting in [location] this [month]
  ← [Dorado card] [Wahoo card] [GT card] →    (horizontal scroll)
  "View full guide →"
```

---

## Tech Stack Addition

```
# requirements/base.txt — no new library needed
# Open-Meteo: called via httpx (already a dependency) — no SDK

# New Celery tasks:
- prefetch_weather_for_upcoming_bookings  (daily @ 06:00 EGT)
- refresh_weather_cache                   (every 6h for active ports)

# New Django app: seaconnect_api/weather/
# New Django app: seaconnect_api/fishing/
```

---

**Last Updated:** April 7, 2026
**Owner:** Technical Lead / Product Owner
**Sprint Impact:** Adds ~8 new screens/components, 4 new DB tables, 5 new API endpoints
