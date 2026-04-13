---
title: Peptide Store — Phase 1 Design Specification
date: 2026-04-13
status: approved-for-implementation
owner: David Ville (Actually AI)
client: Sam Cowling
contract: SOW-2026-001
related:
  - ../../client-queries-sam.md
  - ../../handover/deployment-checklist.md
  - ../../handover/admin-guide.md
  - ../../handover/content-guide.md
---

# Peptide Store — Phase 1 Design Specification

## 1. Purpose and context

This document specifies the Phase 1 build of a UK research peptide e-commerce website for Sam Cowling, delivered by Actually AI (David Ville) under SOW-2026-001. It is the single source of truth for what is being built, how it is being built, and which decisions have been made during the design phase.

The project is split into three phases:

- **Phase 1 — Foundation, storefront, compliance, SEO, deployment** — the subject of this document. Build starts immediately.
- **Phase 2 — TrueLayer Pay by Bank checkout integration** — scaffolded in Phase 1 behind a payment-provider abstraction, implemented as the next major delivery after Phase 1 Stage 1a completes. (Originally planned as Wallid; Wallid ruled out on 2026-04-13 after direct contact confirmed they offer no REST API for custom Next.js integrations. See decision log entry 26.)
- **Phase 3 — Fulfilment integration (Royal Mail / printer) and product image generation pipeline** — scoped separately once courier platform and printer hardware decisions are made.

Phase 1 is fully buildable today without waiting on any external dependency.

## 2. Commercial context

- **Contract**: SOW-2026-001, signed by Actually AI, awaiting Sam's countersignature. Total fee £3,650 across three deliverables plus optional monthly retainer tiers.
- **Deliverable 1** (this document): Website and e-commerce store — £2,000, 50% deposit received.
- **Deposit**: paid. Countersigned SoW outstanding and flagged as a pre-launch blocker, not a pre-build blocker.
- **All hosting, domain, and platform accounts are held in Sam's name**. David Ville does not hold credentials or accounts on Sam's behalf. This constraint drives the three-stage deployment path described in Section 14.
- **Liability**: the SoW explicitly disclaims Actually AI's liability for compliance with UK medicines law. This does not change the quality bar for compliance infrastructure in the build — solicitor sign-off is still a hard launch gate.

## 3. Risk posture — compliance-first

This is a UK research peptide site, which places the project in a legally sensitive category governed by the Human Medicines Regulations 2012 and MHRA guidance on "research chemicals." The core risk management strategy is:

1. **Compliance UI is non-removable from the codebase** — banner, age gate, research-use disclaimers, and research-confirmation checkbox are implemented as hard-coded infrastructure, not editable content.
2. **All legal-effect copy is drafted as placeholder, reviewed by Sam's solicitor before launch, and gated by a `reviewed: true` frontmatter flag per page.** A legal page without the flag renders a prominent "PLACEHOLDER — PENDING SOLICITOR REVIEW" banner, making accidental pre-review launch impossible.
3. **No customer testimonials, no reviews, no urgency messaging, no email-capture popups, no dosage guidance, no therapeutic claims.** These are all patterns that erode the "research use only" legal framing.
4. **Solicitor review is a hard launch gate** and is written into the launch checklist alongside technical readiness (Section 14).
5. **Server-side evidence of consent** — every order captures server-timestamped `ageGatePassedAt` and `researchConfirmedAt` fields, creating a defensible legal trail.

## 4. Technical approach

### Stack

- **Framework**: Next.js 16 (App Router) with TypeScript
- **Styling**: Tailwind CSS v4 (CSS-first `@theme` configuration, Oxide build engine)
- **Component primitives**: shadcn/ui (v4-native canary channel), copied into the repo, owned and styled
- **Database**: Firebase Firestore in `europe-west2`
- **File storage**: Firebase Storage in `europe-west2`
- **Authentication**: Firebase Authentication (email/password provider)
- **Email**: Resend for transactional and notification emails
- **Hosting**: Vercel (Sam's account)
- **Client state**: Zustand for basket, persisted to localStorage
- **Payments**: payment-provider interface with `stub` implementation in Phase 1, `truelayer` in Phase 2

### Runtime shape

Single monolithic Next.js application on Vercel, with a targeted Firebase Cloud Function added in Phase 3 for the fulfilment webhook only. All storefront pages, customer account pages, admin UI, and Server Actions run in the same codebase and deployment.

```
Sam's Vercel (peptidestore.co.uk)
└── Next.js 16 App Router
    ├── app/layout.tsx              — root Server Component
    │                                  reads age_verified cookie,
    │                                  renders gate or site
    ├── (public) route group        — storefront
    │   ├── Server Components       — all public page rendering
    │   └── Server Actions          — order creation, contact form
    ├── (admin) route group
    │   └── admin/layout.tsx        — Server Component reads
    │                                  Firebase session cookie,
    │                                  validates admin custom claim,
    │                                  redirects if not admin
    ├── /api/webhooks/truelayer     — Phase 2 payment callback
    ├── /api/health                 — deployment health check
    ├── sitemap.ts                  — native sitemap generation
    ├── robots.ts                   — native robots.txt with AI bot allowlist
    └── /llms.txt                   — dynamic LLMO endpoint

Sam's Firebase Project (europe-west2)
├── Firestore: products, orders, customers, enquiries, config
├── Storage:   /products/, /coas/, /vial-base/
├── Auth:      customers + admin (custom claim)
└── Cloud Function (Phase 3 only):
    onOrderStatusChange — Royal Mail → printer → email
```

**Note on `proxy.ts`:** Next.js 16's proxy layer (successor to `middleware.ts`) is **not used in Phase 1**. Age-gating and admin authentication both live in Server Component layouts, which run with the full Node.js runtime and have unrestricted access to the Firebase Admin SDK for token validation. Proxy runs at the Edge runtime where the Admin SDK is unavailable. The Server Component approach is simpler, faster to implement, and produces correct SSR behaviour without flash-of-unverified-content. `proxy.ts` can be introduced in a later phase if we ever need request-level rewrites, rate limiting, or geo-routing.

### Architectural principles

- **Server Components for reads, Server Actions for writes.** Public pages render on the server by default; client components (`'use client'`) are used only when interactivity genuinely requires it (variant selector, basket drawer, admin forms).
- **Server-only code is marked explicit.** `lib/firebase/admin.ts` starts with `import 'server-only'` to cause a build-time error if a client component accidentally imports it.
- **Payment provider is an interface.** `lib/payments/provider.ts` defines the contract; `stub.ts` and `truelayer.ts` are swappable implementations selected by `PAYMENT_PROVIDER` env var.
- **Data-layer functions abstract the data source.** During Stage 1a (local development), `lib/products.ts` reads from `data/products.seed.json`. In Stage 1b, the same functions read from Firestore via the Admin SDK. Client code calls `getProducts()` without knowing which backend is active.
- **Schema is designed for Phase 3 at Phase 1 time.** The `orders.fulfilment` sub-object is defined now with all fields nullable. Phase 3 populates those fields; it does not add them. This eliminates a future migration.

## 5. Folder structure

```
peptide-store/
├── app/
│   ├── (public)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    — homepage
│   │   ├── peptides/
│   │   │   ├── page.tsx                — listing
│   │   │   └── [slug]/page.tsx         — detail (SSG)
│   │   ├── capsules/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   ├── mixers/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/page.tsx
│   │   ├── basket/page.tsx
│   │   ├── checkout/
│   │   │   ├── page.tsx                — entry, redirects to /delivery or /basket
│   │   │   ├── delivery/page.tsx       — delivery form
│   │   │   ├── review/page.tsx         — summary + research checkbox + pay
│   │   │   └── confirmation/[orderId]/page.tsx
│   │   ├── account/
│   │   │   ├── page.tsx                — customer dashboard
│   │   │   ├── orders/page.tsx
│   │   │   ├── orders/[id]/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── about/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── product-information/page.tsx
│   │   └── legal/
│   │       ├── terms/page.tsx
│   │       ├── privacy/page.tsx
│   │       ├── cookies/page.tsx
│   │       ├── refunds/page.tsx
│   │       ├── shipping/page.tsx
│   │       └── research-use/page.tsx
│   ├── (admin)/
│   │   └── admin/
│   │       ├── layout.tsx              — proxy-guarded
│   │       ├── page.tsx                — dashboard
│   │       ├── products/
│   │       │   ├── page.tsx            — list
│   │       │   ├── new/page.tsx        — create
│   │       │   └── [id]/page.tsx       — edit
│   │       ├── orders/
│   │       │   ├── page.tsx
│   │       │   └── [id]/page.tsx
│   │       ├── enquiries/page.tsx
│   │       ├── customers/page.tsx
│   │       └── settings/page.tsx
│   ├── api/
│   │   ├── webhooks/truelayer/route.ts — Phase 2
│   │   └── health/route.ts
│   ├── sitemap.ts
│   ├── robots.ts
│   ├── llms.txt/route.ts
│   ├── globals.css                     — Tailwind v4 @theme
│   ├── layout.tsx                      — root (compliance banner, age gate, cookie consent)
│   └── not-found.tsx
├── components/
│   ├── storefront/
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── ComplianceBanner.tsx
│   │   │   ├── AgeVerificationGate.tsx
│   │   │   └── CookieConsent.tsx
│   │   ├── products/
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductGrid.tsx
│   │   │   ├── ProductFilters.tsx
│   │   │   ├── ProductDetail.tsx
│   │   │   ├── VariantSelector.tsx
│   │   │   ├── CoaDownloadButton.tsx
│   │   │   ├── ResearchDisclaimerCallout.tsx
│   │   │   └── ProductFAQ.tsx
│   │   ├── basket/
│   │   │   ├── BasketDrawer.tsx
│   │   │   ├── BasketItem.tsx
│   │   │   └── BasketIconButton.tsx
│   │   └── checkout/
│   │       ├── DeliveryForm.tsx
│   │       ├── OrderSummary.tsx
│   │       ├── ResearchConfirmCheckbox.tsx
│   │       └── AccountCreationOptional.tsx
│   ├── admin/
│   │   ├── AdminSidebar.tsx
│   │   ├── ProductForm.tsx
│   │   ├── ProductTable.tsx
│   │   ├── OrderTable.tsx
│   │   ├── OrderDetail.tsx
│   │   ├── ImageUploader.tsx
│   │   ├── CoaUploader.tsx
│   │   └── SettingsForm.tsx
│   └── ui/                             — shadcn primitives (button, card, dialog, input, etc.)
├── lib/
│   ├── firebase/
│   │   ├── client.ts                   — Firebase Auth + Firestore client SDK
│   │   └── admin.ts                    — Admin SDK, marked 'server-only'
│   ├── products.ts                     — data-layer: read products
│   ├── orders.ts                       — Server Action helpers
│   ├── customers.ts
│   ├── enquiries.ts
│   ├── config.ts                       — store-wide settings
│   ├── basket.ts                       — Zustand store
│   ├── shipping.ts                     — pure: computeShipping(subtotal, rule)
│   ├── vat.ts                          — pure: computeVat(subtotal, rate)
│   ├── payments/
│   │   ├── provider.ts                 — PaymentProvider interface
│   │   ├── stub.ts                     — Phase 1 implementation
│   │   ├── truelayer.ts                — Phase 2 implementation (scaffolded)
│   │   └── index.ts                    — selects active provider from env
│   ├── seo.ts                          — metadata helpers, JSON-LD builders
│   ├── auth.ts                         — Firebase Auth helpers, admin claim check
│   └── slug.ts                         — slugify utility
├── data/
│   ├── products.seed.json              — Stage 1a placeholder catalogue (~25 products)
│   ├── coa-placeholders/               — stub PDFs
│   └── vial-base.png                   — placeholder until Sam provides
├── content/
│   ├── legal/
│   │   ├── terms.md
│   │   ├── privacy.md
│   │   ├── cookies.md
│   │   ├── refunds.md
│   │   ├── shipping.md
│   │   └── research-use.md
│   └── drafts/
│       ├── about.md                    — drafted, reviewable by Sam
│       ├── product-information.md
│       ├── homepage-copy.md
│       └── product-descriptions/
│           ├── bpc-157.md
│           ├── tb-500.md
│           └── ... (10 drafted descriptions)
├── scripts/
│   ├── seed-firestore.ts               — one-shot: upload seed JSON to Firestore
│   ├── set-admin-claim.ts              — one-shot: set admin: true on a user
│   └── export-firestore.ts             — backup helper
├── types/
│   ├── product.ts
│   ├── order.ts
│   ├── customer.ts
│   ├── enquiry.ts
│   └── config.ts
├── docs/
│   ├── superpowers/specs/
│   │   └── 2026-04-13-peptide-store-phase1-design.md   — this file
│   ├── client-queries-sam.md
│   ├── handover/
│   │   ├── deployment-checklist.md
│   │   ├── admin-guide.md
│   │   └── content-guide.md
│   └── smoke-test.md
├── firestore.rules
├── storage.rules
├── firebase.json
├── .env.example
├── .env.local                          — gitignored
├── .gitignore
├── next.config.ts
├── tailwind.config.ts                  — minimal; most config in globals.css @theme
├── tsconfig.json
└── package.json
```

## 6. Data model

Five Firestore collections. All timestamps are Firestore `Timestamp`. All prices are integer pence. All writes are server-only (via Admin SDK inside Server Actions) with the single exception of `enquiries` create and `customers` own-document write.

### 6.1 `products`

```typescript
type Product = {
  id: string;                   // auto
  slug: string;                 // 'bpc-157'
  name: string;                 // 'BPC-157'
  category: 'peptides' | 'capsules' | 'mixers';

  shortDescription: string;     // card + listing snippet
  fullDescription: string;      // markdown, rendered on detail page

  casNumber: string;            // '137525-51-0'
  molecularFormula: string;     // 'C62H98N16O22'
  molecularWeight: string;      // '1419.53 g/mol'
  synonyms: string[];
  purity: string;               // '≥98%'
  testingMethod: 'HPLC' | 'MS' | 'HPLC-MS';

  variants: Array<{
    sku: string;                // 'BPC157-5MG'
    size: string;               // '5mg'
    priceInPence: number;
    stock: number;
    coaUrl: string | null;
    active: boolean;
  }>;

  images: string[];             // Firebase Storage URLs
  primaryImageIndex: number;

  seoTitle: string | null;
  seoDescription: string | null;

  tags: string[];
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;            // admin UID
};
```

Key decisions:
- Prices stored as integer pence (never float pounds) to avoid floating-point rounding errors.
- Chemistry data denormalized onto the product document — no join required to render a product page.
- Per-variant `coaUrl` — each batch/size can have its own lab report.
- Per-variant `active` — allows a specific size to be pulled from sale without hiding the whole product.
- `synonyms` is a first-class field, used in SEO metadata, JSON-LD `additionalProperty`, and the `llms.txt` file.

### 6.2 `orders`

```typescript
type Order = {
  id: string;
  orderNumber: string;          // 'PPT-20260413-0001' — human readable
  status: 'pending' | 'paid' | 'fulfilled' | 'cancelled' | 'refunded';

  customer: {
    uid: string | null;         // null for guest checkout
    email: string;
    name: string;
    phone: string | null;
    address: {
      line1: string;
      line2: string | null;
      city: string;
      postcode: string;
      country: 'GB';
    };
  };

  items: Array<{
    productId: string;
    productSlug: string;
    name: string;               // snapshot at purchase time
    sku: string;
    size: string;
    unitPriceInPence: number;   // snapshot
    quantity: number;
    lineTotalInPence: number;
  }>;

  itemsSubtotalInPence: number;
  shippingCostInPence: number;
  vatAmountInPence: number;
  totalInPence: number;
  vatRateAtPurchase: number;    // 0.20 snapshot

  researchConfirmed: boolean;
  researchConfirmedAt: Timestamp;
  ageGatePassedAt: Timestamp;

  payment: {
    provider: 'stub' | 'truelayer';
    providerRef: string | null;
    initiatedAt: Timestamp;
    paidAt: Timestamp | null;
    failedAt: Timestamp | null;
    failureReason: string | null;
  };

  fulfilment: {
    carrier: 'royalmail' | 'sendcloud' | 'shippo' | null;
    trackingNumber: string | null;
    labelUrl: string | null;
    printedAt: Timestamp | null;
    printerStatus: 'pending' | 'printed' | 'failed' | null;
    dispatchedAt: Timestamp | null;
    customerEmailedAt: Timestamp | null;
  };

  adminNotes: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};
```

Key decisions:
- **Denormalized line items** — product name, SKU, size, and unit price snapshot at purchase time so historical orders survive product renames and price changes. Required for correctness and HMRC record-keeping.
- **`vatRateAtPurchase`** captured so historical orders survive VAT rate changes.
- **`fulfilment` sub-object defined now with all fields nullable.** Phase 3 populates these fields; it does not add them.
- **`orderNumber`** generated from a daily counter document (`config/orderCounters/{YYYYMMDD}`) atomically incremented inside the order-creation transaction.
- **`ageGatePassedAt` and `researchConfirmedAt`** are server-side timestamps for defensibility.

### 6.3 `customers`

```typescript
type Customer = {
  id: string;                   // Firebase Auth UID
  email: string;
  name: string;
  phone: string | null;
  defaultAddress: Address | null;
  researchInstitution: string | null;  // optional — trust signal + legal framing
  marketingOptIn: boolean;
  orderCount: number;           // denormalized
  lifetimeValueInPence: number; // denormalized
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
};
```

Denormalized `orderCount` and `lifetimeValueInPence` updated inside the Server Action that transitions an order to `paid`. Avoids aggregate queries on the admin customer list.

### 6.4 `enquiries`

```typescript
type Enquiry = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'new' | 'replied' | 'archived';
  createdAt: Timestamp;
};
```

Contact form submissions. Only collection with public-create permission (field-whitelisted at the Firestore rule level).

### 6.5 `config` (single document: `config/main`)

```typescript
type Config = {
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
    rate: number;               // 0.20
    displayPricesInclusive: boolean;
  };

  notifications: {
    newOrderEmailTo: string;
  };

  updatedAt: Timestamp;
  updatedBy: string;
};
```

Single-document pattern — one read serves all store-wide settings used in navbar, footer, checkout, product pages, and metadata.

## 7. Public storefront design

### 7.1 Visual identity

- **Headings**: Cormorant Garamond (serif, classical, pharmacopoeia feel)
- **Body**: DM Sans (clean sans, pairs with traditional serif without conflict)
- **Monospace**: JetBrains Mono, used exclusively for CAS numbers, molecular formulas, SKUs, and order numbers (reinforces lab-notebook aesthetic)
- **Palette**: navy `#0D1B3E` primary, off-white `#F7F8FA` page background, hairline borders `#DDE1E7`, amber compliance callouts `#FFF3CD` / `#6A4D00` (darkened from brief's `#7A5A00` for WCAG AA headroom)
- **No drop shadows, no gradients, no rounded-pill buttons.** Square corners, flat, editorial.
- **Product images always on white or `#F7F8FA`.** No lifestyle photography, no human figures, no loud backgrounds.

### 7.2 Pages

**Homepage** (`/`) — five sections:
1. Hero: Cormorant headline, DM Sans subheading, primary + secondary CTAs, single macro image
2. Category cards: three cards (peptides / capsules / mixers) with product counts
3. Trust row: four editorial items (HPLC Tested / ≥98% Purity / UK Research Grade / COA Included)
4. Featured products: six `ProductCard` components, most recent active products
5. Research framing paragraph: ~80 words, human-facing and LLMO-friendly, links to Research Use Only page

Explicitly excluded: testimonials, countdown timers, "only X left" urgency, email-capture popups, review carousels.

**Category listing** (`/peptides`, `/capsules`, `/mixers`):
- Built from a single `ProductListingPage` component with a `category` prop
- Breadcrumb, H1, one-sentence subheading
- Left sidebar filters (desktop) / filter drawer (mobile): price range, size, testing method, in-stock toggle
- Main grid: 3 cols desktop, 2 tablet, 1 mobile
- Sort dropdown, result count
- Pagination (24 per page, real URLs with query params — no infinite scroll)
- All filter state in URL query params for SEO + shareability

**Product detail** (`/peptides/[slug]`, etc.):
- Generated statically at build time via `generateStaticParams`
- Two-column desktop, stacked mobile
- Left: image gallery (main + thumbnail strip, click to swap)
- Right:
  - Small-caps category tag
  - Cormorant H1 product name
  - Monospace data row: `CAS · FORMULA · WEIGHT`
  - Purity + testing badges
  - Variant selector (square buttons, disabled state for OOS)
  - Price (reactive to variant, VAT-aware)
  - Stock indicator
  - **Add to Basket** — full-width navy square button
  - **Download Certificate of Analysis** — outline button, new tab
  - Research use callout (amber box, Cormorant label + DM Sans body)
- Below fold:
  - Full description (markdown-rendered)
  - Chemical info block (structured data table)
  - **Research FAQ** (4-5 Q&As with `FAQPage` schema.org markup — AEO/LLMO asset)
  - Related products (4 newest active in same category)
- Deep-linked variant via `?size=5mg` query param
- Three JSON-LD blocks: `Product`, `FAQPage`, `BreadcrumbList`

**Basket**:
- `BasketDrawer` (slide-in from right, opens on icon click)
- `/basket` page (full-width version)
- No research checkbox here — moved to checkout review step
- Empty state with CTA to browse

**Checkout**:
- `/checkout` → redirects to `/checkout/delivery` (or `/basket` if empty)
- `/checkout/delivery` → delivery form with optional account-creation checkbox
- `/checkout/review` → summary, research-confirmation checkbox, Pay button
- `/checkout/confirmation/[orderId]` → post-payment landing

**Customer account area** (`/account`, Firebase Auth required):
- Dashboard showing recent orders
- Order history list
- Order detail with **per-item COA download** and **Re-order** button (pushes items to basket)
- Saved details (default address, research institution)
- Email preferences
- Sign out

**Static content pages**:
- `/about` — drafted Cormorant editorial layout, Sam adapts
- `/contact` — simple form writing to `enquiries` via Server Action, Resend confirmation emails
- `/product-information` — drafted educational content, mirrors Nupex page structure
- `/legal/*` — six pages rendered from markdown via shared `LegalPage` component

## 8. Compliance infrastructure

### 8.1 Age verification gate

Cookie-based (not localStorage — avoids flash-of-unverified-content on SSR).

- Cookie: `age_verified=1`, `Secure`, `SameSite=Lax`, 30-day expiry
- Root Server Component reads the cookie; absent → renders age gate, present → renders site
- Gate UI: dark navy overlay, centered white card, Cormorant headline ("For laboratory research use only"), DM Sans explanatory body, two buttons (`Enter site` primary, `Leave` outline)
- Escape and outside-click both trigger Leave
- `Leave` redirects to `https://www.google.com`
- `Enter site` triggers a Server Action that sets the cookie and revalidates

### 8.2 Compliance banner

Fixed `top-0`, `z-50`, always visible above navbar.

- Background `#0D1B3E`, text `#AABBCC`, 12px, uppercase, tracking-wider
- Content: `PRODUCTS SOLD ON THIS SITE ARE FOR RESEARCH PURPOSES ONLY AND ARE NOT FOR HUMAN OR VETERINARY USE.`
- No close button, no state

### 8.3 Cookie consent

Opt-in-only analytics (GDPR-correct).

- Slim bar at viewport bottom on first visit (when `cookie_consent` cookie absent)
- Three buttons: `Accept`, `Decline`, `Read policy` (→ `/legal/cookies`)
- On Accept: set `cookie_consent=accepted` → Vercel Analytics script loads on next render
- On Decline: set `cookie_consent=declined` → analytics never loads
- Until decision: analytics off

### 8.4 Legal pages with review-gate

- Six pages: terms, privacy, cookies, refunds, shipping, research-use
- Content stored as markdown in `content/legal/` with YAML frontmatter
- Shared `LegalPage` component: reads markdown, renders Cormorant H1 + DM Sans body, max-width 800px, `line-height: 1.75`
- **Every page without `reviewed: true` in frontmatter renders a prominent `PLACEHOLDER — PENDING SOLICITOR REVIEW` amber banner at the top.** This is a non-bypassable technical gate against accidental pre-review launch.
- David drafts placeholder content based on industry-standard UK research-supplier templates. All placeholder content is explicitly marked as draft; David does not represent it as legal advice.

### 8.5 Research-use callouts throughout

- Footer (every page)
- Product detail page (amber box)
- Checkout review step
- About page
- Product Information page
- Contact page confirmation
- Order confirmation email

## 9. Checkout flow

### 9.1 Delivery step

Form fields:
- Full name, email, phone (optional)
- Address line 1, line 2 (optional), town/city, postcode, country (`GB` only)
- `researchInstitution` (optional) — "Are you purchasing on behalf of a research institution?"
- **Account creation section** (soft ask):
  - Checkbox: "Create an account to save your details for next time"
  - Collapsible password field (shown only when checkbox ticked)
  - Copy emphasizes customer value (pre-fill, re-order, COA access), not business value

Logged-in customers: fields pre-populate from `customers/{uid}.defaultAddress`.

On submit: Server Action validates, stores in server-authoritative session state, redirects to `/checkout/review`.

### 9.2 Review step

- Full order summary: line items, subtotal, shipping (from `config.shipping`), VAT (from `config.vat`), total
- Delivery address with edit link
- **Research confirmation checkbox** — the legally-effective one, at point of sale:
  > ☐ I confirm that I am purchasing these products for laboratory research purposes only, that I am 18 years or older, and that I understand these products are not for human or veterinary consumption.
- **Pay button disabled until checkbox ticked**
- On Pay click: `createOrder` Server Action runs

### 9.3 `createOrder` Server Action

Server-authoritative order creation inside a Firestore transaction:

1. Read `age_verified` cookie — reject if absent
2. Validate payload shape with Zod
3. If `createAccount === true`, create Firebase Auth user and linked `customers/{uid}` doc first
4. Open Firestore transaction
5. For each line item:
   - Read the product document
   - Find the matching variant
   - Verify variant is active and stock ≥ quantity
   - Read the **current** price from Firestore (never trust client prices)
   - Decrement stock atomically
6. Compute `itemsSubtotal` from server-side prices
7. Compute `shippingCost` from `config.shipping`
8. Compute `vatAmount` from `config.vat`
9. Compute `total`
10. Generate `orderNumber` from `config/orderCounters/{YYYYMMDD}` atomic increment
11. Create the order document with:
    - All snapshot fields (line items, vatRate, etc.)
    - `fulfilment` sub-object with all null fields (populated in Phase 3)
    - `researchConfirmedAt`, `ageGatePassedAt` as server timestamps
12. Commit transaction
13. Call `paymentProvider.initiatePayment(order)`
14. Return `{ orderId, redirectUrl }` to client
15. Client navigates to `redirectUrl`

### 9.4 Stub payment provider (Phase 1)

```typescript
export const stubProvider: PaymentProvider = {
  name: 'stub',
  async initiatePayment(order) {
    await adminDb.doc(`orders/${order.id}`).update({
      status: 'paid',
      'payment.paidAt': FieldValue.serverTimestamp(),
      'payment.providerRef': `STUB-${order.id}`,
    });
    return {
      redirectUrl: `/checkout/confirmation/${order.id}?stub=true`,
      providerRef: `STUB-${order.id}`,
    };
  },
  async verifyWebhook() { return { valid: false, event: null }; },
  parseWebhookEvent() { throw new Error('Stub provider does not receive webhooks'); },
};
```

Confirmation page shows an amber banner when `?stub=true`: "This is a Phase 1 test confirmation — real TrueLayer Pay by Bank integration arriving in Phase 2."

### 9.5 Confirmation page

- Cormorant "Order confirmed" headline
- Order number in mono
- Summary of items + delivery address
- Estimated dispatch timeframe from `config.shipping.estimatedDispatch`
- Research use reminder (amber callout)
- Transactional email sent via Resend (order confirmation)
- **Second-chance account prompt** if customer checked out as guest:
  - "Want this to be easier next time? Set a password now and we'll save your details."
  - On accept: create Firebase Auth user with order email, link the just-completed order retroactively, show "Account created"
  - On dismiss: panel disappears, no re-prompting

## 10. Admin UI

All admin routes under `/admin/*`, guarded by the `(admin)/admin/layout.tsx` Server Component, which runs on every request, reads the Firebase session cookie, validates it with the Firebase Admin SDK, and checks for the `admin: true` custom claim — redirecting to the sign-in page if any check fails. The claim is set once via `scripts/set-admin-claim.ts` at Stage 1b. Running the auth check inside a Server Component (rather than at the Edge via `proxy.ts`) gives the full Node.js runtime and direct Admin SDK access, avoiding the need to run a JWK-based JWT verification library at the Edge. shadcn/ui primitives throughout, styled to match storefront navy/white palette.

### 10.1 Pages

1. **Dashboard** (`/admin`) — four stat cards (open orders, low stock, new enquiries, revenue this month) + recent orders table (last 10).
2. **Products list** (`/admin/products`) — shadcn DataTable with search, category filter, active/inactive filter. Columns: thumbnail, name, category, variant count, total stock, active toggle, edit button.
3. **Product editor** (`/admin/products/new`, `/admin/products/[id]`) — single long form with sections (Basic info, Chemical identity, Variants, Images, SEO, Status). Sticky footer with Save / Save and create another / Cancel.
4. **Orders list** (`/admin/orders`) — DataTable with status badges, filter by status.
5. **Order detail** (`/admin/orders/[id]`) — customer card, items table, totals, status transition controls, admin notes.
6. **Enquiries** (`/admin/enquiries`) — list + expand-to-read, mark-as-replied, mailto link.
7. **Customers** (`/admin/customers`) — list with orders and LTV, click for order history.
8. **Settings** (`/admin/settings`) — single form backed by `config/main`. Store name, addresses, VAT config, shipping rule, notification email.

### 10.2 Admin UX principles

- Long single-page forms, not wizards (admin users are power users of their own data)
- Slug auto-generation from name via controlled input + `slugify`
- Image upload via drag-and-drop with reordering and primary-image indicator
- COA upload per variant from within the product editor
- All writes go through Server Actions → Admin SDK → Firestore transactions
- No delete-on-single-click — destructive actions confirmed via shadcn AlertDialog

## 11. SEO and LLMO

### 11.1 Metadata

Next.js 16 `metadata` and `generateMetadata` APIs used consistently:
- Root layout default title template, default OG tags, default robots
- Per-page overrides via `generateMetadata`
- Product pages: compound name first in title, CAS + molecular formula in meta description
- Listing pages: category-specific metadata
- Canonical URLs on all pages (filtered listing pages canonical to base category URL)
- No prices in titles (cached stale by search engines)

### 11.2 Structured data — three JSON-LD blocks per product page

1. **`Product`** with `additionalProperty` entries for CAS, molecular formula, molecular weight, purity, testing method, intended use
2. **`FAQPage`** with the Research FAQ Q&A pairs (highest-leverage LLMO asset)
3. **`BreadcrumbList`** for navigation hierarchy

Homepage: `Organization`. Category listings: `BreadcrumbList` + `CollectionPage`. Legal pages: minimal `WebPage`.

No `AggregateRating` — no reviews exist, fake ratings are a spam vector.

### 11.3 Sitemap and robots

- **`app/sitemap.ts`** — native Next.js generator, re-runs at build time, includes all active products
- **`app/robots.ts`** — disallows `/basket`, `/checkout`, `/admin`, `/api`, `/account`. Explicitly allows `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended` alongside `*`.

### 11.4 LLMO — `llms.txt`

`app/llms.txt/route.ts` serves a dynamic plain-text Markdown-formatted summary of the site:
- Lead blurb (one-sentence site description, compliance-framed)
- About section links
- Products section — every active product listed as `[Name](url): CAS, formula, weight, variant summary`
- Legal section links

Cached at edge for 1 hour. Conforms to the emerging llms.txt spec.

### 11.5 Content practices

Drafted content delivered to Sam:
- About page (~500 words)
- Product Information page (~800 words)
- Research Use Only page (~400 words)
- Homepage hero and research framing paragraph
- 10 complete product descriptions (~200-300 words each) — BPC-157, TB-500, Semaglutide, Tirzepatide, Ipamorelin, CJC-1295, GHK-Cu, Melanotan II, Epithalon, Thymosin Alpha-1
- Research FAQ snippet library (4-5 Q&As per category)

Writing rules applied to all drafts:
- Lead with the compound, not the brand
- Include synonyms naturally for SEO and LLMO
- State research context in third person, scientific tone
- Never write dosage, frequency, or human application
- Describe physical properties (solubility, stability, storage)
- ~200-300 words per product description
- All drafts cross-checked against PubChem / DrugBank / UniProt — no fabricated chemistry

All drafts marked `[DRAFT — REVIEW AND ADAPT]` and included in the solicitor review pass alongside legal pages.

### 11.6 Accessibility baseline

- One `<h1>` per page, headings in order
- `<main>`, `<nav>`, `<aside>`, `<footer>` landmarks
- Descriptive alt text on all images
- Associated `<label>` for every form field
- WCAG AA color contrast minimum (amber callout darkened from brief to ensure headroom)
- Visible focus states on all interactive elements
- Skip-to-content link

## 12. Analytics and monitoring

- **Vercel Analytics** — consent-gated, loaded only after cookie_consent=accepted
- **Vercel Speed Insights** — consent-gated, Core Web Vitals
- **No Google Analytics, no Facebook Pixel, no third-party tracking** in Phase 1
- **Vercel deployment notifications** — email to Sam + David on deploy failures
- **Google Search Console** — verified via DNS TXT record, sitemap submitted (Stage 1c)
- **Bing Webmaster Tools + IndexNow** — submitted at launch

## 13. Firestore and Storage security rules

Production mode from day one. Full rules committed in `firestore.rules` and `storage.rules`, pushed via Firebase CLI at Stage 1b.

**Firestore rules summary**:
- `products`: public read if `active == true`, admin write
- `orders`: customer reads own via `uid` match, admin reads all, no client writes (server-only)
- `customers`: own read/write via UID match, admin reads all, no delete
- `enquiries`: public create with field whitelist, admin read/update/delete
- `config`: public read, admin write

**Storage rules summary**:
- `/products/*` and `/coas/*`: public read, admin write
- `/vial-base/*`: admin read/write only

Admin check in every rule is `request.auth.token.admin == true`, a custom claim set via Admin SDK.

## 14. Deployment path

### 14.1 Stage 1a — Local development (immediately)

- Scaffold at `/c/Users/david/peptide-store/`
- `git init` locally, no remote
- `.env.local` with `REPLACE_ME` placeholder values
- Data layer reads from `data/products.seed.json`
- All storefront, admin UI, compliance infrastructure, checkout flow (stub), and drafted content built and runnable via `npm run dev`
- Demoable to Sam via screenshare or Loom
- 80% of the work completes in this stage with zero dependencies

### 14.2 Stage 1b — Client infrastructure onboarding

Scripted onboarding day. Full step-by-step instructions in `docs/handover/deployment-checklist.md`. Steps, in order:

1. Sam creates Firebase project in `europe-west2`, enables Firestore, Storage, Auth
2. Sam generates Firebase service account key, shares with David via secure channel
3. Sam creates GitHub repo, adds David as collaborator
4. David pushes local repo to Sam's GitHub
5. Sam creates Vercel account, imports repo (do not deploy yet)
6. Sam + David together populate Vercel environment variables
7. Sam creates Resend account, verifies domain, generates API key
8. Sam buys domain from preferred registrar
9. David connects domain to Vercel, Sam adds DNS records
10. David runs `scripts/seed-firestore.ts` against Sam's Firebase
11. David runs `scripts/set-admin-claim.ts` to grant Sam admin claim
12. David deploys Vercel preview, smoke tests end-to-end
13. David + Sam walk through the site together (30-minute handover session)

### 14.3 Stage 1c — Launch gates

Go-live requires **all** of the following:

1. Countersigned SoW received
2. Solicitor has reviewed all six legal pages (`reviewed: true` frontmatter set)
3. Solicitor has reviewed compliance banner copy, age gate copy, product disclaimers, About page, Product Information page
4. Sam has supplied: store name, registered address, company number, VAT status and number, business email, business phone (optional), shipping rule, domain, admin email
5. Sam has supplied real product catalogue OR approved launch with placeholder
6. Sam has supplied base vial image OR approved launch with placeholder
7. Sam has placed a successful test order and confirmed admin flow
8. Firestore security rules verified in production mode
9. Weekly Firestore export task enabled
10. Google Search Console verified and sitemap submitted

Launch happens only when all ten are ticked.

## 15. Environment variables

Complete `.env.example`:

```bash
# Site identity
NEXT_PUBLIC_SITE_URL="https://REPLACE_ME.co.uk"
NEXT_PUBLIC_SITE_NAME="REPLACE_ME"

# Firebase Client SDK (public, safe to expose)
NEXT_PUBLIC_FIREBASE_API_KEY="REPLACE_ME"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="REPLACE_ME.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="REPLACE_ME"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="REPLACE_ME.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="REPLACE_ME"
NEXT_PUBLIC_FIREBASE_APP_ID="REPLACE_ME"

# Firebase Admin SDK (server-only)
FIREBASE_PROJECT_ID="REPLACE_ME"
FIREBASE_CLIENT_EMAIL="REPLACE_ME"
FIREBASE_PRIVATE_KEY="REPLACE_ME"

# Payments
PAYMENT_PROVIDER="stub"
WALLID_CLIENT_ID=""
WALLID_CLIENT_SECRET=""
WALLID_WEBHOOK_SECRET=""
WALLID_API_BASE_URL=""

# Email (Resend)
RESEND_API_KEY="REPLACE_ME"
RESEND_FROM_EMAIL="orders@REPLACE_ME.co.uk"
RESEND_NOTIFICATION_EMAIL="REPLACE_ME"

# Phase 3
COURIER_PLATFORM=""
COURIER_API_KEY=""
PRINTER_TYPE=""
ZEBRA_CLOUD_API_KEY=""
PRINT_SERVER_URL=""
```

Rules:
- `.env.local` is gitignored
- `.env.example` only ever contains `REPLACE_ME` values
- `FIREBASE_PRIVATE_KEY` is base64-encoded in Vercel, decoded at runtime

## 16. Testing strategy

- **Strict TypeScript** — `tsc --noEmit` on CI, catches a large class of bugs at compile time
- **ESLint + Prettier** — standard Next.js config, enforced on CI
- **`next build` in CI** — broken build blocks deploy
- **Manual smoke test checklist** at `docs/smoke-test.md` — run before every production deploy
- **Solicitor review** for compliance correctness (tests cannot catch this)
- **Sam's test order** during Stage 1b for end-user experience

Not in Phase 1: unit tests, integration tests, Playwright E2E, visual regression. These are legitimate but consume more time than they save for a project of this shape. A Playwright smoke test for the checkout flow is a reasonable Phase 2 addition.

## 17. Operating rules

- **Git**: conventional commits, focused small commits, feature branches for non-trivial work, `main` is the deploy branch
- **Credentials**: never committed, never in plain email or chat, always via 1Password / Vercel env / encrypted transport. If exposed, rotate within an hour.
- **Deploys**: preview on every push, production on merge to `main`. First production deploy is the launch event.
- **Rollbacks**: one-click via Vercel
- **Database changes**: schema-affecting changes go through `scripts/migrations/` with a date prefix. No ad-hoc Firebase console edits.

## 18. Handover artifacts

At launch, Sam receives:

- **`docs/handover/deployment-checklist.md`** — the Stage 1b instructions in Sam's voice
- **`docs/handover/admin-guide.md`** — illustrated admin UI walkthrough
- **`docs/handover/content-guide.md`** — writing patterns with the 10 drafted descriptions as examples
- **Live walkthrough session** — 30-minute call where David demos, Sam drives, questions answered
- **30-day post-launch warranty** per SoW — bug fixes and clarifications

## 19. Backups and disaster recovery

- **Firestore scheduled export** — weekly to a dedicated GCS bucket in Sam's project, 90-day retention (Stage 1c task)
- **Cloud Storage versioning** — enabled on product images and COAs
- **Source code** — GitHub (Sam's account)
- **Environment variables** — Sam keeps a copy in password manager as backup to Vercel

## 20. Out of scope for Phase 1

Explicitly not in Phase 1 (to prevent scope creep):

- Customer reviews or ratings
- Wishlist / favorites
- Multi-currency pricing
- International shipping (UK only)
- Multiple admin users beyond Sam
- Bulk product import via CSV (seed script only)
- Inventory forecasting or low-stock auto-reordering
- Loyalty or discount code system
- Blog or news section
- Newsletter signup and marketing email flows
- A/B testing
- Multi-language support

## 21. Phase 2 preview — TrueLayer integration

**Update 2026-04-13 — payment provider changed from Wallid to TrueLayer.** Wallid was ruled out after direct contact confirmed they do not offer a REST API or open banking payment initiation API for custom Next.js integrations — their product is Shopify-only. **TrueLayer** (`https://truelayer.com`) is the replacement: FCA-regulated open banking payments provider with a full REST API, Web SDK, webhook support, and a **native MCP server for Claude AI** that Claude Code can query during development. Customer experience is identical to Wallid (bank-app Pay by Bank flow, no card details).

Phase 2 adds:
- `lib/payments/truelayer.ts` implementing the `PaymentProvider` interface against the TrueLayer REST API (sandbox `https://api.truelayer-sandbox.com`, production `https://api.truelayer.com`)
- `/api/webhooks/truelayer/route.ts` handler that **verifies signatures with TrueLayer's signing library before processing** and handles `payment_executed`, `payment_failed`, and `payment_settled` events
- `/api/checkout/initiate/route.ts` creates a signed payment request server-side and returns a `resource_token` to the Web SDK
- `/api/checkout/status/[paymentId]/route.ts` polls payment status as a webhook fallback
- TrueLayer Web SDK (`@truelayer/web-sdk`) embedded in the checkout review page, styled to match the store's navy/white palette
- Environment variables: `TRUELAYER_CLIENT_ID`, `TRUELAYER_CLIENT_SECRET`, `TRUELAYER_MERCHANT_ACCOUNT_ID`, `TRUELAYER_SIGNING_KEY_ID`, `TRUELAYER_PRIVATE_KEY` (base64), `TRUELAYER_WEBHOOK_SECRET`, `TRUELAYER_ENVIRONMENT` (`sandbox` or `production`), `NEXT_PUBLIC_TRUELAYER_RETURN_URL`
- Switch `PAYMENT_PROVIDER` env var from `stub` to `truelayer`

**Bank-level age verification** — TrueLayer offers a Signup+ scope that verifies the customer's name and date of birth against their bank records at payment time. Under-18s are blocked at the bank level, not at a front-end checkbox. This is a **genuine compliance control** (not the liability-theatre framing that applies to the cookie age gate) and a material strengthening of the compliance story Sam can present to regulators. The cookie age gate at entry remains as a browsing-phase control; bank-level verification is added at the payment step as defence in depth. The order document's `ageGatePassedAt` field is supplemented with a new `ageBankVerifiedAt: Timestamp | null` field populated when TrueLayer returns a successful Signup+ response.

**TrueLayer MCP for Claude AI** — the MCP server should be connected in Claude Code before Phase 2 starts so the executor can query TrueLayer's API directly during development, inspect payment statuses, and reference webhook events without leaving the session. Documentation: `https://docs.truelayer.com/docs/truelayer-mcp-integration-for-claude-ai`.

**Account ownership** — Sam (not Actually AI) must be the TrueLayer Console account holder. Merchant accounts are regulated entities; they must be in the trading business's name.

**No other code changes required** — the abstraction is designed for this swap. `lib/payments/provider.ts`, the checkout flow, and the order schema all remain unchanged.

## 22. Phase 3 preview — fulfilment and image pipeline

Phase 3 adds:
- **Firebase Cloud Function** `onOrderStatusChange` in `europe-west2`, triggered when `orders/{id}.status` becomes `paid`
- Integration with chosen courier API (Royal Mail / Sendcloud / Shippo) to create shipments and retrieve labels
- Integration with printer (cloud-connected Zebra or local print bridge) for picking list + despatch label
- Dispatch confirmation email via Resend, populated with tracking URL
- Standalone **product image generation script** (Pixa MCP or Python/Pillow) to produce 120 product images from Sam's base vial photograph
- Upload generated images to Firebase Storage, update product documents

The `orders.fulfilment` sub-object is already defined — Phase 3 populates its fields without schema migration.

## 23. Open items — Sam query log

See `docs/client-queries-sam.md` for the full living list of questions to resolve with Sam. Key pre-launch items:

- Store name, domain, registered address, company number, VAT status, business email, shipping rule, admin email
- Real product catalogue (CAS, variants, prices, stock) or approval of placeholder launch
- Base vial image or approval of placeholder launch
- Solicitor identified and review scheduled for all compliance surfaces
- Countersigned SoW returned

## 24. Decision log

Key decisions made during the brainstorming and design phase:

1. **Commercial gate posture**: proceed on deposit-paid basis, treat countersignature as pre-launch rather than pre-build blocker.
2. **Legal posture**: build with solicitor-review launch gate, placeholder copy marked with `reviewed` frontmatter flag.
3. **Client accounts**: build locally with no remote until Sam's Firebase/Vercel/GitHub exist. No work under David's accounts.
4. **Architecture**: Next.js 16 monolith + shadcn admin (approach X), with targeted Cloud Function only for Phase 3 fulfilment webhook. Rejected Sanity CMS (contradicts boutique positioning) and full Cloud Functions split (overkill for Phase 1).
5. **Tailwind v4** over v3, pushing into the newer version to maximize capability.
6. **Admin UI is bespoke** (shadcn primitives) not delegated to a headless CMS — part of the product differentiator.
7. **Product data shape**: per-variant pricing, stock, COA, and active flag; chemistry data denormalized onto product; prices stored as integer pence.
8. **Orders are immutable snapshots**: denormalized line items, snapshot VAT rate, server-timestamped compliance evidence.
9. **`orders.fulfilment` sub-object defined now, populated in Phase 3** — avoids future migration.
10. **Age gate uses a cookie, not localStorage** — SSR-aware, no flash, legally more defensible.
11. **Age gate is lean but present**: simple modal, 30-day cookie, dismissable via Escape and outside-click. Industry-standard legal effect without hostile UX.
12. **Guest checkout supported with soft account prompts** — inline checkbox at delivery step, second-chance prompt on confirmation page. No forced account creation ever.
13. **Research confirmation checkbox is on checkout review step only**, not on basket page — point-of-sale legal effect.
14. **Stub payment creates a real order** in Firestore and redirects to a confirmation page with `?stub=true` banner — lets Sam test the full flow without TrueLayer wired up.
15. **Payment provider is an interface** — `stub.ts`, `truelayer.ts` implementations swappable by env var. Phase 1 scaffolds both; Phase 2 activates TrueLayer.
16. **Typography**: Cormorant Garamond + DM Sans + JetBrains Mono (used only for chemistry data and identifiers).
17. **No reviews, testimonials, countdown timers, urgency messaging, or email popups** — ever. Trust is the product.
18. **Explicit AI crawler allowlist** in `robots.ts` — GPTBot, ClaudeBot, PerplexityBot, Google-Extended.
19. **`llms.txt` file** served dynamically at `/llms.txt` as an emerging AI-search signal.
20. **Three JSON-LD blocks per product page**: `Product`, `FAQPage`, `BreadcrumbList`. `FAQPage` is the highest-leverage AEO asset.
21. **SEO-only acquisition assumption revised**: Nupex running ad pixels is explained by their Shopify trust history, not by paid ads being universally possible for fresh custom-built peptide sites. The SEO focus in Phase 1 is correctly calibrated.
22. **Drafted content is a deliverable** — 10 product descriptions, About, Product Information, Research Use, hero copy, FAQ snippet library. Sam adapts rather than writing from scratch.
23. **No formal test suite in Phase 1** — TypeScript strict + manual smoke test + solicitor review. Playwright E2E reasonable for Phase 2.
24. **Launch gates are written and Sam-visible from day one** — avoids subjective "is it ready?" debates.
25. **`proxy.ts` is not used in Phase 1**. Age-gating and admin authentication both run in Server Component layouts (root layout for age gate, `(admin)` layout for admin auth), giving full Node.js runtime access to the Firebase Admin SDK. Proxy at the Edge runtime would require a separate JWK-based JWT verifier and complicate the auth path for no Phase 1 benefit. Can be introduced later if rewrites, rate limiting, or geo-routing become requirements.
26. **Wallid ruled out, TrueLayer selected for Phase 2 payments** (2026-04-13). After direct contact, Wallid confirmed they offer no REST API or open banking payment initiation API for custom Next.js integrations — their product is Shopify-only. TrueLayer replaces Wallid with equivalent customer experience (Pay by Bank via open banking) and three material advantages: (a) full REST API and `@truelayer/web-sdk`, (b) native MCP server for Claude AI that accelerates development and debugging, (c) Signup+ scope for bank-level name and date-of-birth verification at payment time — a genuine compliance control that strengthens Sam's regulatory position beyond what a front-end checkbox can provide. Payment provider abstraction in `lib/payments/provider.ts` means the swap is a single-file replacement with no downstream changes.
