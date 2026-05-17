# Sprint 14 — Search & Discovery, pgvector Semantic Search, Performance & SEO

**Sprint:** 14
**Date:** TBD
**Theme:** Make discovery excellent — semantic search, SEO metadata, sitemap, performance audit, and image optimisation.

---

## Pre-Sprint State

Sprints 1–13 complete. Key gaps entering Sprint 14:
- Search page exists but only calls text search on yachts — no semantic/vector search
- pgvector is installed (ADR-019) and `Yacht.embedding` field exists — but embedding generation and query are not wired to the search page
- No sitemap.xml or robots.txt
- No OpenGraph images for yacht detail pages
- No structured data (JSON-LD) for SEO
- LCP / CLS metrics not measured — no performance baseline

---

## Goals

1. **14A — Semantic search** — Wire pgvector similarity search to `GET /api/v1/yachts/?search=` and `GET /api/v1/marketplace/products/?search=`
2. **14B — SEO metadata** — `generateMetadata` + OpenGraph images + JSON-LD structured data on all public pages
3. **14C — Sitemap + robots** — `sitemap.xml` and `robots.txt` in Next.js app
4. **14D — Image optimisation** — Replace all `<img>` with Next.js `<Image>` component; add blur placeholders
5. **14E — Performance audit** — Lighthouse audit, fix LCP > 2.5s and CLS > 0.1 issues
6. **14F — Search page enhancement** — Combine text + vector results, add category/region facets

---

## Task Assignments

| Task | Agent | Priority |
|------|-------|----------|
| 14A — Semantic search backend | api-endpoint-agent | HIGH |
| 14B — SEO metadata | nextjs-page-agent | HIGH |
| 14C — Sitemap + robots | nextjs-page-agent | MEDIUM |
| 14D — Image optimisation | nextjs-page-agent | MEDIUM |
| 14E — Performance audit + fix | qa-automation-specialist | MEDIUM |
| 14F — Search page enhancement | nextjs-page-agent | HIGH |

---

## Sprint 14A — Semantic Search

### Backend — Yacht Embeddings
**File:** `backend/apps/bookings/tasks.py`
`generate_yacht_embedding` Celery task already exists (check implementation).
If it only calls Ollama `nomic-embed-text` but doesn't store the result in `Yacht.embedding`, fix it.

**Modify:** `GET /api/v1/yachts/` — if `?search=` param present:
1. Generate query embedding via Ollama (or OpenAI in UAT): `POST http://ollama:11434/api/embeddings`
2. Order results by cosine similarity: `Yacht.objects.order_by(CosineDistance('embedding', query_vec))`
3. Fall back to text search (`icontains` on name/description) if Ollama unavailable

**Modify:** `GET /api/v1/marketplace/products/` — same pattern for products (check if `Product.embedding` field exists; add if not)

### Backend — Product Embeddings
Add `embedding = VectorField(dimensions=768, null=True)` to `Product` model if missing.
Add `generate_product_embedding` Celery task (mirrors yacht embedding task).
Trigger on product create/update.

---

## Sprint 14B — SEO Metadata

**For each public page, add or improve `generateMetadata()`:**

| Page | Title (AR/EN) | Description | OG Image |
|------|--------------|-------------|----------|
| `/yachts` | القوارب المتاحة | Browse yachts in Egypt | Static banner |
| `/yachts/[id]` | {yacht.name_ar} | {yacht.description_ar[:160]} | yacht primary image |
| `/marketplace` | سوق معدات الصيد | Fishing gear marketplace | Static banner |
| `/competitions` | بطولات الصيد | Egypt fishing competitions | Static banner |
| `/weather` | النشرة البحرية | Marine weather advisory | Static banner |
| `/fishing-guide` | دليل الصيد | Egypt fishing season guide | Static banner |

**JSON-LD structured data** for yacht detail pages:
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Al Bahr Al Ahmar",
  "description": "...",
  "offers": {"@type": "Offer", "price": "3800", "priceCurrency": "EGP"}
}
```

---

## Sprint 14C — Sitemap + Robots

**Files to create:**
- `web/app/sitemap.ts` — Next.js 14 sitemap generator
  - Static routes: `/ar/yachts`, `/en/yachts`, `/ar/marketplace`, `/en/marketplace`, etc.
  - Dynamic routes: fetch all active yacht IDs → `/ar/yachts/{id}`, `/en/yachts/{id}`
  - Fetch all competition IDs → `/ar/competitions/{id}`, `/en/competitions/{id}`
- `web/app/robots.ts` — Disallow `/owner/`, `/vendor/`, `/admin/`, Allow everything else

---

## Sprint 14D — Image Optimisation

**Audit:** Find all `<img>` tags in Next.js components — replace with `next/image` `<Image>` component.

Key pages to fix:
- `BoatCard.tsx` — yacht thumbnail
- `yachts/[id]/page.tsx` — gallery images
- `marketplace/page.tsx` — product thumbnails
- All `design-conversion` pages that used bare `<img>`

Add `blurDataURL` placeholder for above-the-fold images.
Set explicit `width` + `height` on all `<Image>` components to prevent CLS.

---

## Sprint 14E — Performance Audit

**Run Lighthouse** against `http://localhost:3010/ar/yachts` and `http://localhost:3010/ar/` using Playwright:
```bash
cd e2e && npx playwright test tests/12-performance.spec.ts
```

Create `e2e/tests/12-performance.spec.ts`:
- Navigate to home, yachts, yacht detail
- Assert LCP < 2500ms
- Assert CLS < 0.1
- Screenshot at fully loaded state

Fix the top 3 issues found (likely: large hero image, render-blocking fonts, missing width/height on images).

---

## Sprint 14F — Search Page Enhancement

**File:** `web/app/[locale]/(public)/search/page.tsx`

Current: text search on yachts only.

Enhance to:
- Tab switcher: Yachts / Gear / Ports (all tabs functional)
- Gear tab calls `GET /api/v1/marketplace/products/?search={q}`
- Region facet filter: Hurghada / Alexandria / Sharm / Luxor / Dahab
- Sort: relevance / price low-high / price high-low / newest
- "Did you mean?" suggestion when zero results (use top pgvector match)
- Pagination / infinite scroll (cursor-based)

---

## Definition of Done

- [ ] `?search=` on yachts API uses pgvector cosine similarity with Ollama fallback to text
- [ ] All public pages have complete `generateMetadata()` with OG image and description
- [ ] Yacht detail page has JSON-LD structured data
- [ ] `sitemap.xml` generates dynamically with all yacht + competition URLs
- [ ] `robots.txt` disallows owner/vendor/admin routes
- [ ] All `<img>` replaced with Next.js `<Image>` component
- [ ] Lighthouse LCP < 2.5s, CLS < 0.1 on home and yachts pages
- [ ] Search page has Yachts + Gear tabs, region facet, sort
- [ ] `npx tsc --noEmit` — 0 errors
