# Egypt Compliance & Regulatory Requirements — SeaConnect
**Version:** 1.0
**Date:** April 6, 2026
**Status:** ✅ Complete — Legal review required before launch

> **DISCLAIMER:** This document is a planning reference, not legal advice.
> All items marked [LEGAL REVIEW] must be verified by a licensed Egyptian attorney
> before business operations begin.

---

## 1. Business Registration & Legal Structure

### 1.1 Required Registrations

| Registration | Authority | Requirement | Notes |
|-------------|----------|-------------|-------|
| Commercial Registration (سجل تجاري) | GAFI / Ministry of Supply | **Mandatory** | Technology marketplace |
| Tax Registration (بطاقة ضريبية) | Egyptian Tax Authority (ETA) | **Mandatory** | Required for Fawry |
| VAT Registration | ETA | **Mandatory** if revenue > 500k EGP/year | Register proactively |
| Social Insurance | NOSI | **Mandatory** for employees | Required once hiring begins |
| Data Protection Registration | MCIT | **Likely required** [LEGAL REVIEW] | Egypt Personal Data Protection Law 2020 |

### 1.2 Recommended Legal Structure
- **LLC (شركة ذات مسئولية محدودة)** — standard for Egyptian tech startups
- Minimum capital: 1,000 EGP (effectively 50,000+ EGP recommended for credibility)
- Number of founders: 2+ shareholders
- Timeline: 2–4 weeks via GAFI One-Stop-Shop or Misr for Central Clearance

### 1.3 GAFI Investment Incentives
- SeaConnect may qualify as a **technology startup** under Egypt's Startups Act (Law 141/2023)
- Benefits: simplified registration, tax incentives, reduced fees
- Check eligibility at: gafi.gov.eg

---

## 2. Maritime & Tourism Regulations

### 2.1 Egyptian Maritime Authority (هيئة قناة السويس / الهيئة البحرية)

SeaConnect is a **marketplace platform** — it does not own vessels. However, boat owners listing on the platform must hold:

| License | Issuing Authority | Who Needs It |
|---------|-----------------|-------------|
| Vessel Registration Certificate | Egyptian Maritime Authority | Boat owner (mandatory) |
| Tourism Activity License | Egyptian Tourism Authority (ETA) | Boat owner operating tourist trips |
| Captain's License (ترخيص ربان) | Egyptian Maritime Authority | Captain of the vessel |
| Marine Insurance Certificate | Private insurer | Boat owner (mandatory to list) |
| Safety Equipment Certificate | Maritime Authority | Boat owner |

**SeaConnect's Obligation:**
- Verify that listing boat owners hold valid licenses at the time of onboarding
- Store copies of licenses in the platform (admin verifies during approval process)
- Display a disclaimer that SeaConnect is not responsible for unlicensed operations
- Remove any listing if license expires (Celery task: weekly license expiry check)

**[LEGAL REVIEW]:** Determine whether SeaConnect itself needs a tourism platform intermediary license from the Egyptian Tourism Authority.

### 2.2 Egyptian Tourism Authority (هيئة تنشيط السياحة)

- Tourist boat trips (sightseeing, water sports) may require the **boat owner** to hold an ETA-issued tourism activity license
- Fishing trips specifically may be classified differently — confirm with ETA
- SeaConnect's T&C must clearly state that the platform is a marketplace only, not a tour operator

### 2.3 Red Sea Special Regulations

Key fishing/boating areas (Hurghada, Sharm el-Sheikh, Dahab, Marsa Alam):
- The **Red Sea Governorate** and **South Sinai Governorate** have additional local permits
- Diving boats: additional CDWS (Chamber of Diving & Water Sports) registration required
- Fishing in protected marine areas is prohibited — SeaConnect must display and enforce area restrictions
- **[LEGAL REVIEW]:** Confirm whether competitive fishing tournaments require permits from the Ministry of Agriculture (Fisheries sector)

---

## 3. E-Commerce & Digital Regulations

### 3.1 Egypt E-Commerce Law (Law 15 of 2020)

Key requirements for SeaConnect:

| Requirement | Details | Status |
|------------|---------|--------|
| Website registration with MCIT | Required for Egyptian e-commerce platforms | [ ] Register at mcit.gov.eg |
| Display merchant info | Business name, address, registration number on website | [ ] Add to footer |
| Clear pricing in EGP | All prices must be in Egyptian Pounds with VAT indicated | ✅ Planned |
| Return/refund policy | Must be clearly displayed | ✅ In T&C |
| Consumer protection compliance | Law 67 of 2006 and amendments | [LEGAL REVIEW] |
| Order confirmation requirement | Must send confirmation to customer after purchase | ✅ Email + push |
| Electronic invoice | Required for B2C transactions above certain threshold | [LEGAL REVIEW] |

### 3.2 Central Bank of Egypt (CBE) — Payment Regulations

- SeaConnect is a **merchant** accepting payments via Fawry (licensed payment service provider)
- SeaConnect does NOT hold customer funds directly — Fawry holds funds in escrow
- **No CBE license required** for SeaConnect as it is not a payment processor
- However, the payout/disbursement mechanism must comply with CBE guidelines for marketplace payouts
- **[LEGAL REVIEW]:** Confirm that the hold-and-release payout model (holding customer payment until trip completion) does not require a payment facilitator license from CBE

### 3.3 Anti-Money Laundering (AML) Obligations

Under Law 80 of 2002 (AML Law) as amended:
- SeaConnect must implement KYC (Know Your Customer) for boat owners and vendors
- KYC minimum: national ID (National ID number + photo), business registration
- Report suspicious transactions to the Egyptian Money Laundering Combating Unit (EMLCU)
- Transaction records retained for 5 years minimum
- **[LEGAL REVIEW]:** Assess whether SeaConnect's transaction volume triggers formal AML reporting obligations

---

## 4. Personal Data Protection

### 4.1 Egypt Personal Data Protection Law (Law 151 of 2020)

This law came into effect in 2020 and applies to any entity processing personal data of Egyptian residents.

| Obligation | Requirement | SeaConnect Action |
|-----------|------------|------------------|
| Lawful basis | Consent or contract basis for processing | Add explicit consent at registration |
| Privacy Notice | Clear, accessible privacy policy in Arabic | ✅ Doc 02-Privacy-Policy.md |
| Data Subject Rights | Right to access, correct, delete data | Build in user profile settings |
| Data Transfers | Restrictions on transferring data outside Egypt | [LEGAL REVIEW] — Railway/Vercel hosting locations |
| Data Breach Notification | Notify NTRA within 72 hours of breach | Define incident response plan |
| DPO Appointment | Required for large-scale data processing | [LEGAL REVIEW] — may be required |
| Registration with NTRA | Data controllers may need to register | [LEGAL REVIEW] |

**Sensitive data handled by SeaConnect:**
- National ID numbers (boat owners, vendors for KYC)
- Payment card data (NOT stored — Fawry handles tokenization)
- GPS/location data (during active trips)
- Photos and personal documents

**[LEGAL REVIEW]:** Engage a data protection counsel to conduct a Data Protection Impact Assessment (DPIA) before launch.

### 4.2 App Store / Play Store Data Compliance

- **Apple App Store:** Privacy Nutrition Label required — declare all data collected
- **Google Play Store:** Data Safety section required — must be accurate
- Both require: honest description of data use, links to privacy policy, age rating
- SeaConnect is **not directed at children** — minimum age 18 for registration (boat owners) and 16 for customers

---

## 5. Tax Obligations

### 5.1 Value Added Tax (VAT)

| Stream | VAT Treatment |
|--------|--------------|
| SeaConnect commission (booking) | VAT on SeaConnect's commission income (14%) |
| SeaConnect commission (marketplace) | VAT on SeaConnect's commission income (14%) |
| Boat trip price paid by customer | VAT liability is owner's — SeaConnect is agent only |
| Product price paid by customer | VAT liability is vendor's — SeaConnect is agent only |
| Featured listing fees | VAT on SeaConnect's fee income (14%) |

- SeaConnect files monthly VAT returns once registered
- Issue VAT invoices to boat owners and vendors for commission deducted
- **[LEGAL REVIEW]:** Confirm agent/principal distinction is valid under Egyptian VAT law for marketplace platforms

### 5.2 Withholding Tax
- Egypt imposes withholding tax on payments to service providers
- Payouts to boat owners and vendors may be subject to withholding tax (typically 2.5–5%)
- **[LEGAL REVIEW]:** Confirm withholding tax obligations on marketplace payouts

### 5.3 Income Tax
- SeaConnect LLC pays corporate income tax on net profit (22.5% standard rate in Egypt)
- Startup exemptions may apply under Law 141/2023

---

## 6. Consumer Protection

### 6.1 Egyptian Consumer Protection Law (Law 67 of 2006 and Amendments)

| Right | Implementation |
|-------|---------------|
| Right to accurate information | All listings must display accurate photos, descriptions, prices |
| Right to cancel | Cancellation policy clearly stated before payment |
| Right to refund | Refund within 14 business days for eligible cancellations |
| Right to complain | In-app support + support@seaconnect.app |
| Protection against misleading ads | No fake reviews, no inflated ratings |

### 6.2 Review Integrity
- One review per verified booking/order (enforced at database level)
- No anonymous reviews (must be verified customer)
- Admin can remove reviews that violate policy (hate speech, fake, irrelevant)
- Boat owners/vendors cannot purchase positive reviews — grounds for permanent ban

---

## 7. Insurance Requirements

SeaConnect should obtain:

| Insurance | Coverage | Priority |
|-----------|----------|---------|
| Professional Indemnity (PI) | Errors and omissions in platform services | P1 — before launch |
| Cyber Liability | Data breach, ransomware, business interruption | P0 — before launch |
| General Liability | Third-party claims from using the platform | P1 — before launch |
| Directors & Officers (D&O) | Founder liability protection | P2 — after funding |

**[LEGAL REVIEW]:** Engage Egyptian insurance broker to obtain quotes. Cyber liability is critical given payment data.

---

## 8. Pre-Launch Legal Checklist

### Must Complete Before Launch
- [ ] LLC registration with GAFI
- [ ] Tax registration (ETA)
- [ ] VAT registration
- [ ] Fawry merchant agreement signed
- [ ] Terms & Conditions reviewed by Egyptian lawyer
- [ ] Privacy Policy reviewed for Law 151/2020 compliance
- [ ] Boat Charter Agreement reviewed by maritime lawyer
- [ ] MCIT e-commerce platform registration
- [ ] Cyber liability insurance obtained
- [ ] Data breach response plan documented

### Must Complete Within 90 Days of Launch
- [ ] Formal DPIA completed
- [ ] AML compliance assessment
- [ ] CBE payout model legal opinion
- [ ] ETA platform intermediary license determination
- [ ] Withholding tax mechanism implemented

---

**Last Updated:** April 6, 2026
**Owner:** Legal / Co-Founders
**Next Action:** Engage Egyptian legal counsel (maritime + tech/data protection specialties)
