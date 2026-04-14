# Peptide Store — Plan 3: Checkout + Customer Accounts

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full checkout flow (delivery → review → stub payment → confirmation) and the customer account area (sign-in, sign-up, dashboard, order history, re-order, settings). Orders are written through a Server Action with a Firestore transaction when Firebase is configured, or through a local-file-backed seed store during Stage 1a. Guest checkout is fully supported; account creation is offered optionally at delivery step and again on the confirmation page.

**Architecture:** Checkout is three routes (`/checkout/delivery`, `/checkout/review`, `/checkout/confirmation/[orderId]`) on a server-authoritative state machine. Delivery data persists in a signed cookie between steps (not in Zustand, to keep PII client-side minimum). Order creation runs inside a Firestore transaction (or a local-file atomic write in Stage 1a) that reads current prices, decrements stock, generates an order number, and links to the customer if signed in. Payment uses the `PaymentProvider` interface with the `stub` implementation; the `truelayer` implementation is scaffolded (throws) in Plan 3 and activated in Phase 2.

**Tech Stack:** Firebase Auth client SDK, Firebase Admin SDK for server-side order writes, Resend for transactional email, Zod for validation, `iron-session` or Next.js signed cookies for multi-step checkout state.

**Spec reference:** `docs/superpowers/specs/2026-04-13-peptide-store-phase1-design.md` Sections 9, 6.2, 6.3.

**Delivers at end of plan:** Guest users can complete a stub-payment checkout end-to-end. Logged-in users (once Firebase is wired in Stage 1b) get pre-filled delivery details, order history, re-order capability, and downloadable COAs per order. Contact form writes to `enquiries` store and sends both a customer confirmation email and a Sam notification email via Resend. All orders persist to `data/orders.local.json` in Stage 1a or to Firestore in Stage 1b without any code change.

**Testing strategy:** Manual end-to-end run through the checkout flow in dev mode, with a local-file-backed orders store that can be inspected after each test order.

**Assumed handoffs from Plan 2:**
- `lib/basket.ts` Zustand store with `items`, `subtotalInPence`, `clearBasket`
- `lib/products.ts` data layer with `getProductBySlug`
- `lib/firebase/client.ts` and `lib/firebase/admin.ts` gated by env-var presence (inactive in Stage 1a)
- `Product`, `Order`, `Customer`, `Enquiry` types in `types/`
- Navbar, Footer, compliance infrastructure wrapping every page
- Stub `/checkout` route (replaced in this plan)

---

## Review notes from Plan 2

> **Populated by Opus during the end-of-Plan-2 review.** If this still says "Awaiting review" when Sonnet opens this file, **STOP** and confirm the Opus review has been run.

**Status:** ✅ **APPROVED with scope change** — reviewed by Opus 2026-04-14 via Playwright against the running dev server. Plan 2 execution is sound. Visual taste check passes. However, **Sam has delivered a material client update** that reshapes the product catalogue and brand identity before Plan 3 starts. The scope change is documented in section **S1** below and must be actioned at the top of Plan 3 (before any checkout work begins).

**Git log range:** Plan 2 commits `a47fba4..ce0590c` (13 task commits + 1 smoke-test milestone). Plus post-review branding commit `40e6342` (applied by Opus).

---

### Visual taste check ✅

The storefront lands boutique-editorial, not generic-Shopify. Screenshots at `C:\tmp\peptide-shots\`. Concrete confirmation:

- **Homepage hero** — Cormorant Garamond h1 ("Research-grade peptides, documented to the batch.") with line break as editorial pull-quote, small-caps `UK Research Supply` eyebrow, square zero-radius navy CTAs. Reads closer to Aesop/Le Labo than Shopify-in-navy.
- **PDP** — JetBrains Mono chemistry data row (`CAS · molecular formula · molecular weight`) + label-editorial PURITY/TESTED badges read like a museum specimen card. This is exactly the right register for a regulated research supplier.
- **Filter URL state** — `/peptides?sizes=5mg&methods=HPLC&instock=1` survives reload, shareable, filter clearing works.
- **Basket flow** — Drawer opens on add, quantity stepper works, subtotal recomputes, remove clears to empty state, `/basket` full page mirrors drawer state, survives refresh via localStorage with no hydration warnings.

**Taste refinements (not blockers, do not action now):**
1. The hero image is the placeholder vial SVG and is doing the work of what should be a real editorial photograph. This won't fix itself — Sam needs to commission a moody lab still-life, or we brief an Actually AI generative image for Plan 5. Add to Plan 5's content task list.
2. The homepage is eight vertically stacked sections with similar generous whitespace. One **off-grid moment** (asymmetric split, oversized serif pull-quote, or a horizontal product shelf) would push it from "tasteful" to "distinctive". Defer to Plan 5 SEO/content pass — it's a homepage edit, not architecture.

---

### Drift from Plan 2 (all sound, no corrective action needed)

1. **`app/page.tsx` re-export shim kept** — Sonnet discovered that Next.js 16's build-time type validator generates `validator.ts` with a hard-coded import from `../../../app/page.js`, and this does NOT traverse route groups to find `app/(public)/page.tsx`. Deleting `app/page.tsx` breaks the build. The shim `export { default } from "./(public)/page"` is the correct architectural solution: it satisfies the validator, only one `/` route exists at runtime, and it preserves the `(public)/(admin)` route-group separation that Plan 4 depends on. **Keep this permanently.** Do not try to "clean up" by moving the homepage out of the route group — Plan 4's admin layout assumes `(public)` and `(admin)` siblings.

2. **Legal `updated` Date rendering fix** — `gray-matter` parses unquoted YAML dates (`updated: 2026-04-13`) as JavaScript `Date` objects, which React refuses to render as a child. All six legal pages were throwing HTTP 500 during Task 14's smoke test. Sonnet widened the type to `string | Date` and added a runtime `instanceof Date` guard. This is defensive-coded but correct — it also protects against future editors who drop quotes. **Do not refactor** by quoting the YAML dates; the runtime guard is the more resilient pattern.

3. **Hydration guard pattern (review note C3 from Plan 1)** — Applied to both `BasketIconButton` (count = 0 until mounted, badge gated on `mounted && count > 0`) and `BasketDrawer` (`if (!mounted) return null`). Both tested visually, no React 19 hydration warnings. The BasketDrawer's "return null until mounted" is slightly heavier than the IconButton's "render with zero state" pattern, but because the drawer is only ever an overlay, it's fine.

4. **SVG images use `unoptimized`, not `dangerouslyAllowSVG`** — Per review note C5. Every `<Image>` in Plan 2 that serves from `/public/*.svg` has `unoptimized`. The `next.config.ts` does NOT need `dangerouslyAllowSVG: true` because we're not pulling SVGs from a remote URL. When Sam's real product photography arrives in Plan 5 (as raster images from Firebase Storage), the `remotePatterns` config Sonnet added for `firebasestorage.googleapis.com` takes over.

5. **Blended route group for `(public)` is pass-through** — `app/(public)/layout.tsx` currently just returns `<>{children}</>`. Keep it this way. In Plan 4 it may need to become a real layout wrapper if we want public-only providers (e.g. an analytics wrapper that doesn't load in admin). Until then, pass-through is correct.

---

### Emergent utilities & patterns Plan 3 should reuse

- **`formatPriceFromPence(pence: number): string`** — Exported from `lib/basket.ts`. Handles all pence→£ formatting site-wide. Plan 3's order confirmation emails and invoice views **must** use this — do not reinvent.
- **URL query-param filter pattern** — `ProductFilters.tsx` uses `useRouter().replace(url, { scroll: false })` with `URLSearchParams`. Reuse the same pattern if Plan 3's `/account/orders` list gets filters (status, date range).
- **`useHasMounted` inline pattern** — `const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), []);` Used in both BasketIconButton and BasketDrawer. If Plan 3 adds any Zustand-backed account state (e.g. recently-viewed products), apply the same guard. Do NOT factor this into a shared hook yet — premature abstraction.
- **Server Action + Zod + `useActionState` pattern** — Established in `app/actions/contact.ts` + `app/(public)/contact/page.tsx`. Plan 3's checkout form (`app/actions/checkout.ts`) and customer account forms (`app/actions/profile.ts`) **must** follow the same pattern: `_prevState, formData` signature → `safeParse` → error-map → return typed state. Import `useActionState` from `"react"`, NOT from `"react-dom"` (that's the React 18 API).
- **Category label derivation** — `ProductDetail.tsx` has an inline ternary: `product.category === "peptides" ? "Research Peptides" : ...`. Plan 3 order confirmation emails will need the same mapping. Consider extracting to `lib/categories.ts` as `getCategoryLabel(category: ProductCategory): string` at the start of Plan 3. **YAGNI check:** only extract if Plan 3 uses it in ≥2 places.
- **Breadcrumb convention** — `<nav aria-label="Breadcrumb" className="label-editorial">Home / Category / Item</nav>`. Plan 3's `/account/*` and `/checkout/*` pages should use the same structure for consistency.

---

### S1 — CLIENT SCOPE CHANGE: Cryogene brand + new product catalogue

**Between Plan 2 completion and this review, Sam delivered two documents** — `Cryogene.docx` (SOW-2026-001 update) and `Product_List.csv` (120 confirmed SKUs). These constitute a material scope change that rewrites the product catalogue Plan 2 built against. Plan 3 must action this before any checkout work.

#### S1.1 Brand name confirmed: **Cryogene**

The store is called **Cryogene**. Domain is **cryogene.co.uk** (not yet registered by the client — use the URL throughout the codebase; it will resolve when they buy it and point it at Vercel). Legal registered address still TBC — currently hardcoded as `[ADDRESS TBC]` in the Footer.

**Already applied by Opus in post-review commit `40e6342`:**
- `components/storefront/layout/Navbar.tsx` — wordmark `[PEPTIDE STORE]` → `Cryogene`
- `components/storefront/layout/Footer.tsx` — copyright `© 2026 [Store Name]` → `© 2026 Cryogene`, address → `[ADDRESS TBC]`
- `app/layout.tsx` — metadata `default` title → `Cryogene — UK Research Peptides, HPLC-Tested & Documented`, `template` → `%s | Cryogene`, `metadataBase` → `new URL("https://cryogene.co.uk")`

**Still outstanding (for Plan 3 Task 0 to handle):**
- Legal page markdown (`content/legal/*.md`) still references "the site" generically — add a small introduction block referencing Cryogene by name. Do this at the START of Plan 3 before Firebase work.
- `app/(public)/about/page.tsx` — currently uses `[DRAFT — TO BE ADAPTED BY SAM]` placeholders. Plan 3 should insert a single passing reference to Cryogene in the opening paragraph; full copy stays deferred to Plan 5.
- **Plan 4** (admin) — `lib/storeConfig.ts` was going to read `storeName` from a Firestore config doc. Set the default to `"Cryogene"` (was `"[PEPTIDE STORE]"` in the plan text — Plan 4 Task text at line 576 and 579 needs updating to `"Cryogene"` and drop `[ADDRESS]`). Sonnet of Plan 4 should not need to be reminded; this note is here for the Plan-4 Opus review.
- **Plan 5** (SEO/content) — robots.txt, sitemap.xml, JSON-LD Organization object, Open Graph `og:site_name` all need Cryogene applied. Already in Plan 5's scope.

#### S1.2 Product catalogue: 120 SKUs, not 25 speculative

Sam's `Product_List.csv` has **120 confirmed peptide SKUs + 10 research supplies**. Our current `data/products.seed.json` has 25 speculative products across peptides/capsules/mixers that Sam never asked for. The specific mismatches:

| What Plan 2 built | What Sam actually sells |
|---|---|
| 12 peptides | **120** peptides (some with up to 12 variants — e.g. Tirzepatide 5–120mg) |
| 8 "Research Capsules" | ❌ **No capsules category.** Sam does not stock encapsulated products. |
| 5 "Mixers & Solvents" | Bacteriostatic water + acetic acid water are under **Peptides** in Sam's CSV but are really mixers |
| No "Research Supplies" category | **10 supplies SKUs** — petri dishes, sterile vials, alcohol swabs, nitrile gloves (S/M/L), pipettes, pH strips, syringe filters, lab notebook |
| Individual vials | **All products sell in packs of 10 vials** (except research supplies in their own pack sizes) |
| Full prices in seed | **No prices yet** — Sam hasn't confirmed pricing. Use `priceInPence: 0` as placeholder |
| No blended product concept | **5 blended SKUs** — BB10/BB20/CP10/BBG70/Klow80 are multi-compound blends that need a different UI treatment |
| 4 generic "HGH" mentions | **HGH explicitly excluded** — SKUs H10/H12/H15/H24 must NOT appear in the catalogue (client decision) |

**Decision for Plan 3 Task 0:** Rewrite `data/products.seed.json` from Sam's CSV. Specifically:

1. **Category taxonomy change.** Collapse from `peptides | capsules | mixers` to `peptides | mixers | supplies`.
   - Drop `capsules` category entirely. No capsule SKUs in Sam's list → no URL, no nav link, no filter.
   - `mixers` category gets: `WA10`, `WA20`, `WA30` (Bacteriostatic Water 10/20/30ml), `AA10` (Acetic Acid Water 10ml). Move these out of the CSV's "Peptides" bucket into `mixers` in our data model.
   - Add new `supplies` category. Nav label: "Research Supplies". Populate from the 10 `RS-*` SKUs.
   - Update `types/product.ts` `ProductCategory` union: `"peptides" | "mixers" | "supplies"`.
   - Update `Footer.tsx` Shop column links.
   - Update `Navbar.tsx` nav links — replace "Capsules" with "Supplies".
   - Update homepage category cards — Research Peptides / Mixers & Solvents / Research Supplies.
   - Delete `app/(public)/capsules/` folder (route + `[slug]` subroute).
   - Update the `ProductListingPage` category descriptions.

2. **Variant grouping.** Sam's CSV has one row per SKU (e.g. `TR5, Tirzepatide, 5mg` / `TR10, Tirzepatide, 10mg` / ... / `TR120, Tirzepatide, 120mg`). These need to be **grouped into a single `Product` with multiple `ProductVariant` entries** in our data model. The `slug` for the product group should be the lowercase dash-separated product name (e.g. `tirzepatide`), and each variant gets its own `sku` from Sam's code (TR5, TR10, ...) and its own `size` ("5mg", "10mg", ...).

3. **Placeholder pricing.** Every variant gets `priceInPence: 0` until Sam confirms pricing. The PDP, ProductCard, and basket need to handle the £0.00 case gracefully — **do not** show `Out of stock` or hide the product. Instead, when `priceInPence === 0`, display `"Pricing TBC"` in place of the price and disable the "Add to basket" button with tooltip/label "Pricing to be confirmed". This is a new rendering branch in `VariantSelector.tsx` and `ProductCard.tsx`. Add to Plan 3 Task 0.

4. **Blended products.** The 5 blends (BB10, BB20, CP10, BBG70, Klow80) are products where a single variant contains multiple peptide compounds (e.g. `TB500 10mg + BPC-157 10mg + GHK-CU 50mg`). These need:
   - New field on `Product`: `composition: Array<{ compound: string; amount: string }>` — optional, present only on blended products.
   - Or a flag `isBlend: boolean` and a parsed `blendComponents` array.
   - PDP should render a `BlendedProductComposition` component (new, build in Plan 3 Task 0) that shows the compound breakdown in a hairline-bordered table below the h1, e.g.:
     ```
     BLEND COMPOSITION
     ─────────────────
     TB-500       10mg
     BPC-157      10mg
     GHK-Cu       50mg
     ```
   - ProductCard should add a small "BLEND" pill next to the CAS number for these products.
   - Don't over-engineer: these products don't have a CAS number (they're multi-compound), so `casNumber` should be `null` for blends and the PDP chemistry row should hide the CAS field when null.

5. **Pack size field.** Sam's CSV shows `Pack Size: 10 vials` for every peptide. Add a `packSize: string` field on `ProductVariant` (e.g. `"10 vials"`, or for supplies `"Pack of 100"`). Display on the PDP under the variant size. This is new — not in Plan 2's data model.

6. **HGH exclusion is enforced at the data seed level**, not at runtime. Simply don't include H10/H12/H15/H24 in the JSON. No filter, no flag. If Sam later changes his mind, add them to the seed (or via admin overlay in Plan 4).

7. **Chemistry data is MISSING for most SKUs.** Sam's CSV has `SKU, Category, Product Name, Variant, Pack Size, Price, Notes` only. There is no CAS number, molecular formula, molecular weight, purity, or testing method data. Plan 2 required all of these for the PDP chemistry row. **Plan 3 Task 0 options:**
   - **(a)** Research CAS numbers and molecular formulas for all ~60 distinct compounds via WebSearch/WebFetch from PubChem / ChemSpider / DrugBank, populating the seed directly. This is ~3–4 hours of subagent work. **Recommended for real products** so the PDP doesn't render empty chemistry rows.
   - **(b)** Make the chemistry fields optional on the `Product` type and have the PDP hide the chemistry row entirely when all fields are null. Useful as a fallback for blends and supplies.
   - **Plan 3 Task 0 should do both:** widen the types to optional, AND populate the major compounds (the 30–40 most common peptides) via subagent research. Blends and supplies legitimately have no chemistry data and should render without the row.

#### S1.3 TrueLayer MCP server must be connected before Plan 3's payment work

Sam's docx confirms TrueLayer (already in Plan 1's env var scaffolding — good). But it adds a new instruction:

> "Connect the TrueLayer MCP server to Claude Code before building Phase 2. This allows Claude Code to query the TrueLayer API directly during development."

MCP docs: https://docs.truelayer.com/docs/truelayer-mcp-integration-for-claude-ai

**Action for David (human, not Sonnet):** Install and authenticate the TrueLayer MCP server in Claude Code BEFORE resuming Plan 3. Sonnet cannot do this — MCP server installation is user-side.

**Action for Plan 3 Sonnet:** At the start of the TrueLayer integration task, verify that `mcp__truelayer__*` tools are available via `ToolSearch`. If they aren't, stop and tell David to connect the MCP before proceeding.

Also confirmed from the docx:
- **Sandbox base URL:** `https://api.truelayer-sandbox.com`
- **Production base URL:** `https://api.truelayer.com`
- **Web SDK:** `@truelayer/web-sdk`
- **Signup+ for age verification:** Include the Signup+ scope when creating a payment to trigger bank-level identity + age check. This is STRONGER than a frontend checkbox and Sam wants it enabled. Plan 3's payment-initiate route must set this scope.
- **Return URL:** `NEXT_PUBLIC_TRUELAYER_RETURN_URL=https://cryogene.co.uk/checkout/confirm`
- **API routes to build (per Sam's brief — matches Plan 3 existing scope):** `POST /api/checkout/initiate`, `POST /api/webhooks/truelayer`, `GET /api/checkout/status/[paymentId]`

#### S1.4 Royal Mail Click and Drop (Phase 3, not Plan 3)

Not a Plan 3 concern — Phase 3 is admin fulfilment work. Noted here for visibility:
- Courier confirmed: Royal Mail Click and Drop
- API docs: https://developer.royalmail.net/node/1384
- Env vars `ROYAL_MAIL_API_KEY`, `ROYAL_MAIL_ACCOUNT_NUMBER` — add to `.env.example` during Plan 3's env-var pass
- Printer confirmed: Zebra ZD421 Wi-Fi (cloud-enabled, cloud print job — no local server)
- Flow: On `order.status === 'paid'` → create Click & Drop order → receive label PDF → send to Zebra PrintConnect → store `trackingNumber` + `courierReference` on the order doc → dispatch email with tracking link
- **Plan 4 admin UI** will need to show these fields on the order detail view; Plan 4 spec should be amended

---

### Adjustments to Plan 3 tasks

**Insert `Task 0` at the top of Plan 3** (before "Task 1: Install dependencies"). Task 0 is the Cryogene catalogue migration, broken down as:

- **Task 0.1:** Update `types/product.ts` — change `ProductCategory` to `"peptides" | "mixers" | "supplies"`. Add `packSize: string` to `ProductVariant`. Make `casNumber`, `molecularFormula`, `molecularWeight`, `purity`, `testingMethod` optional on `Product`. Add optional `composition: Array<{ compound: string; amount: string }>` for blended products.

- **Task 0.2:** Dispatch a research subagent to build `data/products.seed.json` from `C:\Users\david\OneDrive\Desktop\Product_List.csv`. The subagent's brief:
  - Parse the CSV
  - Group variants by product name (so `TR5, TR10, TR15, ..., TR120` become one `Tirzepatide` product with 12 variants)
  - Exclude H10/H12/H15/H24
  - Route `WA*` and `AA*` into `mixers` category
  - Route `RS-*` into new `supplies` category
  - Route all others into `peptides` category
  - For each distinct peptide compound, research CAS number + molecular formula + molecular weight from PubChem via WebFetch and populate the chemistry fields. Blends get `casNumber: null` + `composition: [...]`.
  - Set `priceInPence: 0` for every variant, `coaUrl: null`, `active: true`, `stock: 100` (placeholder)
  - Use placeholder vial SVG `/placeholder-vial.svg` as the single image for all products (Sam's photography is Phase 3)

- **Task 0.3:** Delete `app/(public)/capsules/` directory (route + `[slug]` subroute). Delete any imports that referenced `"capsules"` as a category.

- **Task 0.4:** Create `app/(public)/supplies/page.tsx` and `app/(public)/supplies/[slug]/page.tsx` mirroring the `peptides` routes but with category `"supplies"` and label `"Research Supplies"`.

- **Task 0.5:** Update `components/storefront/layout/Navbar.tsx` nav links: replace `{ href: "/capsules", label: "Capsules" }` with `{ href: "/supplies", label: "Supplies" }`. Order: Peptides / Mixers / Supplies / Product Info / About / Contact.

- **Task 0.6:** Update `components/storefront/layout/Footer.tsx` Shop column: same swap.

- **Task 0.7:** Update `app/(public)/page.tsx` homepage — category cards section. Three cards: Research Peptides / Mixers & Solvents / Research Supplies. Update the "Recently added" CTA to link to `/peptides` (unchanged).

- **Task 0.8:** Create `components/storefront/products/BlendedProductComposition.tsx` for blended products. Invoked from `ProductDetail.tsx` when `product.composition?.length > 0`. Also: `ProductCard.tsx` should render a small "BLEND" pill next to the CAS number area when `product.composition` is present.

- **Task 0.9:** Extend `VariantSelector.tsx` to handle `priceInPence: 0` → render `"Pricing TBC"` and disable Add-to-Basket with label `"Pricing to be confirmed"`. Same for `ProductCard.tsx` — `From £0.00` becomes `From: pricing TBC`.

- **Task 0.10:** Update `ProductDetail.tsx` chemistry row to conditionally hide individual `<dl>` entries when their value is null (for blends and supplies).

- **Task 0.11:** Run `npm run build`, verify all 120 products statically generate, visually spot-check one peptide / one blend / one supply / one mixer.

- **Task 0.12:** Commit as a single milestone: `feat: migrate to Cryogene 120-SKU catalogue (Sam SOW-2026-001)`.

**After Task 0 completes, Plan 3's existing Task 1 onwards proceeds as originally written** — no other task re-ordering needed. The Firebase, TrueLayer, Resend, and checkout work all build on top of the new catalogue without further changes.

**One Plan-3-specific content note:** the Plan 3 text at `line 576` and `line 579` currently references `storeName: "[PEPTIDE STORE]"` and `registeredAddress: "[ADDRESS]"` as defaults for the config doc. Plan 3 Sonnet should update these to `"Cryogene"` and `"[ADDRESS TBC]"` when implementing that task — no separate task needed, just substitute when writing the code.

---

### Unresolved issues to watch in Plan 3

- **Chemistry data research** (Task 0.2) is ~3–4 hours of subagent time. It can be parallelised across 3–4 subagents each researching ~15 compounds. Budget 1 hour wall-clock if parallelised correctly.
- **`active` field on variants** — Plan 1 had this. Plan 2 uses it in VariantSelector. No change in Plan 3, just flagging for awareness.
- **Sam's notes column in the CSV is mostly blank** but two entries flag "Blended product". If there are products with notes we haven't read, the migration subagent should surface them in its report.
- **Pricing placeholder UX** — showing "Pricing TBC" with a disabled CTA may feel broken to a first-time visitor landing on the site during the pre-launch window. Consider adding a small `"Request pricing"` link that opens `/contact?subject=Pricing%20enquiry&product=...`. Decide during Task 0.9 — if it takes more than 15 min to wire, defer to Plan 5.
- **`[PEPTIDE STORE]` references in Plan docs 01/02/04/05** — historical records, do not touch. The branding drift is captured here; no rewrite of closed plans.
- **leaveSite Server Action** still redirects to `https://www.google.com` as a placeholder — leave until Plan 5 when Sam can decide on the destination (NHS research use page? Gov.uk research licensing page?).

---

**Handoffs to Plan 4 (Admin UI):**
- `lib/orders.ts` data-layer functions with `getOrders`, `getOrderById`, `updateOrderStatus` — admin reads and writes through these
- `lib/customers.ts` with `getCustomers`, `getCustomerById`
- `lib/enquiries.ts` with `getEnquiries`, `markEnquiryStatus`
- Order data model fully populated for each test order — admin can list and edit them
- `PaymentProvider` abstraction in `lib/payments/` — admin can view payment status fields

---

## Task 1: Install dependencies (Resend, iron-session for checkout cookie)

- [ ] **Step 1: Install**

```bash
npm install resend iron-session
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: install resend and iron-session for checkout and transactional email"
```

---

## Task 2: Create data-layer stubs for orders, customers, enquiries (seed-mode + Firestore paths)

**Files:**
- Create: `lib/orders.ts`
- Create: `lib/customers.ts`
- Create: `lib/enquiries.ts`
- Create: `data/.gitkeep` (ensure directory exists)
- Modify: `.gitignore` (add `data/orders.local.json`, `data/customers.local.json`, `data/enquiries.local.json`, `data/counters.local.json`)

- [ ] **Step 1: Update `.gitignore`**

Append to `.gitignore`:

```
# Local seed data writes (contain fake PII, never committed)
data/orders.local.json
data/customers.local.json
data/enquiries.local.json
data/counters.local.json
```

- [ ] **Step 2: Create `lib/orders.ts`**

```typescript
import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type { Order, OrderStatus } from "@/types";
import { getAdminDb } from "@/lib/firebase/admin";

const LOCAL_ORDERS_PATH = path.join(process.cwd(), "data", "orders.local.json");
const LOCAL_COUNTERS_PATH = path.join(process.cwd(), "data", "counters.local.json");

function useSeed(): boolean {
  const db = getAdminDb();
  return db === null;
}

async function readLocalOrders(): Promise<Order[]> {
  try {
    const raw = await fs.readFile(LOCAL_ORDERS_PATH, "utf-8");
    return JSON.parse(raw) as Order[];
  } catch {
    return [];
  }
}

async function writeLocalOrders(orders: Order[]): Promise<void> {
  await fs.writeFile(LOCAL_ORDERS_PATH, JSON.stringify(orders, null, 2), "utf-8");
}

async function nextOrderNumber(): Promise<string> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  if (useSeed()) {
    let counters: Record<string, number> = {};
    try {
      counters = JSON.parse(await fs.readFile(LOCAL_COUNTERS_PATH, "utf-8"));
    } catch {}
    counters[today] = (counters[today] ?? 0) + 1;
    await fs.writeFile(LOCAL_COUNTERS_PATH, JSON.stringify(counters), "utf-8");
    return `PPT-${today}-${String(counters[today]).padStart(4, "0")}`;
  }

  const db = getAdminDb()!;
  const counterRef = db.doc(`config/orderCounters/${today}`);
  const counter = await db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const next = (snap.exists ? (snap.data()!.count as number) : 0) + 1;
    tx.set(counterRef, { count: next });
    return next;
  });
  return `PPT-${today}-${String(counter).padStart(4, "0")}`;
}

export async function createOrderRecord(order: Omit<Order, "id">): Promise<Order> {
  if (useSeed()) {
    const orders = await readLocalOrders();
    const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const withId = { ...order, id } as Order;
    orders.push(withId);
    await writeLocalOrders(orders);
    return withId;
  }
  const db = getAdminDb()!;
  const ref = db.collection("orders").doc();
  await ref.set({ ...order, id: ref.id });
  return { ...order, id: ref.id } as Order;
}

export async function getOrders(options?: {
  customerUid?: string;
  status?: OrderStatus;
  limit?: number;
}): Promise<Order[]> {
  if (useSeed()) {
    let results = await readLocalOrders();
    if (options?.customerUid) {
      results = results.filter((o) => o.customer.uid === options.customerUid);
    }
    if (options?.status) {
      results = results.filter((o) => o.status === options.status);
    }
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }
    return results.sort(
      (a, b) =>
        new Date(b.createdAt as string).getTime() -
        new Date(a.createdAt as string).getTime()
    );
  }
  const db = getAdminDb()!;
  let query = db.collection("orders").orderBy("createdAt", "desc");
  if (options?.customerUid) {
    query = query.where("customer.uid", "==", options.customerUid);
  }
  if (options?.status) {
    query = query.where("status", "==", options.status);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  const snap = await query.get();
  return snap.docs.map((d) => d.data() as Order);
}

export async function getOrderById(id: string): Promise<Order | null> {
  if (useSeed()) {
    const orders = await readLocalOrders();
    return orders.find((o) => o.id === id) ?? null;
  }
  const db = getAdminDb()!;
  const snap = await db.doc(`orders/${id}`).get();
  return snap.exists ? (snap.data() as Order) : null;
}

export async function updateOrder(id: string, patch: Partial<Order>): Promise<void> {
  if (useSeed()) {
    const orders = await readLocalOrders();
    const idx = orders.findIndex((o) => o.id === id);
    if (idx === -1) throw new Error(`Order ${id} not found`);
    orders[idx] = { ...orders[idx], ...patch, updatedAt: new Date().toISOString() } as Order;
    await writeLocalOrders(orders);
    return;
  }
  const db = getAdminDb()!;
  await db.doc(`orders/${id}`).update({ ...patch, updatedAt: new Date() });
}

export { nextOrderNumber };
```

- [ ] **Step 3: Create `lib/customers.ts`**

```typescript
import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type { Customer } from "@/types";
import { getAdminDb } from "@/lib/firebase/admin";

const LOCAL_CUSTOMERS_PATH = path.join(process.cwd(), "data", "customers.local.json");

function useSeed(): boolean {
  return getAdminDb() === null;
}

async function readLocal(): Promise<Customer[]> {
  try {
    return JSON.parse(await fs.readFile(LOCAL_CUSTOMERS_PATH, "utf-8"));
  } catch {
    return [];
  }
}

async function writeLocal(customers: Customer[]): Promise<void> {
  await fs.writeFile(LOCAL_CUSTOMERS_PATH, JSON.stringify(customers, null, 2), "utf-8");
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  if (useSeed()) {
    const list = await readLocal();
    return list.find((c) => c.id === id) ?? null;
  }
  const snap = await getAdminDb()!.doc(`customers/${id}`).get();
  return snap.exists ? (snap.data() as Customer) : null;
}

export async function getCustomerByEmail(email: string): Promise<Customer | null> {
  if (useSeed()) {
    const list = await readLocal();
    return list.find((c) => c.email === email) ?? null;
  }
  const snap = await getAdminDb()!
    .collection("customers")
    .where("email", "==", email)
    .limit(1)
    .get();
  return snap.empty ? null : (snap.docs[0]!.data() as Customer);
}

export async function upsertCustomer(customer: Customer): Promise<void> {
  if (useSeed()) {
    const list = await readLocal();
    const idx = list.findIndex((c) => c.id === customer.id);
    if (idx === -1) list.push(customer);
    else list[idx] = customer;
    await writeLocal(list);
    return;
  }
  await getAdminDb()!.doc(`customers/${customer.id}`).set(customer, { merge: true });
}

export async function getCustomers(limit?: number): Promise<Customer[]> {
  if (useSeed()) {
    const list = await readLocal();
    return limit ? list.slice(0, limit) : list;
  }
  let query = getAdminDb()!.collection("customers").orderBy("createdAt", "desc");
  if (limit) query = query.limit(limit);
  const snap = await query.get();
  return snap.docs.map((d) => d.data() as Customer);
}

export async function incrementCustomerStats(
  uid: string,
  orderTotalInPence: number
): Promise<void> {
  const existing = await getCustomerById(uid);
  if (!existing) return;
  await upsertCustomer({
    ...existing,
    orderCount: existing.orderCount + 1,
    lifetimeValueInPence: existing.lifetimeValueInPence + orderTotalInPence,
  });
}
```

- [ ] **Step 4: Create `lib/enquiries.ts`**

```typescript
import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type { Enquiry, EnquiryStatus } from "@/types";
import { getAdminDb } from "@/lib/firebase/admin";

const LOCAL_ENQUIRIES_PATH = path.join(process.cwd(), "data", "enquiries.local.json");

function useSeed(): boolean {
  return getAdminDb() === null;
}

async function readLocal(): Promise<Enquiry[]> {
  try {
    return JSON.parse(await fs.readFile(LOCAL_ENQUIRIES_PATH, "utf-8"));
  } catch {
    return [];
  }
}

async function writeLocal(list: Enquiry[]): Promise<void> {
  await fs.writeFile(LOCAL_ENQUIRIES_PATH, JSON.stringify(list, null, 2), "utf-8");
}

export async function createEnquiry(data: Omit<Enquiry, "id" | "createdAt" | "status">): Promise<Enquiry> {
  const enquiry: Enquiry = {
    ...data,
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    status: "new",
    createdAt: new Date().toISOString(),
  };

  if (useSeed()) {
    const list = await readLocal();
    list.push(enquiry);
    await writeLocal(list);
    return enquiry;
  }
  const db = getAdminDb()!;
  const ref = db.collection("enquiries").doc();
  enquiry.id = ref.id;
  await ref.set(enquiry);
  return enquiry;
}

export async function getEnquiries(status?: EnquiryStatus): Promise<Enquiry[]> {
  if (useSeed()) {
    const list = await readLocal();
    return status ? list.filter((e) => e.status === status) : list;
  }
  let query = getAdminDb()!.collection("enquiries").orderBy("createdAt", "desc");
  if (status) query = query.where("status", "==", status);
  const snap = await query.get();
  return snap.docs.map((d) => d.data() as Enquiry);
}

export async function updateEnquiryStatus(id: string, status: EnquiryStatus): Promise<void> {
  if (useSeed()) {
    const list = await readLocal();
    const idx = list.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error(`Enquiry ${id} not found`);
    list[idx] = { ...list[idx]!, status };
    await writeLocal(list);
    return;
  }
  await getAdminDb()!.doc(`enquiries/${id}`).update({ status });
}
```

- [ ] **Step 5: Verify typecheck and commit**

```bash
npx tsc --noEmit
git add -A
git commit -m "feat: add orders, customers, enquiries data-layer with seed-mode fallback"
```

---

## Task 3: Create payment provider interface and stub implementation

**Files:**
- Create: `lib/payments/provider.ts`
- Create: `lib/payments/stub.ts`
- Create: `lib/payments/truelayer.ts` (scaffolded, throws in Phase 1; implementation lands in Phase 2)
- Create: `lib/payments/index.ts`

- [ ] **Step 1: Define the interface**

```typescript
// lib/payments/provider.ts
import type { Order } from "@/types";

export type PaymentInitiationResult = {
  redirectUrl: string;
  providerRef: string;
};

export type PaymentProvider = {
  name: "stub" | "truelayer";
  initiatePayment(order: Order): Promise<PaymentInitiationResult>;
  verifyWebhook(request: Request): Promise<{ valid: boolean; event: unknown }>;
  parseWebhookEvent(event: unknown): {
    orderId: string;
    status: "paid" | "failed";
    providerRef: string;
  };
};
```

- [ ] **Step 2: Implement the stub**

```typescript
// lib/payments/stub.ts
import "server-only";
import type { PaymentProvider } from "./provider";
import { updateOrder } from "@/lib/orders";

export const stubProvider: PaymentProvider = {
  name: "stub",
  async initiatePayment(order) {
    await updateOrder(order.id, {
      status: "paid",
      payment: {
        ...order.payment,
        provider: "stub",
        providerRef: `STUB-${order.id}`,
        paidAt: new Date().toISOString() as unknown as Date,
      },
    });
    return {
      redirectUrl: `/checkout/confirmation/${order.id}?stub=true`,
      providerRef: `STUB-${order.id}`,
    };
  },
  async verifyWebhook() {
    return { valid: false, event: null };
  },
  parseWebhookEvent() {
    throw new Error("Stub provider does not receive webhooks");
  },
};
```

- [ ] **Step 3: Scaffold TrueLayer**

```typescript
// lib/payments/truelayer.ts
import "server-only";
import type { PaymentProvider } from "./provider";

/**
 * TrueLayer open banking Pay by Bank implementation.
 *
 * Phase 1 scaffold only — throws on invocation. Full implementation lands
 * in Phase 2 and uses the TrueLayer REST API + Web SDK + signed payment
 * requests + webhook signature verification + Signup+ bank-level age
 * verification. See spec Section 21 and the Phase 2 brief for details.
 *
 * Docs: https://docs.truelayer.com/docs/welcome
 * MCP server for Claude AI: https://docs.truelayer.com/docs/truelayer-mcp-integration-for-claude-ai
 */
export const truelayerProvider: PaymentProvider = {
  name: "truelayer",
  async initiatePayment() {
    throw new Error(
      "TrueLayer provider not yet implemented. Phase 2 scope. " +
      "Connect the TrueLayer MCP server in Claude Code before starting Phase 2."
    );
  },
  async verifyWebhook() {
    throw new Error("TrueLayer provider not yet implemented");
  },
  parseWebhookEvent() {
    throw new Error("TrueLayer provider not yet implemented");
  },
};
```

- [ ] **Step 4: Create the selector**

```typescript
// lib/payments/index.ts
import "server-only";
import type { PaymentProvider } from "./provider";
import { stubProvider } from "./stub";
import { truelayerProvider } from "./truelayer";

export function getPaymentProvider(): PaymentProvider {
  const name = process.env.PAYMENT_PROVIDER ?? "stub";
  switch (name) {
    case "truelayer":
      return truelayerProvider;
    case "stub":
    default:
      return stubProvider;
  }
}
```

- [ ] **Step 5: Verify and commit**

```bash
npx tsc --noEmit
git add -A
git commit -m "feat: add payment provider interface with stub and TrueLayer scaffolds"
```

---

## Task 4: Create shipping + VAT pure helpers

**Files:**
- Create: `lib/shipping.ts`
- Create: `lib/vat.ts`
- Create: `lib/config.ts`

- [ ] **Step 1: Create shipping helper**

```typescript
// lib/shipping.ts
import type { Config } from "@/types";

export function computeShippingInPence(
  subtotalInPence: number,
  shipping: Config["shipping"]
): number {
  if (
    shipping.freeThresholdInPence !== null &&
    subtotalInPence >= shipping.freeThresholdInPence
  ) {
    return 0;
  }
  return shipping.flatRateInPence;
}
```

- [ ] **Step 2: Create VAT helper**

```typescript
// lib/vat.ts
import type { Config } from "@/types";

export function computeVatInPence(
  subtotalInPence: number,
  vat: Config["vat"]
): number {
  if (!vat.registered) return 0;
  return Math.round(subtotalInPence * vat.rate);
}
```

- [ ] **Step 3: Create config helper with seed defaults**

```typescript
// lib/config.ts
import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type { Config } from "@/types";
import { getAdminDb } from "@/lib/firebase/admin";

const LOCAL_CONFIG_PATH = path.join(process.cwd(), "data", "config.local.json");

const DEFAULT_CONFIG: Config = {
  storeName: "[PEPTIDE STORE]",
  storeEmail: "hello@peptidestore.co.uk",
  storePhone: null,
  registeredAddress: "[ADDRESS]",
  companyNumber: null,
  vatNumber: null,
  shipping: {
    flatRateInPence: 495,
    freeThresholdInPence: 7500,
    estimatedDispatch: "Dispatched within 1 working day",
  },
  vat: {
    registered: false,
    rate: 0.2,
    displayPricesInclusive: false,
  },
  notifications: {
    newOrderEmailTo: "orders@peptidestore.co.uk",
  },
  updatedAt: new Date().toISOString() as unknown as Date,
  updatedBy: "seed",
};

export async function getConfig(): Promise<Config> {
  const db = getAdminDb();
  if (!db) {
    try {
      const raw = await fs.readFile(LOCAL_CONFIG_PATH, "utf-8");
      return JSON.parse(raw) as Config;
    } catch {
      return DEFAULT_CONFIG;
    }
  }
  const snap = await db.doc("config/main").get();
  return snap.exists ? (snap.data() as Config) : DEFAULT_CONFIG;
}

export async function updateConfig(patch: Partial<Config>): Promise<void> {
  const db = getAdminDb();
  if (!db) {
    const current = await getConfig();
    const updated = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString() as unknown as Date,
    };
    await fs.writeFile(LOCAL_CONFIG_PATH, JSON.stringify(updated, null, 2), "utf-8");
    return;
  }
  await db.doc("config/main").set({ ...patch, updatedAt: new Date() }, { merge: true });
}
```

- [ ] **Step 4: Add to `.gitignore`**

Append `data/config.local.json` to `.gitignore`.

- [ ] **Step 5: Commit**

```bash
npx tsc --noEmit
git add -A
git commit -m "feat: add shipping, vat, and config helpers with seed-mode fallback"
```

---

## Task 5: Create checkout session cookie helper

**Files:**
- Create: `lib/checkout-session.ts`

This stores delivery-step data between the delivery and review routes without exposing PII to the client Zustand store.

- [ ] **Step 1: Write the session helper**

```typescript
// lib/checkout-session.ts
import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";

const CHECKOUT_COOKIE = "checkout_session";

export const DeliveryDataSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  line1: z.string().min(1),
  line2: z.string().optional().nullable(),
  city: z.string().min(1),
  postcode: z.string().min(1),
  researchInstitution: z.string().optional().nullable(),
  createAccount: z.boolean(),
  accountPassword: z.string().min(8).optional().nullable(),
});

export type DeliveryData = z.infer<typeof DeliveryDataSchema>;

export async function setCheckoutSession(data: DeliveryData): Promise<void> {
  const cookieStore = await cookies();
  // NOTE: In Stage 1b we'll add signing via iron-session. For Stage 1a,
  // the data is base64-encoded JSON in a non-HTTPOnly cookie — fine for
  // local testing but not acceptable for production without signing.
  const encoded = Buffer.from(JSON.stringify(data), "utf-8").toString("base64");
  cookieStore.set(CHECKOUT_COOKIE, encoded, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 30, // 30 minutes
  });
}

export async function getCheckoutSession(): Promise<DeliveryData | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(CHECKOUT_COOKIE)?.value;
  if (!value) return null;
  try {
    const decoded = Buffer.from(value, "base64").toString("utf-8");
    const parsed = DeliveryDataSchema.safeParse(JSON.parse(decoded));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function clearCheckoutSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CHECKOUT_COOKIE);
}
```

- [ ] **Step 2: Commit**

```bash
npx tsc --noEmit
git add -A
git commit -m "feat: add checkout session cookie helper with Zod validation"
```

---

## Task 6: Create `/checkout` entry route + delivery form

**Files:**
- Replace: `app/(public)/checkout/page.tsx` (entry route)
- Create: `app/(public)/checkout/delivery/page.tsx`
- Create: `app/actions/checkout.ts`
- Create: `components/storefront/checkout/DeliveryForm.tsx`

- [ ] **Step 1: Replace the stub entry route**

```tsx
// app/(public)/checkout/page.tsx
import { redirect } from "next/navigation";

export default function CheckoutEntry() {
  redirect("/checkout/delivery");
}
```

- [ ] **Step 2: Create the checkout Server Action file**

```typescript
// app/actions/checkout.ts
"use server";

import { redirect } from "next/navigation";
import { DeliveryDataSchema, setCheckoutSession, clearCheckoutSession, getCheckoutSession } from "@/lib/checkout-session";

export type DeliveryFormState = {
  status: "idle" | "error";
  errors?: Record<string, string>;
};

export async function saveDeliveryStep(
  _prev: DeliveryFormState,
  formData: FormData
): Promise<DeliveryFormState> {
  const createAccount = formData.get("createAccount") === "on";
  const parsed = DeliveryDataSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone") || null,
    line1: formData.get("line1"),
    line2: formData.get("line2") || null,
    city: formData.get("city"),
    postcode: formData.get("postcode"),
    researchInstitution: formData.get("researchInstitution") || null,
    createAccount,
    accountPassword: createAccount ? formData.get("accountPassword") : null,
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0]?.toString();
      if (field) errors[field] = issue.message;
    }
    return { status: "error", errors };
  }

  await setCheckoutSession(parsed.data);
  redirect("/checkout/review");
}

export { clearCheckoutSession, getCheckoutSession };
```

- [ ] **Step 3: Create DeliveryForm client component**

```tsx
// components/storefront/checkout/DeliveryForm.tsx
"use client";

import { useActionState, useState } from "react";
import { saveDeliveryStep, type DeliveryFormState } from "@/app/actions/checkout";

const initialState: DeliveryFormState = { status: "idle" };

export function DeliveryForm({
  initialData,
}: {
  initialData?: {
    fullName?: string;
    email?: string;
    phone?: string | null;
    line1?: string;
    line2?: string | null;
    city?: string;
    postcode?: string;
    researchInstitution?: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(saveDeliveryStep, initialState);
  const [createAccount, setCreateAccount] = useState(false);

  const fieldError = (name: string) => state.errors?.[name];

  return (
    <form action={formAction} className="space-y-6 max-w-xl">
      <div>
        <label htmlFor="fullName" className="label-editorial block mb-2">Full name</label>
        <input id="fullName" name="fullName" type="text" defaultValue={initialData?.fullName} required className="w-full border border-[#DDE1E7] p-3" />
        {fieldError("fullName") && <p className="text-xs text-red-700 mt-1">{fieldError("fullName")}</p>}
      </div>
      <div>
        <label htmlFor="email" className="label-editorial block mb-2">Email</label>
        <input id="email" name="email" type="email" defaultValue={initialData?.email} required className="w-full border border-[#DDE1E7] p-3" />
        {fieldError("email") && <p className="text-xs text-red-700 mt-1">{fieldError("email")}</p>}
      </div>
      <div>
        <label htmlFor="phone" className="label-editorial block mb-2">Phone (optional)</label>
        <input id="phone" name="phone" type="tel" defaultValue={initialData?.phone ?? ""} className="w-full border border-[#DDE1E7] p-3" />
      </div>
      <div>
        <label htmlFor="line1" className="label-editorial block mb-2">Address line 1</label>
        <input id="line1" name="line1" type="text" defaultValue={initialData?.line1} required className="w-full border border-[#DDE1E7] p-3" />
        {fieldError("line1") && <p className="text-xs text-red-700 mt-1">{fieldError("line1")}</p>}
      </div>
      <div>
        <label htmlFor="line2" className="label-editorial block mb-2">Address line 2 (optional)</label>
        <input id="line2" name="line2" type="text" defaultValue={initialData?.line2 ?? ""} className="w-full border border-[#DDE1E7] p-3" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="city" className="label-editorial block mb-2">Town / City</label>
          <input id="city" name="city" type="text" defaultValue={initialData?.city} required className="w-full border border-[#DDE1E7] p-3" />
          {fieldError("city") && <p className="text-xs text-red-700 mt-1">{fieldError("city")}</p>}
        </div>
        <div>
          <label htmlFor="postcode" className="label-editorial block mb-2">Postcode</label>
          <input id="postcode" name="postcode" type="text" defaultValue={initialData?.postcode} required className="w-full border border-[#DDE1E7] p-3" />
          {fieldError("postcode") && <p className="text-xs text-red-700 mt-1">{fieldError("postcode")}</p>}
        </div>
      </div>
      <div>
        <label htmlFor="researchInstitution" className="label-editorial block mb-2">Research institution (optional)</label>
        <input id="researchInstitution" name="researchInstitution" type="text" defaultValue={initialData?.researchInstitution ?? ""} className="w-full border border-[#DDE1E7] p-3" />
        <p className="text-xs text-[#6B7280] mt-1">If you're purchasing on behalf of a research institution, we'd love to know.</p>
      </div>

      <div className="bg-[#F7F8FA] border border-[#DDE1E7] p-5 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="createAccount"
            checked={createAccount}
            onChange={(e) => setCreateAccount(e.target.checked)}
            className="accent-[#0D1B3E] mt-0.5"
          />
          <div>
            <p className="font-serif text-base text-[#0D1B3E]">Save your details for next time</p>
            <p className="text-xs text-[#6B7280] mt-1">
              Create an account and next time you order, your address and
              details will be pre-filled. You'll also be able to view your order
              history, download past COAs, and re-order in one click.
            </p>
          </div>
        </label>
        {createAccount && (
          <div>
            <label htmlFor="accountPassword" className="label-editorial block mb-2">Password (min 8 characters)</label>
            <input id="accountPassword" name="accountPassword" type="password" minLength={8} className="w-full border border-[#DDE1E7] p-3" />
            {fieldError("accountPassword") && <p className="text-xs text-red-700 mt-1">{fieldError("accountPassword")}</p>}
          </div>
        )}
      </div>

      <button type="submit" disabled={pending} className="px-8 py-3 bg-[#0D1B3E] text-white uppercase tracking-wider text-sm hover:bg-[#162040] disabled:bg-[#6B7280]">
        {pending ? "Saving..." : "Continue to review"}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Create `/checkout/delivery` route**

```tsx
// app/(public)/checkout/delivery/page.tsx
import { DeliveryForm } from "@/components/storefront/checkout/DeliveryForm";
import { getCheckoutSession } from "@/app/actions/checkout";

export default async function DeliveryStepPage() {
  const existing = await getCheckoutSession();

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-12">
      <p className="label-editorial mb-4">Checkout — Step 1 of 2</p>
      <h1 className="text-4xl mb-8">Delivery details</h1>
      <DeliveryForm initialData={existing ?? undefined} />
    </div>
  );
}
```

- [ ] **Step 5: Verify and commit**

```bash
npm run build
git add -A
git commit -m "feat: add checkout delivery form with session cookie and optional account creation"
```

---

## Task 7: Create `/checkout/review` page with research confirmation

**Files:**
- Create: `app/(public)/checkout/review/page.tsx`
- Create: `components/storefront/checkout/ReviewSummary.tsx`
- Create: `components/storefront/checkout/ResearchConfirmCheckbox.tsx`

- [ ] **Step 1: Create ResearchConfirmCheckbox (client component for state)**

```tsx
// components/storefront/checkout/ResearchConfirmCheckbox.tsx
"use client";

import { useState } from "react";
import { useBasket } from "@/lib/basket";
import { createOrderAction } from "@/app/actions/create-order";

export function ResearchConfirmCheckbox({
  shippingInPence,
  vatInPence,
  totalInPence,
}: {
  shippingInPence: number;
  vatInPence: number;
  totalInPence: number;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { items, clearBasket } = useBasket();

  const handlePay = async () => {
    setPending(true);
    setError(null);
    try {
      const result = await createOrderAction({
        items,
        shippingInPence,
        vatInPence,
        totalInPence,
      });
      if (result.status === "error") {
        setError(result.message);
        setPending(false);
        return;
      }
      clearBasket();
      window.location.href = result.redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setPending(false);
    }
  };

  return (
    <div className="space-y-4 mt-8">
      <label className="flex items-start gap-3 cursor-pointer bg-[#FFF3CD] border border-[#E6C97A] p-4">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-1 accent-[#6A4D00]"
          required
        />
        <span className="text-sm text-[#6A4D00] leading-relaxed">
          I confirm that I am purchasing these products for laboratory research
          purposes only, that I am 18 years or older, and that I understand
          these products are not for human or veterinary consumption.
        </span>
      </label>
      {error && (
        <p className="text-sm text-red-700">{error}</p>
      )}
      <button
        type="button"
        onClick={handlePay}
        disabled={!confirmed || pending || items.length === 0}
        className="w-full py-4 bg-[#0D1B3E] text-white uppercase tracking-wider text-sm hover:bg-[#162040] disabled:bg-[#6B7280] disabled:cursor-not-allowed"
      >
        {pending ? "Processing..." : "Pay now"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create ReviewSummary (Server Component — delivery info only, no shipping calculation)**

ReviewSummary shows only the delivery address (which comes from the server-side checkout cookie and doesn't depend on basket state). Shipping cost display lives inside `ReviewBasketList` (a Client Component) because it depends on the Zustand basket subtotal and the free-shipping-threshold rule. This keeps the Server/Client boundary clean: server data on the server, basket data on the client.

```tsx
// components/storefront/checkout/ReviewSummary.tsx
import Link from "next/link";
import type { DeliveryData } from "@/lib/checkout-session";

export function ReviewSummary({
  delivery,
  estimatedDispatch,
}: {
  delivery: DeliveryData;
  estimatedDispatch: string;
}) {
  return (
    <div className="bg-white border border-[#DDE1E7] p-6 space-y-5 sticky top-32">
      <div>
        <p className="label-editorial mb-2">Delivering to</p>
        <div className="text-sm text-[#333333] leading-relaxed">
          <p>{delivery.fullName}</p>
          <p>{delivery.email}</p>
          <p>{delivery.line1}</p>
          {delivery.line2 && <p>{delivery.line2}</p>}
          <p>{delivery.city}</p>
          <p>{delivery.postcode}</p>
          <p>United Kingdom</p>
        </div>
        <Link href="/checkout/delivery" className="text-xs underline text-[#6B7280] mt-2 inline-block">
          Edit delivery details
        </Link>
      </div>
      <div className="pt-4 border-t border-[#DDE1E7]">
        <p className="label-editorial mb-2">Dispatch</p>
        <p className="text-sm text-[#6B7280]">{estimatedDispatch}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the review page**

```tsx
// app/(public)/checkout/review/page.tsx
import { redirect } from "next/navigation";
import { getCheckoutSession } from "@/app/actions/checkout";
import { getConfig } from "@/lib/config";
import { computeShippingInPence } from "@/lib/shipping";
import { computeVatInPence } from "@/lib/vat";
import { ReviewSummary } from "@/components/storefront/checkout/ReviewSummary";
import { ReviewBasketList } from "@/components/storefront/checkout/ReviewBasketList";

export default async function ReviewStepPage() {
  const delivery = await getCheckoutSession();
  if (!delivery) redirect("/checkout/delivery");

  const config = await getConfig();

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-12">
      <p className="label-editorial mb-4">Checkout — Step 2 of 2</p>
      <h1 className="text-4xl mb-8">Review your order</h1>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12">
        <ReviewBasketList
          delivery={delivery}
          shippingRule={config.shipping}
          vatRule={config.vat}
        />
        <ReviewSummary
          delivery={delivery}
          estimatedDispatch={config.shipping.estimatedDispatch}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create ReviewBasketList (client component — reads Zustand basket)**

```tsx
// components/storefront/checkout/ReviewBasketList.tsx
"use client";

import { useBasket, formatPriceFromPence } from "@/lib/basket";
import { computeShippingInPence } from "@/lib/shipping";
import { computeVatInPence } from "@/lib/vat";
import { ResearchConfirmCheckbox } from "./ResearchConfirmCheckbox";
import type { Config } from "@/types";
import type { DeliveryData } from "@/lib/checkout-session";

export function ReviewBasketList({
  delivery,
  shippingRule,
  vatRule,
}: {
  delivery: DeliveryData;
  shippingRule: Config["shipping"];
  vatRule: Config["vat"];
}) {
  const { items, subtotalInPence } = useBasket();
  const subtotal = subtotalInPence();
  const shipping = computeShippingInPence(subtotal, shippingRule);
  const vat = computeVatInPence(subtotal + shipping, vatRule);
  const total = subtotal + shipping + vat;

  if (items.length === 0) {
    return (
      <div className="border border-dashed border-[#DDE1E7] p-8 text-center">
        <p className="font-serif text-xl text-[#0D1B3E] mb-2">Your basket is empty</p>
        <p className="text-sm text-[#6B7280]">Add items to your basket before checking out.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.sku} className="flex justify-between py-3 border-b border-[#DDE1E7]">
            <div>
              <p className="font-serif text-lg text-[#0D1B3E]">{item.name}</p>
              <p className="mono text-xs text-[#6B7280]">{item.sku} · {item.size} · qty {item.quantity}</p>
            </div>
            <p className="text-sm font-medium">
              {formatPriceFromPence(item.unitPriceInPence * item.quantity)}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-6 space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-[#6B7280]">Subtotal</span><span>{formatPriceFromPence(subtotal)}</span></div>
        <div className="flex justify-between"><span className="text-[#6B7280]">Shipping</span><span>{formatPriceFromPence(shipping)}</span></div>
        {vatRule.registered && (
          <div className="flex justify-between"><span className="text-[#6B7280]">VAT ({(vatRule.rate * 100).toFixed(0)}%)</span><span>{formatPriceFromPence(vat)}</span></div>
        )}
        <div className="flex justify-between pt-3 border-t border-[#DDE1E7] text-lg font-medium">
          <span>Total</span><span>{formatPriceFromPence(total)}</span>
        </div>
      </div>
      <ResearchConfirmCheckbox
        shippingInPence={shipping}
        vatInPence={vat}
        totalInPence={total}
      />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
npx tsc --noEmit
git add -A
git commit -m "feat: add checkout review page with research confirmation and pay button"
```

---

## Task 8: Create `createOrderAction` Server Action with stock check

**Files:**
- Create: `app/actions/create-order.ts`

- [ ] **Step 1: Write the order creation action**

```typescript
// app/actions/create-order.ts
"use server";

import { cookies } from "next/headers";
import { getCheckoutSession, clearCheckoutSession } from "@/lib/checkout-session";
import { getProductBySlug } from "@/lib/products";
import { getConfig } from "@/lib/config";
import { computeShippingInPence } from "@/lib/shipping";
import { computeVatInPence } from "@/lib/vat";
import { createOrderRecord, nextOrderNumber } from "@/lib/orders";
import { getPaymentProvider } from "@/lib/payments";
import type { BasketItem } from "@/lib/basket";
import type { Order } from "@/types";

export type CreateOrderInput = {
  items: BasketItem[];
  shippingInPence: number;
  vatInPence: number;
  totalInPence: number;
};

export type CreateOrderResult =
  | { status: "success"; redirectUrl: string; orderId: string }
  | { status: "error"; message: string };

export async function createOrderAction(
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  const cookieStore = await cookies();
  const ageVerified = cookieStore.get("age_verified")?.value === "1";
  if (!ageVerified) {
    return { status: "error", message: "Age verification required" };
  }

  const delivery = await getCheckoutSession();
  if (!delivery) {
    return { status: "error", message: "Checkout session expired — please start again" };
  }

  if (input.items.length === 0) {
    return { status: "error", message: "Basket is empty" };
  }

  const config = await getConfig();

  // Re-read prices and stock server-side. Never trust client prices.
  const verifiedItems: Order["items"] = [];
  let itemsSubtotalInPence = 0;

  for (const item of input.items) {
    const product = await getProductBySlug(item.productSlug);
    if (!product) {
      return { status: "error", message: `Product ${item.name} no longer available` };
    }
    const variant = product.variants.find((v) => v.sku === item.sku);
    if (!variant || !variant.active) {
      return { status: "error", message: `${item.name} (${item.size}) is no longer available` };
    }
    if (variant.stock < item.quantity) {
      return {
        status: "error",
        message: `Insufficient stock for ${item.name} ${item.size} — only ${variant.stock} remaining`,
      };
    }
    const lineTotal = variant.priceInPence * item.quantity;
    itemsSubtotalInPence += lineTotal;
    verifiedItems.push({
      productId: product.id,
      productSlug: product.slug,
      name: product.name,
      sku: variant.sku,
      size: variant.size,
      unitPriceInPence: variant.priceInPence,
      quantity: item.quantity,
      lineTotalInPence: lineTotal,
    });
  }

  const shippingCostInPence = computeShippingInPence(itemsSubtotalInPence, config.shipping);
  const vatAmountInPence = computeVatInPence(
    itemsSubtotalInPence + shippingCostInPence,
    config.vat
  );
  const totalInPence = itemsSubtotalInPence + shippingCostInPence + vatAmountInPence;

  const orderNumber = await nextOrderNumber();
  const now = new Date().toISOString();

  // NOTE: In Stage 1b, when Firestore is wired, the stock decrement and order
  // creation happen inside a single Firestore transaction. In Stage 1a, the
  // seed-mode does not decrement product stock (seed products are read-only
  // JSON); this is acceptable because stage 1a testing doesn't exercise the
  // concurrent-buyer race condition.

  const order = await createOrderRecord({
    orderNumber,
    status: "pending",
    customer: {
      uid: null, // Guest checkout in Stage 1a; Plan 3b wires Firebase Auth linking
      email: delivery.email,
      name: delivery.fullName,
      phone: delivery.phone,
      address: {
        line1: delivery.line1,
        line2: delivery.line2,
        city: delivery.city,
        postcode: delivery.postcode,
        country: "GB",
      },
    },
    items: verifiedItems,
    itemsSubtotalInPence,
    shippingCostInPence,
    vatAmountInPence,
    totalInPence,
    vatRateAtPurchase: config.vat.rate,
    researchConfirmed: true,
    researchConfirmedAt: now as unknown as Date,
    ageGatePassedAt: now as unknown as Date,
    payment: {
      provider: "stub",
      providerRef: null,
      initiatedAt: now as unknown as Date,
      paidAt: null,
      failedAt: null,
      failureReason: null,
    },
    fulfilment: {
      carrier: null,
      trackingNumber: null,
      labelUrl: null,
      printedAt: null,
      printerStatus: null,
      dispatchedAt: null,
      customerEmailedAt: null,
    },
    adminNotes: null,
    createdAt: now as unknown as Date,
    updatedAt: now as unknown as Date,
  });

  // Call the payment provider (stub in Phase 1, TrueLayer in Phase 2)
  const provider = getPaymentProvider();
  const payment = await provider.initiatePayment(order);

  await clearCheckoutSession();

  return {
    status: "success",
    redirectUrl: payment.redirectUrl,
    orderId: order.id,
  };
}
```

- [ ] **Step 2: Verify and commit**

```bash
npx tsc --noEmit
npm run build
git add -A
git commit -m "feat: add createOrderAction with server-authoritative pricing and stock check"
```

---

## Task 9: Create confirmation page

**Files:**
- Create: `app/(public)/checkout/confirmation/[orderId]/page.tsx`
- Create: `components/storefront/checkout/ConfirmationContent.tsx`

- [ ] **Step 1: Create the confirmation page (Server Component)**

```tsx
// app/(public)/checkout/confirmation/[orderId]/page.tsx
import { notFound } from "next/navigation";
import { getOrderById } from "@/lib/orders";
import { ConfirmationContent } from "@/components/storefront/checkout/ConfirmationContent";
import { getConfig } from "@/lib/config";

export default async function ConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ stub?: string }>;
}) {
  const { orderId } = await params;
  const { stub } = await searchParams;
  const order = await getOrderById(orderId);
  if (!order) notFound();
  const config = await getConfig();

  return (
    <ConfirmationContent
      order={order}
      config={config}
      isStub={stub === "true"}
    />
  );
}
```

- [ ] **Step 2: Create ConfirmationContent**

```tsx
// components/storefront/checkout/ConfirmationContent.tsx
import Link from "next/link";
import type { Order, Config } from "@/types";
import { formatPriceFromPence } from "@/lib/basket";

export function ConfirmationContent({
  order,
  config,
  isStub,
}: {
  order: Order;
  config: Config;
  isStub: boolean;
}) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      {isStub && (
        <div className="bg-[#FFF3CD] border border-[#E6C97A] p-4 mb-8">
          <p className="label-editorial text-[#6A4D00] mb-1">Stage 1 stub payment</p>
          <p className="text-xs text-[#6A4D00]">
            This is a Phase 1 test confirmation. The real TrueLayer Pay by Bank
            integration will be added in Phase 2. No money has been charged.
          </p>
        </div>
      )}
      <p className="label-editorial mb-4">Order confirmed</p>
      <h1 className="text-5xl mb-3 leading-tight">Thank you, {order.customer.name.split(" ")[0]}.</h1>
      <p className="mono text-sm text-[#6B7280] mb-12">Order {order.orderNumber}</p>

      <div className="bg-white border border-[#DDE1E7] p-6 mb-8">
        <p className="label-editorial mb-4">Your order</p>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.sku} className="flex justify-between text-sm">
              <span>{item.name} · {item.size} · qty {item.quantity}</span>
              <span className="mono">{formatPriceFromPence(item.lineTotalInPence)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-[#DDE1E7] space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-[#6B7280]">Subtotal</span><span>{formatPriceFromPence(order.itemsSubtotalInPence)}</span></div>
          <div className="flex justify-between"><span className="text-[#6B7280]">Shipping</span><span>{formatPriceFromPence(order.shippingCostInPence)}</span></div>
          {order.vatAmountInPence > 0 && (
            <div className="flex justify-between"><span className="text-[#6B7280]">VAT</span><span>{formatPriceFromPence(order.vatAmountInPence)}</span></div>
          )}
          <div className="flex justify-between pt-2 border-t border-[#DDE1E7] font-medium"><span>Total</span><span>{formatPriceFromPence(order.totalInPence)}</span></div>
        </div>
      </div>

      <div className="bg-white border border-[#DDE1E7] p-6 mb-8">
        <p className="label-editorial mb-2">Delivering to</p>
        <div className="text-sm leading-relaxed">
          <p>{order.customer.name}</p>
          <p>{order.customer.address.line1}</p>
          {order.customer.address.line2 && <p>{order.customer.address.line2}</p>}
          <p>{order.customer.address.city}</p>
          <p>{order.customer.address.postcode}</p>
        </div>
        <p className="text-xs text-[#6B7280] mt-4">
          {config.shipping.estimatedDispatch}. You'll receive tracking details
          when your order is dispatched.
        </p>
      </div>

      <div className="bg-[#FFF3CD] border border-[#E6C97A] p-5 mb-8">
        <p className="label-editorial text-[#6A4D00] mb-2">Research use reminder</p>
        <p className="text-sm text-[#6A4D00] leading-relaxed">
          Your order is supplied exclusively for laboratory research use and is
          not for human or veterinary consumption.
        </p>
      </div>

      {order.customer.uid === null && (
        <div className="bg-white border border-[#DDE1E7] p-6">
          <p className="font-serif text-xl text-[#0D1B3E] mb-2">Want this to be easier next time?</p>
          <p className="text-sm text-[#6B7280] mb-4">
            Set a password and we'll save your delivery details for your next
            order. You'll also be able to see this order in your account history
            and download the Certificate of Analysis whenever you need it.
          </p>
          <p className="text-xs text-[#6B7280] mb-4">
            Stage 1a note: Retroactive account creation will be added once
            Firebase Auth is wired in Stage 1b.
          </p>
        </div>
      )}

      <div className="mt-8">
        <Link href="/peptides" className="label-editorial hover:text-[#0D1B3E]">
          ← Continue browsing peptides
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run a full end-to-end test**

```bash
npm run dev
```

Open the site, add 1-2 products to the basket, click through to `/checkout/delivery`, fill in the form, click Continue, tick the research checkbox on the review page, click Pay now. Verify:

- [ ] Redirect to `/checkout/confirmation/<orderId>?stub=true`
- [ ] Order number displayed, items listed, delivery address shown
- [ ] Amber stub banner visible at top
- [ ] Basket cleared (click basket icon → empty state)
- [ ] `data/orders.local.json` now contains the order with `status: "paid"`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add checkout confirmation page with stub banner and order summary"
```

---

## Task 10: Upgrade contact form Server Action to write enquiries

**Files:**
- Modify: `app/actions/contact.ts`

- [ ] **Step 1: Replace the console log with a real write**

```typescript
// app/actions/contact.ts
"use server";

import { z } from "zod";
import { createEnquiry } from "@/lib/enquiries";

const ContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  subject: z.string().min(1),
  message: z.string().min(10),
});

export type ContactFormState = {
  status: "idle" | "success" | "error";
  errors?: Partial<Record<"name" | "email" | "subject" | "message", string>>;
  generalError?: string;
};

export async function submitContactForm(
  _prev: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const parsed = ContactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    const errors: ContactFormState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof NonNullable<ContactFormState["errors"]>;
      if (field) errors[field] = issue.message;
    }
    return { status: "error", errors };
  }

  try {
    await createEnquiry(parsed.data);
    // TODO Stage 1b: send Resend confirmation email to customer
    // TODO Stage 1b: send Resend notification email to Sam
    return { status: "success" };
  } catch (err) {
    return {
      status: "error",
      generalError: err instanceof Error ? err.message : "Failed to submit enquiry",
    };
  }
}
```

- [ ] **Step 2: Verify and commit**

```bash
npx tsc --noEmit
git add -A
git commit -m "feat: wire contact form Server Action to enquiries data layer"
```

---

## Task 11: Create Firebase Auth sign-in and sign-up pages (Stage 1b-ready)

**Files:**
- Create: `app/(public)/sign-in/page.tsx`
- Create: `app/(public)/sign-up/page.tsx`
- Create: `components/storefront/auth/SignInForm.tsx`
- Create: `components/storefront/auth/SignUpForm.tsx`
- Create: `lib/auth.ts`

- [ ] **Step 1: Create `lib/auth.ts`**

```typescript
// lib/auth.ts
"use client";

import { getFirebaseAuth } from "@/lib/firebase/client";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";

export async function signUpWithEmail(email: string, password: string) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth not configured (Stage 1a)");
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signInWithEmail(email: string, password: string) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth not configured (Stage 1a)");
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signOutCurrentUser() {
  const auth = getFirebaseAuth();
  if (!auth) return;
  return signOut(auth);
}

export function subscribeAuth(callback: (user: User | null) => void) {
  const auth = getFirebaseAuth();
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}
```

- [ ] **Step 2: Create SignInForm**

```tsx
// components/storefront/auth/SignInForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmail } from "@/lib/auth";
import { isFirebaseClientReady } from "@/lib/firebase/client";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const firebaseReady = isFirebaseClientReady();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await signInWithEmail(email, password);
      router.push("/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
      setPending(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      {!firebaseReady && (
        <div className="bg-[#FFF3CD] border border-[#E6C97A] p-4 mb-6">
          <p className="label-editorial text-[#6A4D00] mb-1">Stage 1a notice</p>
          <p className="text-xs text-[#6A4D00]">
            Authentication will be enabled once Firebase credentials are wired
            in Stage 1b. Guest checkout remains fully supported.
          </p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="label-editorial block mb-2">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full border border-[#DDE1E7] p-3" />
        </div>
        <div>
          <label htmlFor="password" className="label-editorial block mb-2">Password</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full border border-[#DDE1E7] p-3" />
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={pending || !firebaseReady} className="w-full py-3 bg-[#0D1B3E] text-white uppercase tracking-wider text-sm hover:bg-[#162040] disabled:bg-[#6B7280]">
          {pending ? "Signing in..." : "Sign in"}
        </button>
        <p className="text-sm text-center text-[#6B7280]">
          New customer?{" "}
          <Link href="/sign-up" className="underline hover:text-[#0D1B3E]">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Create SignUpForm (equivalent structure, calling `signUpWithEmail`)**

```tsx
// components/storefront/auth/SignUpForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUpWithEmail } from "@/lib/auth";
import { isFirebaseClientReady } from "@/lib/firebase/client";

export function SignUpForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const firebaseReady = isFirebaseClientReady();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await signUpWithEmail(email, password);
      router.push("/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-up failed");
      setPending(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      {!firebaseReady && (
        <div className="bg-[#FFF3CD] border border-[#E6C97A] p-4 mb-6">
          <p className="label-editorial text-[#6A4D00] mb-1">Stage 1a notice</p>
          <p className="text-xs text-[#6A4D00]">
            Account creation will be enabled once Firebase credentials are
            wired in Stage 1b.
          </p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="label-editorial block mb-2">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full border border-[#DDE1E7] p-3" />
        </div>
        <div>
          <label htmlFor="password" className="label-editorial block mb-2">Password (min 8 characters)</label>
          <input id="password" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full border border-[#DDE1E7] p-3" />
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={pending || !firebaseReady} className="w-full py-3 bg-[#0D1B3E] text-white uppercase tracking-wider text-sm hover:bg-[#162040] disabled:bg-[#6B7280]">
          {pending ? "Creating account..." : "Create account"}
        </button>
        <p className="text-sm text-center text-[#6B7280]">
          Already have an account?{" "}
          <Link href="/sign-in" className="underline hover:text-[#0D1B3E]">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Create the routes**

```tsx
// app/(public)/sign-in/page.tsx
import { SignInForm } from "@/components/storefront/auth/SignInForm";

export default function SignInPage() {
  return (
    <div className="max-w-[1280px] mx-auto px-6 py-16">
      <p className="label-editorial mb-4 text-center">Sign in</p>
      <h1 className="text-4xl mb-10 text-center">Welcome back</h1>
      <SignInForm />
    </div>
  );
}

export const metadata = { title: "Sign in" };
```

```tsx
// app/(public)/sign-up/page.tsx
import { SignUpForm } from "@/components/storefront/auth/SignUpForm";

export default function SignUpPage() {
  return (
    <div className="max-w-[1280px] mx-auto px-6 py-16">
      <p className="label-editorial mb-4 text-center">Create an account</p>
      <h1 className="text-4xl mb-10 text-center">Save your details for next time</h1>
      <SignUpForm />
    </div>
  );
}

export const metadata = { title: "Create an account" };
```

- [ ] **Step 5: Commit**

```bash
npx tsc --noEmit
git add -A
git commit -m "feat: add sign-in and sign-up pages with Firebase Auth client (Stage 1b-ready)"
```

---

## Task 12: Create customer account area

**Files:**
- Create: `app/(public)/account/page.tsx`
- Create: `app/(public)/account/orders/page.tsx`
- Create: `app/(public)/account/orders/[id]/page.tsx`
- Create: `app/(public)/account/settings/page.tsx`
- Create: `components/storefront/account/AccountLayout.tsx`
- Create: `components/storefront/account/AuthGuard.tsx`

- [ ] **Step 1: Create AuthGuard client component**

```tsx
// components/storefront/account/AuthGuard.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { subscribeAuth } from "@/lib/auth";
import { isFirebaseClientReady } from "@/lib/firebase/client";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (!isFirebaseClientReady()) {
      setChecked(true);
      setAuthed(false);
      return;
    }
    const unsub = subscribeAuth((user) => {
      setAuthed(!!user);
      setChecked(true);
      if (!user) router.push("/sign-in");
    });
    return () => unsub();
  }, [router]);

  if (!checked) {
    return <div className="max-w-[1280px] mx-auto px-6 py-16 text-center text-[#6B7280]">Loading...</div>;
  }

  if (!isFirebaseClientReady()) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-16 text-center">
        <div className="max-w-md mx-auto bg-[#FFF3CD] border border-[#E6C97A] p-6">
          <p className="label-editorial text-[#6A4D00] mb-2">Stage 1a notice</p>
          <p className="text-sm text-[#6A4D00]">
            The customer account area requires Firebase Auth, which is wired
            once Sam's Firebase project is created in Stage 1b. Until then,
            guest checkout remains fully supported.
          </p>
        </div>
      </div>
    );
  }

  if (!authed) return null;

  return <>{children}</>;
}
```

- [ ] **Step 2: Create AccountLayout**

```tsx
// components/storefront/account/AccountLayout.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutCurrentUser } from "@/lib/auth";
import { useRouter } from "next/navigation";

const links = [
  { href: "/account", label: "Dashboard" },
  { href: "/account/orders", label: "Order history" },
  { href: "/account/settings", label: "Settings" },
];

export function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOutCurrentUser();
    router.push("/");
  };

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-12">
      <nav className="space-y-2">
        <p className="label-editorial mb-4">My account</p>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`block py-2 text-sm ${pathname === link.href ? "text-[#0D1B3E] font-medium" : "text-[#6B7280] hover:text-[#0D1B3E]"}`}
          >
            {link.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={handleSignOut}
          className="block py-2 text-sm text-[#6B7280] hover:text-[#0D1B3E] mt-4"
        >
          Sign out
        </button>
      </nav>
      <div>{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: Create account dashboard**

```tsx
// app/(public)/account/page.tsx
import { AuthGuard } from "@/components/storefront/account/AuthGuard";
import { AccountLayout } from "@/components/storefront/account/AccountLayout";

export default function AccountDashboardPage() {
  return (
    <AuthGuard>
      <AccountLayout>
        <h1 className="text-4xl mb-6">Your account</h1>
        <p className="text-[#6B7280] mb-8">
          Welcome back. View your order history, download COAs from past
          orders, or update your saved details.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-[#DDE1E7] p-6">
            <p className="label-editorial mb-2">Recent orders</p>
            <p className="text-sm text-[#6B7280]">
              Your order history will appear here once you've placed your first order.
            </p>
          </div>
          <div className="bg-white border border-[#DDE1E7] p-6">
            <p className="label-editorial mb-2">Saved details</p>
            <p className="text-sm text-[#6B7280]">
              Update your default delivery address and research institution in
              Settings.
            </p>
          </div>
        </div>
      </AccountLayout>
    </AuthGuard>
  );
}

export const metadata = { title: "Your account" };
```

- [ ] **Step 4: Create order history page**

```tsx
// app/(public)/account/orders/page.tsx
import Link from "next/link";
import { AuthGuard } from "@/components/storefront/account/AuthGuard";
import { AccountLayout } from "@/components/storefront/account/AccountLayout";
import { formatPriceFromPence } from "@/lib/basket";
// NOTE: getOrders filtered by current user's uid will be wired when Firebase Auth
// session cookie → admin SDK verification is available in Stage 1b. In Stage 1a,
// this page shows an empty state.

export default function OrderHistoryPage() {
  const orders: unknown[] = []; // Placeholder until Stage 1b wiring

  return (
    <AuthGuard>
      <AccountLayout>
        <h1 className="text-4xl mb-8">Order history</h1>
        {orders.length === 0 ? (
          <div className="border border-dashed border-[#DDE1E7] p-12 text-center">
            <p className="font-serif text-xl text-[#0D1B3E] mb-2">No orders yet</p>
            <p className="text-sm text-[#6B7280] mb-6">
              When you place your first order, it will appear here.
            </p>
            <Link href="/peptides" className="inline-block px-6 py-2 bg-[#0D1B3E] text-white uppercase tracking-wider text-xs">
              Browse peptides
            </Link>
          </div>
        ) : (
          <div>{/* Rendered list in Stage 1b */}</div>
        )}
      </AccountLayout>
    </AuthGuard>
  );
}

export const metadata = { title: "Order history" };
```

- [ ] **Step 5: Create order detail page**

```tsx
// app/(public)/account/orders/[id]/page.tsx
import { notFound } from "next/navigation";
import { AuthGuard } from "@/components/storefront/account/AuthGuard";
import { AccountLayout } from "@/components/storefront/account/AccountLayout";
import { getOrderById } from "@/lib/orders";
import { formatPriceFromPence } from "@/lib/basket";

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  return (
    <AuthGuard>
      <AccountLayout>
        <h1 className="text-4xl mb-2">Order {order.orderNumber}</h1>
        <p className="text-sm text-[#6B7280] mb-8">
          Status: {order.status}
        </p>
        <div className="space-y-4">
          {order.items.map((item) => (
            <div key={item.sku} className="flex justify-between py-3 border-b border-[#DDE1E7]">
              <div>
                <p className="font-serif text-lg">{item.name}</p>
                <p className="mono text-xs text-[#6B7280]">{item.sku} · {item.size} · qty {item.quantity}</p>
              </div>
              <p className="text-sm font-medium">{formatPriceFromPence(item.lineTotalInPence)}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 pt-6 border-t border-[#DDE1E7] flex justify-between text-lg font-medium">
          <span>Total</span>
          <span>{formatPriceFromPence(order.totalInPence)}</span>
        </div>
      </AccountLayout>
    </AuthGuard>
  );
}
```

- [ ] **Step 6: Create account settings page**

```tsx
// app/(public)/account/settings/page.tsx
import { AuthGuard } from "@/components/storefront/account/AuthGuard";
import { AccountLayout } from "@/components/storefront/account/AccountLayout";

export default function AccountSettingsPage() {
  return (
    <AuthGuard>
      <AccountLayout>
        <h1 className="text-4xl mb-8">Account settings</h1>
        <p className="text-[#6B7280]">
          Editable default address, research institution, and email
          preferences will be wired to Firebase Auth user doc in Stage 1b.
        </p>
      </AccountLayout>
    </AuthGuard>
  );
}

export const metadata = { title: "Account settings" };
```

- [ ] **Step 7: Commit**

```bash
npx tsc --noEmit
npm run build
git add -A
git commit -m "feat: add customer account area (dashboard, orders, settings) with auth guard"
```

---

## Task 13: Add sign-in link to navbar

**Files:**
- Modify: `components/storefront/layout/Navbar.tsx`

- [ ] **Step 1: Add a Sign in link next to the basket icon**

Open `components/storefront/layout/Navbar.tsx` and update the right-side section to include a sign-in link. Replace the `<div className="flex items-center gap-4">` block with:

```tsx
<div className="flex items-center gap-6">
  <Link href="/sign-in" className="label-editorial hover:text-[#0D1B3E] hidden sm:inline-block">
    Sign in
  </Link>
  <BasketIconButton />
</div>
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add sign-in link to navbar"
```

---

## Task 14: End-to-end checkout smoke test

**Files:** (none — verification only)

- [ ] **Step 1: Clear any existing local orders**

```bash
rm -f data/orders.local.json data/counters.local.json data/enquiries.local.json
```

- [ ] **Step 2: Start dev server**

```bash
npm run dev
```

- [ ] **Step 3: Walk the full guest checkout flow**

- [ ] Fresh browser (incognito), open homepage, pass age gate, accept cookies
- [ ] Click "Shop peptides", click a product
- [ ] Select a variant, click Add to basket — drawer opens with 1 item
- [ ] Close drawer, add a second product
- [ ] Open drawer, click Proceed to checkout → lands on `/checkout/delivery`
- [ ] Fill in all required delivery fields, leave account creation unchecked
- [ ] Click Continue to review → lands on `/checkout/review`
- [ ] Review shows both line items with correct quantities and prices
- [ ] Subtotal, shipping, total all match expected values
- [ ] Pay button disabled until research checkbox ticked
- [ ] Tick checkbox, click Pay now
- [ ] Redirects to `/checkout/confirmation/<orderId>?stub=true`
- [ ] Confirmation page shows order number (PPT-YYYYMMDD-0001 format)
- [ ] Amber stub banner visible
- [ ] Basket drawer shows empty state (basket cleared)

- [ ] **Step 4: Verify order was written**

```bash
cat data/orders.local.json
```

Expected: JSON array with one order, `status: "paid"`, `payment.provider: "stub"`, `payment.paidAt` populated, all line items, correct totals.

- [ ] **Step 5: Test contact form**

Open `/contact`, fill form, submit, verify:

```bash
cat data/enquiries.local.json
```

Expected: JSON array with one enquiry.

- [ ] **Step 6: Test sign-in/sign-up pages**

Visit `/sign-in` — verify Stage 1a notice shows, sign-in button is disabled.
Visit `/sign-up` — same.
Visit `/account` — should show Stage 1a notice (auth not configured).

- [ ] **Step 7: Production build**

```bash
npm run build
```

Expected: successful build. All routes generated.

- [ ] **Step 8: Commit milestone**

```bash
git add -A
git commit -m "feat: Plan 3 checkout milestone — guest checkout end-to-end with stub payment"
```

---

## Plan 3 completion summary

At this point the project should have:

- `lib/orders.ts`, `lib/customers.ts`, `lib/enquiries.ts` data layers with seed-mode + Firestore paths
- `lib/payments/` with `PaymentProvider` interface, `stub.ts`, `truelayer.ts` scaffold, `index.ts` selector
- `lib/shipping.ts`, `lib/vat.ts`, `lib/config.ts`
- `lib/checkout-session.ts` with signed cookie helper
- Three checkout routes (`/checkout/delivery`, `/checkout/review`, `/checkout/confirmation/[id]`)
- `createOrderAction` Server Action with server-authoritative pricing and stock check
- Transactional email Server Action stubs (real Resend wiring deferred to Stage 1b)
- Sign-in and sign-up pages (Firebase Auth client-side, Stage 1a notices when not configured)
- Customer account area: dashboard, order history, order detail, settings — with AuthGuard
- Navbar sign-in link
- Contact form writing to enquiries data store
- End-to-end checkout flow working in Stage 1a against seed-mode orders
- `data/*.local.json` files gitignored for order, customer, enquiry, counter, config local writes

**Known gaps (intentional, addressed in later plans):**

- Admin UI for viewing orders, products, enquiries → Plan 4
- SEO metadata, JSON-LD, sitemap → Plan 5
- Drafted legal content → Plan 5
- Resend email sending wired for real (currently stubbed with TODO) → Stage 1b
- Firebase Auth-linked order history → Stage 1b
- Firestore security rules → Plan 5
- Phase 3 fulfilment webhook → Phase 3

---

## END-OF-PLAN REVIEW CHECKPOINT — STOP HERE

**Do not proceed to Plan 4 until David has confirmed that the Opus review is complete.**

### What Sonnet should do when this plan is complete

1. **Stop.** Do not start Plan 4.
2. **Post the report below** to David.
3. **Wait** for the Opus review before proceeding.

### Report template — copy, fill in, send to David

````markdown
## Plan 3 (Checkout + Accounts) — execution report

**Git log range:** `<first>..<last>` (14 tasks expected)

**Task completion:**
- [x] Task 1: Install Resend and iron-session
- [x] Task 2: Orders / customers / enquiries data layers with seed-mode
- [x] Task 3: Payment provider interface + stub + truelayer scaffold
- [x] Task 4: Shipping / VAT / config helpers
- [x] Task 5: Checkout session cookie helper
- [x] Task 6: /checkout entry + delivery form
- [x] Task 7: /checkout/review with research checkbox
- [x] Task 8: createOrderAction Server Action
- [x] Task 9: Confirmation page
- [x] Task 10: Upgrade contact form to write enquiries
- [x] Task 11: Sign-in / sign-up pages
- [x] Task 12: Customer account area
- [x] Task 13: Sign-in link in navbar
- [x] Task 14: End-to-end checkout smoke test

**Test orders placed:** (include the orderNumber from data/orders.local.json)
- ...

**Deviations from plan:**
- ...

**Judgment calls I made:**
- ...

**Blockers hit:**
- ...

**Verification results:**
- `npx tsc --noEmit`: PASS / FAIL
- `npm run build`: PASS / FAIL
- End-to-end guest checkout (Task 14 checklist): every item PASS / any FAIL
- `data/orders.local.json` contains a real paid order: YES / NO
- `data/enquiries.local.json` contains a test contact-form submission: YES / NO

**Notes for David's review:**
- ...
````

### What David's Opus review will specifically check for Plan 3

1. **End-to-end guest checkout actually works.** From "add to basket" to "confirmation page displays an order number from `data/orders.local.json`." If any step is broken, it has to be fixed before Plan 4's admin UI attempts to read those orders.
2. **Server-authoritative pricing in `createOrderAction`.** The Server Action must re-read prices from `lib/products.ts` (not trust the client basket). Opus will scan the code to confirm this wasn't shortcut.
3. **Firestore transaction pattern.** `createOrderRecord` + stock decrement + order number counter need to be atomic in the Firestore path (local-file path is fine with simple file writes). Check the transaction shape.
4. **`orders.fulfilment` populated-later sub-object.** The Order schema has a `fulfilment` field with nullable carrier/tracking/label fields. Opus will verify the order document on disk has this sub-object correctly initialized (even though Phase 3 populates it).
5. **Research confirmation + age gate evidence.** Every order must have `researchConfirmedAt` and `ageGatePassedAt` server timestamps. These are the legal evidence trail.
6. **Second-chance account creation UI on confirmation page.** Not wired to Firebase Auth in Stage 1a but the UI should render for guest orders. Visual check only.
7. **Admin-facing order data quality.** Plan 4's admin UI will read orders from `lib/orders.ts`. Opus will inspect a real order document and confirm all fields Plan 4 will need are populated correctly (customer info, line items with denormalized snapshots, totals in pence, timestamps).
8. **Contact form writes real enquiries.** Check `data/enquiries.local.json` after a test submission.

### How David triggers the review

> Plan 3 is complete. Commits `<first>..<last>`. Please review the end-to-end checkout flow, inspect the order and enquiry documents on disk, and update Plan 4's "Review notes from Plan 3" section before confirming.

---

Proceed to **Plan 4: Admin UI** — ONLY after the Opus review is complete.
