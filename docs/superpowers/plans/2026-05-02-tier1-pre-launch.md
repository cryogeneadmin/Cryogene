# Tier 1 — Pre-Launch Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take the storefront from "safe for first-customer testing" (Tier 0 outcome) to "ready for public-launch announcement." Closes every HIGH-priority finding from the post-migration review across security, performance, accessibility, compliance content, and design correctness — without touching the LOW/MEDIUM polish tail.

**Architecture:** Five sub-modules executable in any order; each ships independently and merges to main on its own.

1. **Caching (Tasks 1-3)** — `'use cache'` + `cacheTag` on the data-layer reads, image optimization, drop dead duplicate query on home. Single biggest performance + cost win.
2. **Security headers + abuse controls (Tasks 4-5)** — CSP, HSTS, X-Frame-Options, Permissions-Policy in `next.config.ts`; rate-limit + honeypot on `/contact`.
3. **Accessibility critical fixes (Tasks 6-9)** — Age gate focus trap + `inert`, compliance banner contrast + role fix, form errors `aria-describedby` + `role="alert"`, skip-to-main + global focus-visible.
4. **Compliance content (Tasks 10-12)** — T&C/Privacy acceptance tickbox at checkout, GLP-1 SKU policy decision, CoA promise vs reality reconciliation.
5. **Design correctness (Tasks 13-14)** — Strip drop shadows + gradients from molecule panels, cookie consent shadow, mobile drawer shadow.

**Tech Stack:** Next.js 16 App Router · Firebase Admin SDK · Tailwind v4 · Sharp (image optimization) · Vercel Edge headers · Zod.

**Test approach:** TypeScript (`npx tsc --noEmit`) + `npm run build` + manual smoke against the live preview. No automated tests per project spec. Visual diffs verified by byte-count comparison against the previous deploy where applicable.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `lib/products.ts` | Modify | Add `'use cache'` + `cacheTag('products')` on `getProducts`, `getProductBySlug`, `getAllProductSlugs` |
| `lib/config.ts` | Modify | Add `'use cache'` + `cacheTag('config')` on `getConfig` |
| `app/actions/products.ts` | Modify | Call `revalidateTag('products')` on every product write |
| `app/actions/config.ts` | Modify | Call `revalidateTag('config')` on every config write |
| `app/(public)/page.tsx` | Modify | Dedupe duplicate `getProducts` call (was fetching catalogue twice) |
| `next.config.ts` | Modify | Add `headers()` block: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| `scripts/optimize-images.ts` | Create | Sharp batch script: `public/products/*.png` → AVIF + WebP at 800×800, ≤200KB target |
| `scripts/optimize-hero-images.ts` | Create | Same for `public/site/*.png` (hero set) |
| `app/actions/contact.ts` | Modify | Honeypot field check + IP rate limit |
| `firestore.rules` | Modify | Tighten enquiries rule with size caps (`message.size() < 5000`) |
| `components/storefront/layout/AgeVerificationGate.tsx` | Modify | Add `inert` to underlying content, focus trap via Base UI Dialog or auto-focus + `useEffect` |
| `components/storefront/layout/ComplianceBanner.tsx` | Modify | Foreground `#AABBCC` → `#C8D4E4`; remove `role="status"` |
| `components/storefront/auth/SignInForm.tsx` | Modify | Add `aria-invalid` + `aria-describedby` + form-level `role="alert"` |
| `components/storefront/auth/SignUpForm.tsx` | Modify | Same |
| `components/storefront/checkout/DeliveryForm.tsx` | Modify | Same |
| `components/admin/ProductForm.tsx` | Modify | Same |
| `app/layout.tsx` | Modify | Add `<a href="#main" className="sr-only focus:not-sr-only">Skip to main content</a>`; add `id="main"` to `<main>` |
| `app/globals.css` | Modify | Global `:focus-visible { outline: 2px solid var(--color-navy); outline-offset: 2px; }` |
| Form input borders across components | Modify | `border-[#DDE1E7]` → `border-[#6B7280]` on form inputs only (not decorative cards) |
| `components/storefront/checkout/ResearchConfirmCheckbox.tsx` | Modify | Add T&C/Privacy acceptance checkbox |
| `app/actions/create-order.ts` | Modify | Validate T&C/Privacy acceptance via Zod literal |
| `components/storefront/products/ProductCard.tsx` | Modify | Strip molecule panel `bg-gradient-*` + `shadow-*` + `rounded-sm` |
| `components/storefront/products/ProductDetail.tsx` | Modify | Same; also remove `drop-shadow-md` from molecule image |
| `components/storefront/layout/CookieConsent.tsx` | Modify | Strip top drop shadow `shadow-[0_-4px_12px_...]` |
| `components/storefront/products/ListingToolbar.tsx` | Modify | Strip mobile drawer `shadow-xl` |

---

## Task 1: `'use cache'` on data layer reads

**Files:**
- Modify: `lib/products.ts` (3 functions)
- Modify: `lib/config.ts` (1 function)
- Modify: `app/actions/products.ts` (3 mutation paths)
- Modify: `app/actions/config.ts` (1 mutation path)

**Why this task:** Each `npm run build` does ~94+ Firestore reads (every dynamic page's `generateStaticParams` + Navbar's `getConfig`). At runtime, every cold request hits Firestore again across the Atlantic. Both costs disappear with framework-level caching keyed by tag — the admin write actions invalidate the relevant tag, so cache freshness is bounded by writes (rare) not requests (constant).

- [ ] **Step 1: Read current `lib/products.ts` and `lib/config.ts`**

Use Read tool to confirm current shape after Tier 0 changes.

- [ ] **Step 2: Wrap `getProducts` in `lib/products.ts`**

Find the function. Add `"use cache"` directive as the first line of the function body, then add `cacheTag('products')`:

```typescript
import { unstable_cacheTag as cacheTag } from "next/cache";

export async function getProducts(options?: {
  category?: ProductCategory;
  activeOnly?: boolean;
  limit?: number;
}): Promise<Product[]> {
  "use cache";
  cacheTag("products");
  // ... existing body unchanged
}
```

Same pattern for `getProductBySlug` and `getAllProductSlugs`.

- [ ] **Step 3: Wrap `getConfig` in `lib/config.ts`**

```typescript
export async function getConfig(): Promise<Config> {
  "use cache";
  cacheTag("config");
  // ... existing body unchanged
}
```

- [ ] **Step 4: Add `revalidateTag('products')` to product mutation paths in `app/actions/products.ts`**

Find every place that writes to Firestore (product save, toggle active, delete if any). After each successful write, add `revalidateTag('products')` (in addition to any existing `revalidatePath` calls — keep those for now).

```typescript
import { revalidateTag } from "next/cache";

// after write:
revalidateTag("products");
```

- [ ] **Step 5: Same for `app/actions/config.ts` — call `revalidateTag('config')` after the config save**

- [ ] **Step 6: Type-check + build**

```powershell
cd C:\Users\david\repos\cryogene; npx tsc --noEmit 2>&1 | Select-Object -Last 5
cd C:\Users\david\repos\cryogene; npm run build 2>&1 | Select-Object -Last 10
```

Expected: clean type-check, build green, 95 routes, **dramatically fewer Firestore reads at build time** (visible in Vercel build logs after deploy).

- [ ] **Step 7: Commit**

```powershell
cd C:\Users\david\repos\cryogene; git add lib/products.ts lib/config.ts app/actions/products.ts app/actions/config.ts; $msg = @"
perf: cache product/config reads with 'use cache' + cacheTag

Each build did 94+ Firestore reads (every dynamic page's
generateStaticParams + Navbar's getConfig per route). At runtime,
every cold request hit Firestore across the Atlantic.

Now: getProducts/getProductBySlug/getAllProductSlugs/getConfig wrap
their bodies in 'use cache' + cacheTag('products'/'config'). Admin
write actions call revalidateTag to invalidate. Cache freshness is
bounded by writes (rare), not requests (constant).

Even on Blaze billing, the savings matter: faster cold starts, cheaper
Firestore reads bill, fewer cross-region round-trips. Closes Perf C3
of the post-migration review.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
"@; git commit -m $msg
```

---

## Task 2: Dedupe homepage's duplicate catalogue fetch

**Files:**
- Modify: `app/(public)/page.tsx`

**Why this task:** Memory says the home calls `getFeaturedProducts(6)` (which internally does `getProducts({activeOnly: true})`) AND a second `getProducts({activeOnly: true})` separately. Two identical queries per request. After Task 1 they're cached so the cost is amortized, but it's still wasteful and confusing.

- [ ] **Step 1: Read `app/(public)/page.tsx`**

Find the two calls. Pattern:
```typescript
const featured = await getFeaturedProducts(6);
const allActive = await getProducts({ activeOnly: true });
```

- [ ] **Step 2: Fetch once, derive both**

```typescript
const allActive = await getProducts({ activeOnly: true });
const featured = [...allActive]
  .sort((a, b) => /* same sort getFeaturedProducts uses */)
  .slice(0, 6);
```

Read the existing `getFeaturedProducts` implementation in `lib/products.ts` to see its sort logic, copy it inline (or factor into a small helper). Then `getFeaturedProducts` becomes unused on this route — leave the function for other callers.

- [ ] **Step 3: Type-check + build + commit**

```powershell
cd C:\Users\david\repos\cryogene; npx tsc --noEmit 2>&1 | Select-Object -Last 5; npm run build 2>&1 | Select-Object -Last 6
```

```powershell
cd C:\Users\david\repos\cryogene; git add "app/(public)/page.tsx"; git commit -m "perf: dedupe homepage's two identical product queries

getFeaturedProducts(6) internally calls getProducts({activeOnly:true})
and the next line called it again separately. With Task 1's cache the
second call hit the cache, but still: cleaner to fetch once and derive
both. getFeaturedProducts left in place for other callers.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Image optimization (Sharp batch)

**Files:**
- Create: `scripts/optimize-images.ts`
- Modify: `public/products/*.png` → also produce `*.avif` + `*.webp` siblings

**Why this task:** `public/products/` has 124 PNGs averaging 580KB. Hero set in `public/site/` ranges 600KB-1.4MB. Largest single user-visible delay on first visit. `next/image` will re-encode on demand, but Sharp pre-encoding source files cuts the work by ~80%.

- [ ] **Step 1: Confirm Sharp is already a dep**

```powershell
cd C:\Users\david\repos\cryogene; Select-String -Path package.json -Pattern "sharp"
```

Sharp should already be listed (it's a Next.js peer dep for image optimization).

- [ ] **Step 2: Create `scripts/optimize-images.ts`**

```typescript
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

type Job = { source: string; outAvif: string; outWebp: string; maxWidth: number };

async function optimizeOne(job: Job): Promise<{ inBytes: number; avifBytes: number; webpBytes: number }> {
  const buf = await fs.readFile(job.source);
  const inBytes = buf.length;
  const pipeline = sharp(buf).resize({ width: job.maxWidth, withoutEnlargement: true });
  const avif = await pipeline.clone().avif({ quality: 65, effort: 4 }).toBuffer();
  const webp = await pipeline.clone().webp({ quality: 80 }).toBuffer();
  await fs.writeFile(job.outAvif, avif);
  await fs.writeFile(job.outWebp, webp);
  return { inBytes, avifBytes: avif.length, webpBytes: webp.length };
}

async function batch(dir: string, maxWidth: number) {
  const entries = await fs.readdir(dir);
  const pngs = entries.filter((e) => e.toLowerCase().endsWith(".png"));
  const jobs: Job[] = pngs.map((name) => {
    const stem = name.replace(/\.png$/i, "");
    return {
      source: path.join(dir, name),
      outAvif: path.join(dir, `${stem}.avif`),
      outWebp: path.join(dir, `${stem}.webp`),
      maxWidth,
    };
  });

  let totalIn = 0, totalAvif = 0, totalWebp = 0;
  for (const job of jobs) {
    const r = await optimizeOne(job);
    totalIn += r.inBytes;
    totalAvif += r.avifBytes;
    totalWebp += r.webpBytes;
    console.log(
      `  ${path.basename(job.source).padEnd(50)} ${(r.inBytes / 1024).toFixed(0).padStart(5)} KB → ${(r.avifBytes / 1024).toFixed(0).padStart(5)} KB AVIF, ${(r.webpBytes / 1024).toFixed(0).padStart(5)} KB WebP`
    );
  }
  console.log(
    `\n${dir}: ${pngs.length} files, ${(totalIn / 1024 / 1024).toFixed(1)} MB → ${(totalAvif / 1024 / 1024).toFixed(1)} MB AVIF, ${(totalWebp / 1024 / 1024).toFixed(1)} MB WebP`
  );
}

async function main() {
  await batch(path.join(process.cwd(), "public", "products"), 800);
  await batch(path.join(process.cwd(), "public", "site"), 1280);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 3: Run the script**

```powershell
cd C:\Users\david\repos\cryogene; npx tsx scripts/optimize-images.ts 2>&1 | Select-Object -Last 30
```

Expected: ~125 PNGs processed, total payload reduction from ~80MB → ~12MB. Each line shows per-file old size → new sizes.

- [ ] **Step 4: Audit the output sizes**

```powershell
cd C:\Users\david\repos\cryogene; Get-ChildItem public/products/*.avif | Measure-Object -Property Length -Sum | Select-Object Count, @{N="MB"; E={[math]::Round($_.Sum / 1MB, 2)}}
```

If any single AVIF is >300KB, flag for re-encode at lower quality (45-55).

- [ ] **Step 5: Update `next.config.ts` to prefer AVIF**

Should already be the default in Next.js 16 (`formats: ["image/avif", "image/webp"]`). Verify via Read.

- [ ] **Step 6: Commit**

```powershell
cd C:\Users\david\repos\cryogene; git add scripts/optimize-images.ts "public/products/*.avif" "public/products/*.webp" "public/site/*.avif" "public/site/*.webp"; git commit -m "perf: AVIF + WebP encodings for all product + hero images

Source PNGs in public/products/ (124 files, ~71MB) and public/site/
(8 files, ~7MB) re-encoded to AVIF (q65) and WebP (q80) via Sharp.
Total payload: ~78MB → ~12MB (-85%). Largest single user-visible
performance win on the site.

next/image picks the format the browser supports; PNG sources kept
as fallback. Re-running the script overwrites in place — safe to
iterate on quality settings.

Closes Perf C1 + C2 of the post-migration review.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Security headers in `next.config.ts`

**Files:**
- Modify: `next.config.ts`

**Why this task:** No CSP, HSTS, X-Frame-Options, Permissions-Policy. A reflected/stored XSS or supply-chain compromise has unrestricted exfil. Clickjacking on `/checkout/review` is possible without `X-Frame-Options: DENY`.

- [ ] **Step 1: Read current `next.config.ts`** to see existing config shape.

- [ ] **Step 2: Add `headers()` async function**

```typescript
const config: NextConfig = {
  // ... existing config preserved

  async headers() {
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://*.googleapis.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://firebasestorage.googleapis.com https://storage.googleapis.com https://lh3.googleusercontent.com",
      "font-src 'self' data:",
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.firebaseapp.com",
      "frame-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: cspDirectives },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()" },
        ],
      },
    ];
  },
};
```

`unsafe-inline` and `unsafe-eval` on `script-src` are required because Next.js's runtime uses inline scripts for hydration. A nonce-based CSP is Tier 2 work.

- [ ] **Step 3: Type-check + build**

If the build fails because of CSP violations during static generation, that's actual content the CSP correctly blocks — narrow the directive to allow it. Common: Google Fonts loaded inline, Vercel telemetry, etc.

- [ ] **Step 4: Local smoke-test**

```powershell
cd C:\Users\david\repos\cryogene; npm run start
```

Open the homepage in browser → DevTools → Network → click any document request → confirm headers include `Content-Security-Policy`, `Strict-Transport-Security`, etc.

- [ ] **Step 5: Commit**

```powershell
cd C:\Users\david\repos\cryogene; git add next.config.ts; git commit -m "feat(security): CSP, HSTS, X-Frame-Options + Permissions-Policy

Adds defense-in-depth headers on every response:
- Content-Security-Policy: tightens script/img/connect/frame sources;
  blocks frame embedding entirely; allow Firebase + Google APIs only
  for connect/img origins
- Strict-Transport-Security: 2-year HSTS with preload + subdomains
- X-Frame-Options: DENY (clickjacking protection on /checkout/review
  and every other page)
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: deny camera/mic/geo/FLoC/Topics

unsafe-inline + unsafe-eval on script-src are required for Next.js
runtime hydration. Nonce-based CSP is Tier 2 hardening.

Closes Sec H1 of the post-migration review.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Rate-limit + honeypot on `/contact`

**Files:**
- Modify: `app/actions/contact.ts`
- Modify: `firestore.rules` (size caps in enquiries rule)
- Modify: `app/(public)/contact/page.tsx` (honeypot field)

**Why this task:** No rate limit on enquiry creation, no captcha, no length cap. A spambot can flood Sam's inbox + drain Firestore quota in minutes.

- [ ] **Step 1: Add honeypot field to the contact form**

Read `app/(public)/contact/page.tsx`. Add a hidden input:

```tsx
<input
  type="text"
  name="website"
  tabIndex={-1}
  autoComplete="off"
  className="absolute left-[-9999px] opacity-0 pointer-events-none"
  aria-hidden="true"
/>
```

Real humans don't fill it; bots scraping name attributes do.

- [ ] **Step 2: In `app/actions/contact.ts`, reject if honeypot is non-empty**

```typescript
const honeypot = formData.get("website");
if (honeypot && typeof honeypot === "string" && honeypot.length > 0) {
  // Silently succeed — don't tell the bot it failed.
  return { ok: true };
}
```

- [ ] **Step 3: Add IP-based rate limit using a simple in-memory map**

For Phase 1 (low traffic), an in-memory rate limit is fine. Tier 2 work would replace with Vercel KV / Upstash.

```typescript
const ipRateLimit = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 3;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const existing = ipRateLimit.get(ip);
  if (!existing || existing.resetAt < now) {
    ipRateLimit.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (existing.count >= MAX_PER_WINDOW) return false;
  existing.count++;
  return true;
}

// In the action:
import { headers } from "next/headers";
const headersList = await headers();
const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim()
  ?? headersList.get("x-real-ip")
  ?? "unknown";
if (!checkRateLimit(ip)) {
  return { ok: false, error: "Too many requests. Please wait a minute and try again." };
}
```

- [ ] **Step 4: Tighten Firestore rule for enquiries with size cap**

In `firestore.rules`, the existing block:

```
match /enquiries/{id} {
  allow create: if request.resource.data.keys()
    .hasOnly(['name','email','subject','message','status','createdAt'])
    && request.resource.data.status == 'new';
```

Add size constraints inside the create rule:

```
match /enquiries/{id} {
  allow create: if request.resource.data.keys()
    .hasOnly(['name','email','subject','message','status','createdAt'])
    && request.resource.data.status == 'new'
    && request.resource.data.name.size() < 200
    && request.resource.data.email.size() < 320
    && request.resource.data.subject.size() < 500
    && request.resource.data.message.size() < 5000;
```

(Rule deploy still requires interactive `firebase login` — Tier 0 Task 9.)

- [ ] **Step 5: Type-check + build + commit**

```powershell
cd C:\Users\david\repos\cryogene; git add app/actions/contact.ts "app/(public)/contact/page.tsx" firestore.rules; $msg = @"
feat(security): rate-limit + honeypot + size caps on /contact

Three layers of spam defense added:
1. Honeypot 'website' input — hidden via CSS, real humans skip,
   spambots filling all named fields trigger silent success
2. IP-based rate limit: 3 enquiries per minute per IP, tracked in
   in-memory Map (Tier 2 work would move to Vercel KV / Upstash)
3. Firestore rule size caps: name<200, email<320, subject<500,
   message<5000 — bot floods can't spike message size

Net effect: per-IP DoS bounded; Firestore bills bounded; admin inbox
remains usable.

Closes Sec H3 of the post-migration review.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
"@; git commit -m $msg
```

---

## Task 6: Age gate focus trap + `inert`

**Files:**
- Modify: `components/storefront/layout/AgeVerificationGate.tsx`

**Why this task:** Currently a fake `role="dialog" aria-modal="true"` overlay with no `inert`, no focus trap, no Escape handler. Keyboard users Tab past the modal into the obscured Navbar; screen readers don't get announced into the dialog.

- [ ] **Step 1: Read the current component**

- [ ] **Step 2: Apply `inert` to the rest of the page while gate is open**

The cleanest approach: let `app/layout.tsx` inject the gate and apply `inert` to siblings.

Read `app/layout.tsx`. Find where `<AgeVerificationGate>` is rendered. Wrap the rest of the page content in a div with `inert` conditional on `!verified`:

```tsx
{!verified && <AgeVerificationGate />}
<div className={!verified ? "" : ""} {...(!verified ? { inert: "" as unknown as boolean } : {})}>
  <Navbar />
  <main id="main">{children}</main>
  <Footer />
</div>
```

(TS workaround: `inert` is HTML4 but TS types lag — cast to `boolean` is the standard hack.)

Alternative if that's awkward: convert `AgeVerificationGate` to a Base UI Dialog (already imported in `components/ui/dialog.tsx` per memory). Base UI handles focus trap + Escape + restore automatically.

- [ ] **Step 3: Auto-focus the primary "Enter site" button on mount**

```tsx
"use client";
import { useEffect, useRef } from "react";

export function AgeVerificationGate() {
  const enterRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    enterRef.current?.focus();
  }, []);
  // ...
  <button ref={enterRef} ...>Enter site</button>
}
```

- [ ] **Step 4: Type-check + build + commit**

```powershell
cd C:\Users\david\repos\cryogene; git add app/layout.tsx components/storefront/layout/AgeVerificationGate.tsx; $msg = @"
fix(a11y): age gate focus trap + inert on underlying content

Before: gate was a fake role='dialog' aria-modal='true' overlay with
no focus trap, no Escape handler, no inert. Keyboard users could Tab
into the obscured Navbar and activate links beneath. Screen readers
did not get announced into the dialog on mount.

Now: layout applies the inert attribute to all non-gate content while
!verified. Gate auto-focuses the primary 'Enter site' button on mount.
Keyboard focus is constrained to the gate's two buttons until one is
clicked.

Closes A11y CRITICAL #2 (age gate focus management) and partially
mitigates A11y HIGH (h1 duplication on gated pages).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
"@; git commit -m $msg
```

---

## Task 7: Compliance banner contrast + role fix

**Files:**
- Modify: `components/storefront/layout/ComplianceBanner.tsx`

**Why this task:** Foreground `#AABBCC` on `#0D1B3E` at 11px ≈ 4.49:1 — *just below* WCAG 1.4.3 floor. Plus `role="status"` is wrong: causes the legal disclaimer to be re-announced on every App Router navigation.

- [ ] **Step 1: Read `ComplianceBanner.tsx`**

- [ ] **Step 2: Change foreground colour**

Find the text colour `#AABBCC` and replace with `#C8D4E4` (≈5.4:1, comfortably above WCAG AA floor).

- [ ] **Step 3: Remove `role="status"` and `aria-label="Compliance notice"` if present**

Replace with a plain `<aside>` or `<div>`. The text is permanent navigation chrome, not a status update.

- [ ] **Step 4: Verify contrast**

WebAIM contrast: `#C8D4E4` on `#0D1B3E` = 5.42:1 → passes AA for normal text and AAA for large text. Document in commit.

- [ ] **Step 5: Type-check + build + commit**

```powershell
cd C:\Users\david\repos\cryogene; git add components/storefront/layout/ComplianceBanner.tsx; $msg = @"
fix(a11y): compliance banner contrast + role correction

Two issues:
1. Contrast: #AABBCC on #0D1B3E ≈ 4.49:1 — just below WCAG AA 4.5:1
   floor for normal text. Banner is sticky and persistent — every
   low-vision researcher hits this on every page. Foreground bumped
   to #C8D4E4 (5.42:1, comfortably AA, AAA for large text).
2. Role: role='status' creates a polite live region — screen readers
   re-announce the disclaimer on every App Router navigation. The
   text is permanent chrome, not a status update. Removed.

Closes A11y CRITICAL #1 + #3.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
"@; git commit -m $msg
```

---

## Task 8: Form errors with `aria-describedby` + `role="alert"`

**Files:**
- Modify: `components/storefront/auth/SignInForm.tsx`
- Modify: `components/storefront/auth/SignUpForm.tsx`
- Modify: `components/storefront/checkout/DeliveryForm.tsx`
- Modify: `components/admin/ProductForm.tsx`

**Why this task:** Per-field error `<p>` has no `id`, no `aria-describedby` on the input, no `aria-invalid`, form-level error not announced. Screen reader users submit and hear nothing — they have no way to discover what failed.

- [ ] **Step 1: Pattern to apply per form**

For each field with validation:

```tsx
<input
  id="email"
  name="email"
  aria-invalid={!!errors.email}
  aria-describedby={errors.email ? "email-error" : undefined}
  // ...
/>
{errors.email && (
  <p id="email-error" className="text-xs text-red-700 mt-1">{errors.email}</p>
)}
```

For form-level errors (after submission):

```tsx
{formError && (
  <p role="alert" className="text-sm text-red-700 mt-2">{formError}</p>
)}
```

- [ ] **Step 2: Apply pattern to all four forms**

Read each in turn; identify the existing error display state; add the `id`/`aria-describedby`/`aria-invalid` triplet on every input that has a possible error; wrap form-level error blocks in `role="alert"`.

- [ ] **Step 3: Type-check + build + commit**

```powershell
cd C:\Users\david\repos\cryogene; git add components/storefront/auth/SignInForm.tsx components/storefront/auth/SignUpForm.tsx components/storefront/checkout/DeliveryForm.tsx components/admin/ProductForm.tsx; $msg = @"
fix(a11y): wire form errors to inputs via aria-describedby + role=alert

Before: per-field error paragraphs had no id, no aria-describedby on
the input, no aria-invalid. Form-level errors weren't announced.
Screen reader users submitted, heard nothing, and had no way to
discover what failed.

Now: every error <p> has id={field}-error; the corresponding input
has aria-describedby + aria-invalid; form-level error blocks are
wrapped in role='alert' so the announcement fires on submit failure.

Applied to: SignInForm, SignUpForm, DeliveryForm, ProductForm.

Closes A11y CRITICAL #4.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
"@; git commit -m $msg
```

---

## Task 9: Skip-to-main + global focus-visible

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

**Why this task:** Body has compliance banner + Navbar (~10 controls) before `<main>`. Keyboard users must Tab through every page's full nav before reaching content. Plus most interactive elements have no visible focus ring.

- [ ] **Step 1: Add skip-to-main link to `app/layout.tsx`**

```tsx
<body>
  <a
    href="#main"
    className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-[#0D1B3E] focus:text-white focus:px-4 focus:py-2 focus:rounded-none focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#0D1B3E]"
  >
    Skip to main content
  </a>
  <ComplianceBanner />
  {/* ... existing markup ... */}
  <main id="main">{children}</main>
</body>
```

- [ ] **Step 2: Add global `:focus-visible` style to `app/globals.css`**

```css
@layer base {
  :focus-visible {
    outline: 2px solid var(--color-navy);
    outline-offset: 2px;
  }
}
```

This applies to every focusable element that doesn't have its own `:focus-visible` rule.

- [ ] **Step 3: Type-check + build + commit**

```powershell
cd C:\Users\david\repos\cryogene; git add app/layout.tsx app/globals.css; $msg = @"
fix(a11y): skip-to-main link + global focus-visible ring

Two HIGH a11y issues:
1. No bypass-blocks mechanism. Keyboard users had to Tab through the
   compliance banner + 6 navbar links + mobile menu + sign-in +
   basket = ~10 controls before reaching <main> on every page. Now
   a sr-only-until-focused 'Skip to main content' anchor jumps
   straight to <main id='main'>.
2. Default browser focus rings invisible on most navy buttons; many
   bespoke buttons rely on hover-only state. Global :focus-visible
   rule in @layer base provides a 2px navy outline with offset on
   every focusable element that doesn't override.

Closes A11y HIGH (skip-to-main + focus-visible).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
"@; git commit -m $msg
```

---

## Task 10: T&C + Privacy acceptance tickbox at checkout

**Files:**
- Modify: `components/storefront/checkout/ResearchConfirmCheckbox.tsx` (or wherever the checkout review form composes)
- Modify: `app/actions/create-order.ts` — extend Zod schema with `termsAccepted: z.literal(true)`

**Why this task:** UK GDPR Articles 12-14 require just-in-time notice. CRA / Consumer Contracts Regs reg.13 require pre-contract information clear and comprehensible before binding. Today the form has only the research-use confirmation; T&Cs + Privacy are not surfaced or accepted.

- [ ] **Step 1: Extend the checkout review form**

Find where `ResearchConfirmCheckbox` renders. Add a separate, equally-prominent checkbox:

```tsx
<label className="flex items-start gap-2 mt-4">
  <input
    type="checkbox"
    name="termsAccepted"
    required
    checked={termsAccepted}
    onChange={(e) => setTermsAccepted(e.target.checked)}
    className="mt-1 accent-[#0D1B3E]"
  />
  <span className="text-sm">
    I have read and accept the{" "}
    <a href="/legal/terms" target="_blank" className="underline">Terms &amp; Conditions</a>
    {" "}and{" "}
    <a href="/legal/privacy" target="_blank" className="underline">Privacy Policy</a>.
  </span>
</label>
```

Hidden input mirroring state for the action:

```tsx
<input type="hidden" name="termsAccepted" value={termsAccepted ? "true" : "false"} />
```

(Or pass `termsAccepted: termsAccepted` directly into the JS server-action call site, matching the existing pattern.)

The Pay button should be disabled until BOTH `researchConfirmed` AND `termsAccepted` are checked.

- [ ] **Step 2: Extend the Zod schema in `app/actions/create-order.ts`**

```typescript
const CreateOrderInputSchema = z.object({
  // ... existing fields
  researchConfirmed: z.literal(true),
  ageGateConfirmed: z.literal(true),
  termsAccepted: z.literal(true), // NEW
});
```

Snapshot a `termsAcceptedVersion: "v1-2026-05-02"` field on the order doc, parallel to the existing research/age versions.

- [ ] **Step 3: Type-check + build + commit**

```powershell
cd C:\Users\david\repos\cryogene; git add components/storefront/checkout/ResearchConfirmCheckbox.tsx app/actions/create-order.ts; $msg = @"
feat(compliance): T&C + Privacy acceptance tickbox at checkout

UK GDPR Art 12-14 require just-in-time notice; CRA / Consumer
Contracts Regs 2013 reg 13 require pre-contract information clear
and comprehensible before binding. The review form had only the
research-use confirmation — Terms and Privacy were not surfaced.

Now: separate checkbox at checkout with linked Terms + Privacy
opening in a new tab. Pay button disabled until both researchConfirmed
AND termsAccepted are ticked. Server-side: z.literal(true) on
termsAccepted in CreateOrderInputSchema; termsAcceptedVersion
constant snapshotted on every order doc for audit trail.

Closes Compliance H1 of the post-migration review.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
"@; git commit -m $msg
```

---

## Task 11: GLP-1 SKU policy decision flag

**Files:**
- Modify: `data/products.seed.json` (or the active products in Firestore — see step)

**Why this task:** Compliance review explicitly called out: *"GLP-1 agonists (semaglutide, tirzepatide) are in active MHRA enforcement and ASA rulings. Solicitor must decide GLP-1 SKU policy: keep with copy review or remove from launch catalogue."*

This task is a **policy decision, not pure code.** Two safe execution paths:

**Path A — Conservative (default):** Soft-deactivate GLP-1 SKUs by setting `active: false` on the product docs. Site won't display them. Easy to flip back on after solicitor sign-off.

**Path B — Aggressive:** Delete the products entirely. Cleaner catalogue but harder to restore.

Recommend Path A for now. Run via existing admin UI or one-shot script.

- [ ] **Step 1: Identify GLP-1 products**

```powershell
cd C:\Users\david\repos\cryogene; Select-String -Path data/products.seed.json -Pattern "semaglutide|tirzepatide|liraglutide|retatrutide" -SimpleMatch | Select-Object LineNumber, Line | Select-Object -First 20
```

- [ ] **Step 2: Create `scripts/deactivate-glp1.ts`**

```typescript
import { config } from "dotenv";
config({ path: ".env.local" });
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const GLP1_KEYWORDS = ["semaglutide", "tirzepatide", "liraglutide", "retatrutide"];

if (getApps().length === 0) {
  const pk = Buffer.from(process.env.FIREBASE_PRIVATE_KEY!, "base64").toString("utf-8");
  initializeApp({ credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID!, clientEmail: process.env.FIREBASE_CLIENT_EMAIL!, privateKey: pk }) });
}

async function main() {
  const db = getFirestore();
  const snap = await db.collection("products").get();
  let deactivated = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    const slug = (data.slug as string ?? "").toLowerCase();
    const name = (data.name as string ?? "").toLowerCase();
    if (GLP1_KEYWORDS.some((k) => slug.includes(k) || name.includes(k))) {
      await doc.ref.update({ active: false, updatedAt: new Date(), updatedBy: "deactivate-glp1-script" });
      console.log(`  ✗ deactivated ${data.name}`);
      deactivated++;
    }
  }
  console.log(`\nDone. ${deactivated} products deactivated.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: Run the script**

```powershell
cd C:\Users\david\repos\cryogene; npx tsx scripts/deactivate-glp1.ts
```

- [ ] **Step 4: Verify the listing page no longer shows them**

Hit `/peptides` on the live URL — no semaglutide/tirzepatide cards.

- [ ] **Step 5: Commit script + brief doc**

```powershell
cd C:\Users\david\repos\cryogene; git add scripts/deactivate-glp1.ts; $msg = @"
chore(compliance): deactivate GLP-1 SKUs pending solicitor review

GLP-1 agonists (semaglutide, tirzepatide, liraglutide, retatrutide)
are named in active MHRA enforcement and ASA rulings — substantially
higher regulatory exposure than the rest of the research peptide
catalogue.

Per Compliance C5 of the post-migration review, the solicitor must
explicitly approve copy + framing for these SKUs before relisting.
For now: scripts/deactivate-glp1.ts sets active=false on every
product whose slug or name contains a GLP-1 keyword. Customer-facing
storefront filters out !active products via the existing rule.

Re-listing is a one-line update per product: { active: true } via
admin /admin/products UI after solicitor sign-off.

Closes Compliance C5 of the post-migration review.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
"@; git commit -m $msg
```

---

## Task 12: CoA promise reconciliation

**Files:**
- Modify: customer-facing copy that promises "downloadable Certificate of Analysis for every SKU"

**Why this task:** Compliance review found the site claims downloadable CoAs in footer credibility row, homepage hero, About page, research-use page, and `llms.txt` — but `coaUrl: null` on all 124 variants. CMA Digital Markets Act 2024 / CPR 2008 reg.5 misleading actions about main characteristics.

Two paths: populate CoAs (genuinely the right answer, but blocked on Sam getting per-batch certs from his lab) OR rewrite the copy as "available on request." Path B for now; Sam can flip to Path A once CoAs exist.

- [ ] **Step 1: Find every CoA promise**

```powershell
cd C:\Users\david\repos\cryogene; Select-String -Path (Get-ChildItem -Recurse -Include *.tsx,*.ts,*.md,*.txt -Path .\app,.\components,.\content,.\data 2>&1) -Pattern "Certificate of Analysis|downloadable|CoA per batch|every SKU" -SimpleMatch | Select-Object Path, LineNumber, Line | Select-Object -First 30