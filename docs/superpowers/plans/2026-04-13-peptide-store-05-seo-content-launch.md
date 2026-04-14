# Peptide Store — Plan 5: SEO, Content, Launch Prep

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Phase 1 Stage 1a by adding full SEO + LLMO infrastructure (metadata helpers, three JSON-LD blocks, native sitemap, robots with AI bot allowlist, `llms.txt` endpoint), drafting all content (10 product descriptions, About, Product Information, Research Use Only, six legal pages), writing Firestore + Storage security rules, wiring the navbar/footer to read live store config, and producing the handover documentation Sam will use at Stage 1b onboarding.

**Architecture:** Metadata and JSON-LD helpers in `lib/seo.ts`. Sitemap and robots as native Next.js routes. `llms.txt` as a dynamic route generated from the products data layer. Content drafts in `content/drafts/` and `content/legal/` (replacing placeholders from Plan 2). Security rules in `firestore.rules` and `storage.rules`, pushed via Firebase CLI at Stage 1b.

**Tech Stack:** Next.js 16 native metadata APIs, schema.org JSON-LD, Firebase CLI for security rules.

**Spec reference:** `docs/superpowers/specs/2026-04-13-peptide-store-phase1-design.md` Sections 11, 13, 14, 18.

**Delivers at end of plan:** Phase 1 Stage 1a is complete. Every page has proper metadata. Product detail pages emit three JSON-LD blocks. Sitemap and robots.txt generated. `llms.txt` served dynamically. All content drafted and reviewable by Sam and his solicitor. Security rules committed and ready to push. Handover checklist, admin guide, and content guide written. The site is fully demoable end-to-end and ready for Stage 1b client onboarding.

**Testing strategy:** Final Stage 1a smoke test runs every critical path, checks every content drafting deliverable, validates metadata with `view-source:` inspection, validates JSON-LD with Google's Rich Results Test pattern.

**Assumed handoffs from Plan 4:**
- Admin UI fully functional with `config/main` editable from Settings
- All data-layer functions working against seed-mode
- Orders, enquiries, products writable via admin UI
- `lib/config.ts` with `getConfig`

---

## Review notes from Plan 4

> **Populated by Opus during the end-of-Plan-4 review (2026-04-14).** Reviewed against the running dev server on `localhost:3001` with `ADMIN_DEV_BYPASS=1`, via curl and direct file inspection. Every admin route walked.

**Status:** ✅ **APPROVED** — Plan 4 execution is structurally sound. The products overlay fix is the only hard gate between Plan 4 and Plan 5 and it passed end-to-end. All six admin server actions have `isAdminRequest()` guards, the auth bypass has a `NODE_ENV !== "production"` hard-guard, and every admin route renders 200 with correct data. Plan 5 can proceed. Two drift items below require Plan 5 scope adjustments; one is a pre-existing Plan 1/Plan 3 inconsistency that Plan 4 correctly left alone and which Plan 5 should clean up before wiring SEO.

**Git log range:** Plan 4 commits `38be957..2b4df0a` (8 tasks + 8 review-fix commits — every task underwent spec compliance review then code quality review, with fixes applied between).

---

### ✅ Verified working

- **Products overlay fix (the critical gate).** Wrote a modified `seed-bpc-157` record to `data/products.local.json` with two sentinel strings (`OVERLAY REVIEW SENTINEL` appended to name, `OPUS-OVERLAY-PROOF-STRING-7X9K2` as shortDescription). Curled `/peptides/bpc-157`, `/peptides`, `/admin/products`, and `/admin/products/seed-bpc-157` — all four returned HTML containing both sentinel strings. Removed the overlay file, curled `/peptides/bpc-157` again — only `BPC 157` visible, sentinels gone. The `mergedSeed()` function in `lib/products.ts` lines 35–41 correctly merges by `id` with overlay-wins semantics, and the `fs.readFile` in `readLocalOverlay` is not memoised so each request gets a fresh read. Dev server picks up changes on the next request with no restart needed.
- **All 7 admin routes return 200:** `/admin`, `/admin/products`, `/admin/orders`, `/admin/enquiries`, `/admin/customers`, `/admin/settings`, `/admin/products/new`. Dashboard shows all 4 stat cards (`Open orders`, `Low stock alerts`, `New enquiries`, `Revenue (last 10 orders)`) and the test order `PPT-20260414-0001` in the Recent Orders table.
- **Admin order detail end-to-end.** `/admin/orders/local-smoke-test-001` renders the order number (`PPT-20260414-0001`), customer name (`Jane Smith`), SKU (`BPC-157`), items subtotal (`£99.98`), and total (`£103.93`) — confirming the itemsSubtotal 9998p + shipping 395p = 10393p math, the `coerceToDate` helper on `paidAt`, and the `notFound()` guard on the `params.id` validation in `app/(admin)/admin/orders/[id]/page.tsx`.
- **Settings page defaults.** `/admin/settings` renders `Cryogene` as the default `storeName` and `[ADDRESS TBC]` as the default `registeredAddress`, both sourced from `DEFAULT_CONFIG` in `lib/config.ts`. All four sections render (Store identity, VAT, Shipping, Notifications).
- **All 6 admin server actions have `isAdminRequest()` as the first line:** `saveProduct`, `toggleProductActive`, `setOrderStatus`, `addAdminNote`, `setEnquiryStatusAction`, `saveConfig`. Grep-verified at the listed line numbers; every admin write path is gated against direct-POST attacks regardless of the layout guard. User-facing actions (`checkout`, `contact`, `create-order`, `age-gate`, `cookie-consent`) correctly do NOT have this guard.
- **Auth bypass hard-guarded against production.** `lib/admin-auth.ts` lines 9–12 require BOTH `process.env.NODE_ENV !== "production"` AND `process.env.ADMIN_DEV_BYPASS === "1"`. On Vercel `NODE_ENV` is always `"production"` regardless of which environment is configured, so the bypass is structurally impossible to enable on any deployed build. Verified by inspection — a runtime toggle test would require a dev-server restart and is unnecessary given the correctness of the check.
- **Local write gitignore.** `.gitignore` contains all six `data/*.local.json` paths: `orders`, `customers`, `enquiries`, `counters`, `config`, `products`. Sonnet added `products.local.json` during Task 8 after catching its absence — confirmed no local writes are being tracked by git.
- **TypeScript + build:** `npx tsc --noEmit` passes with zero errors at commit `2b4df0a`. Clean working tree after overlay cleanup.

### Actual config document shape

Runtime shape of `Config` in seed mode (read from `DEFAULT_CONFIG` in `lib/config.ts`):

```ts
{
  storeName: "Cryogene",
  storeEmail: "hello@cryogene.co.uk",  // see lib/config.ts for current default
  storePhone: null,
  registeredAddress: "[ADDRESS TBC]",
  companyNumber: null,
  vatNumber: null,
  vat: {
    registered: false,
    rate: 0.20,
    displayPricesInclusive: false,
  },
  shipping: {
    flatRateInPence: 395,
    freeThresholdInPence: null,
    estimatedDispatch: "…",  // see current default
  },
  notifications: {
    newOrderEmailTo: "…",
  },
  updatedAt: Date,
}
```

**Settings save runtime path NOT exercised during review.** The `SettingsForm` uses `useTransition` + `saveConfig` server action, which in turn calls `updateConfig` → writes `data/config.local.json` in seed mode. The write path is correct by inspection (Zod-validated, `isAdminRequest` gated, `revalidatePath("/", "layout")` called), but no `data/config.local.json` exists on disk because no admin has clicked Save yet. Plan 5 Task 8 (final smoke test) should perform one settings save through the UI and capture the exact `config.local.json` JSON shape at that point, confirming field-level fidelity against `DEFAULT_CONFIG`.

### Drift from plan

1. **`useSeed()` idiom inconsistency across data layer.** Two different checks are in use:
   - **Products layer** (`lib/products.ts` + `app/actions/products.ts`): `!projectId || projectId === "REPLACE_ME"` — env-var string check.
   - **Orders/enquiries/customers/config layers**: `getAdminDb() === null` — SDK presence check. `getAdminDb()` delegates to `isAdminConfigured()` in `lib/firebase/admin.ts`, which requires **all three** of `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` to be set and `PROJECT_ID !== "REPLACE_ME"`.

   These are equivalent only when all three env vars are set together. If a partial config exists (e.g. `FIREBASE_PROJECT_ID` set but credentials missing), products would attempt Firestore reads while orders would correctly stay in seed mode. This is a pre-existing Plan 1 drift that Plan 4 correctly did not touch. **Fix in Plan 5:** extract a shared `useSeed()` helper — e.g. `lib/data-mode.ts` exporting `isSeedMode()` — that delegates to `!isFirebaseAdminReady()` (already exported from `lib/firebase/admin.ts`) and have all data-layer files import from it. Flag this as an early task in Plan 5 before the sitemap/llms.txt routes land, since those new routes will want to reuse the same guard.

2. **`data/orders.local.json` has ONE fabricated smoke-test order, not a real checkout flow.** Sonnet's Task 8 wrote a correctly-typed order record directly to the JSON file because the canonical checkout walkthrough cannot be performed while all variants have `priceInPence: 0` (Pricing TBC). The order shape is correct and Plan 4's admin list/detail views render it correctly — but the end-to-end "user clicks Pay → order appears in admin" path has never been walked. **Combined with the Plan 3 launch-time gate below**, this is a single blocker: once Sam provides pricing, a real guest-checkout walk MUST be performed before cutover.

3. **Products edit → storefront overlay path now proven end-to-end BUT only via direct file write, not via the admin UI Save button.** The full path (admin form → `saveProduct` action → `revalidatePath` → page re-render) depends on (a) the admin UI producing a valid Product object, (b) the server action writing to disk, and (c) `revalidatePath` flushing the cache. I verified (c) by direct write + curl, which is sufficient to prove the overlay merge and cache invalidation work — but the admin UI's form serialization (specifically the `_key`-strip step before `saveProduct`) is only verified by code inspection, not runtime. Plan 5 Task 8 smoke test must click through one product edit in the browser and confirm the change appears on the public page.

### Adjustments to Plan 5 tasks

**Adjustment A — Add `lib/data-mode.ts` helper at the start of Plan 5.** Before Plan 5 writes the sitemap route (`app/sitemap.ts`) or the `llms.txt` dynamic route, create `lib/data-mode.ts`:

```typescript
// lib/data-mode.ts
import "server-only";
import { isFirebaseAdminReady } from "@/lib/firebase/admin";

export function isSeedMode(): boolean {
  return !isFirebaseAdminReady();
}
```

Then in a follow-up step, refactor all six data-layer files (`lib/products.ts`, `lib/orders.ts`, `lib/customers.ts`, `lib/enquiries.ts`, `lib/config.ts`, `app/actions/products.ts`) to import `isSeedMode()` and remove their private `useSeed()` helpers. This is a mechanical refactor, ~20 lines touched, one commit. Land it as the first task in Plan 5 so the new SEO routes have a single source of truth.

**Adjustment B — Plan 5 Task 8 final smoke test must perform a real product edit through the admin UI.** The existing Task 8 outline in Plan 5 (Stage 1a end-to-end) should explicitly include:

1. Open `/admin/products/seed-bpc-157` in a real browser
2. Change the `shortDescription` to something visually distinctive
3. Click Save
4. Verify the redirect to `/admin/products` fires
5. Navigate to `/peptides/bpc-157` in an incognito tab
6. Confirm the new description renders
7. Delete `data/products.local.json` to restore the seed-only state (or commit the edit to `products.local.json` if the edit is wanted as a content draft)

Add this to whatever Plan 5 task covers the Stage 1a final smoke test, before the SEO validation steps.

**Adjustment C — Plan 5 Task 8 should also perform one real Settings Save.** The runtime shape of `data/config.local.json` has never been captured. When Plan 5 runs the final smoke test, change the `storeName` (back to something non-Cryogene and back again), click Save, `cat data/config.local.json`, and paste the exact shape into Plan 5's Task 8 verification notes as evidence. This is the first time the config write path will run end-to-end.

### Content drafting constraints discovered in Plan 4

None. Plan 4 was UI-only and introduced no new content-shape requirements. The existing Plan 5 scope for product descriptions, About, Research Use Only, and the six legal pages is unchanged. **Note the field naming for SEO:** `seoTitle` and `seoDescription` on `Product` are **nullable string overrides** — when null, Plan 5's metadata helper should fall back to `product.name` and `product.shortDescription` respectively. The `ProductForm` already emits `null` (not empty string) via `e.target.value || null` — Plan 5's `lib/seo.ts` metadata builder must handle that null correctly.

### Launch-time gate (carried over from Plan 3, unchanged)

**Real end-to-end smoke test still cannot be performed until Sam provides pricing.** Every variant has `priceInPence: 0`, which triggers the "Pricing TBC" guard in `lib/basket.ts` and blocks any item from entering the basket. Sonnet worked around this during Plan 4 Task 8 by writing a fabricated order directly to `orders.local.json` — that proves the admin read path but not the checkout write path. **Before production cutover:** after the pricing bulk-update (admin action or seed edit), run the full Plan 3 Task 14 guest checkout in a fresh incognito browser, then walk the Plan 5 Task 8 admin-edit-reflects-on-storefront path above. Add both to Plan 5's pre-launch checklist as hard gates.

---

**Handoffs to Stage 1b (client infrastructure onboarding):**
- `firestore.rules` and `storage.rules` committed and ready to push via Firebase CLI
- `scripts/seed-firestore.ts` to push `data/products.seed.json` into real Firestore
- `scripts/set-admin-claim.ts` to grant Sam admin access
- `docs/handover/deployment-checklist.md` written as a Sam-voice step-by-step
- All content drafted and ready for solicitor review

---

## Task 1: Create SEO utilities library

**Files:**
- Create: `lib/seo.ts`

- [ ] **Step 1: Write metadata and JSON-LD builders**

```typescript
// lib/seo.ts
import type { Product, Config } from "@/types";

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://peptidestore.co.uk";
}

export function getStoreName(config: Config | null): string {
  return config?.storeName || process.env.NEXT_PUBLIC_SITE_NAME || "[PEPTIDE STORE]";
}

export function buildProductJsonLd(
  product: Product,
  config: Config | null
): object {
  const siteUrl = getSiteUrl();
  const storeName = getStoreName(config);
  const lowestPrice = Math.min(...product.variants.map((v) => v.priceInPence));
  const inStock = product.variants.some((v) => v.active && v.stock > 0);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription,
    image: product.images.map((img) =>
      img.startsWith("http") ? img : `${siteUrl}${img}`
    ),
    sku: product.variants[0]?.sku,
    brand: { "@type": "Brand", name: storeName },
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/${product.category}/${product.slug}`,
      priceCurrency: "GBP",
      price: (lowestPrice / 100).toFixed(2),
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: storeName },
    },
    additionalProperty: [
      { "@type": "PropertyValue", name: "CAS Number", value: product.casNumber },
      { "@type": "PropertyValue", name: "Molecular Formula", value: product.molecularFormula },
      { "@type": "PropertyValue", name: "Molecular Weight", value: product.molecularWeight },
      { "@type": "PropertyValue", name: "Purity", value: product.purity },
      { "@type": "PropertyValue", name: "Testing Method", value: product.testingMethod },
      { "@type": "PropertyValue", name: "Intended Use", value: "Laboratory research only" },
    ],
  };
}

export function buildFaqJsonLd(
  items: Array<{ question: string; answer: string }>
): object | null {
  if (items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function buildBreadcrumbJsonLd(
  crumbs: Array<{ name: string; url: string }>
): object {
  const siteUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: crumb.name,
      item: crumb.url.startsWith("http") ? crumb.url : `${siteUrl}${crumb.url}`,
    })),
  };
}

export function buildOrganizationJsonLd(config: Config | null): object {
  const siteUrl = getSiteUrl();
  const storeName = getStoreName(config);
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: storeName,
    url: siteUrl,
    email: config?.storeEmail,
    address: config?.registeredAddress
      ? {
          "@type": "PostalAddress",
          streetAddress: config.registeredAddress,
          addressCountry: "GB",
        }
      : undefined,
  };
}

export function renderJsonLd(data: object): string {
  return JSON.stringify(data, null, 0);
}
```

- [ ] **Step 2: Commit**

```bash
npx tsc --noEmit
git add -A
git commit -m "feat: add SEO utility library with JSON-LD builders"
```

---

## Task 2: Wire JSON-LD into product detail pages

**Files:**
- Modify: `components/storefront/products/ProductDetail.tsx`

- [ ] **Step 1: Import SEO helpers and emit JSON-LD blocks**

Open `components/storefront/products/ProductDetail.tsx`. Add imports at the top:

```tsx
import { getConfig } from "@/lib/config";
import {
  buildProductJsonLd,
  buildFaqJsonLd,
  buildBreadcrumbJsonLd,
  renderJsonLd,
} from "@/lib/seo";
```

Inside `ProductDetail`, after the `related` fetch, add:

```tsx
const config = await getConfig();
const productJsonLd = buildProductJsonLd(product, config);
const faqJsonLd = buildFaqJsonLd(product.faq);
const breadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: "Home", url: "/" },
  { name: categoryLabel, url: `/${product.category}` },
  { name: product.name, url: `/${product.category}/${product.slug}` },
]);
```

At the top of the returned JSX (inside the root `<div>`), add:

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: renderJsonLd(productJsonLd) }}
/>
{faqJsonLd && (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: renderJsonLd(faqJsonLd) }}
  />
)}
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: renderJsonLd(breadcrumbJsonLd) }}
/>
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Validate JSON-LD manually**

```bash
npm run dev
```

Open a product detail page. Right-click → View Source. Verify three `<script type="application/ld+json">` blocks with the correct content.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: emit three JSON-LD blocks on product detail pages"
```

---

## Task 3: Wire Organization JSON-LD into homepage

**Files:**
- Modify: `app/(public)/page.tsx`

- [ ] **Step 1: Add Organization JSON-LD to homepage**

Open `app/(public)/page.tsx`. Add imports:

```tsx
import { getConfig } from "@/lib/config";
import { buildOrganizationJsonLd, renderJsonLd } from "@/lib/seo";
```

Inside `HomePage`, after `const featured = ...`:

```tsx
const config = await getConfig();
const orgJsonLd = buildOrganizationJsonLd(config);
```

At the top of the returned JSX (inside the root `<div>`):

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: renderJsonLd(orgJsonLd) }}
/>
```

- [ ] **Step 2: Verify and commit**

```bash
npm run build
git add -A
git commit -m "feat: emit Organization JSON-LD on homepage"
```

---

## Task 4: Create native sitemap

**Files:**
- Create: `app/sitemap.ts`

- [ ] **Step 1: Write the sitemap generator**

```typescript
// app/sitemap.ts
import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/products";
import { getSiteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const products = await getProducts({ activeOnly: true });

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, priority: 1.0, changeFrequency: "weekly" },
    { url: `${baseUrl}/peptides`, priority: 0.9, changeFrequency: "weekly" },
    { url: `${baseUrl}/capsules`, priority: 0.9, changeFrequency: "weekly" },
    { url: `${baseUrl}/mixers`, priority: 0.9, changeFrequency: "weekly" },
    { url: `${baseUrl}/about`, priority: 0.7, changeFrequency: "monthly" },
    { url: `${baseUrl}/product-information`, priority: 0.8, changeFrequency: "monthly" },
    { url: `${baseUrl}/contact`, priority: 0.6, changeFrequency: "monthly" },
    { url: `${baseUrl}/sign-in`, priority: 0.3 },
    { url: `${baseUrl}/sign-up`, priority: 0.3 },
  ];

  const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${baseUrl}/${p.category}/${p.slug}`,
    lastModified: new Date(p.updatedAt as string),
    priority: 0.8,
    changeFrequency: "weekly" as const,
  }));

  const legalPaths = [
    "/legal/terms",
    "/legal/privacy",
    "/legal/cookies",
    "/legal/refunds",
    "/legal/shipping",
    "/legal/research-use",
  ];
  const legalEntries: MetadataRoute.Sitemap = legalPaths.map((p) => ({
    url: `${baseUrl}${p}`,
    priority: 0.3,
    changeFrequency: "monthly" as const,
  }));

  return [...staticEntries, ...productEntries, ...legalEntries];
}
```

- [ ] **Step 2: Verify build and visit /sitemap.xml**

```bash
npm run build
npm run dev
```

Open `http://localhost:3000/sitemap.xml` — expected: valid XML with all routes listed.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add native sitemap with product, category, and legal routes"
```

---

## Task 5: Create native robots.txt with AI crawler allowlist

**Files:**
- Create: `app/robots.ts`

- [ ] **Step 1: Write the robots generator**

```typescript
// app/robots.ts
import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/basket", "/checkout", "/admin", "/api", "/account"],
      },
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
```

- [ ] **Step 2: Verify at /robots.txt**

```bash
npm run dev
```

Visit `http://localhost:3000/robots.txt`. Expected: valid robots output with AI crawlers explicitly allowed.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add native robots.txt with AI crawler allowlist"
```

---

## Task 6: Create llms.txt dynamic endpoint

**Files:**
- Create: `app/llms.txt/route.ts`

- [ ] **Step 1: Write the llms.txt route**

```typescript
// app/llms.txt/route.ts
import { getProducts } from "@/lib/products";
import { getConfig } from "@/lib/config";
import { getSiteUrl } from "@/lib/seo";

export async function GET() {
  const [products, config] = await Promise.all([
    getProducts({ activeOnly: true }),
    getConfig(),
  ]);
  const baseUrl = getSiteUrl();
  const storeName = config.storeName;

  const peptides = products.filter((p) => p.category === "peptides");
  const capsules = products.filter((p) => p.category === "capsules");
  const mixers = products.filter((p) => p.category === "mixers");

  const formatProduct = (p: typeof products[number]) => {
    const sizes = p.variants.map((v) => v.size).join(", ");
    return `- [${p.name}](${baseUrl}/${p.category}/${p.slug}): Research ${p.category.slice(0, -1)} — CAS ${p.casNumber}, ${p.molecularFormula}, ${p.molecularWeight}. Available in ${sizes}.`;
  };

  const body = `# ${storeName}

> Research-grade peptides, capsules, and mixers supplied to UK laboratories.
> Every product HPLC-tested with a downloadable Certificate of Analysis.
> Sold strictly for laboratory research use only — not for human or veterinary consumption.

## About

- [About Us](${baseUrl}/about): Our approach to research supply and quality assurance
- [Product Information & Labelling](${baseUrl}/product-information): Standards, testing, and how to read our documentation
- [Research Use Only Statement](${baseUrl}/legal/research-use): Our legal position and commitments

## Research Peptides

${peptides.map(formatProduct).join("\n")}

## Research Capsules

${capsules.map(formatProduct).join("\n")}

## Mixers and Solvents

${mixers.map(formatProduct).join("\n")}

## Legal and Compliance

- [Terms and Conditions](${baseUrl}/legal/terms)
- [Privacy Policy](${baseUrl}/legal/privacy)
- [Refund and Returns Policy](${baseUrl}/legal/refunds)
- [Shipping Policy](${baseUrl}/legal/shipping)
- [Cookie Policy](${baseUrl}/legal/cookies)
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
```

- [ ] **Step 2: Verify**

```bash
npm run dev
```

Visit `http://localhost:3000/llms.txt` — expected: plain-text Markdown with every product listed.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add dynamic llms.txt endpoint for AI search crawlers"
```

---

## Task 7: Draft About, Product Information, Research Use content

**Files:**
- Modify: `app/(public)/about/page.tsx` (replace draft content)
- Modify: `app/(public)/product-information/page.tsx` (replace draft content)
- Modify: `content/legal/research-use.md` (replace placeholder)

- [ ] **Step 1: Draft the About page**

Replace the body of `app/(public)/about/page.tsx` with the drafted content. The full drafted content for the About page is ~500 words organised in sections: introduction, approach, testing process, commitment to research use. All text must be scientifically factual, compliance-aware, in third-person tone, and contain no therapeutic claims or dosage guidance.

Example opening section (adapt remaining sections in the same voice):

```tsx
export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <p className="label-editorial mb-4">About</p>
      <h1 className="text-5xl mb-10 leading-tight">Research supply, done carefully.</h1>

      <div className="prose prose-lg max-w-none text-[#333333] leading-relaxed space-y-6">
        <p className="text-xl">
          [DRAFT — REVIEW AND ADAPT] We supply research-grade peptides, capsules,
          and laboratory mixers to researchers across the United Kingdom. Every
          product we sell is supplied exclusively for controlled laboratory
          research, accompanied by a Certificate of Analysis, and backed by a
          transparent approach to sourcing and testing.
        </p>

        <h2 className="text-3xl mt-12">Our approach</h2>
        <p>
          [DRAFT — REVIEW AND ADAPT] We work with compounds that appear in
          current research literature, source them from manufacturers we have
          vetted for documentation and process quality, and independently verify
          purity before any batch is released for sale. We publish the
          Certificate of Analysis for every variant on its product page so that
          researchers can review the data before they order.
        </p>

        <h2 className="text-3xl mt-12">Our testing process</h2>
        <p>
          [DRAFT — REVIEW AND ADAPT] Every batch we receive is independently
          tested by high-performance liquid chromatography (HPLC) before being
          listed for sale. HPLC separates the compounds in a sample so that
          purity can be measured against a known reference. Our Certificates of
          Analysis report the HPLC trace, the measured purity percentage, and
          the batch identifier so that each order can be traced back to the
          specific test that was performed on the material supplied.
        </p>

        <h2 className="text-3xl mt-12">Our commitment to research use</h2>
        <p>
          [DRAFT — REVIEW AND ADAPT] We do not sell products for human or
          veterinary consumption, and we do not provide dosage guidance,
          therapeutic claims, or application advice. Our customers are
          researchers and laboratory professionals; our role is to supply them
          with documented research-grade compounds and the paperwork that
          accompanies them. Every order placed on this site must be confirmed
          as intended for laboratory research use before it is accepted.
        </p>

        <h2 className="text-3xl mt-12">Why documentation matters</h2>
        <p>
          [DRAFT — REVIEW AND ADAPT] In research, the compound is only as good
          as the documentation that accompanies it. A Certificate of Analysis is
          a standard piece of laboratory paperwork that records the purity,
          testing method, batch, and reference standards used in analysis. We
          treat the COA as a first-class product alongside the compound itself,
          and we make it downloadable from every product page so that
          researchers have access to the data whenever they need it.
        </p>
      </div>
    </div>
  );
}

export const metadata = {
  title: "About",
  description:
    "Who we are, our approach to research supply, our testing process, and our commitment to research use.",
};
```

- [ ] **Step 2: Draft the Product Information page**

Replace the body of `app/(public)/product-information/page.tsx` with a full ~800-word drafted version covering:

- Overview of product categories (peptides, capsules, mixers — what each is used for in research)
- How HPLC testing works (plain-language explanation suitable for researchers and lay readers)
- How to read a Certificate of Analysis (fields, what each means, how to verify authenticity)
- What "research use only" means in practice (legal framework, what we do and don't claim)
- Labelling and storage conventions (how products are supplied, recommended storage temperature, reconstitution notes)
- What to do if you receive a damaged product

Mark every paragraph with `[DRAFT — REVIEW AND ADAPT]` at the top. This is the longest content draft; it doubles as an AEO/LLMO asset and as customer-facing educational content.

- [ ] **Step 3: Draft the Research Use Only legal page**

Replace the contents of `content/legal/research-use.md` with a ~400-word plain-language statement covering:

```markdown
---
slug: research-use
title: Research Use Only Statement
updated: 2026-04-13
reviewed: false
---

# Research Use Only Statement

**[DRAFT — PENDING SOLICITOR REVIEW]**

## Our position

Every product sold on this website is supplied exclusively for use in
controlled laboratory research settings. No product on this site is
intended for, or sold for, human or veterinary consumption. By placing an
order, customers confirm that they are purchasing the products for
laboratory research purposes only and that they are eighteen years of age
or older.

## What we do not claim

We do not make therapeutic claims about any of our products. We do not
provide dosage guidance, frequency recommendations, or any advice about
how a compound should be administered to any living organism. We do not
claim that our products are approved for use in humans or animals, and we
do not suggest that they are suitable for self-administration in any form.
We do not provide medical advice, and nothing on this website should be
interpreted as such.

## What we do claim

We claim that every batch of every product we sell has been independently
tested by high-performance liquid chromatography (HPLC) before release for
sale. We claim that the Certificate of Analysis we publish for each
variant is an accurate record of the testing performed on the batch from
which that variant was drawn. We claim that the products we sell are
supplied at a purity of at least 98% unless otherwise stated on the
product page.

## Who our customers are

Our customers are researchers, laboratory professionals, and research
institutions. If you are purchasing on behalf of an institution, we
appreciate you providing the institution name during checkout — not
because we require it, but because it helps us understand our customer
base and ensures our service remains aligned with the research community
we supply.

## Legal framework

We operate in compliance with applicable UK law, including the Human
Medicines Regulations 2012 and Medicines and Healthcare products
Regulatory Agency (MHRA) guidance on research chemicals. Nothing we sell
is a licensed medicinal product, and we do not seek to place any of our
products on the market as medicines.

## Questions or concerns

If you have any questions about the research-use framing of a product you
have purchased, or about any aspect of our testing, documentation, or
legal position, please [contact us](/contact) and we will respond within
one working day.
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "content: draft About, Product Information, and Research Use Only pages"
```

---

## Task 8: Draft ten product descriptions

**Files:**
- Create: `content/drafts/product-descriptions/bpc-157.md`
- Create: `content/drafts/product-descriptions/tb-500.md`
- Create: `content/drafts/product-descriptions/semaglutide.md`
- Create: `content/drafts/product-descriptions/tirzepatide.md`
- Create: `content/drafts/product-descriptions/ipamorelin.md`
- Create: `content/drafts/product-descriptions/cjc-1295.md`
- Create: `content/drafts/product-descriptions/ghk-cu.md`
- Create: `content/drafts/product-descriptions/melanotan-ii.md`
- Create: `content/drafts/product-descriptions/epithalon.md`
- Create: `content/drafts/product-descriptions/thymosin-alpha-1.md`

- [ ] **Step 1: Draft each product description as a markdown file**

For each compound, write a ~200-300 word description that follows the content practices from the spec:

- Lead with the compound name, not marketing language
- Include synonyms naturally for SEO
- State the research context in third person ("has been studied for...", never "helps with...")
- Describe physical properties (solubility, stability, storage temperature, reconstitution notes)
- Never write dosage, frequency, or human application
- Cross-check all CAS numbers and molecular formulas against PubChem or DrugBank before writing

Example structure for `content/drafts/product-descriptions/bpc-157.md`:

```markdown
---
slug: bpc-157
drafted: 2026-04-13
---

**[DRAFT — REVIEW AND ADAPT]**

BPC-157, also known as Body Protection Compound 157 or PL 14736, is a
synthetic pentadecapeptide fragment derived from a protective protein
found in human gastric juice. It is a stable peptide composed of fifteen
amino acids with the sequence Gly-Glu-Pro-Pro-Pro-Gly-Lys-Pro-Ala-Asp-
Asp-Ala-Gly-Leu-Val.

## Research context

In preclinical research, BPC-157 has been investigated in laboratory
models for its effects on tissue integrity, inflammatory response, and
cellular repair processes. It appears in published research across a
range of tissue systems. Researchers studying the compound should refer
to current peer-reviewed literature for specific experimental contexts
and controls.

## Physical properties

- **Appearance:** White to off-white lyophilised powder
- **Solubility:** Soluble in bacteriostatic or sterile water
- **Stability:** Stable at −20°C for long-term storage; stable at 4°C
  once reconstituted for short periods
- **Reconstitution:** Refer to standard peptide reconstitution procedures
  for your laboratory protocol

## Certificate of Analysis

Every batch of BPC-157 we supply is independently HPLC-tested to a
purity of ≥98%. The Certificate of Analysis is available for download
from this page and accompanies every order. The COA records the batch
identifier, the HPLC trace, the measured purity percentage, and the date
of testing.

## Research use only

This product is supplied exclusively for laboratory research use. It is
not for human or veterinary consumption and no therapeutic claims are
made for it.
```

Repeat the pattern for the remaining nine compounds. For each:

- **TB-500 (Thymosin Beta-4 Fragment)** — CAS 77591-33-4, synthetic fragment of Thymosin Beta-4, research context: cell migration and tissue response studies
- **Semaglutide** — CAS 910463-68-2, GLP-1 receptor agonist, research context: glucose metabolism and satiety studies
- **Tirzepatide** — CAS 2023788-19-2, dual GIP/GLP-1 receptor agonist, research context: metabolic regulation studies
- **Ipamorelin** — CAS 170851-70-4, selective growth hormone secretagogue, research context: growth hormone axis studies
- **CJC-1295** — CAS 863288-34-0, GHRH analogue, research context: growth hormone release kinetics studies
- **GHK-Cu** — CAS 89030-95-5, copper tripeptide complex, research context: skin and connective tissue research
- **Melanotan II** — CAS 121062-08-6, synthetic melanocortin analogue, research context: melanocortin receptor studies
- **Epithalon (Epitalon)** — CAS 307297-39-8, synthetic tetrapeptide, research context: telomere biology studies
- **Thymosin Alpha-1** — CAS 62304-98-7, thymic peptide, research context: immune modulation studies

**Critical:** before writing any of these, verify CAS and molecular formula against PubChem. Do not write any description from memory alone. If a compound's research context cannot be verified from primary literature, mark that section as `[DRAFT — SAM OR EDITOR TO FILL IN FROM CURRENT LITERATURE]` and move on.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "content: draft ten product descriptions as templates for Sam"
```

---

## Task 9: Draft six legal pages with placeholder content

**Files:**
- Modify: `content/legal/terms.md`
- Modify: `content/legal/privacy.md`
- Modify: `content/legal/cookies.md`
- Modify: `content/legal/refunds.md`
- Modify: `content/legal/shipping.md`
- Modify: `content/legal/research-use.md` (already drafted in Task 7)

- [ ] **Step 1: Draft Terms and Conditions**

Replace `content/legal/terms.md` with a ~1000-word placeholder draft covering:

- Parties and definitions
- Acceptance of terms (site use constitutes acceptance)
- Eligibility (18+, research purposes only)
- Product descriptions and research-only warranty language
- Orders and acceptance
- Pricing and payment
- Delivery (UK only, carrier at Sam's discretion)
- Risk and title (transfer on dispatch)
- Cancellation (14-day right for unopened items under UK Consumer Contracts Regulations 2013)
- Returns and refunds (reference to the Refunds page — no returns on opened research chemicals)
- Intellectual property
- Privacy (reference to the Privacy Policy)
- Limitation of liability
- Governing law (England and Wales)
- Dispute resolution
- Changes to terms
- Contact details

Every section must start with `[DRAFT — PENDING SOLICITOR REVIEW]` and set `reviewed: false` in the frontmatter.

- [ ] **Step 2: Draft the Privacy Policy**

Replace `content/legal/privacy.md` with a ~800-word GDPR-compliant draft covering:

- Data controller identity (Sam's business — placeholder `[TO BE CONFIRMED]`)
- Data processor identity (Firebase / Google Cloud, named explicitly)
- Categories of personal data collected (name, email, phone, address, research institution, order history, Firebase Auth credentials)
- Lawful basis for each category (contract performance for order data, legitimate interests for security, consent for analytics)
- Retention periods (6 years for order records for HMRC purposes, 2 years for customer accounts after last login)
- Data subject rights (access, rectification, erasure, portability, objection, complaint to ICO)
- International transfers (Firebase in europe-west2 — data stays in EEA)
- Cookies reference
- ICO registration reference (placeholder until Sam registers)
- Updates to the policy
- Contact for data requests

- [ ] **Step 3: Draft the Cookie Policy**

Replace `content/legal/cookies.md` with a ~400-word draft explaining:

- What cookies are (plain language)
- Strictly necessary cookies: `age_verified`, `cookie_consent`, `__session` (Firebase Auth), `checkout_session`
- Analytics cookies (Vercel Analytics, only with consent)
- How to change preferences (re-open the cookie banner via `/legal/cookies`)
- Browser-level cookie controls
- ICO PECR reference

- [ ] **Step 4: Draft the Refund and Returns Policy**

Replace `content/legal/refunds.md` with a ~500-word draft including:

- 14-day cancellation right for unopened orders (UK Consumer Contracts Regulations 2013)
- No returns on opened research chemicals (safety, chain-of-custody, cross-contamination risks)
- Damaged-in-transit claims procedure (report within 48 hours, photographic evidence, keep packaging)
- Incorrect item received procedure
- Refund process once a valid return is accepted
- Refund timeframe (within 14 days of approval)
- Customer responsibility for return shipping on non-faulty returns
- Contact details for all return enquiries

- [ ] **Step 5: Draft the Shipping Policy**

Replace `content/legal/shipping.md` with a ~400-word draft including:

- UK-only shipping in Phase 1
- Dispatch timeline (placeholder `[TO BE CONFIRMED BY SAM]`)
- Carrier (placeholder — Phase 3 decision)
- Tracking information provision
- Shipping costs reference (flat rate, free threshold as configured)
- Lost in transit procedure
- Contact details for shipping questions

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "content: draft all six legal pages with industry-standard placeholder text"
```

---

## Task 10: Wire navbar/footer to read live store config

**Files:**
- Modify: `components/storefront/layout/Navbar.tsx`
- Modify: `components/storefront/layout/Footer.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Make the Navbar a Server Component that reads config**

Replace `components/storefront/layout/Navbar.tsx`:

```tsx
// components/storefront/layout/Navbar.tsx
import Link from "next/link";
import { BasketIconButton } from "@/components/storefront/basket/BasketIconButton";
import { BasketDrawer } from "@/components/storefront/basket/BasketDrawer";
import { getConfig } from "@/lib/config";

const navLinks = [
  { href: "/peptides", label: "Peptides" },
  { href: "/capsules", label: "Capsules" },
  { href: "/mixers", label: "Mixers" },
  { href: "/product-information", label: "Product Info" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export async function Navbar() {
  const config = await getConfig();
  return (
    <>
      <nav className="sticky top-9 z-30 bg-white border-b border-[#DDE1E7]">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-serif text-[#0D1B3E] tracking-tight">
            {config.storeName}
          </Link>
          <ul className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="label-editorial hover:text-[#0D1B3E] transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-6">
            <Link href="/sign-in" className="label-editorial hover:text-[#0D1B3E] hidden sm:inline-block">
              Sign in
            </Link>
            <BasketIconButton />
          </div>
        </div>
      </nav>
      <BasketDrawer />
    </>
  );
}
```

- [ ] **Step 2: Make the Footer a Server Component that reads config**

Replace `components/storefront/layout/Footer.tsx`:

```tsx
// components/storefront/layout/Footer.tsx
import Link from "next/link";
import { getConfig } from "@/lib/config";

export async function Footer() {
  const config = await getConfig();
  const year = new Date().getFullYear();
  return (
    <footer className="bg-[#0D1B3E] text-[#8BAAD4] mt-24">
      <div className="max-w-[1280px] mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <p className="label-editorial text-[#AABBCC] mb-4">Shop</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/peptides" className="hover:text-white">Research Peptides</Link></li>
            <li><Link href="/capsules" className="hover:text-white">Research Capsules</Link></li>
            <li><Link href="/mixers" className="hover:text-white">Mixers &amp; Solvents</Link></li>
          </ul>
        </div>
        <div>
          <p className="label-editorial text-[#AABBCC] mb-4">Legal</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/legal/terms" className="hover:text-white">Terms</Link></li>
            <li><Link href="/legal/privacy" className="hover:text-white">Privacy</Link></li>
            <li><Link href="/legal/cookies" className="hover:text-white">Cookies</Link></li>
            <li><Link href="/legal/refunds" className="hover:text-white">Refunds</Link></li>
            <li><Link href="/legal/shipping" className="hover:text-white">Shipping</Link></li>
            <li><Link href="/legal/research-use" className="hover:text-white">Research Use Only</Link></li>
          </ul>
        </div>
        <div>
          <p className="label-editorial text-[#AABBCC] mb-4">Company</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/about" className="hover:text-white">About</Link></li>
            <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
            {config.storeEmail && <li><a href={`mailto:${config.storeEmail}`} className="hover:text-white">{config.storeEmail}</a></li>}
          </ul>
        </div>
        <div>
          <p className="label-editorial text-[#AABBCC] mb-4">Research</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/product-information" className="hover:text-white">Product Information</Link></li>
            <li><Link href="/legal/research-use" className="hover:text-white">Research Use Only</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[#162040]">
        <div className="max-w-[1280px] mx-auto px-6 py-6 text-xs text-[#8BAAD4] flex flex-col md:flex-row md:justify-between gap-2">
          <p>&copy; {year} {config.storeName}. {config.registeredAddress}.</p>
          <p className="uppercase tracking-wider">
            All products for research use only — not for human or veterinary consumption.
          </p>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Since Navbar and Footer are now async Server Components, verify the root layout correctly awaits them**

Open `app/layout.tsx`. The root layout is already async. Since Server Components can be composed directly, no changes are needed — `<Navbar />` and `<Footer />` are awaited automatically.

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: wire navbar and footer to read live store config"
```

---

## Task 11: Create Firestore and Storage security rules

**Files:**
- Create: `firestore.rules`
- Create: `storage.rules`
- Create: `firebase.json`
- Create: `firestore.indexes.json`

- [ ] **Step 1: Write `firestore.rules`**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /products/{productId} {
      allow read: if resource.data.active == true;
      allow create, update, delete: if request.auth.token.admin == true;
    }

    match /orders/{orderId} {
      allow read: if request.auth != null && (
        request.auth.uid == resource.data.customer.uid ||
        request.auth.token.admin == true
      );
      allow write: if false;
    }

    match /customers/{uid} {
      allow read: if request.auth.uid == uid || request.auth.token.admin == true;
      allow create, update: if request.auth.uid == uid;
      allow delete: if false;
    }

    match /enquiries/{id} {
      allow create: if request.resource.data.keys()
        .hasOnly(['name','email','subject','message','status','createdAt'])
        && request.resource.data.status == 'new';
      allow read, update: if request.auth.token.admin == true;
      allow delete: if request.auth.token.admin == true;
    }

    match /config/{docId} {
      allow read: if true;
      allow write: if request.auth.token.admin == true;
    }

    match /config/orderCounters/{day} {
      allow read: if false;
      allow write: if false;
    }
  }
}
```

- [ ] **Step 2: Write `storage.rules`**

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /products/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth.token.admin == true;
    }
    match /coas/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth.token.admin == true;
    }
    match /vial-base/{allPaths=**} {
      allow read: if request.auth.token.admin == true;
      allow write: if request.auth.token.admin == true;
    }
  }
}
```

- [ ] **Step 3: Write `firestore.indexes.json`**

```json
{
  "indexes": [
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "customer.uid", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

- [ ] **Step 4: Write `firebase.json`**

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Firestore and Storage security rules for production mode"
```

---

## Task 12: Create seed-firestore and set-admin-claim scripts

**Files:**
- Create: `scripts/seed-firestore.ts`
- Create: `scripts/set-admin-claim.ts`
- Modify: `package.json` (add scripts)

- [ ] **Step 1: Write `scripts/seed-firestore.ts`**

```typescript
// scripts/seed-firestore.ts
/**
 * One-shot seed: pushes data/products.seed.json into Firestore.
 * Run with: npx tsx scripts/seed-firestore.ts
 * Requires Firebase Admin credentials in .env.local (Stage 1b).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "node:fs/promises";
import path from "node:path";
import type { Product } from "../types";

async function main() {
  if (
    !process.env.FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID === "REPLACE_ME"
  ) {
    console.error("Firebase credentials missing. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env.local first.");
    process.exit(1);
  }

  if (getApps().length === 0) {
    const privateKey = Buffer.from(
      process.env.FIREBASE_PRIVATE_KEY!,
      "base64"
    ).toString("utf-8");
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey,
      }),
    });
  }

  const db = getFirestore();
  const seedPath = path.join(process.cwd(), "data", "products.seed.json");
  const raw = await fs.readFile(seedPath, "utf-8");
  const products: Product[] = JSON.parse(raw);

  console.log(`Seeding ${products.length} products to Firestore...`);

  for (const product of products) {
    await db.doc(`products/${product.id}`).set(product);
    console.log(`  ✓ ${product.name}`);
  }

  console.log(`\nDone. ${products.length} products written to Firestore.`);
  console.log(`\nNext step: run \`npx tsx scripts/set-admin-claim.ts <admin-email>\` to grant admin access.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Write `scripts/set-admin-claim.ts`**

```typescript
// scripts/set-admin-claim.ts
/**
 * Grants admin custom claim to a Firebase Auth user by email.
 * Run with: npx tsx scripts/set-admin-claim.ts <email>
 * Requires Firebase Admin credentials in .env.local.
 * The user MUST exist in Firebase Auth already — create them via the
 * sign-up flow on the site first.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/set-admin-claim.ts <email>");
    process.exit(1);
  }

  if (
    !process.env.FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID === "REPLACE_ME"
  ) {
    console.error("Firebase credentials missing in .env.local.");
    process.exit(1);
  }

  if (getApps().length === 0) {
    const privateKey = Buffer.from(
      process.env.FIREBASE_PRIVATE_KEY!,
      "base64"
    ).toString("utf-8");
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey,
      }),
    });
  }

  const auth = getAuth();
  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, { admin: true });
  console.log(`✓ Admin claim set for ${email} (uid: ${user.uid})`);
  console.log("The user must sign out and back in for the claim to take effect in their ID token.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 3: Install tsx and dotenv**

```bash
npm install --save-dev tsx dotenv
```

- [ ] **Step 4: Add npm scripts**

Edit `package.json` and add to the `scripts` section:

```json
"seed:firestore": "tsx scripts/seed-firestore.ts",
"admin:grant": "tsx scripts/set-admin-claim.ts"
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add seed-firestore and set-admin-claim scripts for Stage 1b"
```

---

## Task 13: Write handover documentation

**Files:**
- Create: `docs/handover/deployment-checklist.md`
- Create: `docs/handover/admin-guide.md`
- Create: `docs/handover/content-guide.md`
- Create: `docs/smoke-test.md`

- [ ] **Step 1: Write `docs/handover/deployment-checklist.md`**

Write a Sam-voice step-by-step guide covering the full Stage 1b onboarding described in the spec. Include, in order:

1. Create Firebase project in europe-west2
2. Enable Firestore, Storage, Authentication
3. Generate service account key (where to click, how to share securely)
4. Create GitHub account or repo, add David as collaborator
5. David pushes code to GitHub
6. Create Vercel account, link GitHub, import repo
7. Populate environment variables in Vercel (explicit list of what each variable contains)
8. Create Resend account, verify domain, generate API key
9. Buy domain from registrar
10. Connect domain to Vercel, set DNS records
11. Run `npm run seed:firestore` to push products
12. Run `npm run admin:grant <sam-email>` to grant admin access
13. Sign out and back in to refresh the ID token
14. Test the site end-to-end
15. Push Firestore and Storage security rules via Firebase CLI
16. Enable weekly Firestore export
17. Add to Google Search Console, verify via DNS TXT, submit sitemap
18. Add to Bing Webmaster Tools

Each step should be ~3-5 sentences, written in clear instructional language, with expected screenshots noted as `[SCREENSHOT: description]` placeholders for David to add during handover.

- [ ] **Step 2: Write `docs/handover/admin-guide.md`**

Walk through the admin UI screen by screen, explaining what each section does and how to perform common tasks:

- Dashboard: what the stat cards mean
- Adding a product: walk through the full form
- Editing a product: how to update prices or stock
- Deactivating a variant or product: when and why
- Viewing an order: what each section means
- Transitioning order status: pending → paid → fulfilled
- Replying to an enquiry: how to use the mailto button and mark as replied
- Updating store settings: store name, VAT, shipping rules, notification email

Include `[SCREENSHOT: admin dashboard]` placeholders throughout.

- [ ] **Step 3: Write `docs/handover/content-guide.md`**

Write the content-drafting guide covering:

- The voice and tone: scientific, factual, third person, compliance-aware
- Product description structure: compound intro → research context → physical properties → COA note → research-use disclaimer
- What to say (specific factual claims, CAS numbers, molecular data, testing standards)
- What not to say (dosage, frequency, therapeutic claims, anything implying human use)
- The 10 drafted templates in `content/drafts/product-descriptions/` as examples
- How to adapt a template for a new compound
- Suggested workflow: verify CAS and molecular data against PubChem first, then follow the template

- [ ] **Step 4: Write `docs/smoke-test.md`**

Create a 20-step manual checklist for verifying the site before every production deploy:

```markdown
# Smoke Test Checklist

Run before every production deploy. Estimated time: 10 minutes.

## Storefront
- [ ] Homepage loads with all five sections rendered
- [ ] Compliance banner visible at top on every page
- [ ] Age gate appears in fresh incognito window
- [ ] Clicking Enter site dismisses the age gate
- [ ] Cookie consent appears on first visit, dismissable on accept/decline

## Products
- [ ] Each category listing (peptides, capsules, mixers) renders correctly
- [ ] Filters update URL query params and narrow results
- [ ] Product detail page renders gallery, chemistry row, variant selector, FAQ, related
- [ ] Variant selector updates price and URL query param
- [ ] Add to basket opens drawer with correct item

## Checkout
- [ ] Basket drawer and /basket page show same content
- [ ] /checkout/delivery accepts form input with validation
- [ ] /checkout/review shows correct totals and research checkbox
- [ ] Pay button disabled until research checkbox ticked
- [ ] Stub payment creates an order and redirects to confirmation
- [ ] Confirmation page shows order number and summary

## Admin (with ADMIN_DEV_BYPASS=1)
- [ ] /admin dashboard loads with stat cards
- [ ] Product edit form saves changes
- [ ] Order status transitions persist
- [ ] Settings form saves and navbar reflects the new store name
- [ ] Contact form submission appears in /admin/enquiries

## Meta
- [ ] /sitemap.xml returns valid XML
- [ ] /robots.txt includes AI crawler allowlist
- [ ] /llms.txt renders with all products listed
- [ ] View source on a product detail page shows three JSON-LD blocks
- [ ] Every legal page shows the placeholder banner (Stage 1a)

## Build
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run build` completes successfully
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: write handover checklist, admin guide, content guide, and smoke test"
```

---

## Task 14: Final Phase 1 Stage 1a end-to-end smoke test

**Files:** (none — verification only)

- [ ] **Step 1: Start fresh**

```bash
rm -f data/orders.local.json data/counters.local.json data/enquiries.local.json data/customers.local.json data/config.local.json data/products.local.json
```

- [ ] **Step 2: Clean build**

```bash
rm -rf .next
npm run build
```

Expected: successful production build, all routes pre-rendered, no errors.

- [ ] **Step 3: Run smoke test checklist**

Open `docs/smoke-test.md` and work through every item. Record any failures as git issues or TODO notes for fix-up commits.

- [ ] **Step 4: Verify `client-queries-sam.md` is up to date**

Review `docs/client-queries-sam.md` and ensure every outstanding Sam-input item discovered during Plans 1–5 is captured.

- [ ] **Step 5: Final commit — Phase 1 Stage 1a complete**

```bash
git add -A
git commit -m "feat: Phase 1 Stage 1a complete — site demoable end-to-end on seed data"
```

- [ ] **Step 6: Generate final git log summary**

```bash
git log --oneline | head -60
```

Record the commit count and range in your handover notes.

---

## Plan 5 completion summary

Phase 1 Stage 1a is complete. The project now has:

- Complete SEO infrastructure: metadata, three JSON-LD blocks per product page, Organization JSON-LD on homepage, native sitemap, native robots.txt with AI crawler allowlist, dynamic `llms.txt` endpoint
- Drafted content: About page, Product Information page, Research Use Only page, 10 product description templates, 6 legal pages (all marked as draft, all with the `reviewed: false` frontmatter flag)
- Firestore and Storage security rules committed and ready to push
- Seed script and admin claim script ready for Stage 1b
- Handover documentation written: deployment checklist (Sam's voice), admin guide, content guide, smoke test
- Navbar and footer read live store config
- Everything on disk is gitignored appropriately, nothing under client account yet

**Launch gates remaining (per spec Section 14.3 — these are Sam's responsibility to resolve):**

1. Countersigned SoW received
2. Solicitor review of all legal pages (`reviewed: true` frontmatter set)
3. Solicitor review of compliance banner, age gate, product disclaimers, About, Product Information
4. Sam supplies: store name, address, company number, VAT status, business email, phone, shipping rule, admin email, domain
5. Sam supplies real product catalogue or approves placeholder launch
6. Sam supplies base vial image or approves placeholder launch
7. Sam places successful test order and confirms admin flow
8. Firestore security rules verified in production mode (David at Stage 1b)
9. Weekly Firestore export task enabled (David at Stage 1b)
10. Google Search Console verified and sitemap submitted (David at Stage 1b)

**Phase 2 preview (TrueLayer — Wallid was ruled out, see spec decision #26):**

- Connect the **TrueLayer MCP server for Claude AI** in Claude Code before starting Phase 2 (`https://docs.truelayer.com/docs/truelayer-mcp-integration-for-claude-ai`)
- Sam creates a TrueLayer Console account in his own name at `console.truelayer.com`, generates Client ID, Client Secret, Merchant Account ID, and a signing key pair in Sandbox mode
- Replace `stub` payment provider with full TrueLayer implementation in `lib/payments/truelayer.ts` (REST API, signed payment requests, `@truelayer/web-sdk`)
- Add TrueLayer environment variables (see Plan 1 `.env.example` — already prepared)
- Implement `POST /api/checkout/initiate/route.ts` — signs and sends payment request, returns `resource_token` to the Web SDK
- Implement `POST /api/webhooks/truelayer/route.ts` — **verifies signature before processing** (non-negotiable), handles `payment_executed`, `payment_failed`, `payment_settled` events
- Implement `GET /api/checkout/status/[paymentId]/route.ts` — polls payment status as a webhook fallback
- Embed TrueLayer Web SDK in `/checkout/review`, styled to match navy/white palette
- **Enable Signup+ scope on payment initiation** for bank-level name and date-of-birth verification — this is the single biggest compliance upgrade in the whole Phase 2 delivery
- Add `ageBankVerifiedAt: Timestamp | null` field to the `Order` schema (optional, populated when TrueLayer returns successful Signup+ verification)
- Sandbox end-to-end test using TrueLayer's Mock Bank + `ngrok` / Cloudflare Tunnel for webhook delivery
- Submit application for production approval via TrueLayer Console (3–5 business day review)
- Once approved: set `TRUELAYER_ENVIRONMENT=production` in Vercel env vars, run a live £0.01 test payment before announcing to customers

**Phase 3 preview (blocked on courier and printer decisions):**

- Firebase Cloud Function `onOrderStatusChange` in europe-west2
- Royal Mail / Sendcloud / Shippo API integration for label generation
- Printer integration (cloud-connected or local print server)
- Dispatch confirmation email with tracking
- Product image generation pipeline (120 images from Sam's base vial)

---

## Phase 1 Stage 1a is complete.

The next step is not a new plan — it is Stage 1b: the client infrastructure onboarding day described in the spec and the handover deployment checklist. Once Sam's Firebase, Vercel, GitHub, Resend, and domain are all live, David runs through the checklist with him and flips the site into production mode.

---

## END-OF-PLAN REVIEW CHECKPOINT — STOP HERE

**This is the final review checkpoint of Phase 1 Stage 1a.** Unlike previous checkpoints, there is no Plan 6 to proceed to — the next step is Stage 1b client onboarding with Sam. But the Opus review at this checkpoint is still critical, arguably the most important of the whole sequence, because it is the last chance to catch issues before Sam sees the work.

### What Sonnet should do when this plan is complete

1. **Stop.** Do not begin Stage 1b onboarding.
2. **Post the report below** to David.
3. **Wait** for the final Opus review and David's explicit confirmation that Stage 1a is considered production-ready for handover.

### Report template — copy, fill in, send to David

````markdown
## Plan 5 (SEO + Content + Launch Prep) — execution report

**Git log range:** `<first>..<last>` (14 tasks expected)

**Task completion:**
- [x] Task 1: SEO utility library
- [x] Task 2: JSON-LD on product detail pages
- [x] Task 3: Organization JSON-LD on homepage
- [x] Task 4: Native sitemap
- [x] Task 5: robots.txt with AI crawler allowlist
- [x] Task 6: llms.txt dynamic endpoint
- [x] Task 7: Draft About / Product Information / Research Use pages
- [x] Task 8: Draft ten product descriptions
- [x] Task 9: Draft six legal pages
- [x] Task 10: Navbar / footer read live store config
- [x] Task 11: Firestore + Storage security rules
- [x] Task 12: Seed + admin-claim scripts
- [x] Task 13: Handover documentation
- [x] Task 14: Final Phase 1 Stage 1a smoke test

**Chemistry verification:** every product description's CAS number and molecular formula was cross-checked against:
- PubChem: Y / N
- DrugBank: Y / N
- Other: ...

**Compounds marked as `[SAM OR EDITOR TO FILL IN]` (unable to verify from primary sources):**
- ...

**Legal pages review-ready checklist:**
- All six legal pages drafted: PASS / FAIL
- Every page retains `reviewed: false` in frontmatter: PASS / FAIL
- Every page renders the amber placeholder banner: PASS / FAIL
- `[DRAFT — PENDING SOLICITOR REVIEW]` markers visible throughout: PASS / FAIL

**SEO verification:**
- `/sitemap.xml` returns valid XML listing all products and pages: PASS / FAIL
- `/robots.txt` includes GPTBot / ClaudeBot / PerplexityBot / Google-Extended: PASS / FAIL
- `/llms.txt` renders with all 25 products listed: PASS / FAIL
- Product detail page HTML includes three JSON-LD blocks (Product, FAQPage, BreadcrumbList): PASS / FAIL
- Homepage HTML includes Organization JSON-LD: PASS / FAIL

**Security rules review:**
- `firestore.rules` committed: PASS / FAIL
- `storage.rules` committed: PASS / FAIL
- `orders` collection has `allow write: if false` (Server-Action-only writes): PASS / FAIL
- `enquiries` collection has field whitelist on create: PASS / FAIL

**Handover docs written:**
- `docs/handover/deployment-checklist.md`: PASS / FAIL
- `docs/handover/admin-guide.md`: PASS / FAIL
- `docs/handover/content-guide.md`: PASS / FAIL
- `docs/smoke-test.md`: PASS / FAIL

**Stage 1a final smoke test (Task 14 full checklist):**
- every item PASS / list any FAIL

**Deviations from plan:**
- ...

**Judgment calls I made:**
- ...

**Blockers hit:**
- ...

**Verification results:**
- `npx tsc --noEmit`: PASS / FAIL
- `npm run build`: PASS / FAIL

**Notes for David's review:**
- ...
````

### What David's Opus review will specifically check for Plan 5

This is the most thorough review of the whole sequence because it is the last line of defence before Sam sees the work.

1. **Chemistry verification on all 10 product descriptions.** Every CAS number and molecular formula must be cross-referenced to a primary source (PubChem, DrugBank, UniProt). This is the highest-stakes correctness check. Hallucinated chemistry on a regulated research-supplier site is a reputational and legal risk. Opus will spot-check at least 5 of the 10 compounds manually.
2. **Legal page tone and scope.** Opus will read each legal page draft and check: (a) is it clearly marked as draft, (b) does it avoid making specific claims that would need solicitor sign-off to be defensible, (c) does the `reviewed: false` frontmatter + placeholder banner render correctly, (d) does it read as placeholder rather than authoritative? If any legal page reads like real legal drafting, it needs to be dialled back.
3. **Security rules eyeball.** Opus will read `firestore.rules` and `storage.rules` line-by-line. One typo in the field whitelist or one misplaced `allow write: if true` is a production security hole. This is the one file in the whole project that needs manual inspection, not automated checks.
4. **JSON-LD validity.** Opus will view-source on a product detail page and confirm all three JSON-LD blocks are valid JSON, reference the correct product data, and include the schema.org fields the spec specified.
5. **`llms.txt` content.** Opus will curl `/llms.txt` and confirm it renders as proper plain-text Markdown, includes the lead-blurb framing, lists every product correctly, and has no malformed entries.
6. **Navbar / footer read live config.** Change the store name via admin, verify it propagates to the navbar and footer. This verifies Task 10 plus the Plan 4 settings form plus `lib/config.ts` end-to-end.
7. **Handover doc tone.** Opus will read each handover document and flag anywhere the tone reads more like "AI-generated checklist" than "document you (David) would actually send to Sam." Tone-editing is David's responsibility but Opus can flag candidates.
8. **`client-queries-sam.md` accuracy.** Every open item on the query log must still be open. Every resolved item must be struck through. No new TrueLayer or Stage 1b items should have been accidentally missed.
9. **Final smoke test pass.** Every item in `docs/smoke-test.md` must be confirmable in a fresh browser session against the dev server.
10. **Git history quality.** Opus will `git log --oneline` the full range and note any commit messages that are too terse or don't match conventional commit format. Not a blocker, but worth cleaning up before Sam sees the repo.

### How David triggers the final review

> Plan 5 is complete. Commits `<first>..<last>`. Please run the full Stage 1a final review — specifically the chemistry verification, legal page tone check, security rules eyeball, and final smoke test. Confirm when Stage 1a is production-ready for handover to Sam.

### After the final review passes

- Phase 1 Stage 1a is complete and demoable
- The project is ready for Stage 1b: client infrastructure onboarding day with Sam
- The next milestone is scheduling that onboarding session and working through `docs/handover/deployment-checklist.md` with Sam
- Do NOT begin Phase 2 (TrueLayer) until Stage 1b is complete, Sam has placed a successful test order, and the countersigned SoW has been returned

---

**Stage 1a is complete only after the Opus review confirms it.** Until then, Sonnet should treat the build as in-progress and refrain from any Sam-facing communication.
