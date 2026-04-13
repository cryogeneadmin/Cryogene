# Peptide Store — Plan 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Next.js 16 project with Tailwind v4, shadcn/ui primitives, type definitions, seed data, Firebase SDK wiring, and compliance infrastructure (age gate, banner, cookie consent). Leaves a runnable project with navigation scaffolding and all compliance UI working against a placeholder homepage.

**Architecture:** Monolithic Next.js 16 App Router on Vercel. Server Components by default. Data-layer abstraction reads from `data/products.seed.json` in Stage 1a, swappable to Firestore in Stage 1b. Compliance UI lives in the root layout as Server Components, cookie-based (not localStorage) to avoid flash-of-unverified-content.

**Tech Stack:** Next.js 16, TypeScript 5, Tailwind CSS v4, shadcn/ui (v4-native canary), Firebase Admin + Client SDKs, Zustand (installed but not yet used), Resend (installed but not yet used).

**Spec reference:** `docs/superpowers/specs/2026-04-13-peptide-store-phase1-design.md` Sections 4, 5, 6, 8.

**Delivers at end of plan:** `npm run dev` runs without errors. Home page renders with navy compliance banner, empty navbar/footer scaffolds, and placeholder "Coming soon" content. Age verification gate appears on first visit, dismissable, stored in cookie. Cookie consent banner appears on first visit. All five Firestore types defined. Seed JSON with 25 products importable. `.env.local` has `REPLACE_ME` placeholders for every variable.

**Testing strategy for this plan:** Per spec Section 16 decision, no unit or E2E tests in Phase 1. Each task has a manual verification step instead (visual check, `tsc --noEmit`, `next build`, runtime inspection).

**Assumed handoffs from previous plan:** None — this is the first plan.

**Handoffs to next plan (Plan 2: Storefront):**
- Type definitions exist at `types/*.ts` for all five Firestore collections
- `lib/products.ts` data-layer abstraction reads seed JSON, ready to be called from Server Components
- `lib/firebase/client.ts` and `lib/firebase/admin.ts` are wired but inactive (env vars are placeholders)
- shadcn primitives installed: `button`, `card`, `dialog`, `input`, `textarea`, `label`, `checkbox`, `badge`, `separator`, `sheet`, `alert`, `alert-dialog`, `collapsible`, `dropdown-menu`, `form`, `data-table`
- Tailwind v4 `@theme` defines brand colours and typography
- `ComplianceBanner`, `AgeVerificationGate`, `CookieConsent` components work and wrap the root layout
- `Navbar` and `Footer` exist as scaffolds (no real content yet)
- `.env.example` complete

---

## Task 1: Initialize Next.js 16 project

**Files:**
- Create: `C:\Users\david\peptide-store\` (project root, may already exist from spec directory creation)
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `app/`, `public/`

- [ ] **Step 1: Confirm project directory exists and docs are in place**

```bash
cd /c/Users/david/peptide-store
ls docs/superpowers/specs/
```

Expected: `2026-04-13-peptide-store-phase1-design.md` listed.

- [ ] **Step 2: Initialize Next.js with TypeScript, App Router, Tailwind, src-less layout**

```bash
cd /c/Users/david/peptide-store
npx create-next-app@latest . --typescript --app --tailwind --no-src-dir --no-eslint --import-alias "@/*" --use-npm
```

When prompted, do not overwrite the `docs/` directory. If the prompt does not allow selective overwrite, answer no to any destructive prompt and manually integrate the docs afterwards.

Expected: `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `tailwind.config.ts`, `next.config.ts`, `tsconfig.json`, `package.json`, `postcss.config.mjs`, `public/` all created.

- [ ] **Step 3: Verify Next.js version is 16.x**

```bash
cat package.json | grep '"next"'
```

Expected: `"next": "^16.x.x"` or similar — not `14.x` or `15.x`. If installer picked an older version, upgrade:

```bash
npm install next@latest react@latest react-dom@latest
```

- [ ] **Step 4: Install ESLint with Next.js config**

```bash
npm install --save-dev eslint eslint-config-next
```

Create `.eslintrc.json`:

```json
{
  "extends": "next/core-web-vitals"
}
```

- [ ] **Step 5: Verify build works**

```bash
npm run build
```

Expected: successful build, no errors. Static route `/` generated.

- [ ] **Step 6: Initialize git locally (no remote yet)**

```bash
git init
```

Create `.gitignore` additions (create the file if it doesn't already exist; Next.js creates one with sensible defaults):

```
# Env
.env.local
.env*.local

# IDE
.vscode/
.idea/
*.swp
.DS_Store

# OS
Thumbs.db
```

- [ ] **Step 7: Initial commit**

```bash
git add -A
git commit -m "chore: initial Next.js 16 scaffold with TypeScript and Tailwind"
```

---

## Task 2: Configure Tailwind v4 with brand theme

**Files:**
- Modify: `app/globals.css`
- Modify: `tailwind.config.ts` (may be deleted if v4 pure CSS-config is used)

- [ ] **Step 1: Verify Tailwind version is v4**

```bash
cat package.json | grep '"tailwindcss"'
```

If the installed version is 3.x, upgrade:

```bash
npm install -D tailwindcss@latest @tailwindcss/postcss@latest
```

Expected: `"tailwindcss": "^4.x.x"`.

- [ ] **Step 2: Configure PostCSS for Tailwind v4**

Create or update `postcss.config.mjs`:

```js
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
```

- [ ] **Step 3: Write brand theme to `app/globals.css`**

Replace the contents of `app/globals.css` with:

```css
@import "tailwindcss";

@theme {
  /* Brand palette */
  --color-navy: #0D1B3E;
  --color-mid-navy: #162040;
  --color-accent-blue: #2B4A8A;
  --color-off-white: #F7F8FA;
  --color-warm-grey: #E8EAED;
  --color-border-grey: #DDE1E7;
  --color-body-grey: #333333;
  --color-muted-grey: #6B7280;
  --color-compliance-amber-bg: #FFF3CD;
  --color-compliance-amber-text: #6A4D00;
  --color-compliance-amber-border: #E6C97A;
  --color-success-bg: #DCFCE7;
  --color-success-text: #166534;

  /* Typography */
  --font-serif: "Cormorant Garamond", Georgia, serif;
  --font-sans: "DM Sans", system-ui, -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  /* Compliance banner height — used for root layout padding */
  --compliance-banner-height: 2.25rem;
}

:root {
  color-scheme: light;
}

html, body {
  background: var(--color-off-white);
  color: var(--color-body-grey);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-serif);
  font-weight: 500;
  color: var(--color-navy);
}

/* Utility layer: small-caps editorial labels */
.label-editorial {
  font-family: var(--font-serif);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  color: var(--color-muted-grey);
}

.mono {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 4: Delete or empty tailwind.config.ts if present (v4 uses CSS-first config)**

```bash
rm -f tailwind.config.ts tailwind.config.js
```

- [ ] **Step 5: Verify build still works**

```bash
npm run build
```

Expected: successful build. Warnings about missing content are acceptable — Tailwind v4 auto-discovers content.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "style: configure Tailwind v4 with brand theme and typography"
```

---

## Task 3: Import Google Fonts via next/font

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace app/layout.tsx with brand-font-enabled version**

```tsx
import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

const jetBrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "[Store Name] — UK Research Peptides, HPLC-Tested & Documented",
    template: "%s | [Store Name]",
  },
  description:
    "Research-grade peptides, capsules, and mixers for UK laboratory research. Every product HPLC-tested with a Certificate of Analysis. For laboratory research use only.",
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en-GB"
      className={`${cormorant.variable} ${dmSans.variable} ${jetBrains.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Bind the font CSS variables in globals.css**

Open `app/globals.css` and update the typography block in `@theme` to reference the next/font CSS variables:

```css
  --font-serif: var(--font-cormorant), Georgia, serif;
  --font-sans: var(--font-dm-sans), system-ui, -apple-system, sans-serif;
  --font-mono: var(--font-jetbrains), ui-monospace, monospace;
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: successful build. Fonts should be prefetched as part of the build output.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "style: import Cormorant Garamond, DM Sans, and JetBrains Mono via next/font"
```

---

## Task 4: Install shadcn/ui primitives

**Files:**
- Create: `components/ui/*` (generated by shadcn CLI)
- Create: `components.json` (shadcn config)
- Modify: `lib/utils.ts` (generated by shadcn CLI)

- [ ] **Step 1: Initialize shadcn with v4 support**

```bash
npx shadcn@canary init
```

Prompts and answers:
- Which style? → **Default**
- Which base color? → **Slate**
- Use CSS variables? → **Yes**

The CLI will ask whether to overwrite `app/globals.css`. Answer **No** — we have our own theme. shadcn will merge its base variables in a separate layer.

If the CLI modifies `globals.css` despite the "No", check the diff with `git diff app/globals.css` and restore our brand palette.

Expected: `components.json` created, `lib/utils.ts` created with `cn` helper, `components/ui/` directory created.

- [ ] **Step 2: Install required shadcn primitives in one batch**

```bash
npx shadcn@canary add button card dialog input textarea label checkbox badge separator sheet alert alert-dialog collapsible dropdown-menu form table
```

Expected: `components/ui/button.tsx`, `card.tsx`, `dialog.tsx`, `input.tsx`, `textarea.tsx`, `label.tsx`, `checkbox.tsx`, `badge.tsx`, `separator.tsx`, `sheet.tsx`, `alert.tsx`, `alert-dialog.tsx`, `collapsible.tsx`, `dropdown-menu.tsx`, `form.tsx`, `table.tsx` all created.

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: successful build. If any shadcn primitive fails to compile due to v4 incompatibility, drop the offending component for now — we'll revisit in later tasks.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: install shadcn/ui primitives (v4-compatible canary)"
```

---

## Task 5: Define TypeScript types for Firestore collections

**Files:**
- Create: `types/product.ts`
- Create: `types/order.ts`
- Create: `types/customer.ts`
- Create: `types/enquiry.ts`
- Create: `types/config.ts`
- Create: `types/index.ts`

- [ ] **Step 1: Create `types/product.ts`**

```typescript
import type { Timestamp } from "firebase/firestore";

export type ProductCategory = "peptides" | "capsules" | "mixers";

export type ProductVariant = {
  sku: string;
  size: string;
  priceInPence: number;
  stock: number;
  coaUrl: string | null;
  active: boolean;
};

export type ProductFaqItem = {
  question: string;
  answer: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;

  shortDescription: string;
  fullDescription: string;

  casNumber: string;
  molecularFormula: string;
  molecularWeight: string;
  synonyms: string[];
  purity: string;
  testingMethod: "HPLC" | "MS" | "HPLC-MS";

  variants: ProductVariant[];

  images: string[];
  primaryImageIndex: number;

  seoTitle: string | null;
  seoDescription: string | null;

  faq: ProductFaqItem[];

  tags: string[];
  active: boolean;

  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  updatedBy: string;
};
```

- [ ] **Step 2: Create `types/order.ts`**

```typescript
import type { Timestamp } from "firebase/firestore";

export type OrderStatus =
  | "pending"
  | "paid"
  | "fulfilled"
  | "cancelled"
  | "refunded";

export type Address = {
  line1: string;
  line2: string | null;
  city: string;
  postcode: string;
  country: "GB";
};

export type OrderCustomer = {
  uid: string | null;
  email: string;
  name: string;
  phone: string | null;
  address: Address;
};

export type OrderLineItem = {
  productId: string;
  productSlug: string;
  name: string;
  sku: string;
  size: string;
  unitPriceInPence: number;
  quantity: number;
  lineTotalInPence: number;
};

export type OrderPayment = {
  provider: "stub" | "truelayer";
  providerRef: string | null;
  initiatedAt: Timestamp | Date;
  paidAt: Timestamp | Date | null;
  failedAt: Timestamp | Date | null;
  failureReason: string | null;
};

export type OrderFulfilment = {
  carrier: "royalmail" | "sendcloud" | "shippo" | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  printedAt: Timestamp | Date | null;
  printerStatus: "pending" | "printed" | "failed" | null;
  dispatchedAt: Timestamp | Date | null;
  customerEmailedAt: Timestamp | Date | null;
};

export type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;

  customer: OrderCustomer;
  items: OrderLineItem[];

  itemsSubtotalInPence: number;
  shippingCostInPence: number;
  vatAmountInPence: number;
  totalInPence: number;
  vatRateAtPurchase: number;

  researchConfirmed: boolean;
  researchConfirmedAt: Timestamp | Date;
  ageGatePassedAt: Timestamp | Date;

  payment: OrderPayment;
  fulfilment: OrderFulfilment;

  adminNotes: string | null;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
};
```

- [ ] **Step 3: Create `types/customer.ts`**

```typescript
import type { Timestamp } from "firebase/firestore";
import type { Address } from "./order";

export type Customer = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  defaultAddress: Address | null;
  researchInstitution: string | null;
  marketingOptIn: boolean;
  orderCount: number;
  lifetimeValueInPence: number;
  createdAt: Timestamp | Date;
  lastLoginAt: Timestamp | Date;
};
```

- [ ] **Step 4: Create `types/enquiry.ts`**

```typescript
import type { Timestamp } from "firebase/firestore";

export type EnquiryStatus = "new" | "replied" | "archived";

export type Enquiry = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: EnquiryStatus;
  createdAt: Timestamp | Date;
};
```

- [ ] **Step 5: Create `types/config.ts`**

```typescript
import type { Timestamp } from "firebase/firestore";

export type Config = {
  storeName: string;
  storeEmail: string;
  storePhone: string | null;
  registeredAddress: string;
  companyNumber: string | null;
  vatNumber: string | null;

  shipping: {
    flatRateInPence: number;
    freeThresholdInPence: number | null;
    estimatedDispatch: string;
  };

  vat: {
    registered: boolean;
    rate: number;
    displayPricesInclusive: boolean;
  };

  notifications: {
    newOrderEmailTo: string;
  };

  updatedAt: Timestamp | Date;
  updatedBy: string;
};
```

- [ ] **Step 6: Create `types/index.ts` barrel export**

```typescript
export * from "./product";
export * from "./order";
export * from "./customer";
export * from "./enquiry";
export * from "./config";
```

- [ ] **Step 7: Install Firebase SDK to resolve the Timestamp import**

```bash
npm install firebase firebase-admin
```

- [ ] **Step 8: Verify typecheck passes**

```bash
npx tsc --noEmit
```

Expected: no errors. If `firebase/firestore` types are missing, re-run `npm install` and check `tsconfig.json` has `"moduleResolution": "bundler"` or `"node"`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add TypeScript types for all Firestore collections"
```

---

## Task 6: Create seed data for 25 placeholder products

**Files:**
- Create: `data/products.seed.json`

- [ ] **Step 1: Create `data/` directory and seed file**

```bash
mkdir -p data
```

- [ ] **Step 2: Write `data/products.seed.json`**

The seed catalogue is 25 plausible research compounds structured to mirror the Nupex category shape. All prices are integer pence, all chemistry data cross-checked against PubChem, synonyms included for SEO.

```json
[
  {
    "id": "seed-bpc-157",
    "slug": "bpc-157",
    "name": "BPC-157",
    "category": "peptides",
    "shortDescription": "Body Protection Compound 157, research peptide derived from a protective protein in gastric juice.",
    "fullDescription": "[DRAFT] BPC-157 is a synthetic pentadecapeptide fragment derived from a protective protein found in human gastric juice. In preclinical research, BPC-157 has been investigated for its effects on tissue integrity and inflammatory response in laboratory models. Supplied as a lyophilised powder for reconstitution in laboratory research contexts.",
    "casNumber": "137525-51-0",
    "molecularFormula": "C62H98N16O22",
    "molecularWeight": "1419.53 g/mol",
    "synonyms": ["Body Protection Compound 157", "PL 14736"],
    "purity": "≥98%",
    "testingMethod": "HPLC",
    "variants": [
      { "sku": "BPC157-2MG", "size": "2mg", "priceInPence": 2499, "stock": 50, "coaUrl": null, "active": true },
      { "sku": "BPC157-5MG", "size": "5mg", "priceInPence": 4999, "stock": 40, "coaUrl": null, "active": true },
      { "sku": "BPC157-10MG", "size": "10mg", "priceInPence": 8999, "stock": 25, "coaUrl": null, "active": true }
    ],
    "images": ["/placeholder-vial.svg"],
    "primaryImageIndex": 0,
    "seoTitle": null,
    "seoDescription": null,
    "faq": [
      {
        "question": "What is BPC-157?",
        "answer": "BPC-157 is a synthetic peptide fragment studied in laboratory research for its effects on tissue integrity. It is sold strictly for research use, not for human consumption."
      },
      {
        "question": "How is purity verified?",
        "answer": "Every batch is tested by high-performance liquid chromatography (HPLC) and a Certificate of Analysis is issued for each variant. The COA is downloadable from the product page."
      }
    ],
    "tags": ["peptide", "research"],
    "active": true,
    "createdAt": "2026-04-13T00:00:00Z",
    "updatedAt": "2026-04-13T00:00:00Z",
    "updatedBy": "seed"
  },
  {
    "id": "seed-tb-500",
    "slug": "tb-500",
    "name": "TB-500",
    "category": "peptides",
    "shortDescription": "Thymosin Beta-4 synthetic fragment, research peptide.",
    "fullDescription": "[DRAFT] TB-500 is a synthetic fragment of the naturally occurring peptide Thymosin Beta-4. In preclinical research, it has been investigated for its role in cell migration and tissue response. Supplied as a lyophilised powder for reconstitution in laboratory research contexts.",
    "casNumber": "77591-33-4",
    "molecularFormula": "C212H350N56O78S",
    "molecularWeight": "4963.44 g/mol",
    "synonyms": ["Thymosin Beta-4 Fragment", "TB4-Frag"],
    "purity": "≥98%",
    "testingMethod": "HPLC",
    "variants": [
      { "sku": "TB500-2MG", "size": "2mg", "priceInPence": 2999, "stock": 45, "coaUrl": null, "active": true },
      { "sku": "TB500-5MG", "size": "5mg", "priceInPence": 5999, "stock": 30, "coaUrl": null, "active": true },
      { "sku": "TB500-10MG", "size": "10mg", "priceInPence": 10999, "stock": 20, "coaUrl": null, "active": true }
    ],
    "images": ["/placeholder-vial.svg"],
    "primaryImageIndex": 0,
    "seoTitle": null,
    "seoDescription": null,
    "faq": [],
    "tags": ["peptide", "research"],
    "active": true,
    "createdAt": "2026-04-13T00:00:00Z",
    "updatedAt": "2026-04-13T00:00:00Z",
    "updatedBy": "seed"
  }
]
```

**IMPORTANT:** The example above shows 2 products for brevity. The complete seed file must contain 25 products. The remaining 23 products should follow the same schema shape and cover:

Peptides (10 more): Semaglutide, Tirzepatide, Ipamorelin, CJC-1295, GHK-Cu, Melanotan II, Epithalon, Thymosin Alpha-1, Retatrutide, Hexarelin.

Capsules (8): NAD+ capsules, NMN capsules, L-Carnitine capsules, Glutathione capsules, Resveratrol capsules, CoQ10 capsules, Berberine capsules, Spermidine capsules.

Mixers (5): Bacteriostatic water 10ml, Bacteriostatic water 30ml, Sterile saline 10ml, Sterile saline 30ml, 0.9% sodium chloride 10ml.

Each entry must have: valid CAS number from PubChem or DrugBank (look up before writing — NEVER fabricate), correct molecular formula, accurate molecular weight, at least 2 variants with realistic prices in pence, 1 FAQ item, `active: true`, `createdAt` and `updatedAt` as ISO strings, `coaUrl: null` (COAs come in plan 4), `images: ["/placeholder-vial.svg"]`.

- [ ] **Step 3: Create the placeholder SVG**

Create `public/placeholder-vial.svg` with a minimal vial shape:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <rect width="400" height="400" fill="#F7F8FA"/>
  <g transform="translate(150,80)">
    <rect x="0" y="20" width="100" height="240" rx="6" fill="#FFFFFF" stroke="#DDE1E7" stroke-width="2"/>
    <rect x="-6" y="0" width="112" height="30" rx="3" fill="#0D1B3E"/>
    <rect x="10" y="100" width="80" height="100" fill="#F7F8FA" stroke="#DDE1E7"/>
    <text x="50" y="155" text-anchor="middle" font-family="Georgia, serif" font-size="14" fill="#6B7280">SAMPLE</text>
  </g>
</svg>
```

- [ ] **Step 4: Verify JSON is valid**

```bash
node -e "console.log(JSON.parse(require('fs').readFileSync('data/products.seed.json','utf8')).length + ' products')"
```

Expected: `25 products`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add 25-product seed catalogue with placeholder vial SVG"
```

---

## Task 7: Create data-layer abstraction for products

**Files:**
- Create: `lib/products.ts`

- [ ] **Step 1: Write `lib/products.ts` with seed-first reads and local-overlay support**

Important design note: in Stage 1a, the product catalogue has **two layers**: a read-only bundled seed file (`data/products.seed.json`) which provides the initial catalogue, and an optional writable overlay file (`data/products.local.json`) which Plan 4's admin UI writes to when Sam edits a product. The data layer merges the two: overlay records win by ID, and any new records in the overlay are appended. This way, admin edits made in Plan 4 are immediately visible on the storefront without requiring a code change or a retroactive modification to this file.

```typescript
import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import seedProducts from "@/data/products.seed.json";
import type { Product, ProductCategory } from "@/types";

/**
 * Data-layer abstraction for product reads.
 *
 * Stage 1a (local): reads from two layers merged by ID:
 *   1. data/products.seed.json — read-only bundled seed (25 products)
 *   2. data/products.local.json — optional overlay written by the admin UI
 *
 * Stage 1b onward: when FIREBASE_PROJECT_ID is set and non-placeholder,
 * reads from Firestore `products` collection instead.
 */

const LOCAL_OVERLAY_PATH = path.join(process.cwd(), "data", "products.local.json");
const seed = seedProducts as unknown as Product[];

function useSeed(): boolean {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  return !projectId || projectId === "REPLACE_ME";
}

async function readLocalOverlay(): Promise<Product[]> {
  try {
    const raw = await fs.readFile(LOCAL_OVERLAY_PATH, "utf-8");
    return JSON.parse(raw) as Product[];
  } catch {
    return [];
  }
}

async function mergedSeed(): Promise<Product[]> {
  const overlay = await readLocalOverlay();
  const byId = new Map<string, Product>();
  for (const p of seed) byId.set(p.id, p);
  for (const p of overlay) byId.set(p.id, p); // overlay wins
  return Array.from(byId.values());
}

export async function getProducts(options?: {
  category?: ProductCategory;
  activeOnly?: boolean;
  limit?: number;
}): Promise<Product[]> {
  if (useSeed()) {
    let results = await mergedSeed();
    if (options?.activeOnly) {
      results = results.filter((p) => p.active);
    }
    if (options?.category) {
      results = results.filter((p) => p.category === options.category);
    }
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }
    return results;
  }
  // Firestore path will be added in a future plan.
  throw new Error("Firestore product reads not yet implemented");
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (useSeed()) {
    const all = await mergedSeed();
    return all.find((p) => p.slug === slug) ?? null;
  }
  throw new Error("Firestore product reads not yet implemented");
}

export async function getFeaturedProducts(limit = 6): Promise<Product[]> {
  const all = await getProducts({ activeOnly: true });
  return all
    .sort(
      (a, b) =>
        new Date(b.createdAt as string).getTime() -
        new Date(a.createdAt as string).getTime()
    )
    .slice(0, limit);
}

export async function getAllProductSlugs(): Promise<string[]> {
  const all = await getProducts({ activeOnly: true });
  return all.map((p) => p.slug);
}
```

- [ ] **Step 2: Add JSON module resolution to tsconfig**

Open `tsconfig.json` and verify `"resolveJsonModule": true` is set in `compilerOptions`. If not, add it:

```json
{
  "compilerOptions": {
    "resolveJsonModule": true,
    "esModuleInterop": true
    // ... other existing options
  }
}
```

- [ ] **Step 3: Verify typecheck passes**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add products data-layer with seed-first reads"
```

---

## Task 8: Wire Firebase SDKs (client + admin)

**Files:**
- Create: `lib/firebase/client.ts`
- Create: `lib/firebase/admin.ts`
- Create: `.env.example`
- Create: `.env.local`

- [ ] **Step 1: Write `lib/firebase/client.ts`**

```typescript
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;

function isConfigured(): boolean {
  return (
    !!firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== "REPLACE_ME" &&
    !!firebaseConfig.projectId &&
    firebaseConfig.projectId !== "REPLACE_ME"
  );
}

function getOrInit(): FirebaseApp | null {
  if (!isConfigured()) return null;
  if (app) return app;
  app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  return app;
}

export function getFirebaseAuth(): Auth | null {
  if (authInstance) return authInstance;
  const initialized = getOrInit();
  if (!initialized) return null;
  authInstance = getAuth(initialized);
  return authInstance;
}

export function getFirebaseDb(): Firestore | null {
  if (dbInstance) return dbInstance;
  const initialized = getOrInit();
  if (!initialized) return null;
  dbInstance = getFirestore(initialized);
  return dbInstance;
}

export function getFirebaseStorage(): FirebaseStorage | null {
  if (storageInstance) return storageInstance;
  const initialized = getOrInit();
  if (!initialized) return null;
  storageInstance = getStorage(initialized);
  return storageInstance;
}

export function isFirebaseClientReady(): boolean {
  return isConfigured();
}
```

- [ ] **Step 2: Write `lib/firebase/admin.ts` with server-only import**

```typescript
import "server-only";
import {
  cert,
  getApps as getAdminApps,
  initializeApp as initializeAdminApp,
  type App as AdminApp,
} from "firebase-admin/app";
import { getFirestore as getAdminFirestore, type Firestore as AdminFirestore } from "firebase-admin/firestore";
import { getAuth as getAdminAuth, type Auth as AdminAuth } from "firebase-admin/auth";
import { getStorage as getAdminStorage, type Storage as AdminStorage } from "firebase-admin/storage";

let adminApp: AdminApp | null = null;

function isAdminConfigured(): boolean {
  return (
    !!process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_PROJECT_ID !== "REPLACE_ME" &&
    !!process.env.FIREBASE_CLIENT_EMAIL &&
    !!process.env.FIREBASE_PRIVATE_KEY
  );
}

function getAdminAppOrNull(): AdminApp | null {
  if (!isAdminConfigured()) return null;
  if (adminApp) return adminApp;
  const existing = getAdminApps();
  if (existing.length > 0) {
    adminApp = existing[0]!;
    return adminApp;
  }
  const privateKey = Buffer.from(
    process.env.FIREBASE_PRIVATE_KEY!,
    "base64"
  ).toString("utf-8");
  adminApp = initializeAdminApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey,
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
  return adminApp;
}

export function getAdminDb(): AdminFirestore | null {
  const app = getAdminAppOrNull();
  return app ? getAdminFirestore(app) : null;
}

export function getAdminAuthSdk(): AdminAuth | null {
  const app = getAdminAppOrNull();
  return app ? getAdminAuth(app) : null;
}

export function getAdminStorageSdk(): AdminStorage | null {
  const app = getAdminAppOrNull();
  return app ? getAdminStorage(app) : null;
}

export function isFirebaseAdminReady(): boolean {
  return isAdminConfigured();
}
```

- [ ] **Step 3: Install `server-only` package**

```bash
npm install server-only
```

- [ ] **Step 4: Create `.env.example`**

```bash
# ═══════════════════════════════════════════════════════════
# Site identity
# ═══════════════════════════════════════════════════════════
NEXT_PUBLIC_SITE_URL="https://REPLACE_ME.co.uk"
NEXT_PUBLIC_SITE_NAME="REPLACE_ME"

# ═══════════════════════════════════════════════════════════
# Firebase Client SDK (public, exposed to browser)
# ═══════════════════════════════════════════════════════════
NEXT_PUBLIC_FIREBASE_API_KEY="REPLACE_ME"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="REPLACE_ME.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="REPLACE_ME"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="REPLACE_ME.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="REPLACE_ME"
NEXT_PUBLIC_FIREBASE_APP_ID="REPLACE_ME"

# ═══════════════════════════════════════════════════════════
# Firebase Admin SDK (SERVER ONLY — never expose)
# ═══════════════════════════════════════════════════════════
FIREBASE_PROJECT_ID="REPLACE_ME"
FIREBASE_CLIENT_EMAIL="REPLACE_ME"
FIREBASE_PRIVATE_KEY="REPLACE_ME"

# ═══════════════════════════════════════════════════════════
# Payments — stub in Phase 1, TrueLayer in Phase 2
# ═══════════════════════════════════════════════════════════
PAYMENT_PROVIDER="stub"
# Phase 2 (TrueLayer Pay by Bank via open banking):
TRUELAYER_CLIENT_ID=""
TRUELAYER_CLIENT_SECRET=""
TRUELAYER_MERCHANT_ACCOUNT_ID=""
TRUELAYER_SIGNING_KEY_ID=""
TRUELAYER_PRIVATE_KEY=""              # base64-encoded PEM
TRUELAYER_WEBHOOK_SECRET=""
TRUELAYER_ENVIRONMENT="sandbox"        # sandbox | production
NEXT_PUBLIC_TRUELAYER_RETURN_URL=""    # e.g. https://peptidestore.co.uk/checkout/confirm

# ═══════════════════════════════════════════════════════════
# Email (Resend)
# ═══════════════════════════════════════════════════════════
RESEND_API_KEY="REPLACE_ME"
RESEND_FROM_EMAIL="orders@REPLACE_ME.co.uk"
RESEND_NOTIFICATION_EMAIL="REPLACE_ME"

# ═══════════════════════════════════════════════════════════
# Phase 3 (fulfilment — not needed until later)
# ═══════════════════════════════════════════════════════════
COURIER_PLATFORM=""
COURIER_API_KEY=""
PRINTER_TYPE=""
ZEBRA_CLOUD_API_KEY=""
PRINT_SERVER_URL=""
```

Create the file:

```bash
cp /dev/null .env.example
```

Then paste the contents above via your editor, or use a heredoc:

```bash
cat > .env.example <<'EOF'
# (paste the contents above)
EOF
```

- [ ] **Step 5: Create `.env.local` from `.env.example`**

```bash
cp .env.example .env.local
```

`.env.local` is gitignored and contains the same `REPLACE_ME` values in Stage 1a. In Stage 1b, Sam's real credentials replace them.

- [ ] **Step 6: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: wire Firebase client and admin SDKs with env-var gating"
```

---

## Task 9: Create ComplianceBanner component

**Files:**
- Create: `components/storefront/layout/ComplianceBanner.tsx`

- [ ] **Step 1: Write the component**

```tsx
export function ComplianceBanner() {
  return (
    <div
      role="status"
      aria-label="Compliance notice"
      className="fixed top-0 left-0 right-0 z-50 h-9 flex items-center justify-center bg-[#0D1B3E] text-[#AABBCC] text-[11px] uppercase tracking-wider px-4 text-center"
    >
      Products sold on this site are for research purposes only and are not
      for human or veterinary use.
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add persistent compliance banner component"
```

---

## Task 10: Create AgeVerificationGate component (cookie-based, SSR-aware)

**Files:**
- Create: `components/storefront/layout/AgeVerificationGate.tsx`
- Create: `app/actions/age-gate.ts`

- [ ] **Step 1: Create the Server Action that sets the cookie**

```typescript
// app/actions/age-gate.ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const AGE_COOKIE_NAME = "age_verified";
const AGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function confirmAgeGate() {
  const cookieStore = await cookies();
  cookieStore.set(AGE_COOKIE_NAME, "1", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AGE_COOKIE_MAX_AGE,
  });
  redirect("/");
}

export async function leaveSite() {
  redirect("https://www.google.com");
}

export async function isAgeVerified(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(AGE_COOKIE_NAME)?.value === "1";
}
```

- [ ] **Step 2: Create the gate component**

```tsx
// components/storefront/layout/AgeVerificationGate.tsx
import { confirmAgeGate, leaveSite } from "@/app/actions/age-gate";

export function AgeVerificationGate() {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0D1B3E]/95 p-4"
    >
      <div className="max-w-lg w-full bg-white border border-[#DDE1E7] p-10 text-center">
        <p className="label-editorial mb-4">Laboratory research only</p>
        <h1
          id="age-gate-title"
          className="text-3xl md:text-4xl mb-6 leading-tight"
        >
          For laboratory research use only
        </h1>
        <p className="text-sm md:text-base leading-relaxed mb-8 text-[#333333]">
          The products sold on this website are intended exclusively for
          scientific and laboratory research. They are not for human or
          veterinary consumption. By entering, you confirm you are 18 years or
          older and understand this distinction.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <form action={confirmAgeGate}>
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3 bg-[#0D1B3E] text-white uppercase tracking-wider text-sm hover:bg-[#162040] transition-colors"
            >
              Enter site
            </button>
          </form>
          <form action={leaveSite}>
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3 border border-[#DDE1E7] text-[#0D1B3E] uppercase tracking-wider text-sm hover:bg-[#F7F8FA] transition-colors"
            >
              Leave
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add cookie-based age verification gate"
```

---

## Task 11: Create CookieConsent component

**Files:**
- Create: `components/storefront/layout/CookieConsent.tsx`
- Create: `app/actions/cookie-consent.ts`

- [ ] **Step 1: Create the Server Action**

```typescript
// app/actions/cookie-consent.ts
"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const CONSENT_COOKIE_NAME = "cookie_consent";
const CONSENT_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export async function acceptCookies() {
  const cookieStore = await cookies();
  cookieStore.set(CONSENT_COOKIE_NAME, "accepted", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CONSENT_MAX_AGE,
  });
  revalidatePath("/");
}

export async function declineCookies() {
  const cookieStore = await cookies();
  cookieStore.set(CONSENT_COOKIE_NAME, "declined", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CONSENT_MAX_AGE,
  });
  revalidatePath("/");
}

export type ConsentState = "accepted" | "declined" | "unknown";

export async function getCookieConsent(): Promise<ConsentState> {
  const cookieStore = await cookies();
  const value = cookieStore.get(CONSENT_COOKIE_NAME)?.value;
  if (value === "accepted") return "accepted";
  if (value === "declined") return "declined";
  return "unknown";
}
```

- [ ] **Step 2: Create the CookieConsent component**

```tsx
// components/storefront/layout/CookieConsent.tsx
import Link from "next/link";
import {
  acceptCookies,
  declineCookies,
  getCookieConsent,
} from "@/app/actions/cookie-consent";

export async function CookieConsent() {
  const consent = await getCookieConsent();
  if (consent !== "unknown") return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#DDE1E7] shadow-[0_-4px_12px_rgba(13,27,62,0.06)]"
    >
      <div className="max-w-[1280px] mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <p className="text-sm leading-relaxed text-[#333333] max-w-2xl">
          We use cookies for essential site functionality and, with your consent,
          anonymous analytics to understand how visitors use the site. You can
          accept, decline, or{" "}
          <Link href="/legal/cookies" className="underline hover:text-[#0D1B3E]">
            read our cookie policy
          </Link>
          .
        </p>
        <div className="flex gap-3">
          <form action={acceptCookies}>
            <button
              type="submit"
              className="px-5 py-2 bg-[#0D1B3E] text-white uppercase tracking-wider text-xs hover:bg-[#162040] transition-colors"
            >
              Accept
            </button>
          </form>
          <form action={declineCookies}>
            <button
              type="submit"
              className="px-5 py-2 border border-[#DDE1E7] text-[#0D1B3E] uppercase tracking-wider text-xs hover:bg-[#F7F8FA] transition-colors"
            >
              Decline
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add GDPR-compliant cookie consent banner"
```

---

## Task 12: Create Navbar and Footer scaffolds

**Files:**
- Create: `components/storefront/layout/Navbar.tsx`
- Create: `components/storefront/layout/Footer.tsx`

- [ ] **Step 1: Write Navbar scaffold**

```tsx
// components/storefront/layout/Navbar.tsx
import Link from "next/link";

const navLinks = [
  { href: "/peptides", label: "Peptides" },
  { href: "/capsules", label: "Capsules" },
  { href: "/mixers", label: "Mixers" },
  { href: "/product-information", label: "Product Info" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  return (
    <nav className="sticky top-9 z-30 bg-white border-b border-[#DDE1E7]">
      <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          href="/"
          className="text-2xl font-serif text-[#0D1B3E] tracking-tight"
        >
          [PEPTIDE STORE]
        </Link>
        <ul className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="label-editorial hover:text-[#0D1B3E] transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-4">
          <Link
            href="/basket"
            className="label-editorial hover:text-[#0D1B3E]"
            aria-label="View basket"
          >
            Basket (0)
          </Link>
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Write Footer scaffold**

```tsx
// components/storefront/layout/Footer.tsx
import Link from "next/link";

export function Footer() {
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
          <p>&copy; 2026 [Store Name]. Registered in England. [ADDRESS]</p>
          <p className="uppercase tracking-wider">
            All products for research use only — not for human or veterinary consumption.
          </p>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add navbar and footer layout scaffolds"
```

---

## Task 13: Wire compliance infrastructure into the root layout

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Update `app/layout.tsx` to wrap every page with banner, age gate, navbar, footer, cookie consent**

```tsx
import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

import { ComplianceBanner } from "@/components/storefront/layout/ComplianceBanner";
import { AgeVerificationGate } from "@/components/storefront/layout/AgeVerificationGate";
import { CookieConsent } from "@/components/storefront/layout/CookieConsent";
import { Navbar } from "@/components/storefront/layout/Navbar";
import { Footer } from "@/components/storefront/layout/Footer";
import { isAgeVerified } from "@/app/actions/age-gate";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

const jetBrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "[Store Name] — UK Research Peptides, HPLC-Tested & Documented",
    template: "%s | [Store Name]",
  },
  description:
    "Research-grade peptides, capsules, and mixers for UK laboratory research. Every product HPLC-tested with a Certificate of Analysis. For laboratory research use only.",
  robots: { index: true, follow: true },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const verified = await isAgeVerified();

  return (
    <html
      lang="en-GB"
      className={`${cormorant.variable} ${dmSans.variable} ${jetBrains.variable}`}
    >
      <body className="min-h-screen flex flex-col">
        <ComplianceBanner />
        {!verified && <AgeVerificationGate />}
        <div className="pt-9 flex-1 flex flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
        <CookieConsent />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: successful build.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: wire compliance banner, age gate, cookie consent into root layout"
```

---

## Task 14: Create placeholder homepage

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace `app/page.tsx` with a minimal placeholder**

```tsx
export default function HomePage() {
  return (
    <div className="max-w-[1280px] mx-auto px-6 py-24">
      <p className="label-editorial mb-6">Phase 1 — Foundation Milestone</p>
      <h1 className="text-5xl md:text-6xl mb-8 leading-tight">
        Research-grade peptides,
        <br />
        documented to the batch.
      </h1>
      <p className="text-lg text-[#333333] max-w-2xl leading-relaxed mb-10">
        This is a placeholder homepage served as part of the Phase 1 foundation
        build. Compliance infrastructure, navigation scaffolding, data layer,
        and brand typography are in place. The full storefront will be built in
        Plan 2.
      </p>
      <div className="inline-flex items-center gap-4 px-6 py-3 bg-[#FFF3CD] border border-[#E6C97A] text-[#6A4D00]">
        <span className="label-editorial text-[#6A4D00]">Laboratory research only</span>
        <span className="text-sm">
          Not for human or animal consumption.
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify dev server starts**

```bash
npm run dev
```

Open `http://localhost:3000` in a browser.

- [ ] **Step 3: Visual verification checklist**

Tick each item after visually confirming in the browser:

- [ ] Compliance banner appears at the top of the viewport, navy background, muted blue text, all-caps
- [ ] Age verification gate appears on first load, over-centered white card on dark navy overlay
- [ ] Clicking "Enter site" dismisses the gate and persists across refresh
- [ ] Opening an incognito window shows the age gate again
- [ ] Cookie consent banner appears at the bottom on first visit
- [ ] Clicking "Accept" dismisses the cookie banner and persists
- [ ] Navbar shows `[PEPTIDE STORE]` logo and nav links, sticky below the compliance banner
- [ ] Footer shows all four columns with the correct links
- [ ] The placeholder homepage headline renders in Cormorant serif
- [ ] The body text renders in DM Sans
- [ ] The amber compliance callout renders with correct colours

- [ ] **Step 4: Stop dev server and run build one more time**

```bash
npm run build
```

Expected: successful production build.

- [ ] **Step 5: Commit the visual verification milestone**

```bash
git add -A
git commit -m "feat: Phase 1 foundation milestone — compliance UI working against placeholder"
```

---

## Plan 1 completion summary

At this point the project should have:

- Runnable Next.js 16 app (`npm run dev` → `http://localhost:3000`)
- Tailwind v4 with brand palette and three next/font imports
- shadcn/ui primitives installed and building cleanly
- Five type files covering all Firestore collections
- Seed data: 25 placeholder products in `data/products.seed.json`
- Data-layer abstraction: `lib/products.ts` reads seed data transparently
- Firebase Client and Admin SDKs wired with env-var gating (inactive until real credentials)
- `.env.example` and `.env.local` with all Phase 1 variables as `REPLACE_ME`
- Compliance banner (fixed, non-dismissable)
- Age verification gate (cookie-based, SSR-aware, dismissable with 30-day expiry)
- Cookie consent banner (GDPR-compliant opt-in, Server Actions)
- Navbar and footer scaffolds (content placeholders)
- Placeholder homepage
- Clean git history with conventional commits

**Known gaps (intentional, addressed in later plans):**

- No product listing pages yet → Plan 2
- No product detail pages yet → Plan 2
- No real homepage content → Plan 2
- No checkout or customer accounts → Plan 3
- No admin UI → Plan 4
- No SEO metadata, JSON-LD, sitemap, robots, or llms.txt → Plan 5
- No drafted content for legal pages → Plan 5
- No security rules or handover docs → Plan 5

---

## END-OF-PLAN REVIEW CHECKPOINT — STOP HERE

**Do not proceed to Plan 2 until David has confirmed that the Opus review is complete.** This is a hard gate, not an optional step.

The project's execution protocol is: Sonnet executes each plan task-by-task; between plans, David opens a fresh Opus session to review what was actually built against what the plan specified, update the next plan based on any drift or learnings, and confirm readiness to proceed. Skipping this checkpoint silently accumulates drift and is explicitly discouraged — see the spec decision log.

### What Sonnet should do when this plan is complete

1. **Stop.** Do not start Plan 2.
2. **Post the report below** to David in the conversation.
3. **Wait** for David to run the Opus review and confirm before moving on.

### Report template — copy, fill in, send to David

````markdown
## Plan 1 (Foundation) — execution report

**Git log range:** `<first-commit-hash>..<last-commit-hash>` (14 tasks expected)

**Task completion:**
- [x] Task 1: Initialize Next.js 16 project
- [x] Task 2: Configure Tailwind v4 with brand theme
- [x] Task 3: Import Google Fonts via next/font
- [x] Task 4: Install shadcn/ui primitives
- [x] Task 5: Define TypeScript types for Firestore collections
- [x] Task 6: Create seed data for 25 placeholder products
- [x] Task 7: Create data-layer abstraction for products (with overlay support)
- [x] Task 8: Wire Firebase SDKs (client + admin)
- [x] Task 9: Create ComplianceBanner component
- [x] Task 10: Create AgeVerificationGate component
- [x] Task 11: Create CookieConsent component
- [x] Task 12: Create Navbar and Footer scaffolds
- [x] Task 13: Wire compliance infrastructure into the root layout
- [x] Task 14: Create placeholder homepage

**Installed versions:** (paste key deps from package.json)
- next: <version>
- react: <version>
- tailwindcss: <version>
- shadcn: <version>
- typescript: <version>
- firebase: <version>
- firebase-admin: <version>

**Deviations from plan:** (anything that differed from the instructions — nothing is the expected answer)
- ...

**Judgment calls I made:** (where I chose between reasonable options without asking)
- ...

**Blockers hit:** (things that didn't work as written — none expected)
- ...

**Verification results:**
- `npx tsc --noEmit`: PASS / FAIL
- `npm run build`: PASS / FAIL
- Visual smoke test (Task 14 step 3 checklist): PASS / FAIL — (note any items)

**Notes for David's review:**
- ...
````

### What David's Opus review will specifically check for Plan 1

Opus will check all of the standard things, but the **highest-priority items specific to this plan** are:

1. **Seed catalogue chemistry accuracy.** Every CAS number and molecular formula in `data/products.seed.json` must be verified against PubChem, DrugBank, or an equivalent authoritative chemistry source. Hallucinated chemistry data propagates into every downstream plan — JSON-LD, SEO metadata, llms.txt, product detail pages, admin UI. This is the single most important correctness check on the whole project.
2. **Tailwind v4 + shadcn canary integration.** If any shadcn primitive failed to install or compile, that affects every component in Plans 2–4. Opus needs to know which primitives are actually available so Plan 2 can be updated with workarounds if needed.
3. **Firebase SDK version compatibility.** Plan 1's data-layer helpers assume specific Firebase Admin SDK and client SDK API shapes. If the installed versions use different import paths or method signatures, Plans 3–5 will all reference outdated patterns and need updating.
4. **Age gate cookie behaviour.** The cookie-based age gate is the single most fragile piece of compliance infrastructure — if the Server Action + cookie + layout pattern doesn't render correctly (flash of unverified content, cookie not persisting, redirect loop), it has to be fixed here before Plan 2 builds on top of it.
5. **`lib/products.ts` overlay pattern.** The data layer must correctly merge `products.seed.json` with an optional `products.local.json` overlay. If Plan 1's implementation doesn't handle the missing-overlay case gracefully, Plan 4's admin edits will silently fail to appear on the storefront (this is the critical bug fix we made during cross-plan review).

### How David triggers the review

When you're ready, open a fresh Opus session and say something like:

> Plan 1 is complete. Commits `<first>..<last>`. Please read the execution report, review what was built against the plan, update Plan 2's "Review notes from Plan 1" section with any drift or adjustments, and confirm readiness to proceed.

Opus has memory access to `project_peptide_store.md` and can read the files on disk directly. No extra context needed beyond the commit range.

---

Proceed to **Plan 2: Storefront** — ONLY after the Opus review is complete and Plan 2's "Review notes from Plan 1" section has been populated.
