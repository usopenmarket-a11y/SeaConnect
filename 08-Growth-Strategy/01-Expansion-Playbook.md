# Expansion Playbook — SeaConnect
**Version:** 1.0  
**Date:** April 8, 2026  
**Status:** Active — Reference before entering any new market

---

## Purpose

This playbook defines the repeatable process for entering a new geographic market. It applies to every country expansion from UAE (Phase 3) onward. The goal is to reduce time-to-launch in each new market by following a proven checklist rather than reinventing the process.

Egypt (Phase 1) is the reference implementation. Every decision made in Egypt should be documented here for reuse.

---

## 1. Market Entry Decision Framework

### 1.1 Mandatory Gates (ALL must pass before committing to a new market)

| Gate | Criterion | Measurement |
|------|-----------|-------------|
| **Supply Signal** | 20+ boat owners OR 15+ vendors willing to list | Signed LOIs or confirmed conversations |
| **Demand Signal** | Validated willingness-to-pay from 100+ target users | Survey or waitlist signups |
| **Unit Economics** | Current market contribution-margin positive | Monthly P&L (at least 3 months) |
| **Payment Ready** | Local payment provider contracted | Signed merchant agreement |
| **Legal Cleared** | Local entity OR partner arrangement confirmed | Legal opinion from local counsel |
| **Ops Hire** | 1 local operations person contracted | Offer accepted |
| **Regulatory** | Platform legal to operate (maritime + e-commerce) | Written opinion from local lawyer |

### 1.2 Market Scoring Matrix

Before committing to any market, score it across 6 dimensions (1–5 each):

| Dimension | Weight | Egypt Score | UAE Score | KSA Score |
|-----------|--------|-------------|-----------|-----------|
| Market size (boats + tourism) | 25% | 4 | 5 | 4 |
| Regulatory ease | 20% | 3 | 4 | 3 |
| Payment infrastructure | 15% | 3 | 5 | 4 |
| Language/cultural fit | 15% | 5 | 5 | 5 |
| Competition intensity | 15% | 5 | 3 | 4 |
| Supply availability | 10% | 4 | 4 | 3 |
| **Weighted Score** | | **3.9** | **4.3** | **3.8** |

UAE scores highest → confirmed as Phase 3 target.

---

## 2. Pre-Launch Timeline (Per Market)

### T-6 months: Market Research

```
Week 1–2:  Market sizing (boats, marinas, tourism volume)
Week 3–4:  Competitor analysis (local + regional players)
Week 5–6:  Regulatory research (maritime law, e-commerce law, payment rules)
Week 7–8:  Supply interviews (20+ boat owner conversations)
Week 9–10: Demand validation (100+ customer surveys)
Week 11–12: Financial model (revenue, cost, break-even, required seed supply)

Deliverable: Market Entry Decision document (go / no-go)
```

### T-4 months: Legal & Payment Setup

```
Week 1–2:  Engage local legal counsel (maritime + corporate)
Week 3–4:  Legal entity registration initiated
Week 5–6:  Payment provider negotiations (contract + integration kickoff)
Week 7–8:  Maritime license verification process understood + documented
Week 9–10: Data residency compliance plan written
Week 11–16: Legal entity registered (often takes 4–8 weeks in MENA)

Deliverable: Legal entity active, payment provider merchant agreement signed
```

### T-3 months: Supply Acquisition

```
Week 1–2:  Hire local operations person (marina outreach, owner acquisition)
Week 3–4:  First 10 boat owners onboarded (soft launch supply)
Week 5–8:  Reach 20+ boats listed (minimum viable supply)
Week 9–12: Reach 10+ vendors listed (marketplace MVP supply)

Deliverable: 20+ boats live, 10+ vendors live
```

### T-2 months: Technical Launch Prep

```
Week 1:  New region seeded in DB (Region model, currency, timezone)
Week 2:  Payment provider for new currency integrated (new PaymentProvider class)
Week 3:  New language strings added (if needed — e.g., Turkish for Turkey)
Week 4:  New ports/locations seeded (fishing seasons, weather ports)
Week 5:  Legal doc translations (T&C, Privacy Policy in local language)
Week 6:  New domain registered and DNS configured
Week 7:  Staging deployment in new region, smoke tested
Week 8:  Performance testing (latency from new market location)

Deliverable: Platform ready for new market, staging passing all tests
```

### T-1 month: Soft Launch

```
Week 1–2: Invite-only beta (first 20 boat owners + 50 customers)
Week 3:   Fix critical bugs from beta feedback
Week 4:   Public launch with PR + social media campaign

Deliverable: Public launch
```

---

## 3. Country-Specific Profiles

### 3.1 UAE — Phase 3 (Target: Q3 2027)

**Market Overview**
- ~1,200 registered leisure boats in UAE waters
- Dubai Marina, Abu Dhabi Corniche, Fujairah major hubs
- High average spend: AED 3,000–15,000/charter
- Strong expat market (40%+ of population)
- Year-round season (best: Oct–April, summer is slow but not dead)

**Regulatory**
- Federal Transport Authority (FTA) — Land & Maritime: vessel registration
- Dubai Maritime City Authority (DMCA): Dubai-specific permits
- Tourism DED license required for charter operations
- No restriction on foreign-owned online marketplace platforms
- VAT: 5% (much lower than Egypt's 14%)
- Data: No strict data residency law yet (UAE DIFC applies only to DIFC entities)

**Payment**
| Provider | Coverage | Decision |
|----------|---------|---------|
| Telr | Visa/MC, Apple Pay, local wallets | Primary |
| PayTabs | MENA coverage, good documentation | Backup |
| Stripe | International cards | Phase 3+ |

**Legal Entity**
- UAE Free Zone LLC (RAKEZ or Meydan) — 100% foreign ownership, no local sponsor required
- Cost: ~AED 15,000–25,000 setup + annual renewal
- Alternative: UAE mainland LLC (requires local service agent, more complex)
- Recommendation: Start with RAKEZ Free Zone → mainland later if required by FTA

**Operations**
- Local ops hire: UAE-based maritime industry contact (English + Arabic mandatory)
- Marina outreach targets: Dubai Marina, The Palm, Yas Marina, Fujairah Marina
- Primary customer: Expats, tourists, corporate events
- Primary listing type: Luxury yachts (higher ASP vs Egypt)

**Commission rates (UAE):**
- Bookings: 10% (vs 12% Egypt — more competitive market)
- Marketplace: 8% (vs 10% Egypt)
- First 3 months for founding UAE owners: 7%

**Localization**
- Language: Arabic (ar-AE dialect) + English (ar-AE has slightly different dialect from ar-EG)
- Currency: AED — store as 'AED', display as 'د.إ'
- Timezone: Asia/Dubai (UTC+4, no DST)

---

### 3.2 KSA — Phase 4 (Target: Q1 2028)

**Market Overview**
- Massive Vision 2030 investment in Red Sea tourism (NEOM, AMAALA, Sindalah Island)
- ~2,000+ registered boats (mostly on Red Sea coast: Jeddah, Yanbu, Jizan)
- Growing domestic tourism (previously restricted)
- Large fishing culture (deep-sea fishing is popular)
- Stricter regulatory environment

**Regulatory**
- Saudi Ports Authority + Coast Guard: commercial vessel permits
- ZATCA (Zakat, Tax and Customs Authority): VAT 15%, e-commerce registration
- CITC (Communications and Information Technology Commission): e-commerce platform license
- Saudi PDPL (Personal Data Protection Law, 2021): data must stay in KSA
- Shariah compliance consideration for T&C language

**Payment**
| Provider | Coverage | Decision |
|----------|---------|---------|
| Mada | Saudi national debit card (80%+ market share) | Primary |
| STC Pay | Saudi telco wallet | Secondary |
| Moyasar | Mada + Visa/MC for online | Integration layer |

**Legal Entity**
- Foreign company 100% ownership now allowed in most sectors (Vision 2030 reform)
- MISA (Ministry of Investment) license required
- Option: Regional headquarters license (preferred — full branch rights)
- Timeline: 3–5 months for full registration
- Cost: SAR 30,000–80,000 depending on structure

**Data Residency**
- Saudi PDPL requires personal data of Saudi nationals to be stored in KSA
- Infrastructure: Supabase on AWS Riyadh (me-south-1) region
- Django deployment: Fly.io (closest region: AMS until ME region available) + KSA VPS as needed

**Localization**
- Language: Arabic (ar-SA) — Hijri calendar awareness (date display)
- Currency: SAR — display as 'ر.س'
- Timezone: Asia/Riyadh (UTC+3, no DST)
- Cultural: Gender-mixed activities now permitted; family-friendly framing important

---

### 3.3 Morocco — Phase 5 (Target: Q3 2028)

**Market Overview**
- Atlantic + Mediterranean coasts: Agadir, Casablanca, Tangier, Al Hoceima
- Strong French language presence (bilingual AR/FR market)
- Growing tourism (14M+ arrivals/year, European tourists dominant)
- Lower ASP vs Gulf — price-sensitive market

**Regulatory**
- Office National de Pêche (ONP): fishing boat permits
- Ministère du Tourisme: charter licensing
- VAT: 20% standard (higher than Egypt)
- French + Arabic official languages — legal docs in both

**Payment**
| Provider | Coverage | Decision |
|----------|---------|---------|
| CMI (Centre Monétique Interbancaire) | Moroccan cards (Visa/MC local) | Primary |
| PayDunya | West Africa + Morocco wallet | Secondary |
| Stripe | European tourist cards | Phase 5 |

**Localization**
- Languages: Arabic (ar-MA, Darija dialect) + French (fr-MA)
- Currency: MAD — display as 'د.م.' or 'MAD'
- Timezone: Africa/Casablanca (UTC+1, Ramadan time adjustment quirk)
- Note: Darija (Moroccan Arabic dialect) differs significantly from MSA — UI copy should use Modern Standard Arabic (MSA) for formal text

---

### 3.4 Turkey — Phase 6 (Target: Q1 2029)

**Market Overview**
- Massive yacht charter market (Turkish Riviera: Bodrum, Marmaris, Göcek, Antalya)
- 5,000+ licensed charter boats (gulets — traditional Turkish vessels)
- Major European tourist market
- Strong domestic demand (affluent Turkish market)
- Different product type: multi-day gulet charters (vs day trips)

**Regulatory**
- Directorate General of Coastal Safety: vessel registration
- Ministry of Culture and Tourism: charter license (ÇYPAA)
- KVKK (Turkish personal data law): data residency in Turkey required
- VAT: 10% on tourism services

**Payment**
| Provider | Coverage | Decision |
|----------|---------|---------|
| İyzico | Turkish cards + installments (taksit) | Primary |
| PayTR | Backup | Secondary |
| Stripe | International (EU tourists) | Phase 6 |

**Localization**
- Language: Turkish (tr) — first fully non-Arabic/non-English market
- Currency: TRY — display as '₺'
- Timezone: Europe/Istanbul (UTC+3, no DST since 2016)
- Note: Installment payments (taksit) are culturally expected in Turkey — build support into PaymentProvider

---

## 4. Operations Playbook (Reusable)

### 4.1 Local Operations Role — Job Spec

Every new market requires one local Operations Manager before launch:

**Role:** SeaConnect Country Operations Manager — {Country}

**Responsibilities:**
- Boat owner acquisition: Identify, pitch, onboard first 30 boat owners
- Vendor acquisition: Identify, pitch, onboard first 15 fishing gear vendors
- Marina relationships: Establish presence in top 3 marinas in market
- Regulatory liaison: Interface with maritime authority for license verification
- Customer support: Handle Arabic/local-language support queries (first 6 months)
- Local marketing: Coordinate with central team on country-specific campaigns

**Requirements:**
- Native speaker of local language
- Existing network in maritime/fishing/tourism industry
- Based in target city (not remote)
- Prior marketplace or hospitality operations experience preferred

**Compensation:**
- Phase 1 of new market: Contract-based (avoid full-time cost before PMF)
- Phase 2 of new market: Full-time + equity (0.1–0.25% depending on seniority)

### 4.2 Supply Acquisition Script

Proven messaging from Egypt Phase 1 (translate for each market):

```
Subject: List your boat on SeaConnect — reach 10,000+ customers from day 1

Hi [Captain's Name],

I'm [Name] from SeaConnect — the maritime booking platform launching in [Country].

We're inviting [N] founding captains to list their boats before our public launch.
As a founding partner, you get:
- Reduced commission: [X]% for your first 3 months (vs standard [Y]%)
- "Founding Partner" badge on your listing
- Priority placement in search results for 6 months
- Direct onboarding support from our team

We handle: payments, customer communication, cancellation disputes.
You focus on: running great trips.

Takes 20 minutes to list. I can walk you through it in person at the marina.

When are you available this week?

[Name]
[Phone/WhatsApp]
```

### 4.3 Regulatory Verification Checklist (Per Country)

For each boat owner listing, verify:

| Document | Egypt | UAE | KSA | Morocco |
|----------|-------|-----|-----|---------|
| Vessel registration | Maritime Authority | FTA | Saudi Ports | ONP |
| Hull insurance | Required (min 1M EGP) | Required | Required | Required |
| Captain's license | EMSA license | FTA license | Coast Guard | Ministry |
| Tourism/charter permit | Tourism Authority | DMCA | MISA | Ministry of Tourism |
| Commercial insurance | Recommended | Required | Required | Required |

---

## 5. Financial Model Per Market

### 5.1 Break-Even Calculator Template

Plug in market-specific numbers:

```
Monthly Fixed Costs (new market):
  Local ops salary:           {X} {currency}
  Legal/compliance retainer:  {Y} {currency}
  Marketing (paid ads):       {Z} {currency}
  Infra overhead (new region):{W} {currency}
  Total Fixed:                {Total} {currency}

Variable Revenue:
  Avg booking value:          {A} {currency}
  Commission rate:            {B}%
  Commission per booking:     {A × B} {currency}

Break-Even Bookings/Month:
  = Total Fixed ÷ Commission per booking
  = {Total} ÷ {A × B}
  = {N} bookings/month to break even

Egypt reference:
  Fixed: ~45,000 EGP/month
  Avg booking: 4,200 EGP × 12% = 504 EGP commission
  Break-even: 45,000 ÷ 504 = 90 bookings/month

UAE estimate:
  Fixed: ~25,000 AED/month  
  Avg booking: 8,000 AED × 10% = 800 AED commission
  Break-even: 25,000 ÷ 800 = 32 bookings/month ← much faster
```

### 5.2 Market Launch Budget

| Category | Egypt (Actual) | UAE (Estimate) | KSA (Estimate) |
|----------|---------------|----------------|----------------|
| Legal setup | 15,000 EGP | AED 20,000 | SAR 50,000 |
| Payment integration | 5,000 EGP dev cost | AED 5,000 | SAR 5,000 |
| Local ops hire (6mo) | 60,000 EGP | AED 90,000 | SAR 120,000 |
| Marketing (pre-launch) | 20,000 EGP | AED 30,000 | SAR 40,000 |
| Infra + tooling | 3,000 EGP | AED 3,000 | SAR 3,000 |
| **Total launch budget** | **~103,000 EGP (~$2,100)** | **~AED 148,000 (~$40,000)** | **~SAR 218,000 (~$58,000)** |

Note: Egypt is cheapest because existing infrastructure, legal entity, and team can absorb overhead. UAE and KSA require standalone investment.

---

## 6. Series A Preparation

### 6.1 What Investors Want to See (Maritime Marketplace)

Before raising Series A (target: Phase 3, post-UAE launch):

| Metric | Target | Measurement |
|--------|--------|------------|
| GMV (Gross Merchandise Value) | >$1M/month across all markets | Financial records |
| Take rate (commission) | 10–12% blended | Revenue ÷ GMV |
| Month-over-month growth | >15% GMV growth for 3+ months | Financial records |
| Supply-side retention | >80% owners active after 6 months | Cohort analysis |
| Demand-side retention | >40% customers book again within 12 months | Cohort analysis |
| NPS (Net Promoter Score) | >50 | Survey |
| Markets active | 2+ countries | Operational |
| Unit economics | Contribution margin positive | P&L |
| Team | Founder + 3–5 core hires | Org chart |

### 6.2 Narrative for Maritime Marketplace Investors

**The pitch in three sentences:**
SeaConnect is the Airbnb for boats in MENA — a region with 8,000+ km of coastline, 30M+ maritime tourism visits per year, and zero digital infrastructure for booking. We launched in Egypt in [date], reached [X] bookings in [Y] months, and are now expanding to UAE — the highest-value boat charter market in the Middle East. We're raising to fund UAE supply acquisition, KSA regulatory work, and 3 engineering hires.

**Comps to use:**
- Airbnb (marketplace network effects, trust/safety model)
- GetYourGuide (activity booking, experience economy)
- Boatsetter (US boat rental marketplace — direct vertical comp)
- Viator (tours and experiences, distribution model)

**MENA-specific angle:**
- Arabic-first (no competitor has this)
- Egyptian payment infrastructure (Fawry — no international player has integrated this)
- Regulatory relationships (maritime authority connections from Egypt)
- Local team (not a Western company trying to enter MENA)

### 6.3 Data Room Contents (Series A)

```
Financial:
  - 24 months P&L (monthly breakdown)
  - Unit economics by cohort (owner and customer)
  - Revenue forecast (3 years)
  - Cap table + existing investor agreements

Product:
  - Key metrics dashboard (30/60/90 day trends)
  - App store ratings and reviews
  - NPS survey results
  - Feature roadmap (12 months)

Market:
  - Egypt market share estimate
  - UAE market analysis (this playbook section 3.1)
  - MENA total addressable market

Legal:
  - Legal entity registrations
  - Regulatory licenses
  - Key contracts (Fawry, Telr, top 5 boat owners)
  - IP: trademark filings

Team:
  - Org chart
  - Key hire plans (how Series A funds are used)
  - Advisor agreements
```

---

## 7. Trademark & IP Protection

### 7.1 Trademark Filing Priority

File "SeaConnect" and logo as a trademark in each market **before or simultaneously with launch**, not after:

| Market | Filing Body | Estimated Cost | Priority |
|--------|------------|----------------|---------|
| Egypt | Egyptian Intellectual Property Office (EIPO) | ~5,000 EGP | P0 — do now |
| UAE | UAE Ministry of Economy IP Department | ~AED 8,000 | P0 — before UAE launch |
| KSA | Saudi Authority for Intellectual Property (SAIP) | ~SAR 10,000 | P1 — before KSA launch |
| WIPO (international) | Madrid Protocol (covers 130 countries) | ~$3,000–5,000 | P1 — Phase 3 |
| Morocco | OMPIC (Office Marocain de la Propriété Industrielle) | ~MAD 5,000 | P2 — before Morocco launch |

**Trademark classes to file:**
- Class 39: Transportation, boat charter services
- Class 35: Marketplace / e-commerce platform services
- Class 41: Sports fishing competitions, event organization
- Class 42: Software as a service (SaaS platform)

### 7.2 Domain Portfolio

Register all country domains immediately (cost: ~$100/year total):

```
seaconnect.eg    ← Egypt (register now via NTRA)
seaconnect.com   ← Global (register now)
seaconnect.ae    ← UAE (register before Phase 3)
seaconnect.sa    ← KSA (register before Phase 4)
seaconnect.ma    ← Morocco (register before Phase 5)
seaconnect.com.tr ← Turkey
sea-connect.com  ← Defensive (typosquat protection)
seaconnectapp.com ← App-focused domain
```

---

## 8. Expansion Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Regulatory block (maritime license) | Medium | High | Legal opinion before committing; operate in legal grey zone temporarily if precedent exists |
| Payment provider delays | High | High | Start integration 4 months before launch; have backup provider identified |
| Supply acquisition failure | Medium | High | Require 20 boats signed before launching (gate criterion) |
| Local competitor launches first | Low | Medium | Speed advantage from proven playbook; focus on quality > quantity |
| Exchange rate risk (EGP devaluation) | High | Medium | Hedge by keeping reserves in USD; price in local currency but track USD equivalent |
| Language/cultural misfire | Low | Medium | Native-speaking ops hire reviews all copy before launch |
| Data breach in new market | Low | Very High | Same security standards as Egypt; local DPA notification plan ready |
| Key ops hire leaves | Medium | High | Document all relationships; 2-person coverage for key marina relationships |
