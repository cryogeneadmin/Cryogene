# Performance Audit — Cryogene Storefront, 2026-05-02

Reviewer: Performance Benchmarker subagent · Stack: Next.js 16 (Turbopack) + React 19 + Tailwind v4 + Firebase admin SDK + Vercel Hobby (default `iad1`) · Production data: Firestore `europe-west2`.

## CRITICAL

### C1. Unoptimized PNG product photography — 71 MB across 124 files
`public/products/` averages ~580KB/file. Largest: `selank--10mg.png` 798KB, `tirzepatide--30mg.png` 786KB, `cjc-1295-ipamorelin-blend--10mg.png` 773KB. `next/image` re-encodes on first hit, but listing page hits ~30+ thumbs. First visit to `/peptides` triggers 47 Sharp transforms against 580KB sources.

**Fix**: re-encode PNGs to ≤200KB target ~80KB at 800×800 WebP/AVIF. Keep PNG fallback. Expected: 65MB → 12MB; LCP improvement 1.5–3s.

### C2. Hero PNGs 600KB–1.4MB
`homepage-hero.png` 642KB, `peptides-hero.png` 845KB, `mixers-hero.png` 808KB, `supplies-hero.png` 1.16MB, `about-lab.png` 1.14MB, `no-results.png` 1.37MB, `empty-basket.png` 712KB. LCP candidates on every category page.

**Fix**: pre-encode hero set to AVIF at max 1280px, target 60–90KB. `no-results.png` should be 5KB SVG.

### C3. Cross-region Firestore — 80–100ms per round-trip, no caching
Firestore `europe-west2`, Lambda `iad1`. Every dynamic page pays Virginia↔London round-trip. None of `getProducts`/`getProductBySlug`/`getConfig` is cached.

| Route | Firestore calls | Min latency floor |
|---|---|---|
| `/` (home) | 3 | 240–300ms |
| `/peptides` | 2 (incl. Navbar `getConfig`) | 160–200ms |
| `/peptides/[slug]` | 3 | 240–300ms |
| `/checkout/review` | 2 | 160–200ms |

**Fix priority**:
1. `'use cache'` + `cacheTag('products' | 'config')`, `revalidateTag` from admin actions.
2. Static-generate product detail pages (`generateStaticParams` already in place; add `export const revalidate = 3600`).
3. Move Vercel functions to `lhr1` via `vercel.json` `"regions": ["lhr1"]` — single config, ~80ms saved per uncached read.

## HIGH

### H1. Homepage fetches active catalogue twice
`app/(public)/page.tsx:10` calls `getFeaturedProducts(6)` (which internally `getProducts({activeOnly:true})`); line 15 calls `getProducts({activeOnly:true})` again. Two identical Firestore queries sequentially. Fix: fetch once, derive both.

### H2. `getFeaturedProducts` sorts in memory
`lib/products.ts:103-115` reads every active product just to take the 6 most recent. Replace with `query.orderBy('createdAt','desc').limit(limit)`.

### H3. `getAllProductSlugs` reads full docs to project one field
`lib/products.ts:117-120`. Use `db.collection('products').select('slug').where(...)` for ~95% wire reduction. Currently build-time only.

### H4. `getProductBySlug` uses `where(slug==).limit(1)`
`lib/products.ts:94-98`. Direct `db.collection('products').doc(slug).get()` is one keyed lookup. Requires migrating doc IDs in seed (one-time). Saves 5–15ms; unblocks cleaner caching.

### H5. Composite-index gap for `where(active==true) + where(category==x)`
`lib/products.ts:74-79`. `firestore.indexes.json` only declares orders. Production works because Firestore auto-builds via error-thrown URL. Redeployment to new env will FAILED_PRECONDITION. Add to indexes JSON.

### H6. `Navbar` `getConfig()` runs every render
`components/storefront/layout/Navbar.tsx:20`. Per-route layout cost. Either `'use cache'` with forever cache + invalidate from admin, or hard-code brand name.

### H7. First-fold ProductCards lack `priority`
`ProductImageShell` doesn't set `priority`. First 3–6 cards on `/peptides` are above fold. Add `priority` for `index < 3`.

## MEDIUM

- M1. Font weight bloat — Playfair (10 faces) + Inter (4) + JetBrains Mono (3) = 17 font files. Trim to actually-used weights, save 200–400KB.
- M2. `react-markdown` + `remark-gfm` — used only in `LegalPage`. Confirm doesn't leak to client bundle.
- M3. Per-render Timestamp normalization adds 94 instanceof checks per home render — sub-millisecond, won't matter once cached.
- M4. Missing `revalidate` on listing pages. Add `export const revalidate = 300;` per category, `revalidateTag('products')` in admin write.
- M5. `create-order` does N sequential `getProductBySlug` calls. 5-item basket = 400–500ms. Use `Promise.all` or `where('slug','in',slugs)`.
- M6. `ProductDetail` related-products fetches entire active catalogue. Free with cache; otherwise add `relatedSlugs` field + `where(__name__,'in',...)`.

## LOW

- L1. `lucide-react ^1.8.0` — verify tree-shake to per-icon imports.
- L2. `qrcode` in dev only — fine.
- L3. `replicate` runtime dep — move to dev if scripts only.

## Strengths

- Admin SDK singleton correctly cached (`lib/firebase/admin.ts:12-44`).
- Server Components default; only 19 Client Components (genuinely interactive).
- No `force-dynamic` poisoning.
- `generateStaticParams` in place on all `[slug]` routes.
- `revalidatePath` correctly fires from admin product mutation.
- `next/image` everywhere with `sizes`; `priority` on hero.
- Firestore data layer thin — caching can be added in 2 files.
- Build 94 routes in 55s with Turbopack.

## Quantitative

| Metric | Current | After C1+C2+C3+H1+H2 | Mechanism |
|---|---|---|---|
| Cold home (Vercel) | 3.6s | ~1.1s | Cache + dedup + smaller HTML |
| Warm home | 0.36–1.4s | ~120–200ms | Cache hit |
| `/peptides` weight | 335KB | ~150–180KB | Smaller card payload |
| LCP image | hero 640KB+transform | ~80KB AVIF edge | Pre-encoded |
| `/products` static | 71MB | ~12–14MB | AVIF/WebP cap |
| Firestore reads/home | 3 | 0 cache hit / 2 cache miss | `'use cache'` |
| Checkout submit | ~500ms lookups | ~100ms | Promise.all / `where in` |

## Cryogene-specific

Low-volume high-intent traffic; every visit cold. Three orthogonal fixes ranked:

1. **Cache aggressively at framework layer** (`'use cache'` + tags + `revalidateTag` in admin actions) — 95% renders hit zero Firestore.
2. **Co-locate Lambda with Firestore** — Vercel `regions: ["lhr1"]`. Removes 80ms transatlantic floor + admin SDK warmup variance.
3. **Skip cold-start for product pages** — `generateStaticParams` + `export const revalidate = 3600` (or `false` with `revalidateTag` on writes). Edge static HTML, no Lambda, no SDK init. ~80 product HTMLs well within Hobby limits.

Pre-warming cron is wrong answer — costs invocation budget, only fixes just-warmed pages.
