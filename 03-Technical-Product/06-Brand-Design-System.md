# Brand Identity & Design System — SeaConnect
**Version:** 1.0
**Date:** April 6, 2026
**Status:** ✅ Complete — Decisions locked for MVP

---

## 1. Brand Identity

### 1.1 Name

**SeaConnect** (English) / **سي كونكت** (Arabic transliteration)

- "Sea" = the product's domain (maritime, fishing, water)
- "Connect" = the marketplace bridge between owners, customers, and vendors
- Short, memorable, works in Arabic and English contexts
- Domain: `seaconnect.app` (confirmed)

### 1.2 Tagline

| Language | Tagline |
|----------|---------|
| English | *Your sea, your adventure* |
| Arabic | *بحرك، مغامرتك* |

### 1.3 Brand Personality

SeaConnect is:
- **Adventurous** — it opens access to experiences people didn't know they could have
- **Trustworthy** — every boat is verified, every payment is safe
- **Local** — built for Egypt first, speaks Arabic natively
- **Energetic** — the sea, fishing, and open water carry natural excitement

SeaConnect is NOT:
- Corporate or stiff (avoid bank-like blue/grey palettes)
- Luxury-only (it serves everyday fishing families, not just yacht tourists)
- Generic (avoid generic wave/anchor stock icons)

### 1.4 Tone of Voice

| Context | Tone | Example |
|---------|------|---------|
| Marketing copy | Exciting, inviting | "انطلق للبحر — حجز في دقيقتين" |
| Booking confirmation | Warm, reassuring | "تم تأكيد رحلتك! استعد للإبحار 🎣" |
| Error messages | Clear, helpful, never blaming | "حدث خطأ في الدفع. تحقق من بيانات بطاقتك وحاول مرة أخرى." |
| Admin notifications | Direct, professional | "تم رفض القائمة — السبب: الصور غير واضحة" |
| Empty states | Encouraging, actionable | "لا توجد رحلات متاحة في هذا التاريخ. جرب تاريخاً آخر." |

---

## 2. Color Palette

### 2.1 Primary Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Deep Sea** | `#0A3D62` | Primary brand color — headers, primary buttons, nav bar |
| **Ocean Blue** | `#1E88E5` | Interactive elements — links, secondary buttons, highlights |
| **Sea Foam** | `#E3F2FD` | Light backgrounds, cards, input fills |

**Rationale:** Deep navy evokes the sea and trust. Bright blue provides energy and calls to action. Avoids the cliché "Airbnb coral" or generic fintech navy.

### 2.2 Secondary / Accent Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Coral Gold** | `#F4A300` | Featured listings badge, ratings stars, premium indicators |
| **Fishing Green** | `#2E7D32` | Success states, "confirmed" badges, "available" indicators |
| **Sunset Orange** | `#E64A19` | Alerts, "declining soon", limited availability warnings |

### 2.3 Neutral Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Dark Text** | `#1A1A2E` | Primary body text |
| **Medium Text** | `#546E7A` | Secondary text, captions, labels |
| **Light Text** | `#90A4AE` | Placeholder text, disabled states |
| **Divider** | `#ECEFF1` | Dividers, borders, separators |
| **Surface** | `#F5F7FA` | Page background, card backgrounds |
| **White** | `#FFFFFF` | Card surfaces, modal backgrounds |

### 2.4 Semantic Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Success** | `#2E7D32` | Payment confirmed, booking confirmed |
| **Warning** | `#F9A825` | Expiring documents, owner response deadline approaching |
| **Error** | `#C62828` | Payment failed, validation errors |
| **Info** | `#1565C0` | Informational banners, tips |

### 2.5 Dark Mode Equivalents

| Light | Dark | Token Name |
|-------|------|-----------|
| `#FFFFFF` | `#121212` | `surface` |
| `#F5F7FA` | `#1E1E2E` | `background` |
| `#1A1A2E` | `#E8EAF6` | `onSurface` |
| `#0A3D62` | `#90CAF9` | `primary` |
| `#1E88E5` | `#42A5F5` | `secondary` |

Dark mode is a **Phase 2** feature. Design for light mode first. Use design tokens (not hardcoded hex) in code from day one so dark mode can be added with a theme swap.

---

## 3. Typography

### 3.1 Font Selection

| Role | Font | Weights | Format |
|------|------|---------|--------|
| **Arabic body + UI** | Cairo | 400, 500, 600, 700 | Google Fonts |
| **Arabic display / headings** | Tajawal | 700, 800 | Google Fonts |
| **English body + UI** | Inter | 400, 500, 600, 700 | Google Fonts |
| **English display** | Inter | 700, 800 | Google Fonts |

**Rationale:**
- **Cairo** is the gold standard for Arabic UI text — excellent legibility at small sizes, strong RTL support, widely used in Egyptian apps (trusted feel)
- **Tajawal** pairs well with Cairo for headings — slightly more expressive
- **Inter** is the industry standard for UI Latin text — neutral, readable at all sizes
- Both are free, open source, available on Google Fonts and Flutter/Next.js

### 3.2 Type Scale

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `display-xl` | 32px | 800 | 40px | Hero banners, splash screens |
| `display-lg` | 28px | 700 | 36px | Page titles |
| `display-md` | 24px | 700 | 32px | Section headings |
| `title-lg` | 20px | 600 | 28px | Card titles, modal headings |
| `title-md` | 18px | 600 | 26px | Subtitle, list item titles |
| `body-lg` | 16px | 400 | 24px | Primary body text |
| `body-md` | 14px | 400 | 22px | Secondary body, descriptions |
| `body-sm` | 12px | 400 | 18px | Captions, labels, metadata |
| `label` | 11px | 500 | 16px | Tags, chips, badges |

### 3.3 Flutter Font Setup

```dart
// pubspec.yaml
flutter:
  fonts:
    - family: Cairo
      fonts:
        - asset: assets/fonts/Cairo-Regular.ttf
          weight: 400
        - asset: assets/fonts/Cairo-Medium.ttf
          weight: 500
        - asset: assets/fonts/Cairo-SemiBold.ttf
          weight: 600
        - asset: assets/fonts/Cairo-Bold.ttf
          weight: 700
    - family: Inter
      fonts:
        - asset: assets/fonts/Inter-Regular.ttf
          weight: 400
        - asset: assets/fonts/Inter-Medium.ttf
          weight: 500
        - asset: assets/fonts/Inter-SemiBold.ttf
          weight: 600
        - asset: assets/fonts/Inter-Bold.ttf
          weight: 700
```

```dart
// lib/core/theme/text_theme.dart
TextTheme seaConnectTextTheme(Locale locale) {
  final String fontFamily = locale.languageCode == 'ar' ? 'Cairo' : 'Inter';
  return TextTheme(
    displayLarge: TextStyle(fontFamily: fontFamily, fontSize: 32, fontWeight: FontWeight.w800),
    displayMedium: TextStyle(fontFamily: fontFamily, fontSize: 28, fontWeight: FontWeight.w700),
    headlineLarge: TextStyle(fontFamily: fontFamily, fontSize: 24, fontWeight: FontWeight.w700),
    titleLarge:   TextStyle(fontFamily: fontFamily, fontSize: 20, fontWeight: FontWeight.w600),
    titleMedium:  TextStyle(fontFamily: fontFamily, fontSize: 18, fontWeight: FontWeight.w600),
    bodyLarge:    TextStyle(fontFamily: fontFamily, fontSize: 16, fontWeight: FontWeight.w400),
    bodyMedium:   TextStyle(fontFamily: fontFamily, fontSize: 14, fontWeight: FontWeight.w400),
    bodySmall:    TextStyle(fontFamily: fontFamily, fontSize: 12, fontWeight: FontWeight.w400),
    labelSmall:   TextStyle(fontFamily: fontFamily, fontSize: 11, fontWeight: FontWeight.w500),
  );
}
```

### 3.4 Next.js Font Setup

```typescript
// app/layout.tsx
import { Cairo, Inter } from 'next/font/google'

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cairo',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
})

// In tailwind.config.ts
fontFamily: {
  arabic: ['var(--font-cairo)', 'sans-serif'],
  latin:  ['var(--font-inter)', 'sans-serif'],
  sans:   ['var(--font-cairo)', 'var(--font-inter)', 'sans-serif'], // default
}
```

---

## 4. Spacing & Layout System

### 4.1 Spacing Scale (8px base grid)

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Tight inline gaps (icon + label) |
| `space-2` | 8px | Small padding inside components |
| `space-3` | 12px | List item vertical padding |
| `space-4` | 16px | Standard component padding |
| `space-5` | 20px | Card internal padding |
| `space-6` | 24px | Section gaps |
| `space-8` | 32px | Large section separators |
| `space-10` | 40px | Page-level top/bottom padding |
| `space-12` | 48px | Hero section padding |

### 4.2 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 6px | Chips, tags, small badges |
| `radius-md` | 12px | Buttons, input fields |
| `radius-lg` | 16px | Cards, bottom sheets |
| `radius-xl` | 24px | Modal sheets, large cards |
| `radius-full` | 999px | Avatars, pills |

### 4.3 Elevation / Shadows

```dart
// Flutter
BoxShadow cardShadow = BoxShadow(
  color: Colors.black.withOpacity(0.08),
  blurRadius: 12,
  offset: Offset(0, 4),
);

BoxShadow floatingShadow = BoxShadow(
  color: Colors.black.withOpacity(0.16),
  blurRadius: 24,
  offset: Offset(0, 8),
);
```

```css
/* Next.js / Tailwind */
--shadow-card: 0 4px 12px rgba(0,0,0,0.08);
--shadow-modal: 0 8px 24px rgba(0,0,0,0.16);
--shadow-nav: 0 2px 8px rgba(0,0,0,0.06);
```

---

## 5. Component Library

### 5.1 Flutter — Component Decisions

**Base:** Flutter Material 3 (Material You) — use `ThemeData` with custom color scheme.

**Do NOT use:** Third-party component packages as the primary UI system (brittle, hard to customize for Arabic RTL). Build on Material 3 primitives.

Key custom components to build (Sprint 11 — Polish):
- `YachtCard` — photo, title, price, rating, capacity badge
- `ProductCard` — photo, name, price, vendor name, stock indicator
- `BookingStatusChip` — color-coded status pill (pending/confirmed/completed)
- `AvailabilityCalendar` — custom calendar with blocked/available/booked date states
- `PriceDisplay` — EGP currency formatted correctly (e.g., ١٢٠٠ ج.م or 1,200 EGP)
- `RatingStars` — 5-star display with half-star support
- `OwnerAvatar` — circular avatar with online/verified badge
- `EmptyState` — illustration + message + CTA button
- `LoadingCard` — shimmer skeleton for cards while loading
- `BottomSheetModal` — rounded top, drag handle, consistent padding

### 5.2 Next.js (Admin + Web) — Component Decisions

**Base:** [shadcn/ui](https://ui.shadcn.com/) — copy-paste components built on Radix UI + Tailwind CSS.

**Rationale:** shadcn gives full ownership of component code (not a dependency), works perfectly with Tailwind, and has excellent accessibility. Admin portal uses it heavily for tables, forms, dialogs.

Additional libraries:
- `@tanstack/react-table` — admin data tables (bookings, orders, user management)
- `recharts` — revenue/analytics charts in admin portal
- `react-day-picker` — date range picker for search filters
- `leaflet` + `react-leaflet` — map view for yacht listings (free, no API key required for MVP)
- `react-hook-form` + `zod` — all forms with validation

---

## 6. Iconography

### 6.1 Icon Library

**Flutter:** [`phosphor_flutter`](https://pub.dev/packages/phosphor_flutter) — 1,000+ icons, consistent stroke weight, maritime-relevant icons available (anchor, boat, fish, waves).

**Next.js:** [`phosphor-react`](https://phosphoricons.com/) — same set, consistent cross-platform look.

**Why Phosphor over Material Icons or FontAwesome:**
- More expressive and modern
- Has specific maritime icons (anchor, boat, fish, wave, compass)
- Consistent stroke weight in all sizes
- Works in both Flutter and React (same visual language across platforms)

### 6.2 Key Icons Used

| Icon | Phosphor Name | Context |
|------|--------------|---------|
| Boat/Yacht | `Boat` | Navigation, listing type |
| Fish | `Fish` | Fishing trip type, marketplace |
| Anchor | `Anchor` | Marina, departure point |
| Waves | `Waves` | Sea/water context |
| Compass | `Compass` | Location, navigation |
| Calendar | `Calendar` | Availability, booking dates |
| Star | `Star` / `StarFill` | Ratings |
| ShoppingCart | `ShoppingCart` | Marketplace cart |
| Package | `Package` | Orders, shipping |
| Trophy | `Trophy` | Competitions (Phase 2) |
| Bell | `Bell` | Notifications |
| User | `User` | Profile |
| SignIn | `SignIn` | Login |
| CurrencyEgp | `CurrencyDollar` (custom label) | Prices |

### 6.3 Custom Illustrations

For empty states and onboarding screens, create simple SVG illustrations:
- Empty bookings: boat on calm water with dashed outline
- Empty cart: fishing basket, empty
- No search results: fisherman with empty net
- Onboarding step 1: boat on water with location pin
- Onboarding step 2: calendar with checkmark
- Onboarding step 3: payment card with wave

**Tool:** Design in Figma, export as SVG, use `flutter_svg` package in Flutter and `next/image` for web.

---

## 7. Logo Direction

> **Note:** Final logo requires a professional graphic designer. This section defines the design brief to hand to a designer.

### 7.1 Logo Brief

**Concept:** A stylized letter "S" (for SeaConnect) formed by a wave, combined with a subtle connection/link motif. The wave implies the sea; the connection implies the marketplace.

**Alternatives to explore:**
1. **Wave + Hook:** A fishing hook whose curve forms the "S", combined with a wave underneath
2. **Anchor + Link:** Simplified anchor where the ring is replaced with a chain link
3. **Boat silhouette:** Minimal side-profile of a fishing boat inside a circle badge

**What to AVOID:**
- Generic blue globe / generic anchor clip-art
- Overly complex — must read at 24×24px (app icon size)
- Gradients that disappear on dark backgrounds

### 7.2 App Icon Specifications

| Platform | Size | Format | Notes |
|---------|------|--------|-------|
| Android launcher | 192×192px | PNG | Adaptive icon (foreground layer) |
| Android adaptive bg | 108×108px | PNG | Background color layer |
| iOS App Store | 1024×1024px | PNG | No alpha, no rounded corners (iOS applies) |
| iOS home screen | 180×180px | PNG | @3x |
| Play Store listing | 512×512px | PNG | |
| Web favicon | 32×32, 16×16 | ICO/PNG | |
| Web PWA icon | 192×192, 512×512 | PNG | |

**Flutter asset generation:** Use `flutter_launcher_icons` package — define one 1024×1024 source and it generates all sizes.

```yaml
# pubspec.yaml
flutter_launcher_icons:
  android: true
  ios: true
  image_path: "assets/icon/app_icon.png"
  adaptive_icon_background: "#0A3D62"  # Deep Sea color
  adaptive_icon_foreground: "assets/icon/app_icon_foreground.png"
  web:
    generate: true
    image_path: "assets/icon/app_icon.png"
```

### 7.3 Splash Screen

```dart
// Flutter splash: Deep Sea background (#0A3D62) + white logo centered
// Duration: 2 seconds max, then fade to home
// Use flutter_native_splash package

flutter_native_splash:
  color: "#0A3D62"
  image: assets/images/splash_logo.png
  android: true
  ios: true
```

---

## 8. Flutter Theme Configuration

Full theme implementation for the Flutter app:

```dart
// lib/core/theme/app_theme.dart
import 'package:flutter/material.dart';

class AppTheme {
  // Color constants
  static const Color deepSea     = Color(0xFF0A3D62);
  static const Color oceanBlue   = Color(0xFF1E88E5);
  static const Color seaFoam     = Color(0xFFE3F2FD);
  static const Color coralGold   = Color(0xFFF4A300);
  static const Color fishingGreen= Color(0xFF2E7D32);
  static const Color sunsetOrange= Color(0xFFE64A19);
  static const Color darkText    = Color(0xFF1A1A2E);
  static const Color mediumText  = Color(0xFF546E7A);
  static const Color lightText   = Color(0xFF90A4AE);
  static const Color divider     = Color(0xFFECEFF1);
  static const Color surface     = Color(0xFFF5F7FA);

  static ThemeData lightTheme(Locale locale) {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: deepSea,
        primary: deepSea,
        secondary: oceanBlue,
        tertiary: coralGold,
        surface: surface,
        error: Color(0xFFC62828),
      ),
      textTheme: seaConnectTextTheme(locale),
      appBarTheme: AppBarTheme(
        backgroundColor: deepSea,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: deepSea,
          foregroundColor: Colors.white,
          minimumSize: Size(double.infinity, 52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            fontFamily: locale.languageCode == 'ar' ? 'Cairo' : 'Inter',
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: divider),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: divider),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: oceanBlue, width: 2),
        ),
        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      cardTheme: CardTheme(
        elevation: 0,
        color: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: divider),
        ),
        margin: EdgeInsets.zero,
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: Colors.white,
        selectedItemColor: deepSea,
        unselectedItemColor: lightText,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
      ),
    );
  }
}
```

---

## 9. Next.js / Tailwind Design Tokens

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'deep-sea':      '#0A3D62',
        'ocean-blue':    '#1E88E5',
        'sea-foam':      '#E3F2FD',
        'coral-gold':    '#F4A300',
        'fishing-green': '#2E7D32',
        'sunset-orange': '#E64A19',
        'dark-text':     '#1A1A2E',
        'medium-text':   '#546E7A',
        'light-text':    '#90A4AE',
        'divider':       '#ECEFF1',
        'surface':       '#F5F7FA',
      },
      fontFamily: {
        arabic: ['var(--font-cairo)', 'sans-serif'],
        latin:  ['var(--font-inter)', 'sans-serif'],
        sans:   ['var(--font-cairo)', 'var(--font-inter)', 'sans-serif'],
      },
      borderRadius: {
        'sm': '6px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
      },
      boxShadow: {
        'card':    '0 4px 12px rgba(0,0,0,0.08)',
        'modal':   '0 8px 24px rgba(0,0,0,0.16)',
        'nav':     '0 2px 8px rgba(0,0,0,0.06)',
        'float':   '0 8px 32px rgba(10,61,98,0.16)',
      },
    },
  },
  plugins: [require('tailwindcss-rtl')],  // RTL support
}

export default config
```

---

## 10. Arabic RTL Rules

### 10.1 Flutter RTL
```dart
// Wrap entire app with locale-aware directionality
MaterialApp(
  locale: currentLocale,
  supportedLocales: [Locale('ar'), Locale('en')],
  localizationsDelegates: [
    GlobalMaterialLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    AppLocalizations.delegate,
  ],
  // Flutter handles RTL automatically when locale is 'ar'
  // All Row() widgets flip direction automatically
  // Icons that are directional (arrows, back button) flip automatically
)
```

**Manual RTL rules in Flutter:**
- Use `EdgeInsetsDirectional` instead of `EdgeInsets` for padding
- Use `start`/`end` instead of `left`/`right` in all layout code
- Test every screen with both `ar` and `en` locale before Sprint review
- Numbers always LTR (phone numbers, prices, dates) — wrap in `Directionality(textDirection: TextDirection.ltr)`
- Prices: "١٢٠٠ ج.م" in Arabic mode, "1,200 EGP" in English mode

### 10.2 Next.js RTL
```html
<!-- app/layout.tsx — set dir based on locale -->
<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
```

```css
/* Use logical CSS properties throughout */
padding-inline-start: 16px;  /* NOT padding-left */
margin-inline-end: 8px;      /* NOT margin-right */
text-align: start;           /* NOT text-align: left */
border-inline-start: ...;    /* NOT border-left */
```

**Tailwind RTL plugin** (`tailwindcss-rtl`) provides `ps-4` (padding-start) and `pe-4` (padding-end) utilities that auto-flip in RTL.

### 10.3 Number & Currency Formatting

```dart
// Flutter — always use intl package for formatting
import 'package:intl/intl.dart';

String formatPrice(double amount, String locale) {
  final formatter = NumberFormat.currency(
    locale: locale,          // 'ar_EG' or 'en_EG'
    symbol: locale == 'ar' ? 'ج.م' : 'EGP',
    decimalDigits: 0,
  );
  return formatter.format(amount);
  // ar_EG: ١٬٢٠٠ ج.م
  // en_EG: EGP 1,200
}

String formatDate(DateTime date, String locale) {
  return DateFormat.yMMMMd(locale).format(date);
  // ar: ٦ أبريل ٢٠٢٦
  // en: April 6, 2026
}
```

---

## 11. Figma Design File Structure (Recommended)

When a designer works on SeaConnect, the Figma file should be structured:

```
SeaConnect.fig
├── 🎨 Foundations
│   ├── Colors (all tokens from Section 2)
│   ├── Typography (all type styles from Section 3)
│   ├── Spacing (all spacing tokens from Section 4)
│   └── Iconography (Phosphor icon set)
│
├── 🧩 Components
│   ├── Buttons (primary, secondary, ghost, destructive)
│   ├── Inputs (text, search, dropdown, date picker)
│   ├── Cards (YachtCard, ProductCard, BookingCard)
│   ├── Navigation (bottom nav, app bar, tab bar)
│   ├── Modals & Sheets
│   ├── Chips & Badges
│   └── Empty States
│
├── 📱 Mobile Screens — Arabic (RTL)
│   ├── Onboarding
│   ├── Auth (login, register, OTP)
│   ├── Customer flows
│   ├── Owner flows
│   └── Vendor flows
│
├── 📱 Mobile Screens — English (LTR)
│   └── (Mirror of Arabic screens)
│
└── 🖥️ Admin Portal (Web)
    ├── Dashboard
    ├── Approval queues
    └── Analytics
```

---

## 12. Design Deliverables Checklist (Before Sprint 1)

Minimum required before coding begins:

- [ ] Color tokens defined in Flutter `ThemeData` (done — see Section 8)
- [ ] Font files downloaded and added to `assets/fonts/` 
- [ ] `AppTheme.lightTheme()` implemented and applied to `MaterialApp`
- [ ] Tailwind config with all color/font tokens (done — see Section 9)
- [ ] App icon source file (1024×1024 PNG) ready — hand to designer
- [ ] Splash screen configured

Nice to have before Sprint 3 (Yacht Listings):
- [ ] `YachtCard` component designed in Figma
- [ ] Search bar + filter chips designed
- [ ] Booking flow screens (Steps 1–4) designed in Figma

**The code can start without Figma files.** Sprint 1 is backend setup + scaffolding. Designs are needed from Sprint 3 onward (first user-facing screens).

---

**Last Updated:** April 6, 2026
**Owner:** Technical Lead + Designer
**Designer needed:** Yes — hire/contract a UI designer before Sprint 3
