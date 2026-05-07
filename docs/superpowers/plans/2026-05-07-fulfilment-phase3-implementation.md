# Phase 3 Fulfilment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship SoW Phase 3 fulfilment integration — Royal Mail Click & Drop with daily Mon–Fri 13:00 batch printing to a Zebra ZD421d-NW via Cloud Connect, full Royal Mail tracking webhook ingestion (5 milestones), customer-facing tracking timeline, and dispatch console with bulk actions. International readiness baked in via type-widening.

**Architecture:** Two adapter families (`lib/fulfilment/carriers/`, `lib/fulfilment/printers/`) each with one real implementation + stubs. Daily Cloud Function calls internal `/api/admin/dispatch/run-batch` endpoint with shared-secret auth, which iterates paid orders through `generateLabel` server action. Tracking events arrive via authenticated webhook, populating an append-only `trackingEvents` journal on the order. Dispatch console at `/admin/dispatch` provides per-order + bulk actions and serves as manual override for the scheduled batch.

**Tech Stack:** Next.js 16 App Router · React 19 · TypeScript · Firebase (Firestore + Functions v2 + Admin SDK) · Resend · Zod · Royal Mail Click & Drop REST API · Zebra Print Cloud Connect REST API.

**Verification convention:** This codebase deliberately has no test suite (Phase 1 decision, confirmed in spec §15). Per-task verification gates are:
- `npx tsc --noEmit` — type check
- `npx next lint` — lint
- `npm run build` — at major milestones (Phase boundaries)
- Manual smoke-test runbook in `docs/handover/dispatch-smoke-test.md` (Task F4) — at Phase D and Phase F completion

**Reference spec:** `docs/superpowers/specs/2026-05-07-fulfilment-phase3-design.md`. Treat the spec as authoritative for behaviour; this plan is the build sequence.

**Critical implementation rule:** Royal Mail Click & Drop and Zebra Cloud Connect have evolving REST APIs. **Before writing each adapter call, pull the current vendor docs** and Zod-validate every external response shape at the trust boundary. This plan documents the contract; vendor docs document the wire.

---

## Files to Create / Modify

| Path | Action | Phase |
|---|---|---|
| `types/customer.ts` | Modify (widen `country`) | A |
| `types/order.ts` | Modify (add `currencyCode`, extend `OrderFulfilment`, line-item customs) | A |
| `types/audit.ts` | Modify (add 9 new event types) | A |
| `types/dispatch.ts` | Create (DispatchConfig, ShippingRates, BatchRun, TrackingMilestone) | A |
| `types/index.ts` | Modify (re-export `dispatch`) | A |
| `lib/zod/address.ts` | Create / Modify (Zod schema with country allowlist) | A |
| `firestore.indexes.json` | Modify (add 2 indexes) | A |
| `firestore.rules` | Modify (rules for new collections) | A |
| `scripts/seed-firestore.ts` | Modify (seed `config/dispatch`, `shippingRates/main`) | A |
| `lib/fulfilment/carriers/types.ts` | Create | B |
| `lib/fulfilment/service-codes.ts` | Create | B |
| `lib/fulfilment/carriers/stub.ts` | Create | B |
| `lib/fulfilment/carriers/royalmail.ts` | Create | B |
| `lib/fulfilment/carriers/sendcloud.ts` | Create (typed stub) | B |
| `lib/fulfilment/carriers/shippo.ts` | Create (typed stub) | B |
| `lib/fulfilment/carriers/index.ts` | Create (selector) | B |
| `lib/fulfilment/printers/types.ts` | Create | B |
| `lib/fulfilment/printers/stub.ts` | Create | B |
| `lib/fulfilment/printers/zebra-cloud.ts` | Create | B |
| `lib/fulfilment/printers/printnode.ts` | Create (typed stub) | B |
| `lib/fulfilment/printers/index.ts` | Create (selector) | B |
| `lib/fulfilment/webhook-verify.ts` | Create | B/D |
| `lib/fulfilment/dispatch-config.ts` | Create (config getter helper) | C |
| `lib/fulfilment/weight.ts` | Create (weight calculation) | C |
| `lib/email-templates/order-dispatched.ts` | Create | C |
| `app/actions/fulfilment.ts` | Create | C |
| `app/actions/orders.ts` | Modify (cancel cascade) | C |
| `app/actions/dispatch-config.ts` | Create | C |
| `app/api/admin/dispatch/run-batch/route.ts` | Create | D |
| `app/api/webhooks/royalmail/tracking/route.ts` | Create | D |
| `app/(admin)/admin/orders/[id]/label/route.ts` | Create | D |
| `app/(admin)/admin/orders/[id]/packing-slip/page.tsx` | Create | D |
| `app/(admin)/admin/dispatch/page.tsx` | Create | D |
| `app/(admin)/admin/dispatch/DispatchClient.tsx` | Create | D |
| `app/(admin)/admin/dispatch/DispatchRow.tsx` | Create | D |
| `app/(admin)/admin/dispatch/DispatchHeader.tsx` | Create | D |
| `components/account/TrackingTimeline.tsx` | Create | D |
| `app/(public)/account/orders/[id]/page.tsx` | Modify (mount TrackingTimeline) | D |
| `app/(admin)/admin/settings/page.tsx` | Modify (dispatch tab) | D |
| `app/(admin)/admin/audit-log/AuditLogRow.tsx` | Modify (render new event types) | F |
| `app/(admin)/admin/audit-log/AuditLogDrillDown.tsx` | Modify (drilldown for new types) | F |
| `functions/src/dispatch/runDailyBatch.ts` | Create | E |
| `functions/src/index.ts` | Modify (export new function) | E |
| `docs/client-queries-sam.md` | Modify (Sam-blocking inputs) | F |
| `docs/handover/stage1b-env-vars.md` | Modify (promote Phase 3 vars to active) | F |
| `docs/handover/dispatch-smoke-test.md` | Create (12-step runbook) | F |
| `docs/handover/admin-guide.md` | Modify (dispatch console doc) | F |
| `public/dev-fixtures/sample-label.pdf` | Create (placeholder PDF for stub) | B |

---

## Phase A — Foundation: Types, Schemas, Audit Events, Config

### Task A1: Widen `Address.country` literal to ISO string

**Files:**
- Modify: `types/customer.ts`

- [ ] **Step 1: Replace the literal type with ISO 3166-1 alpha-2 string**

In `types/customer.ts`, change:

```ts
export type Address = {
  line1: string;
  line2: string | null;
  city: string;
  postcode: string;
  country: "GB";
};
```

to:

```ts
export type Address = {
  line1: string;
  line2: string | null;
  city: string;
  postcode: string;
  /**
   * ISO 3166-1 alpha-2 country code. Phase 3 launches GB-only — Zod schemas
   * enforce GB at the validation boundary. International activation is a
   * Zod allowlist change (see spec §13: International Activation Runbook).
   */
  country: string;
};
```

If the same `Address` type is also defined in `types/order.ts`, keep it consistent (it imports from `customer.ts`).

- [ ] **Step 2: Type-check passes**

Run: `npx tsc --noEmit`
Expected: 0 errors. (The change is widening — narrower → wider — so existing call sites still satisfy the type.)

- [ ] **Step 3: Commit**

```bash
git add types/customer.ts
git commit -m "feat(types): widen Address.country from GB literal to ISO string

Type widens; Zod narrows. Future international activation is a one-line
allowlist change in the Zod schema, not a type-system migration.

Refs: docs/superpowers/specs/2026-05-07-fulfilment-phase3-design.md §2.1"
```

---

### Task A2: Add `Order.currencyCode` field

**Files:**
- Modify: `types/order.ts`

- [ ] **Step 1: Add field to `Order` type**

After the `vatRateAtPurchase: number;` line in `Order`, add:

```ts
  /**
   * ISO 4217 currency code. Always "GBP" at launch. Future multi-currency
   * support widens this and updates price formatters.
   */
  currencyCode: string;
```

- [ ] **Step 2: Type-check identifies missing field on existing reads/writes**

Run: `npx tsc --noEmit`
Expected: errors at every site that constructs an `Order` (mainly `lib/orders.ts` and `app/actions/create-order.ts`).

- [ ] **Step 3: Default missing field to "GBP" at the read boundary**

In `lib/orders.ts`, find the function that converts Firestore docs to `Order` (likely `coerceToOrder` or inline in `getOrderById` / `getOrders`). Add:

```ts
currencyCode: (data.currencyCode as string | undefined) ?? "GBP",
```

In `app/actions/create-order.ts`, in the `createOrderTransaction` order-doc construction, add `currencyCode: "GBP"` to the object literal alongside `vatRateAtPurchase`.

- [ ] **Step 4: Type-check passes**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add types/order.ts lib/orders.ts app/actions/create-order.ts
git commit -m "feat(types): add Order.currencyCode (GBP at launch)

Field defaults to GBP at the data-layer read boundary so existing orders
remain readable. Enables future multi-currency support without migration.

Refs: spec §2.2"
```

---

### Task A3: Extend `OrderFulfilment` with new fields

**Files:**
- Modify: `types/order.ts`

- [ ] **Step 1: Replace `OrderFulfilment` definition**

Replace the existing `OrderFulfilment` type with:

```ts
export type TrackingMilestone =
  | "collected"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "failed";

export type TrackingEvent = {
  milestone: TrackingMilestone;
  timestamp: Timestamp | Date;
  location: string | null;
  /** Raw Royal Mail webhook payload, capped at ~1KB by clampJsonObject. */
  raw: Record<string, unknown>;
};

export type OrderFulfilment = {
  carrier: "royalmail" | "sendcloud" | "shippo" | null;
  carrierOrderId: string | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  printedAt: Timestamp | Date | null;
  printerStatus: "pending" | "printed" | "failed" | null;
  dispatchedAt: Timestamp | Date | null;
  customerEmailedAt: Timestamp | Date | null;
  lastError: string | null;
  trackingEvents: TrackingEvent[];
  lastTrackingStatus: TrackingMilestone | null;
};
```

- [ ] **Step 2: Default missing fields at the read boundary**

In `lib/orders.ts`, when coercing to `Order`, ensure `fulfilment` is normalised:

```ts
function coerceToFulfilment(raw: Record<string, unknown> | undefined): OrderFulfilment {
  const f = (raw ?? {}) as Partial<OrderFulfilment>;
  return {
    carrier: f.carrier ?? null,
    carrierOrderId: f.carrierOrderId ?? null,
    trackingNumber: f.trackingNumber ?? null,
    labelUrl: f.labelUrl ?? null,
    printedAt: f.printedAt ?? null,
    printerStatus: f.printerStatus ?? null,
    dispatchedAt: f.dispatchedAt ?? null,
    customerEmailedAt: f.customerEmailedAt ?? null,
    lastError: f.lastError ?? null,
    trackingEvents: Array.isArray(f.trackingEvents) ? f.trackingEvents : [],
    lastTrackingStatus: f.lastTrackingStatus ?? null,
  };
}
```

Wire it into the existing order-coerce path. Existing orders without these fields will read with sensible defaults.

- [ ] **Step 3: Update `createOrderTransaction` order doc**

In `app/actions/create-order.ts`, ensure the `fulfilment` object on new orders initialises every field:

```ts
fulfilment: {
  carrier: null,
  carrierOrderId: null,
  trackingNumber: null,
  labelUrl: null,
  printedAt: null,
  printerStatus: null,
  dispatchedAt: null,
  customerEmailedAt: null,
  lastError: null,
  trackingEvents: [],
  lastTrackingStatus: null,
},
```

- [ ] **Step 4: Type-check passes**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add types/order.ts lib/orders.ts app/actions/create-order.ts
git commit -m "feat(types): extend OrderFulfilment with carrierOrderId, lastError, trackingEvents

Adds the data foundation for Phase 3 fulfilment integration and the five
tracking-driven upsells (review email, failed-delivery rescue, dispatch
analytics, branded tracking page, SMS notifications). Field defaults applied
at the read boundary — existing orders remain readable without migration.

Refs: spec §2.2"
```

---

### Task A4: Add `OrderLineItem` customs fields (typed stubs)

**Files:**
- Modify: `types/order.ts`

- [ ] **Step 1: Extend `OrderLineItem`**

Add three optional fields:

```ts
export type OrderLineItem = {
  productId: string;
  productSlug: string;
  name: string;
  sku: string;
  size: string;
  unitPriceInPence: number;
  quantity: number;
  lineTotalInPence: number;
  /** ISO 6 HS code — required for international shipments. Null at GB-only launch. */
  hsCode: string | null;
  /** Customs declared value — required for international. Null at GB-only launch. */
  customsValueInPence: number | null;
  /** Plain-language item description for customs forms. Null at GB-only launch. */
  customsDescription: string | null;
};
```

- [ ] **Step 2: Default to null at the read and write boundary**

In `lib/orders.ts` line-item coercion, default each new field to `null`. In `app/actions/create-order.ts` line-item construction, add `hsCode: null, customsValueInPence: null, customsDescription: null`.

- [ ] **Step 3: Type-check passes**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add types/order.ts lib/orders.ts app/actions/create-order.ts
git commit -m "feat(types): add OrderLineItem customs fields as typed stubs

Optional fields populated by international activation (upsell 3.4). Null
at GB-only launch. No UI surface yet.

Refs: spec §2.3"
```

---

### Task A5: Add new audit event types

**Files:**
- Modify: `types/audit.ts`

- [ ] **Step 1: Append 9 new event types to `ALL_AUDIT_EVENT_TYPES`**

In `types/audit.ts`, add these entries to the `ALL_AUDIT_EVENT_TYPES` const array (preserving existing entries, append at the end with a comment header):

```ts
  // Fulfilment (Phase 3)
  "order.label_generated",
  "order.label_voided",
  "order.dispatched",
  "order.tracking_collected",
  "order.tracking_in_transit",
  "order.tracking_out_for_delivery",
  "order.tracking_delivered",
  "order.tracking_failed",
  "order.dispatch_batch_run",
```

- [ ] **Step 2: Type-check passes (the type is `as const`-derived; consumers may need updating in Phase F task F1)**

Run: `npx tsc --noEmit`
Expected: 0 errors. (Audit-log viewer rendering for the new types is wired in Task F1; default render handles unknown types gracefully.)

- [ ] **Step 3: Commit**

```bash
git add types/audit.ts
git commit -m "feat(audit): add 9 fulfilment event types for Phase 3

label_generated, label_voided, dispatched, tracking_{collected,
in_transit, out_for_delivery, delivered, failed}, dispatch_batch_run.

Refs: spec §2.4"
```

---

### Task A6: Create `types/dispatch.ts`

**Files:**
- Create: `types/dispatch.ts`
- Modify: `types/index.ts`

- [ ] **Step 1: Create the dispatch types file**

```ts
// types/dispatch.ts
import type { Timestamp } from "firebase/firestore";
import type { Address } from "./customer";

/**
 * Royal Mail GB service codes used at launch. International codes added
 * via upsell 3.4. Verify against current Click & Drop API documentation
 * before committing — Royal Mail occasionally renames codes.
 */
export const ROYAL_MAIL_GB_SERVICES = {
  TPN24: { label: "Tracked 24", maxKg: 20 },
  TPN48: { label: "Tracked 48", maxKg: 20 },
} as const;

export type RoyalMailServiceCode = keyof typeof ROYAL_MAIL_GB_SERVICES;

export type DispatchConfig = {
  enabled: boolean;
  returnAddress: Address;
  senderName: string;
  defaultServiceCodeByCountry: Record<string, RoyalMailServiceCode>;
  obaAccountNumber: string;
  batchScheduleCron: string;
  batchScheduleTimezone: string;
  defaultWeightGrams: number;
  zebraPrinterDeviceId: string;
  trackingWebhookUrl: string;
};

export type ShippingRates = {
  /** Rate in pence keyed by ISO 3166-1 alpha-2 country code. */
  rates: Record<string, number>;
};

export type DispatchBatchRun = {
  id: string;
  startedAt: Timestamp | Date;
  completedAt: Timestamp | Date | null;
  triggeredBy: "schedule" | "admin";
  triggeredByActor: { uid: string | null; email: string | null };
  ordersProcessed: number;
  ordersFailed: number;
  errors: Array<{ orderId: string; orderNumber: string; message: string }>;
  durationMs: number;
};
```

- [ ] **Step 2: Re-export from `types/index.ts`**

Add: `export * from "./dispatch";`

- [ ] **Step 3: Type-check passes**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add types/dispatch.ts types/index.ts
git commit -m "feat(types): add DispatchConfig, ShippingRates, BatchRun, RoyalMailServiceCode

Refs: spec §2.5"
```

---

### Task A7: Update Zod schemas — country allowlist + currency

**Files:**
- Create: `lib/zod/address.ts` (if it doesn't exist; otherwise modify the canonical Zod address location)
- Modify: any existing Zod schemas that validate addresses (search for `country: z.literal` or `country: z.string`)

- [ ] **Step 1: Locate existing address Zod schemas**

Run: `npx grep -rn "country:" lib/ app/ --include="*.ts" --include="*.tsx"` (or use the Grep tool).
Identify every Zod schema that currently typed `country` as `z.literal("GB")` or similar.

- [ ] **Step 2: Create / update canonical Zod address schema**

In `lib/zod/address.ts` (create if missing):

```ts
import { z } from "zod";

export const ALLOWED_COUNTRY_CODES = ["GB"] as const;
export type AllowedCountryCode = (typeof ALLOWED_COUNTRY_CODES)[number];

export const addressSchema = z.object({
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).nullable(),
  city: z.string().min(1).max(120),
  postcode: z.string().min(1).max(20),
  country: z.enum(ALLOWED_COUNTRY_CODES),
});

export type AddressInput = z.infer<typeof addressSchema>;
```

- [ ] **Step 3: Update call sites to import the canonical schema**

For each Zod schema that validates an address (signup, checkout delivery, admin order edit), replace inline address shape with `addressSchema`. If a schema needed an override (e.g. checkout adds extra fields), use `.extend()`.

- [ ] **Step 4: Add Zod schema for `currencyCode`**

In `lib/zod/order.ts` (create if missing):

```ts
import { z } from "zod";

export const ALLOWED_CURRENCY_CODES = ["GBP"] as const;
export const currencyCodeSchema = z.enum(ALLOWED_CURRENCY_CODES);
```

Use it wherever a Zod schema validates an `Order` containing `currencyCode`.

- [ ] **Step 5: Type-check + lint pass**

Run: `npx tsc --noEmit && npx next lint`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add lib/zod/ app/actions/ lib/
git commit -m "refactor(zod): consolidate address+currency schemas with allowlist

Single canonical addressSchema with country: z.enum(['GB']). Going
international (upsell 3.4) is a one-line allowlist change. Same pattern
for currencyCode.

Refs: spec §2.1, §13"
```

---

### Task A8: Update Firestore indexes

**Files:**
- Modify: `firestore.indexes.json`

- [ ] **Step 1: Add two composite indexes**

Append to the `indexes` array in `firestore.indexes.json`:

```json
{
  "collectionGroup": "orders",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "fulfilment.printerStatus", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "orders",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "fulfilment.trackingNumber", "order": "ASCENDING" }
  ]
}
```

- [ ] **Step 2: Validate JSON parses**

Run: `node -e "JSON.parse(require('fs').readFileSync('firestore.indexes.json', 'utf-8'))"`
Expected: no error output.

- [ ] **Step 3: Commit**

```bash
git add firestore.indexes.json
git commit -m "feat(firestore): add indexes for dispatch queue + tracking webhook lookup

- orders by status + printerStatus + createdAt (dispatch queue read)
- orders by fulfilment.trackingNumber (webhook receiver lookup)

Indexes deploy via 'firebase deploy --only firestore:indexes' before
Phase 3 goes live in production. Note in handover task F3.

Refs: spec §2.6"
```

---

### Task A9: Update Firestore rules for new collections

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Add rules for `dispatchBatchRuns`, `config/dispatch`, `shippingRates`**

Find the existing `match /databases/{database}/documents { ... }` block. Add:

```
match /dispatchBatchRuns/{id} {
  allow read: if isAdmin();
  allow create, update, delete: if false;  // server-admin-SDK only
}

match /config/dispatch {
  allow read: if isAdmin();
  allow create, update, delete: if false;  // server-admin-SDK only
}

match /shippingRates/{id} {
  allow read: if true;          // public — checkout reads to compute shipping
  allow create, update, delete: if false;  // server-admin-SDK only
}
```

(Reuse the existing `isAdmin()` helper. If the helper has a different name in this codebase, use whatever is already there.)

- [ ] **Step 2: Validate rules syntax**

Run: `firebase emulators:exec --only firestore "echo rules ok"`
Expected: emulator boots, validates rules, exits 0.

If `firebase` CLI is not available locally, defer this to deploy time but verify visually that brace counts and rule predicates match patterns elsewhere in the file.

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat(firestore): rules for dispatchBatchRuns, config/dispatch, shippingRates

All admin-read or public-read; writes from server admin SDK only.

Refs: spec §2.7"
```

---

### Task A10: Seed `config/dispatch` and `shippingRates/main`

**Files:**
- Modify: `scripts/seed-firestore.ts`

- [ ] **Step 1: Add seed for `config/dispatch`**

In `scripts/seed-firestore.ts`, find the existing config-doc seed pattern. Add a new seed:

```ts
const dispatchConfigDoc: DispatchConfig = {
  enabled: false,                        // Sam flips this in /admin/settings once OBA + return address are filled
  returnAddress: {
    line1: "",
    line2: null,
    city: "",
    postcode: "",
    country: "GB",
  },
  senderName: "Cryogene Laboratories",
  defaultServiceCodeByCountry: { GB: "TPN48" },
  obaAccountNumber: "",
  batchScheduleCron: "0 13 * * 1-5",
  batchScheduleTimezone: "Europe/London",
  defaultWeightGrams: 100,
  zebraPrinterDeviceId: "",
  trackingWebhookUrl: "",
};

await db.collection("config").doc("dispatch").set(dispatchConfigDoc, { merge: true });
console.log("Seeded config/dispatch");
```

- [ ] **Step 2: Add seed for `shippingRates/main`**

```ts
const shippingRatesDoc: ShippingRates = {
  rates: { GB: 695 },  // £6.95 — match existing checkout rate
};

await db.collection("shippingRates").doc("main").set(shippingRatesDoc, { merge: true });
console.log("Seeded shippingRates/main");
```

- [ ] **Step 3: Run seeder against local Firebase emulator (or skip if no emulator)**

Run: `npm run seed:firestore`
Expected: no errors. (If credentials aren't set for the seed environment, the script logs a clear "skipping" message — acceptable.)

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-firestore.ts
git commit -m "feat(seed): seed config/dispatch and shippingRates/main with safe defaults

config/dispatch.enabled = false at seed — Sam opts in via /admin/settings
once OBA + return address + Zebra device fingerprint are populated.
shippingRates seeded with the existing £6.95 GB flat rate.

Refs: spec §2.5, §11"
```

---

## Phase A verification gate

- [ ] **Run full type-check + lint + build**

```bash
npx tsc --noEmit && npx next lint && npm run build
```

Expected: all pass.

- [ ] **Confirm: existing tests / smoke flows unaffected**

Browse `/admin/orders` in dev (`npm run dev`) — confirm the orders table still renders. The widening + new fields should be invisible to existing UX.

---

## Phase B — Adapter Layer

### Task B1: CarrierAdapter contract

**Files:**
- Create: `lib/fulfilment/carriers/types.ts`

- [ ] **Step 1: Write the contract**

```ts
// lib/fulfilment/carriers/types.ts
import "server-only";
import type { Address } from "@/types/customer";
import type { RoyalMailServiceCode } from "@/types/dispatch";

export type CustomsDeclaration = {
  items: Array<{
    description: string;
    hsCode: string;
    quantity: number;
    valueInPence: number;
    weightGrams: number;
  }>;
  totalValueInPence: number;
};

export type ShipmentInput = {
  orderId: string;
  orderNumber: string;
  destinationAddress: Address;
  destinationName: string;
  destinationEmail: string;
  destinationPhone: string | null;
  senderAddress: Address;
  senderName: string;
  serviceCode: RoyalMailServiceCode;
  weightGrams: number;
  /** Required when destination country !== "GB". Null otherwise. */
  customs: CustomsDeclaration | null;
};

export type ShipmentResult = {
  carrierOrderId: string;
  trackingNumber: string;
  labelPdfUrl: string;
};

export type CarrierAdapter = {
  createShipment(input: ShipmentInput): Promise<ShipmentResult>;
  voidShipment(carrierOrderId: string): Promise<void>;
  /**
   * Subscribe an HTTPS webhook to receive tracking milestones for this shipment.
   * Fire-and-forget — failure logs but does not block label generation.
   */
  subscribeTracking(input: { trackingNumber: string; webhookUrl: string }): Promise<void>;
};
```

- [ ] **Step 2: Type-check passes**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add lib/fulfilment/carriers/types.ts
git commit -m "feat(fulfilment): CarrierAdapter contract

Three methods: createShipment, voidShipment, subscribeTracking.
Future carriers (Sendcloud, Shippo) drop in against this contract.

Refs: spec §1"
```

---

### Task B2: Stub carrier adapter

**Files:**
- Create: `lib/fulfilment/carriers/stub.ts`
- Create: `public/dev-fixtures/sample-label.pdf`

- [ ] **Step 1: Place a placeholder PDF in `public/dev-fixtures/`**

Create the directory and a 1-page PDF named `sample-label.pdf`. A minimal valid PDF can be generated with:

```bash
mkdir -p public/dev-fixtures && node -e "
const pdf = '%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 288 432]/Contents 4 0 R/Resources<<>>>>endobj\n4 0 obj<</Length 44>>stream\nBT /F1 14 Tf 20 200 Td (STUB SHIPPING LABEL) Tj ET\nendstream endobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000050 00000 n\n0000000090 00000 n\n0000000180 00000 n\ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n260\n%%EOF';
require('fs').writeFileSync('public/dev-fixtures/sample-label.pdf', pdf);
"
```

Verify the file is non-empty: `ls -la public/dev-fixtures/sample-label.pdf`

- [ ] **Step 2: Write the stub adapter**

```ts
// lib/fulfilment/carriers/stub.ts
import "server-only";
import type { CarrierAdapter, ShipmentInput, ShipmentResult } from "./types";

const FAIL_NEXT_FLAG = "STUB_CARRIER_FAIL_NEXT";

export const stubCarrier: CarrierAdapter = {
  async createShipment(input: ShipmentInput): Promise<ShipmentResult> {
    if (process.env[FAIL_NEXT_FLAG] === "1") {
      // Reset so the next call succeeds — useful for one-shot failure simulation.
      delete process.env[FAIL_NEXT_FLAG];
      throw new Error("Stub carrier: simulated failure (STUB_CARRIER_FAIL_NEXT=1)");
    }
    const trackingNumber = `STUBTRACK${input.orderId.slice(0, 6).toUpperCase()}`;
    return {
      carrierOrderId: `stub-${input.orderId}`,
      trackingNumber,
      // Served from public/ — accessible at runtime
      labelPdfUrl: "/dev-fixtures/sample-label.pdf",
    };
  },

  async voidShipment(carrierOrderId: string): Promise<void> {
    console.log(`[stubCarrier] voidShipment(${carrierOrderId}) — no-op`);
  },

  async subscribeTracking({ trackingNumber, webhookUrl }): Promise<void> {
    console.log(`[stubCarrier] subscribeTracking(${trackingNumber}, ${webhookUrl}) — no-op`);
  },
};
```

- [ ] **Step 3: Type-check passes**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add public/dev-fixtures/sample-label.pdf lib/fulfilment/carriers/stub.ts
git commit -m "feat(fulfilment): stub carrier adapter + dev-fixture sample label

Returns deterministic fake data so dispatch console works end-to-end
without RM credentials. STUB_CARRIER_FAIL_NEXT=1 simulates one-shot
failure for retry testing.

Refs: spec §5"
```

---

### Task B3: Sendcloud + Shippo typed stubs

**Files:**
- Create: `lib/fulfilment/carriers/sendcloud.ts`
- Create: `lib/fulfilment/carriers/shippo.ts`

- [ ] **Step 1: Sendcloud stub**

```ts
// lib/fulfilment/carriers/sendcloud.ts
import "server-only";
import type { CarrierAdapter } from "./types";

/**
 * Typed stub. Sendcloud activation is upsell 3.5 — multi-carrier abstraction.
 * Throwing here means a misconfigured COURIER_PLATFORM=sendcloud at runtime
 * surfaces immediately rather than silently falling through.
 */
export const sendcloudCarrier: CarrierAdapter = {
  async createShipment() {
    throw new Error("Sendcloud carrier not implemented — see upsell 3.5");
  },
  async voidShipment() {
    throw new Error("Sendcloud carrier not implemented — see upsell 3.5");
  },
  async subscribeTracking() {
    throw new Error("Sendcloud carrier not implemented — see upsell 3.5");
  },
};
```

- [ ] **Step 2: Shippo stub**

```ts
// lib/fulfilment/carriers/shippo.ts
import "server-only";
import type { CarrierAdapter } from "./types";

export const shippoCarrier: CarrierAdapter = {
  async createShipment() {
    throw new Error("Shippo carrier not implemented — see upsell 3.5");
  },
  async voidShipment() {
    throw new Error("Shippo carrier not implemented — see upsell 3.5");
  },
  async subscribeTracking() {
    throw new Error("Shippo carrier not implemented — see upsell 3.5");
  },
};
```

- [ ] **Step 3: Type-check + commit**

```bash
npx tsc --noEmit
git add lib/fulfilment/carriers/sendcloud.ts lib/fulfilment/carriers/shippo.ts
git commit -m "feat(fulfilment): Sendcloud + Shippo typed stubs

Reserve enum members against the CarrierAdapter contract. Throw on call
so misconfigured COURIER_PLATFORM surfaces immediately.

Refs: spec §17"
```

---

### Task B4: Royal Mail Click & Drop adapter — auth + token caching

**Files:**
- Create: `lib/fulfilment/carriers/royalmail.ts`

**Critical implementation note:** Pull the **current** Royal Mail Click & Drop API documentation (`https://developer.royalmail.net/`) before writing this code. Verify the base URL, auth header format, and `/orders` endpoint contract. The structure below is correct in shape but specific paths/headers may have changed.

- [ ] **Step 1: Scaffold the file with token caching**

```ts
// lib/fulfilment/carriers/royalmail.ts
import "server-only";
import { z } from "zod";
import type { CarrierAdapter, ShipmentInput, ShipmentResult } from "./types";

// ------- env helpers -------

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Royal Mail adapter requires env ${name}`);
  return v;
}

const BASE_URL = () =>
  process.env.ROYALMAIL_CLICK_AND_DROP_BASE_URL ?? "https://api.parcel.royalmail.com";

// ------- token cache -------

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  // VERIFY: the auth flow against current RM docs. Click & Drop typically uses
  // an API key passed directly as Bearer — no token exchange. If your account
  // type uses OAuth, add the exchange here.
  const apiKey = requireEnv("ROYALMAIL_CLICK_AND_DROP_API_KEY");

  cachedToken = {
    token: apiKey,
    // Treat as long-lived. If RM moves to OAuth, set from response.
    expiresAt: Date.now() + 50 * 60 * 1000,
  };
  return cachedToken.token;
}

// (Subsequent tasks add createShipment, voidShipment, subscribeTracking)

export const royalMailCarrier: CarrierAdapter = {
  async createShipment(_input: ShipmentInput): Promise<ShipmentResult> {
    throw new Error("Not yet implemented — see Task B5");
  },
  async voidShipment(_carrierOrderId: string): Promise<void> {
    throw new Error("Not yet implemented — see Task B6");
  },
  async subscribeTracking(): Promise<void> {
    throw new Error("Not yet implemented — see Task B7");
  },
};
```

- [ ] **Step 2: Type-check passes**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add lib/fulfilment/carriers/royalmail.ts
git commit -m "feat(fulfilment): Royal Mail adapter scaffold with token caching

Methods stubbed; createShipment, voidShipment, subscribeTracking
implemented in Tasks B5/B6/B7.

Refs: spec §5"
```

---

### Task B5: Royal Mail `createShipment`

**Files:**
- Modify: `lib/fulfilment/carriers/royalmail.ts`

**Critical:** Verify the request/response shape against current Click & Drop API docs before committing. The structure below reflects the public schema as of spec writing — endpoint paths and field names may evolve.

- [ ] **Step 1: Add the response Zod schema**

In `lib/fulfilment/carriers/royalmail.ts`, add near the top after imports:

```ts
const createShipmentResponseSchema = z.object({
  createdOrders: z.array(z.object({
    orderIdentifier: z.string(),
    trackingNumber: z.string().optional(),     // present only for tracked services
    labelUrl: z.string().url().optional(),
  })),
  errorsCount: z.number().optional(),
  successCount: z.number().optional(),
});
```

- [ ] **Step 2: Implement `createShipment`**

Replace the stub `createShipment` body with:

```ts
async createShipment(input: ShipmentInput): Promise<ShipmentResult> {
  const token = await getAccessToken();

  // Build the order payload. VERIFY field names against current RM docs.
  const body = {
    items: [{
      orderReference: input.orderNumber,
      recipient: {
        address: {
          fullName: input.destinationName,
          companyName: "",
          addressLine1: input.destinationAddress.line1,
          addressLine2: input.destinationAddress.line2 ?? "",
          addressLine3: "",
          city: input.destinationAddress.city,
          county: "",
          postcode: input.destinationAddress.postcode,
          countryCode: input.destinationAddress.country,
        },
        phoneNumber: input.destinationPhone ?? "",
        emailAddress: input.destinationEmail,
      },
      sender: {
        tradingName: input.senderName,
        phoneNumber: "",
        emailAddress: "",
      },
      packages: [{
        weightInGrams: input.weightGrams,
        packageFormatIdentifier: "smallParcel",
      }],
      shipmentInformation: {
        shipmentPackageCount: 1,
        totalPackageWeightInGrams: input.weightGrams,
        serviceCode: input.serviceCode,
        // International requires customs payload — populated when activation flips on.
        ...(input.customs && {
          customsInformation: {
            commodities: input.customs.items.map(i => ({
              description: i.description,
              quantity: i.quantity,
              hsCode: i.hsCode,
              valueInPence: i.valueInPence,
              weightInGrams: i.weightGrams,
            })),
            totalValueInPence: input.customs.totalValueInPence,
          },
        }),
      },
      label: { includeLabelInResponse: true, includeCN: !!input.customs },
    }],
  };

  const res = await fetch(`${BASE_URL()}/api/v1/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Royal Mail createShipment failed: ${res.status} ${text.slice(0, 500)}`);
  }

  const json = await res.json();
  const parsed = createShipmentResponseSchema.parse(json);
  const created = parsed.createdOrders[0];
  if (!created) throw new Error("Royal Mail createShipment: no order returned");
  if (!created.trackingNumber) throw new Error("Royal Mail: tracking number missing — check service code");
  if (!created.labelUrl) throw new Error("Royal Mail: label URL missing in response");

  return {
    carrierOrderId: created.orderIdentifier,
    trackingNumber: created.trackingNumber,
    labelPdfUrl: created.labelUrl,
  };
},
```

- [ ] **Step 3: Type-check passes**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add lib/fulfilment/carriers/royalmail.ts
git commit -m "feat(fulfilment): Royal Mail createShipment via Click & Drop /api/v1/orders

Zod-validates response shape at the trust boundary. Customs payload
populated when ShipmentInput.customs is non-null (international upsell).

Refs: spec §5"
```

---

### Task B6: Royal Mail `voidShipment`

**Files:**
- Modify: `lib/fulfilment/carriers/royalmail.ts`

- [ ] **Step 1: Implement `voidShipment`**

Replace the stub body:

```ts
async voidShipment(carrierOrderId: string): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(
    `${BASE_URL()}/api/v1/orders/${encodeURIComponent(carrierOrderId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  // 200/204 = voided. 404 = already gone (idempotent — treat as success).
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => "");
    throw new Error(`Royal Mail voidShipment failed: ${res.status} ${text.slice(0, 500)}`);
  }
},
```

- [ ] **Step 2: Type-check + commit**

```bash
npx tsc --noEmit
git add lib/fulfilment/carriers/royalmail.ts
git commit -m "feat(fulfilment): Royal Mail voidShipment via DELETE /api/v1/orders/{id}

404 treated as idempotent success.

Refs: spec §5"
```

---

### Task B7: Royal Mail `subscribeTracking`

**Files:**
- Modify: `lib/fulfilment/carriers/royalmail.ts`

**Critical:** RM tracking webhook subscription has changed twice in two years. Verify the current API path against `https://developer.royalmail.net/` before committing — possibilities include declaring the webhook on the original POST `/orders` body, or registering separately via a tracking-subscriptions endpoint. The implementation below uses a separate registration call; if the live API embeds it in the original POST, move this logic into Task B5.

- [ ] **Step 1: Implement `subscribeTracking`**

```ts
async subscribeTracking({ trackingNumber, webhookUrl }: {
  trackingNumber: string;
  webhookUrl: string;
}): Promise<void> {
  const token = await getAccessToken();
  // VERIFY this endpoint exists. If RM embeds webhook subscription in the
  // original POST /orders body, move this logic into Task B5.
  const res = await fetch(`${BASE_URL()}/api/v1/tracking/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ trackingNumber, webhookUrl }),
  });
  if (!res.ok) {
    // Non-fatal — log and return. Label generation is the primary success path.
    const text = await res.text().catch(() => "");
    console.warn(`Royal Mail subscribeTracking warn: ${res.status} ${text.slice(0, 200)}`);
  }
},
```

- [ ] **Step 2: Commit**

```bash
git add lib/fulfilment/carriers/royalmail.ts
git commit -m "feat(fulfilment): Royal Mail tracking webhook subscription

Failure logs but does not block label generation.

Refs: spec §5, §8"
```

---

### Task B8: Carrier provider selector

**Files:**
- Create: `lib/fulfilment/carriers/index.ts`

- [ ] **Step 1: Write the selector**

```ts
// lib/fulfilment/carriers/index.ts
import "server-only";
import type { CarrierAdapter } from "./types";
import { stubCarrier } from "./stub";
import { royalMailCarrier } from "./royalmail";
import { sendcloudCarrier } from "./sendcloud";
import { shippoCarrier } from "./shippo";
import { getDispatchConfig } from "@/lib/fulfilment/dispatch-config";

let warnedOnce = false;

export async function getCarrier(): Promise<CarrierAdapter> {
  const platform = process.env.COURIER_PLATFORM ?? "stub";
  const config = await getDispatchConfig();

  if (platform === "stub") return stubCarrier;

  if (platform === "royalmail") {
    const hasKey = !!process.env.ROYALMAIL_CLICK_AND_DROP_API_KEY;
    if (hasKey && config.enabled) {
      return royalMailCarrier;
    }
    if (!warnedOnce) {
      console.warn(
        `Carrier selector: COURIER_PLATFORM=royalmail but ` +
        `${!hasKey ? "ROYALMAIL_CLICK_AND_DROP_API_KEY missing" : "config.enabled=false"}` +
        ` — falling back to stub`
      );
      warnedOnce = true;
    }
    return stubCarrier;
  }

  if (platform === "sendcloud") return sendcloudCarrier;
  if (platform === "shippo") return shippoCarrier;

  if (!warnedOnce) {
    console.warn(`Carrier selector: unknown COURIER_PLATFORM=${platform} — using stub`);
    warnedOnce = true;
  }
  return stubCarrier;
}
```

- [ ] **Step 2: Type-check passes**

Run: `npx tsc --noEmit`
Note: `getDispatchConfig` is created in Task C1 — if Task C1 hasn't run yet, type-check will fail. Skip this task until C1 lands, or do C1 first. Mark a TODO and proceed to Task B9 below.

If running tasks strictly in order, defer this commit until C1 is done. Otherwise create a temporary placeholder:

```ts
// Temporary — replaced by C1
async function getDispatchConfig() {
  return { enabled: false };
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/fulfilment/carriers/index.ts
git commit -m "feat(fulfilment): carrier provider selector

Reads COURIER_PLATFORM env + config.enabled flag. Falls back to stub
when not fully configured (warn-once at boot).

Refs: spec §11"
```

---

### Task B9: PrinterAdapter contract + stub

**Files:**
- Create: `lib/fulfilment/printers/types.ts`
- Create: `lib/fulfilment/printers/stub.ts`

- [ ] **Step 1: Write the contract**

```ts
// lib/fulfilment/printers/types.ts
import "server-only";

export type PrintJobStatus = "queued" | "printed" | "failed";

export type PrinterAdapter = {
  printPdf(input: { pdfUrl: string; orderId: string }): Promise<{ jobId: string }>;
  getJobStatus(jobId: string): Promise<PrintJobStatus>;
};
```

- [ ] **Step 2: Write the stub**

```ts
// lib/fulfilment/printers/stub.ts
import "server-only";
import type { PrinterAdapter } from "./types";

const FAIL_NEXT_FLAG = "STUB_PRINTER_FAIL_NEXT";

export const stubPrinter: PrinterAdapter = {
  async printPdf({ pdfUrl, orderId }) {
    if (process.env[FAIL_NEXT_FLAG] === "1") {
      delete process.env[FAIL_NEXT_FLAG];
      throw new Error("Stub printer: simulated failure (STUB_PRINTER_FAIL_NEXT=1)");
    }
    console.log(`[stubPrinter] printPdf(${pdfUrl}) for order ${orderId}`);
    return { jobId: `stub-job-${orderId}-${Date.now()}` };
  },
  async getJobStatus(_jobId: string) {
    // Pretend the job completed instantly.
    return "printed";
  },
};
```

- [ ] **Step 3: Type-check + commit**

```bash
npx tsc --noEmit
git add lib/fulfilment/printers/types.ts lib/fulfilment/printers/stub.ts
git commit -m "feat(fulfilment): PrinterAdapter contract + stub

Stub logs PDF URL, returns synthetic jobId, reports printed instantly.
STUB_PRINTER_FAIL_NEXT=1 simulates a print failure.

Refs: spec §6"
```

---

### Task B10: Zebra Cloud Connect printer adapter

**Files:**
- Create: `lib/fulfilment/printers/zebra-cloud.ts`

**Critical:** Pull the current Zebra Print Cloud Connect API docs (`https://developer.zebra.com/`). Verify the base URL, device-fingerprint endpoint, PDF send endpoint, and job-status endpoint. Adjust paths below to match.

- [ ] **Step 1: Implement the Zebra Cloud adapter**

```ts
// lib/fulfilment/printers/zebra-cloud.ts
import "server-only";
import { z } from "zod";
import type { PrinterAdapter, PrintJobStatus } from "./types";
import { getDispatchConfig } from "@/lib/fulfilment/dispatch-config";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Zebra adapter requires env ${name}`);
  return v;
}

const BASE_URL = () =>
  process.env.ZEBRA_CLOUD_BASE_URL ?? "https://api.zebra.com";

const printResponseSchema = z.object({
  jobId: z.string(),
});

const statusResponseSchema = z.object({
  status: z.enum(["queued", "printed", "failed"]),
});

export const zebraCloudPrinter: PrinterAdapter = {
  async printPdf({ pdfUrl, orderId }) {
    const apiKey = requireEnv("ZEBRA_CLOUD_API_KEY");
    const config = await getDispatchConfig();
    if (!config.zebraPrinterDeviceId) {
      throw new Error("Zebra adapter: dispatchConfig.zebraPrinterDeviceId not set");
    }

    // Fetch the PDF binary from Royal Mail's signed URL, then POST to Zebra.
    const pdfRes = await fetch(pdfUrl);
    if (!pdfRes.ok) throw new Error(`Failed to fetch label PDF: ${pdfRes.status}`);
    const pdfBuffer = await pdfRes.arrayBuffer();

    // VERIFY this endpoint path against current Zebra docs.
    const res = await fetch(
      `${BASE_URL()}/v2/devices/${encodeURIComponent(config.zebraPrinterDeviceId)}/sendpdf`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/pdf",
          "X-Order-Id": orderId,
        },
        body: pdfBuffer,
      }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Zebra printPdf failed: ${res.status} ${text.slice(0, 500)}`);
    }
    const json = await res.json();
    const parsed = printResponseSchema.parse(json);
    return { jobId: parsed.jobId };
  },

  async getJobStatus(jobId: string): Promise<PrintJobStatus> {
    const apiKey = requireEnv("ZEBRA_CLOUD_API_KEY");
    const config = await getDispatchConfig();
    if (!config.zebraPrinterDeviceId) {
      throw new Error("Zebra adapter: dispatchConfig.zebraPrinterDeviceId not set");
    }
    const res = await fetch(
      `${BASE_URL()}/v2/devices/${encodeURIComponent(config.zebraPrinterDeviceId)}/jobs/${encodeURIComponent(jobId)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Zebra getJobStatus failed: ${res.status} ${text.slice(0, 200)}`);
    }
    const json = await res.json();
    return statusResponseSchema.parse(json).status;
  },
};
```

- [ ] **Step 2: Type-check passes**

Run: `npx tsc --noEmit`
Note: depends on `getDispatchConfig` from Task C1.

- [ ] **Step 3: Commit**

```bash
git add lib/fulfilment/printers/zebra-cloud.ts
git commit -m "feat(fulfilment): Zebra Print Cloud Connect printer adapter

Fetches the Royal Mail label PDF, POSTs to Zebra cloud sendpdf endpoint
keyed by device fingerprint from dispatchConfig.

Refs: spec §6"
```

---

### Task B11: PrintNode typed stub + printer selector

**Files:**
- Create: `lib/fulfilment/printers/printnode.ts`
- Create: `lib/fulfilment/printers/index.ts`

- [ ] **Step 1: PrintNode typed stub**

```ts
// lib/fulfilment/printers/printnode.ts
import "server-only";
import type { PrinterAdapter } from "./types";

export const printNodePrinter: PrinterAdapter = {
  async printPdf() {
    throw new Error("PrintNode printer not implemented — alternative to Zebra Cloud");
  },
  async getJobStatus() {
    throw new Error("PrintNode printer not implemented");
  },
};
```

- [ ] **Step 2: Selector**

```ts
// lib/fulfilment/printers/index.ts
import "server-only";
import type { PrinterAdapter } from "./types";
import { stubPrinter } from "./stub";
import { zebraCloudPrinter } from "./zebra-cloud";
import { printNodePrinter } from "./printnode";
import { getDispatchConfig } from "@/lib/fulfilment/dispatch-config";

let warnedOnce = false;

export async function getPrinter(): Promise<PrinterAdapter> {
  const platform = process.env.PRINTER_PLATFORM ?? "stub";
  const config = await getDispatchConfig();

  if (platform === "stub") return stubPrinter;

  if (platform === "zebra-cloud") {
    const hasKey = !!process.env.ZEBRA_CLOUD_API_KEY;
    if (hasKey && config.enabled && config.zebraPrinterDeviceId) {
      return zebraCloudPrinter;
    }
    if (!warnedOnce) {
      console.warn(
        `Printer selector: PRINTER_PLATFORM=zebra-cloud but ` +
        `${!hasKey ? "ZEBRA_CLOUD_API_KEY missing" : !config.enabled ? "config.enabled=false" : "zebraPrinterDeviceId not set"}` +
        ` — falling back to stub`
      );
      warnedOnce = true;
    }
    return stubPrinter;
  }

  if (platform === "printnode") return printNodePrinter;

  if (!warnedOnce) {
    console.warn(`Printer selector: unknown PRINTER_PLATFORM=${platform} — using stub`);
    warnedOnce = true;
  }
  return stubPrinter;
}
```

- [ ] **Step 3: Type-check + commit**

```bash
npx tsc --noEmit
git add lib/fulfilment/printers/printnode.ts lib/fulfilment/printers/index.ts
git commit -m "feat(fulfilment): PrintNode stub + printer provider selector

Mirrors carrier selector pattern. Falls back to stub when not fully
configured.

Refs: spec §11"
```

---

### Task B12: HMAC webhook verifier helper

**Files:**
- Create: `lib/fulfilment/webhook-verify.ts`

- [ ] **Step 1: Write the verifier**

```ts
// lib/fulfilment/webhook-verify.ts
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies an inbound webhook signature using HMAC-SHA256.
 *
 * VERIFY against current Royal Mail webhook documentation: the algorithm,
 * header name, and body canonicalisation may differ. This implementation
 * assumes raw body + secret + sha256 hex digest.
 */
export function verifyWebhookSignature(args: {
  rawBody: string;
  signatureHeader: string | null;
  secret: string;
}): boolean {
  if (!args.signatureHeader) return false;
  const computed = createHmac("sha256", args.secret).update(args.rawBody).digest("hex");
  const expected = Buffer.from(computed, "hex");
  // signatureHeader may be hex or "sha256=<hex>". Strip prefix if present.
  const actualHex = args.signatureHeader.replace(/^sha256=/i, "");
  let actual: Buffer;
  try {
    actual = Buffer.from(actualHex, "hex");
  } catch {
    return false;
  }
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
```

- [ ] **Step 2: Type-check + commit**

```bash
npx tsc --noEmit
git add lib/fulfilment/webhook-verify.ts
git commit -m "feat(fulfilment): HMAC-SHA256 webhook signature verifier

Uses node:crypto timingSafeEqual to prevent timing attacks. Verify the
algorithm + header name against current RM webhook docs at integration time.

Refs: spec §8"
```

---

## Phase B verification gate

- [ ] **Run full type-check + lint**

```bash
npx tsc --noEmit && npx next lint
```

Expected: 0 errors. (Build will fail if `getDispatchConfig` isn't yet defined — that's fine, fixed by Task C1.)

---

## Phase C — Server Actions

### Task C1: Dispatch config getter helper

**Files:**
- Create: `lib/fulfilment/dispatch-config.ts`

- [ ] **Step 1: Write the helper**

```ts
// lib/fulfilment/dispatch-config.ts
import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import type { DispatchConfig } from "@/types/dispatch";

const DEFAULT_CONFIG: DispatchConfig = {
  enabled: false,
  returnAddress: { line1: "", line2: null, city: "", postcode: "", country: "GB" },
  senderName: "Cryogene Laboratories",
  defaultServiceCodeByCountry: { GB: "TPN48" },
  obaAccountNumber: "",
  batchScheduleCron: "0 13 * * 1-5",
  batchScheduleTimezone: "Europe/London",
  defaultWeightGrams: 100,
  zebraPrinterDeviceId: "",
  trackingWebhookUrl: "",
};

export async function getDispatchConfig(): Promise<DispatchConfig> {
  const db = getAdminDb();
  const snap = await db.collection("config").doc("dispatch").get();
  if (!snap.exists) return DEFAULT_CONFIG;
  const data = snap.data() ?? {};
  return { ...DEFAULT_CONFIG, ...data } as DispatchConfig;
}
```

- [ ] **Step 2: Type-check + build**

Run: `npx tsc --noEmit && npm run build`
Expected: type-check + build both pass. (This unblocks the carrier and printer selectors that depend on it.)

- [ ] **Step 3: Commit**

```bash
git add lib/fulfilment/dispatch-config.ts
git commit -m "feat(fulfilment): dispatch-config server-only getter

Reads config/dispatch with safe defaults applied. Used by carrier +
printer selectors and by server actions.

Refs: spec §11"
```

---

### Task C2: Weight calculation helper

**Files:**
- Create: `lib/fulfilment/weight.ts`

- [ ] **Step 1: Write the helper**

```ts
// lib/fulfilment/weight.ts
import "server-only";
import type { Order } from "@/types/order";
import { getDispatchConfig } from "./dispatch-config";

/**
 * Compute parcel weight in grams. v1 uses dispatchConfig.defaultWeightGrams
 * scaled by total quantity. Future enhancement: per-product weight on
 * ProductVariant. For peptides, ~5-10g per vial — defaultWeightGrams=100
 * generously covers a single-vial parcel including packaging.
 */
export async function computeParcelWeightGrams(order: Order): Promise<number> {
  const config = await getDispatchConfig();
  const totalQty = order.items.reduce((sum, item) => sum + item.quantity, 0);
  // Constant per-parcel weight at launch — assumes most orders are 1-3 vials in one box.
  return config.defaultWeightGrams + Math.max(0, totalQty - 1) * 20;
}
```

- [ ] **Step 2: Type-check + commit**

```bash
npx tsc --noEmit
git add lib/fulfilment/weight.ts
git commit -m "feat(fulfilment): parcel weight calculator

Uses dispatchConfig.defaultWeightGrams as base + 20g per additional item.
Sufficient for vial-based peptide shipments at launch.

Refs: spec §1, §11"
```

---

### Task C3: OrderDispatched email template

**Files:**
- Create: `lib/email-templates/order-dispatched.ts`

- [ ] **Step 1: Inspect the existing email-template pattern**

Run: `ls lib/email-templates/` and read one of the existing templates (e.g. `marketing-objection.ts`) to understand the export shape.

- [ ] **Step 2: Write the OrderDispatched template**

Match the existing pattern. Skeleton:

```ts
// lib/email-templates/order-dispatched.ts
import "server-only";
import type { Order } from "@/types/order";

export type OrderDispatchedEmail = {
  subject: string;
  html: string;
  text: string;
};

const SERVICE_LABELS: Record<string, string> = {
  TPN24: "Tracked 24 — typically delivered next working day",
  TPN48: "Tracked 48 — typically delivered in 2-3 working days",
};

export function buildOrderDispatchedEmail(order: Order, opts: {
  baseUrl: string;
}): OrderDispatchedEmail {
  const trackingNumber = order.fulfilment.trackingNumber;
  if (!trackingNumber) {
    throw new Error("buildOrderDispatchedEmail: order has no tracking number");
  }
  const trackingUrl = `https://www.royalmail.com/track-your-item#/tracking-results/${encodeURIComponent(trackingNumber)}`;
  const accountUrl = `${opts.baseUrl}/account/orders/${encodeURIComponent(order.id)}`;

  // VERIFY: serviceCode lookup. trackingNumber alone doesn't tell us the
  // service. Pull from order.fulfilment metadata if stored, otherwise default.
  const serviceLabel = SERVICE_LABELS.TPN48;

  const items = order.items.map(i =>
    `<li>${escapeHtml(i.name)} (${escapeHtml(i.size)}) × ${i.quantity}</li>`
  ).join("");
  const itemsText = order.items.map(i => `- ${i.name} (${i.size}) × ${i.quantity}`).join("\n");

  return {
    subject: `Your order ${order.orderNumber} has been dispatched`,
    html: `
<!doctype html>
<html lang="en">
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
  <h1 style="font-size: 20px; font-weight: 600;">Your order is on its way</h1>
  <p>Hi ${escapeHtml(order.customer.name.split(" ")[0] ?? "there")},</p>
  <p>Order <strong>${escapeHtml(order.orderNumber)}</strong> has been dispatched with Royal Mail.</p>
  <p><strong>Tracking number:</strong> <a href="${trackingUrl}">${escapeHtml(trackingNumber)}</a><br>
     <strong>Service:</strong> ${escapeHtml(serviceLabel)}</p>
  <p><strong>Items in this parcel:</strong></p>
  <ul>${items}</ul>
  <p><a href="${accountUrl}">View order in your account →</a></p>
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
  <p style="font-size: 12px; color: #6b7280;">
    Cryogene Laboratories. Research Use Only — Not for Human Consumption.
  </p>
</body>
</html>`,
    text: `Your order is on its way

Hi ${order.customer.name.split(" ")[0] ?? "there"},

Order ${order.orderNumber} has been dispatched with Royal Mail.

Tracking number: ${trackingNumber}
Track at: ${trackingUrl}
Service: ${serviceLabel}

Items in this parcel:
${itemsText}

View order: ${accountUrl}

—
Cryogene Laboratories. Research Use Only — Not for Human Consumption.
`,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
```

- [ ] **Step 3: Type-check + commit**

```bash
npx tsc --noEmit
git add lib/email-templates/order-dispatched.ts
git commit -m "feat(email): OrderDispatched transactional template

Subject + HTML + text. Tracking number links to royalmail.com; account
link to /account/orders/[id] for branded timeline view.

Refs: spec §10"
```

---

### Task C4: `generateLabel` server action

**Files:**
- Create: `app/actions/fulfilment.ts`

- [ ] **Step 1: Scaffold the file with `generateLabel`**

```ts
// app/actions/fulfilment.ts
"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { assertAdmin } from "@/lib/admin-auth";
import { writeAuditEvent } from "@/lib/audit-log";
import { getCarrier } from "@/lib/fulfilment/carriers";
import { getPrinter } from "@/lib/fulfilment/printers";
import { getDispatchConfig } from "@/lib/fulfilment/dispatch-config";
import { computeParcelWeightGrams } from "@/lib/fulfilment/weight";
import { ROYAL_MAIL_GB_SERVICES } from "@/types/dispatch";
import type { RoyalMailServiceCode } from "@/types/dispatch";
import type { Order } from "@/types";
import { coerceToDate } from "@/lib/utils";

const orderIdSchema = z.string().min(1).max(128);

const serviceCodeSchema = z.enum(
  Object.keys(ROYAL_MAIL_GB_SERVICES) as [RoyalMailServiceCode, ...RoyalMailServiceCode[]]
);

/**
 * Generate a shipping label for a paid order.
 *
 * `_trustedCaller: true` skips the admin-session assertion. Use only from
 * within other server-only code paths that have already authenticated the
 * caller (e.g. runBatch when triggered by the schedule with a verified
 * shared secret). Callers from UI/route handlers MUST omit this flag.
 */
export async function generateLabel(
  orderId: string,
  opts: { serviceCode?: RoyalMailServiceCode; _trustedCaller?: boolean } = {}
): Promise<{ trackingNumber: string; alreadyGenerated: boolean }> {
  if (!opts._trustedCaller) await assertAdmin();
  const validatedId = orderIdSchema.parse(orderId);
  const validatedService = opts.serviceCode
    ? serviceCodeSchema.parse(opts.serviceCode)
    : undefined;

  const db = getAdminDb();
  const config = await getDispatchConfig();

  // Read + idempotency guard in transaction.
  const orderRef = db.collection("orders").doc(validatedId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) throw new Error("Order not found");
  const order = { id: orderSnap.id, ...orderSnap.data() } as Order;

  if (order.status !== "paid") {
    throw new Error(`Order ${order.orderNumber} is ${order.status}, not paid — cannot generate label`);
  }
  if (order.fulfilment.trackingNumber) {
    return { trackingNumber: order.fulfilment.trackingNumber, alreadyGenerated: true };
  }

  // Pre-flight reset for retry case.
  if (order.fulfilment.printerStatus === "failed") {
    await orderRef.update({
      "fulfilment.printerStatus": null,
      "fulfilment.lastError": null,
    });
  }

  const serviceCode = validatedService
    ?? config.defaultServiceCodeByCountry[order.customer.address.country]
    ?? "TPN48";

  const carrier = await getCarrier();
  const printer = await getPrinter();
  const weightGrams = await computeParcelWeightGrams(order);

  // Step 1: Create shipment at carrier.
  const shipment = await carrier.createShipment({
    orderId: order.id,
    orderNumber: order.orderNumber,
    destinationAddress: order.customer.address,
    destinationName: order.customer.name,
    destinationEmail: order.customer.email,
    destinationPhone: order.customer.phone,
    senderAddress: config.returnAddress,
    senderName: config.senderName,
    serviceCode,
    weightGrams,
    customs: null,  // GB-only at launch — international populates this
  });

  // Step 2: Persist label fields BEFORE printing — durable carrier-side state.
  await orderRef.update({
    "fulfilment.carrier": "royalmail",
    "fulfilment.carrierOrderId": shipment.carrierOrderId,
    "fulfilment.trackingNumber": shipment.trackingNumber,
    "fulfilment.labelUrl": shipment.labelPdfUrl,
    "fulfilment.printerStatus": "pending",
    "fulfilment.printedAt": null,
    "fulfilment.lastError": null,
    updatedAt: Timestamp.now(),
  });

  // Step 3: Send to printer.
  let printErrored = false;
  try {
    await printer.printPdf({ pdfUrl: shipment.labelPdfUrl, orderId: order.id });
    await orderRef.update({
      "fulfilment.printerStatus": "printed",
      "fulfilment.printedAt": Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  } catch (err) {
    printErrored = true;
    const message = err instanceof Error ? err.message : String(err);
    await orderRef.update({
      "fulfilment.printerStatus": "failed",
      "fulfilment.lastError": message,
      updatedAt: Timestamp.now(),
    });
  }

  // Step 4: Subscribe tracking webhook (fire-and-forget).
  if (config.trackingWebhookUrl) {
    carrier.subscribeTracking({
      trackingNumber: shipment.trackingNumber,
      webhookUrl: config.trackingWebhookUrl,
    }).catch(err => console.warn("subscribeTracking failed:", err));
  }

  // Step 5: Audit.
  await writeAuditEvent({
    eventType: "order.label_generated",
    target: { kind: "order", id: order.id },
    metadata: {
      orderNumber: order.orderNumber,
      carrier: "royalmail",
      trackingNumber: shipment.trackingNumber,
      serviceCode,
      labelPdfUrl: shipment.labelPdfUrl,
      printError: printErrored ? "see fulfilment.lastError" : null,
    },
  });

  revalidatePath("/admin/dispatch");
  revalidatePath(`/admin/orders/${order.id}`);

  return { trackingNumber: shipment.trackingNumber, alreadyGenerated: false };
}
```

- [ ] **Step 2: Type-check + commit**

```bash
npx tsc --noEmit
git add app/actions/fulfilment.ts
git commit -m "feat(fulfilment): generateLabel server action

Idempotent on trackingNumber. Persists carrier label before printing —
print failure leaves label intact for retry. Audits order.label_generated.

Refs: spec §4"
```

---

### Task C5: `voidLabel` server action

**Files:**
- Modify: `app/actions/fulfilment.ts`

- [ ] **Step 1: Append `voidLabel`**

Add to the end of `app/actions/fulfilment.ts`:

```ts
export async function voidLabel(
  orderId: string,
  opts: { reason?: string } = {}
): Promise<void> {
  await assertAdmin();
  const validatedId = orderIdSchema.parse(orderId);
  const reason = opts.reason ? z.string().max(500).parse(opts.reason) : null;

  const db = getAdminDb();
  const orderRef = db.collection("orders").doc(validatedId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) throw new Error("Order not found");
  const order = { id: orderSnap.id, ...orderSnap.data() } as Order;

  if (!order.fulfilment.trackingNumber || !order.fulfilment.carrierOrderId) {
    throw new Error("No label to void");
  }
  if (order.fulfilment.dispatchedAt) {
    throw new Error("Cannot void: order already dispatched — use refund flow");
  }

  const carrier = await getCarrier();
  const voidedTrackingNumber = order.fulfilment.trackingNumber;
  await carrier.voidShipment(order.fulfilment.carrierOrderId);

  await orderRef.update({
    "fulfilment.carrierOrderId": null,
    "fulfilment.trackingNumber": null,
    "fulfilment.labelUrl": null,
    "fulfilment.printerStatus": null,
    "fulfilment.printedAt": null,
    "fulfilment.lastError": null,
    updatedAt: Timestamp.now(),
  });

  await writeAuditEvent({
    eventType: "order.label_voided",
    target: { kind: "order", id: order.id },
    metadata: {
      orderNumber: order.orderNumber,
      voidedTrackingNumber,
      reason,
    },
  });

  revalidatePath("/admin/dispatch");
  revalidatePath(`/admin/orders/${order.id}`);
}
```

- [ ] **Step 2: Type-check + commit**

```bash
npx tsc --noEmit
git add app/actions/fulfilment.ts
git commit -m "feat(fulfilment): voidLabel server action

Guards: tracking number exists, dispatchedAt is null. Calls carrier
DELETE, clears fields, preserves trackingEvents for audit.

Refs: spec §4"
```

---

### Task C6: `markDispatched` server action + email send

**Files:**
- Modify: `app/actions/fulfilment.ts`

- [ ] **Step 1: Locate the existing Resend wrapper**

Run: `find lib/email -name "*.ts"` (or use Glob). Look at the existing send helper (likely `lib/email/send.ts`). Match its signature.

- [ ] **Step 2: Append `markDispatched`**

```ts
import { buildOrderDispatchedEmail } from "@/lib/email-templates/order-dispatched";
import { sendTransactionalEmail } from "@/lib/email/send";  // adjust import to match real path

export async function markDispatched(orderId: string): Promise<void> {
  await assertAdmin();
  const validatedId = orderIdSchema.parse(orderId);
  const db = getAdminDb();
  const orderRef = db.collection("orders").doc(validatedId);

  // Transaction: guard + flip atomically.
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(orderRef);
    if (!snap.exists) throw new Error("Order not found");
    const order = { id: snap.id, ...snap.data() } as Order;
    if (order.fulfilment.printerStatus !== "printed") {
      throw new Error("Cannot mark dispatched: label not printed");
    }
    if (order.fulfilment.dispatchedAt) {
      // Idempotent — already dispatched.
      return { order, alreadyDispatched: true };
    }
    const now = Timestamp.now();
    tx.update(orderRef, {
      status: "fulfilled",
      "fulfilment.dispatchedAt": now,
      "fulfilment.customerEmailedAt": now,
      updatedAt: now,
    });
    return { order: { ...order, status: "fulfilled" as const }, alreadyDispatched: false };
  });

  if (result.alreadyDispatched) return;

  // Send email — failure rolls back customerEmailedAt only, not status.
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const email = buildOrderDispatchedEmail(result.order, { baseUrl });
  let emailError: string | null = null;
  try {
    await sendTransactionalEmail({
      to: result.order.customer.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
  } catch (err) {
    emailError = err instanceof Error ? err.message : String(err);
    await orderRef.update({ "fulfilment.customerEmailedAt": null });
  }

  await writeAuditEvent({
    eventType: "order.dispatched",
    target: { kind: "order", id: result.order.id },
    metadata: {
      orderNumber: result.order.orderNumber,
      carrier: result.order.fulfilment.carrier,
      trackingNumber: result.order.fulfilment.trackingNumber,
      dispatchedAt: new Date().toISOString(),
      emailError,
    },
  });

  revalidatePath("/admin/dispatch");
  revalidatePath(`/admin/orders/${result.order.id}`);
}
```

If the existing email helper has a different name or shape, adjust the import + call to match. Do NOT change the existing helper's signature.

- [ ] **Step 3: Type-check + commit**

```bash
npx tsc --noEmit
git add app/actions/fulfilment.ts
git commit -m "feat(fulfilment): markDispatched server action

Transaction guards on printerStatus=printed AND dispatchedAt=null. Flips
status to fulfilled, sends Resend email, audits. Email failure rolls back
customerEmailedAt but not status — packing happened.

Refs: spec §4, §10"
```

---

### Task C7: `markBatchDispatched` bulk action

**Files:**
- Modify: `app/actions/fulfilment.ts`

- [ ] **Step 1: Append `markBatchDispatched`**

```ts
export async function markBatchDispatched(): Promise<{
  marked: number;
  failed: number;
  errors: Array<{ orderId: string; orderNumber: string; message: string }>;
}> {
  await assertAdmin();
  const db = getAdminDb();
  const snap = await db
    .collection("orders")
    .where("status", "==", "paid")
    .where("fulfilment.printerStatus", "==", "printed")
    .where("fulfilment.dispatchedAt", "==", null)
    .get();

  const errors: Array<{ orderId: string; orderNumber: string; message: string }> = [];
  let marked = 0;

  for (const doc of snap.docs) {
    const orderNumber = (doc.data().orderNumber as string) ?? doc.id;
    try {
      await markDispatched(doc.id);
      marked += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ orderId: doc.id, orderNumber, message });
    }
  }

  revalidatePath("/admin/dispatch");
  return { marked, failed: errors.length, errors };
}
```

(Note: the query needs the index from Task A8. If the Firestore index isn't deployed yet locally, this query will throw with a "needs index" error — that's expected pre-deploy.)

- [ ] **Step 2: Type-check + commit**

```bash
npx tsc --noEmit
git add app/actions/fulfilment.ts
git commit -m "feat(fulfilment): markBatchDispatched bulk action

Iterates printed-not-dispatched orders, calls markDispatched per order.
Returns summary for confirmation toast.

Refs: spec §4"
```

---

### Task C8: `retryLabel` server action

**Files:**
- Modify: `app/actions/fulfilment.ts`

- [ ] **Step 1: Append `retryLabel` (thin wrapper around generateLabel)**

```ts
export async function retryLabel(
  orderId: string,
  opts: { serviceCode?: RoyalMailServiceCode } = {}
): Promise<{ trackingNumber: string }> {
  await assertAdmin();
  const validatedId = orderIdSchema.parse(orderId);
  const db = getAdminDb();
  const snap = await db.collection("orders").doc(validatedId).get();
  if (!snap.exists) throw new Error("Order not found");
  const order = { id: snap.id, ...snap.data() } as Order;
  if (order.fulfilment.printerStatus !== "failed") {
    throw new Error("retryLabel: order is not in failed state");
  }
  // generateLabel already handles the failed-state reset internally.
  const result = await generateLabel(orderId, opts);
  return { trackingNumber: result.trackingNumber };
}
```

- [ ] **Step 2: Type-check + commit**

```bash
npx tsc --noEmit
git add app/actions/fulfilment.ts
git commit -m "feat(fulfilment): retryLabel server action

Thin wrapper around generateLabel for the explicit retry UX.

Refs: spec §4"
```

---

### Task C9: `runBatch` server action

**Files:**
- Modify: `app/actions/fulfilment.ts`

- [ ] **Step 1: Append `runBatch`**

```ts
import type { DispatchBatchRun } from "@/types/dispatch";

export async function runBatch(opts: {
  triggeredBy: "schedule" | "admin";
  actor?: { uid: string | null; email: string | null };
} = { triggeredBy: "admin" }): Promise<{
  processed: number;
  failed: number;
  errors: Array<{ orderId: string; orderNumber: string; message: string }>;
  batchRunId: string;
}> {
  // assertAdmin only when triggered manually — schedule path uses shared-secret auth at the route level.
  if (opts.triggeredBy === "admin") await assertAdmin();
  const db = getAdminDb();
  const startedAt = Timestamp.now();
  const batchRunId = `batchRun-${startedAt.toDate().toISOString().replace(/[:.]/g, "-")}`;
  const batchRunRef = db.collection("dispatchBatchRuns").doc(batchRunId);

  const initial: DispatchBatchRun = {
    id: batchRunId,
    startedAt,
    completedAt: null,
    triggeredBy: opts.triggeredBy,
    triggeredByActor: opts.actor ?? { uid: null, email: null },
    ordersProcessed: 0,
    ordersFailed: 0,
    errors: [],
    durationMs: 0,
  };
  await batchRunRef.set(initial);

  // Read paid orders without printer status, oldest first.
  const snap = await db
    .collection("orders")
    .where("status", "==", "paid")
    .where("fulfilment.printerStatus", "in", [null, "failed"])
    .orderBy("createdAt", "asc")
    .limit(500)  // upper bound to keep the function within timeout
    .get();

  const errors: Array<{ orderId: string; orderNumber: string; message: string }> = [];
  let processed = 0;

  for (const doc of snap.docs) {
    const orderNumber = (doc.data().orderNumber as string) ?? doc.id;
    try {
      // _trustedCaller bypasses generateLabel's assertAdmin — runBatch's
      // caller (route handler) has already authenticated via shared secret
      // (schedule path) or admin session (manual path).
      await generateLabel(doc.id, { _trustedCaller: true });
      processed += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ orderId: doc.id, orderNumber, message });
    }
  }

  const completedAt = Timestamp.now();
  await batchRunRef.update({
    completedAt,
    ordersProcessed: processed,
    ordersFailed: errors.length,
    errors,
    durationMs: completedAt.toMillis() - startedAt.toMillis(),
  });

  await writeAuditEvent({
    eventType: "order.dispatch_batch_run",
    target: { kind: null, id: batchRunId },
    metadata: {
      triggeredBy: opts.triggeredBy,
      processed,
      failed: errors.length,
      durationMs: completedAt.toMillis() - startedAt.toMillis(),
    },
  });

  revalidatePath("/admin/dispatch");
  return { processed, failed: errors.length, errors, batchRunId };
}
```

Note: `assertAdmin` here is only required when `triggeredBy === "admin"` — the scheduled path goes through the route handler in Task D1 which uses shared-secret auth. The action itself can be called from server-only contexts where admin assertion isn't applicable.

- [ ] **Step 2: Type-check + commit**

```bash
npx tsc --noEmit
git add app/actions/fulfilment.ts
git commit -m "feat(fulfilment): runBatch server action

Iterates paid-without-label orders, calls generateLabel per order, writes
DispatchBatchRun document with summary. Audits order.dispatch_batch_run.

Refs: spec §4, §7"
```

---

### Task C10: Cancel cascade — extend existing `setOrderStatus`

**Files:**
- Modify: `app/actions/orders.ts`

- [ ] **Step 1: Read the current `setOrderStatus`**

Open `app/actions/orders.ts`. Current implementation flips status without considering fulfilment state.

- [ ] **Step 2: Add cascade for cancellation-with-active-label**

Replace the existing `setOrderStatus` with:

```ts
export async function setOrderStatus(id: string, status: OrderStatus) {
  await assertAdmin();
  const validated = z
    .object({
      id: z.string().min(1).max(128),
      status: z.enum(["pending", "paid", "fulfilled", "cancelled", "refunded"]),
    })
    .parse({ id, status });

  const before = await getOrderById(validated.id);
  const beforeStatus = before?.status ?? null;

  // Cancel cascade: void active label first.
  if (
    validated.status === "cancelled" &&
    before &&
    before.fulfilment.trackingNumber &&
    before.fulfilment.carrierOrderId &&
    !before.fulfilment.dispatchedAt
  ) {
    // Lazy-import to avoid circular dependency.
    const { voidLabel } = await import("./fulfilment");
    await voidLabel(validated.id, { reason: "order cancelled" });
  }

  await updateOrder(validated.id, { status: validated.status as OrderStatus });

  await writeAuditEvent({
    eventType: "order.status_changed",
    target: { kind: "order", id: validated.id },
    before: { status: beforeStatus },
    after: { status: validated.status },
    metadata: { orderNumber: before?.orderNumber ?? null },
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${validated.id}`);
}
```

- [ ] **Step 3: Type-check + commit**

```bash
npx tsc --noEmit
git add app/actions/orders.ts
git commit -m "feat(orders): cancel cascade voids active label before status flip

When an order with an active (printed-not-dispatched) label is cancelled,
the label is voided at the carrier first. Audit log captures both events.

Refs: spec §4"
```

---

### Task C11: Dispatch config server action (for /admin/settings)

**Files:**
- Create: `app/actions/dispatch-config.ts`

- [ ] **Step 1: Write the action**

```ts
// app/actions/dispatch-config.ts
"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { assertAdmin } from "@/lib/admin-auth";
import { writeAuditEvent } from "@/lib/audit-log";
import { addressSchema } from "@/lib/zod/address";
import type { DispatchConfig } from "@/types/dispatch";

const dispatchConfigInputSchema = z.object({
  enabled: z.boolean(),
  returnAddress: addressSchema,
  senderName: z.string().min(1).max(120),
  defaultServiceCodeByCountry: z.record(z.string().length(2), z.enum(["TPN24", "TPN48"])),
  obaAccountNumber: z.string().max(50),
  batchScheduleCron: z.string().max(100),
  batchScheduleTimezone: z.string().max(50),
  defaultWeightGrams: z.number().int().min(10).max(20_000),
  zebraPrinterDeviceId: z.string().max(200),
  trackingWebhookUrl: z.string().url().or(z.literal("")),
});

export async function setDispatchConfig(input: unknown): Promise<void> {
  await assertAdmin();
  const validated = dispatchConfigInputSchema.parse(input);

  // Hard guard: enabling requires populated address + service-code map + Zebra device.
  if (validated.enabled) {
    if (!validated.returnAddress.line1 || !validated.returnAddress.postcode) {
      throw new Error("Cannot enable: returnAddress incomplete");
    }
    if (!validated.zebraPrinterDeviceId) {
      throw new Error("Cannot enable: zebraPrinterDeviceId not set");
    }
    if (!validated.obaAccountNumber) {
      throw new Error("Cannot enable: obaAccountNumber not set");
    }
  }

  const db = getAdminDb();
  const ref = db.collection("config").doc("dispatch");
  const before = await ref.get();
  await ref.set(validated, { merge: true });

  await writeAuditEvent({
    eventType: "admin.role_granted",  // reuse existing event type? See note below
    target: { kind: null, id: "config-dispatch" },
    before: before.exists ? (before.data() ?? {}) : null,
    after: validated,
    metadata: { kind: "dispatch-config-update" },
  });

  revalidatePath("/admin/settings");
}
```

**Note on audit event type:** the audit event used here (`admin.role_granted` placeholder) isn't quite right semantically. **Decision:** add a new event type `config.updated` to `types/audit.ts` if config-edit auditing is wanted, OR simply reuse `order.status_changed` pattern with a clearly labelled metadata.kind. Pick the cleaner option: add `config.updated` to `ALL_AUDIT_EVENT_TYPES` (insert near top of the const array under a new "Configuration" comment). Update this server action to emit `config.updated`. Type-check passes once added.

- [ ] **Step 2: Add `config.updated` to audit events**

In `types/audit.ts`, add:

```ts
  // Configuration
  "config.updated",
```

Update the `setDispatchConfig` action to use `eventType: "config.updated"`.

- [ ] **Step 3: Type-check + commit**

```bash
npx tsc --noEmit
git add app/actions/dispatch-config.ts types/audit.ts
git commit -m "feat(fulfilment): setDispatchConfig server action + config.updated audit event

Hard guards on enable: requires return address, Zebra device ID, OBA
number all populated. Adds new audit event type config.updated.

Refs: spec §11"
```

---

## Phase C verification gate

- [ ] **Run full type-check + lint + build**

```bash
npx tsc --noEmit && npx next lint && npm run build
```

Expected: all pass.

---

## Phase D — Routes & UI

### Task D1: `/api/admin/dispatch/run-batch` endpoint

**Files:**
- Create: `app/api/admin/dispatch/run-batch/route.ts`

- [ ] **Step 1: Write the route handler**

```ts
// app/api/admin/dispatch/run-batch/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runBatch } from "@/app/actions/fulfilment";
import { assertAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const headerSecret = request.headers.get("X-Dispatch-Batch-Secret") ?? "";
  const expectedSecret = process.env.DISPATCH_BATCH_SECRET ?? "";

  let isScheduled = false;
  if (expectedSecret && headerSecret) {
    const a = Buffer.from(headerSecret);
    const b = Buffer.from(expectedSecret);
    if (a.length === b.length && timingSafeEqual(a, b)) {
      isScheduled = true;
    }
  }

  let triggeredBy: "schedule" | "admin" = "schedule";
  let actor = { uid: null as string | null, email: null as string | null };

  if (!isScheduled) {
    // Fall through to admin auth for the manual "Run batch now" button.
    try {
      const session = await assertAdmin();
      triggeredBy = "admin";
      actor = { uid: session.uid ?? null, email: session.email ?? null };
    } catch {
      return NextResponse.json({ error: "unauthorised" }, { status: 401 });
    }
  }

  const result = await runBatch({ triggeredBy, actor });
  return NextResponse.json(result);
}
```

If `assertAdmin` returns a different shape (e.g. doesn't return uid/email), adjust accordingly — log the actor as best available.

- [ ] **Step 2: Type-check + commit**

```bash
npx tsc --noEmit
git add app/api/admin/dispatch/run-batch/route.ts
git commit -m "feat(fulfilment): /api/admin/dispatch/run-batch endpoint

Two auth modes: shared-secret header (Cloud Function) or admin session
(manual 'Run batch now' button). Constant-time secret compare.

Refs: spec §7"
```

---

### Task D2: Royal Mail tracking webhook receiver

**Files:**
- Create: `app/api/webhooks/royalmail/tracking/route.ts`

- [ ] **Step 1: Write the receiver**

```ts
// app/api/webhooks/royalmail/tracking/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { writeAuditEvent } from "@/lib/audit-log";
import { verifyWebhookSignature } from "@/lib/fulfilment/webhook-verify";
import type { TrackingMilestone, TrackingEvent } from "@/types/order";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// VERIFY this schema against current RM tracking webhook docs.
const trackingWebhookSchema = z.object({
  trackingNumber: z.string(),
  status: z.string(),               // RM milestone string
  timestamp: z.string(),            // ISO 8601
  location: z.string().nullish(),
});

const RM_STATUS_MAP: Record<string, TrackingMilestone> = {
  // Verify exact codes against current RM webhook docs.
  "Item posted": "collected",
  "Collection from sender": "collected",
  "In transit": "in_transit",
  "At sorting hub": "in_transit",
  "Departed hub": "in_transit",
  "Out for delivery": "out_for_delivery",
  "With courier": "out_for_delivery",
  "Delivered": "delivered",
  "Delivery attempted": "failed",
  "Returned to sender": "failed",
  "Lost": "failed",
};

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("X-RoyalMail-Signature");
  const secret = process.env.ROYALMAIL_TRACKING_WEBHOOK_SECRET ?? "";

  if (!secret) {
    console.error("Tracking webhook: ROYALMAIL_TRACKING_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "misconfigured" }, { status: 500 });
  }

  if (!verifyWebhookSignature({ rawBody, signatureHeader: signature, secret })) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let parsed: z.infer<typeof trackingWebhookSchema>;
  try {
    parsed = trackingWebhookSchema.parse(JSON.parse(rawBody));
  } catch (err) {
    console.warn("Tracking webhook: malformed payload", err);
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }

  const milestone = RM_STATUS_MAP[parsed.status];
  if (!milestone) {
    console.warn(`Tracking webhook: unmapped status ${parsed.status}`);
    return NextResponse.json({ ok: true });  // 200 to prevent retry storm
  }

  // Look up order by tracking number.
  const db = getAdminDb();
  const snap = await db
    .collection("orders")
    .where("fulfilment.trackingNumber", "==", parsed.trackingNumber)
    .limit(1)
    .get();

  if (snap.empty) {
    console.warn(`Tracking webhook: unknown trackingNumber ${parsed.trackingNumber}`);
    return NextResponse.json({ ok: true });
  }

  const orderRef = snap.docs[0].ref;
  const orderData = snap.docs[0].data();
  const orderId = snap.docs[0].id;
  const orderNumber = orderData.orderNumber as string;
  const existing = (orderData.fulfilment?.trackingEvents ?? []) as TrackingEvent[];

  const eventTimestamp = new Date(parsed.timestamp);
  const isDup = existing.some(e =>
    e.milestone === milestone &&
    Math.abs(coerceDateMs(e.timestamp) - eventTimestamp.getTime()) < 1000
  );
  if (isDup) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  // Cap raw payload at ~1KB.
  const rawSize = Buffer.byteLength(rawBody, "utf-8");
  const rawSafe = rawSize <= 1024 ? JSON.parse(rawBody) : { __overSizeCap: true, __originalByteLength: rawSize };

  const newEvent: TrackingEvent = {
    milestone,
    timestamp: Timestamp.fromDate(eventTimestamp),
    location: parsed.location ?? null,
    raw: rawSafe,
  };

  await orderRef.update({
    "fulfilment.trackingEvents": FieldValue.arrayUnion(newEvent),
    "fulfilment.lastTrackingStatus": milestone,
    updatedAt: Timestamp.now(),
  });

  await writeAuditEvent({
    eventType: `order.tracking_${milestone}` as const,
    target: { kind: "order", id: orderId },
    metadata: {
      orderNumber,
      milestone,
      timestamp: parsed.timestamp,
      location: parsed.location ?? null,
      trackingNumber: parsed.trackingNumber,
    },
  });

  return NextResponse.json({ ok: true });
}

function coerceDateMs(t: Timestamp | Date | { seconds: number }): number {
  if (t instanceof Date) return t.getTime();
  if (typeof t === "object" && "toDate" in t && typeof t.toDate === "function") {
    return t.toDate().getTime();
  }
  if (typeof t === "object" && "seconds" in t) return t.seconds * 1000;
  return 0;
}
```

- [ ] **Step 2: Type-check + commit**

```bash
npx tsc --noEmit
git add app/api/webhooks/royalmail/tracking/route.ts
git commit -m "feat(fulfilment): Royal Mail tracking webhook receiver

HMAC-verifies, parses, maps RM status codes to TrackingMilestone, dedupes
on (milestone, timestamp), appends to trackingEvents, audits as
order.tracking_{milestone}. Returns 200 even for unknown tracking numbers
to prevent retry storms.

Refs: spec §8"
```

---

### Task D3: Admin label proxy route

**Files:**
- Create: `app/(admin)/admin/orders/[id]/label/route.ts`

- [ ] **Step 1: Write the route**

```ts
// app/(admin)/admin/orders/[id]/label/route.ts
import "server-only";
import { NextResponse } from "next/server";
import { getOrderById } from "@/lib/orders";
import { assertAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  await assertAdmin();
  const { id } = await context.params;
  if (!id || id.length > 128 || !/^[\w-]+$/.test(id)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }
  const order = await getOrderById(id);
  if (!order || !order.fulfilment.labelUrl) {
    return NextResponse.json({ error: "no label" }, { status: 404 });
  }

  // Fetch upstream PDF and stream back. Avoids leaking the signed URL into
  // the client DOM and re-checks admin on every fetch.
  const upstream = await fetch(order.fulfilment.labelUrl);
  if (!upstream.ok) {
    return NextResponse.json({ error: "upstream fetch failed", status: upstream.status }, { status: 502 });
  }
  const buffer = await upstream.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="label-${order.orderNumber}.pdf"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
```

- [ ] **Step 2: Type-check + commit**

```bash
npx tsc --noEmit
git add app/\(admin\)/admin/orders/\[id\]/label/route.ts
git commit -m "feat(admin): label PDF proxy route

Re-checks admin on every fetch, streams Click & Drop label PDF back as
application/pdf. Avoids leaking signed URLs into client DOM.

Refs: spec §1, §6"
```

---

### Task D4: Packing slip page

**Files:**
- Create: `app/(admin)/admin/orders/[id]/packing-slip/page.tsx`

- [ ] **Step 1: Write the page**

```tsx
// app/(admin)/admin/orders/[id]/packing-slip/page.tsx
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getOrderById } from "@/lib/orders";
import { coerceToDate } from "@/lib/utils";

async function PackingSlipContent({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!id || !/^[\w-]+$/.test(id)) notFound();
  const order = await getOrderById(id);
  if (!order) notFound();

  const date = coerceToDate(order.createdAt) ?? new Date();

  return (
    <div className="packing-slip">
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          body { background: white; }
          .no-print { display: none !important; }
        }
        .packing-slip { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; max-width: 180mm; margin: 0 auto; padding: 24px; color: #1f2937; }
        .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1f2a37; padding-bottom: 12px; margin-bottom: 24px; }
        .order-number { font-size: 24px; font-weight: 600; font-family: ui-monospace, monospace; }
        .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { padding: 8px 4px; text-align: left; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
        th { font-weight: 500; color: #6b7280; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
        .qty { text-align: right; font-family: ui-monospace, monospace; }
        .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280; }
      `}</style>

      <div className="header">
        <div>
          <p className="label">Cryogene Laboratories</p>
          <p className="order-number">{order.orderNumber}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p className="label">Date</p>
          <p>{date.toLocaleDateString("en-GB")}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        <div>
          <p className="label">Ship to</p>
          <p style={{ fontWeight: 500 }}>{order.customer.name}</p>
          <p>{order.customer.address.line1}</p>
          {order.customer.address.line2 && <p>{order.customer.address.line2}</p>}
          <p>{order.customer.address.city}</p>
          <p>{order.customer.address.postcode}</p>
        </div>
        <div>
          <p className="label">Tracking</p>
          <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
            {order.fulfilment.trackingNumber ?? "—"}
          </p>
          <p className="label" style={{ marginTop: 12 }}>Service</p>
          <p>{order.fulfilment.carrier === "royalmail" ? "Royal Mail" : "—"}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>SKU</th>
            <th>Size</th>
            <th className="qty">Qty</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, i) => (
            <tr key={`${item.sku}-${i}`}>
              <td>{item.name}</td>
              <td style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}>{item.sku}</td>
              <td>{item.size}</td>
              <td className="qty">{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="footer">
        <p><strong>Research Use Only — Not for Human Consumption.</strong></p>
        <p>If anything is missing or damaged, contact us within 7 days at hello@cryogenelaboratories.co.uk.</p>
      </div>

      <div className="no-print" style={{ marginTop: 24, textAlign: "center" }}>
        <button onClick={() => window.print()} type="button" style={{ padding: "8px 16px" }}>
          Print packing slip
        </button>
      </div>
    </div>
  );
}

export default function PackingSlipPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense>
      <PackingSlipContent params={params} />
    </Suspense>
  );
}
```

Note: this is a server component but uses `<style>` inline + a button with `onClick` which is client-only. Convert the print button to a small client component (`"use client"`) extracted into a `PrintButton.tsx` co-located beside the page, or use a `<form action={...}>` print fallback. The cleanest fix: extract `PrintButton` as a client component. Alternative: since the page is admin-only and ad-hoc, accept that `Ctrl+P` works without the button.

For minimal scope: drop the button, rely on browser print. Remove the `onClick` handler.

- [ ] **Step 2: Type-check + commit**

```bash
npx tsc --noEmit
git add app/\(admin\)/admin/orders/\[id\]/packing-slip
git commit -m "feat(admin): printable packing-slip page

A4 print CSS, no prices, RUO disclaimer footer. Admin opens, hits Ctrl+P,
prints to default printer (Sam's Zebra).

Refs: spec §1, §4"
```

---

### Task D5: Dispatch queue page (server component)

**Files:**
- Create: `app/(admin)/admin/dispatch/page.tsx`

- [ ] **Step 1: Write the server component**

```tsx
// app/(admin)/admin/dispatch/page.tsx
import { Suspense } from "react";
import { connection } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { coerceToDate } from "@/lib/utils";
import { DispatchClient } from "./DispatchClient";
import type { Order } from "@/types";
import type { DispatchBatchRun } from "@/types/dispatch";

async function getDispatchQueue(): Promise<Order[]> {
  const db = getAdminDb();
  // Two-pass: paid+unprinted, then paid+printed-not-dispatched, merged.
  const unprintedSnap = await db
    .collection("orders")
    .where("status", "==", "paid")
    .where("fulfilment.printerStatus", "in", [null, "failed"])
    .orderBy("createdAt", "asc")
    .get();
  const printedSnap = await db
    .collection("orders")
    .where("status", "==", "paid")
    .where("fulfilment.printerStatus", "==", "printed")
    .where("fulfilment.dispatchedAt", "==", null)
    .orderBy("createdAt", "asc")
    .get();
  const all = [...unprintedSnap.docs, ...printedSnap.docs].map(d => ({
    id: d.id,
    ...(d.data() as Omit<Order, "id">),
  }));
  return all;
}

async function getLastBatchRun(): Promise<DispatchBatchRun | null> {
  const db = getAdminDb();
  const snap = await db
    .collection("dispatchBatchRuns")
    .orderBy("startedAt", "desc")
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...(snap.docs[0].data() as Omit<DispatchBatchRun, "id">) };
}

async function DispatchContent() {
  await connection();
  const [orders, lastRun] = await Promise.all([getDispatchQueue(), getLastBatchRun()]);
  return <DispatchClient orders={orders} lastBatchRun={lastRun} />;
}

export default function AdminDispatchPage() {
  return (
    <div>
      <h1 className="text-4xl mb-2">Dispatch</h1>
      <p className="mb-8 text-muted">Paid orders awaiting label generation and dispatch.</p>
      <Suspense fallback={<p>Loading dispatch queue…</p>}>
        <DispatchContent />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 2: Type-check (will fail on missing DispatchClient — fixed in Task D6)**

For now, create a placeholder `DispatchClient.tsx` so type-check passes:

```tsx
// app/(admin)/admin/dispatch/DispatchClient.tsx
"use client";
import type { Order } from "@/types";
import type { DispatchBatchRun } from "@/types/dispatch";

export function DispatchClient(_props: {
  orders: Order[];
  lastBatchRun: DispatchBatchRun | null;
}) {
  return <div>Dispatch client placeholder — populated in Task D6</div>;
}
```

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add app/\(admin\)/admin/dispatch
git commit -m "feat(admin): /admin/dispatch queue page server component

Reads paid+unprinted and paid+printed-not-dispatched orders, plus most
recent batch run. Renders DispatchClient (populated in next task).

Refs: spec §1"
```

---

### Task D6: DispatchClient + DispatchRow + DispatchHeader

**Files:**
- Modify: `app/(admin)/admin/dispatch/DispatchClient.tsx`
- Create: `app/(admin)/admin/dispatch/DispatchRow.tsx`
- Create: `app/(admin)/admin/dispatch/DispatchHeader.tsx`

- [ ] **Step 1: Write `DispatchHeader`**

```tsx
// app/(admin)/admin/dispatch/DispatchHeader.tsx
"use client";

import { useState, useTransition } from "react";
import type { DispatchBatchRun } from "@/types/dispatch";
import { coerceToDate } from "@/lib/utils";

export function DispatchHeader({ lastBatchRun, printedCount }: {
  lastBatchRun: DispatchBatchRun | null;
  printedCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleRunBatch() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/dispatch/run-batch", { method: "POST" });
        if (!res.ok) throw new Error(await res.text());
        window.location.reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Batch run failed");
      }
    });
  }

  async function handleMarkAllDispatched() {
    if (!confirm(`Mark ${printedCount} orders as dispatched and notify customers?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        const { markBatchDispatched } = await import("@/app/actions/fulfilment");
        const result = await markBatchDispatched();
        if (result.failed > 0) {
          setError(`${result.marked} marked, ${result.failed} failed. ${result.errors.map(e => e.orderNumber).join(", ")}`);
        }
        window.location.reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bulk dispatch failed");
      }
    });
  }

  return (
    <div className="border border-border bg-white p-4 mb-6 flex justify-between items-center gap-4 flex-wrap">
      <div className="flex gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={handleRunBatch}
          className="px-4 py-2 bg-navy text-white text-sm uppercase tracking-wider disabled:opacity-50"
        >
          {pending ? "Running…" : "Run batch now"}
        </button>
        <button
          type="button"
          disabled={pending || printedCount === 0}
          onClick={handleMarkAllDispatched}
          className="px-4 py-2 border border-border text-sm uppercase tracking-wider disabled:opacity-50"
        >
          Mark all printed as dispatched ({printedCount})
        </button>
      </div>
      {lastBatchRun && (
        <p className="text-xs text-muted">
          Last batch:{" "}
          {coerceToDate(lastBatchRun.startedAt)?.toLocaleString("en-GB")} —{" "}
          {lastBatchRun.ordersProcessed} processed, {lastBatchRun.ordersFailed} failed
        </p>
      )}
      {error && <p className="text-xs text-red-700 w-full">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Write `DispatchRow`**

```tsx
// app/(admin)/admin/dispatch/DispatchRow.tsx
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { Order } from "@/types";
import { ROYAL_MAIL_GB_SERVICES, type RoyalMailServiceCode } from "@/types/dispatch";
import { coerceToDate } from "@/lib/utils";
import { generateLabel, voidLabel, markDispatched, retryLabel } from "@/app/actions/fulfilment";

type SubState = "queue" | "printed" | "failed";

function getSubState(order: Order): SubState {
  if (order.fulfilment.printerStatus === "printed") return "printed";
  if (order.fulfilment.printerStatus === "failed") return "failed";
  return "queue";
}

export function DispatchRow({ order }: { order: Order }) {
  const subState = getSubState(order);
  const [serviceCode, setServiceCode] = useState<RoyalMailServiceCode>("TPN48");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function action(fn: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        window.location.reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
      }
    });
  }

  return (
    <tr className="border-b border-border">
      <td className="p-3">
        <Link href={`/admin/orders/${order.id}`} className="mono text-xs underline text-navy">
          {order.orderNumber}
        </Link>
      </td>
      <td className="p-3 text-muted text-xs">
        {(coerceToDate(order.createdAt) ?? new Date()).toLocaleDateString("en-GB")}
      </td>
      <td className="p-3 text-sm">{order.customer.name}</td>
      <td className="p-3 text-sm">{order.items.reduce((s, i) => s + i.quantity, 0)}</td>
      <td className="p-3">
        {subState === "queue" ? (
          <select
            value={serviceCode}
            onChange={e => setServiceCode(e.target.value as RoyalMailServiceCode)}
            className="border border-border px-2 py-1 text-xs"
            disabled={pending}
          >
            {Object.entries(ROYAL_MAIL_GB_SERVICES).map(([code, info]) => (
              <option key={code} value={code}>{info.label}</option>
            ))}
          </select>
        ) : (
          <span className="text-xs">{order.fulfilment.carrier === "royalmail" ? "Royal Mail" : "—"}</span>
        )}
      </td>
      <td className="p-3">
        {subState === "queue" && (
          <span className="px-2 py-0.5 text-xs bg-gray-100">In queue</span>
        )}
        {subState === "printed" && (
          <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-900">Label printed</span>
        )}
        {subState === "failed" && (
          <span className="px-2 py-0.5 text-xs bg-red-100 text-red-900">Failed</span>
        )}
      </td>
      <td className="p-3 text-right">
        <div className="flex gap-2 justify-end items-center flex-wrap">
          {subState === "queue" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => action(() => generateLabel(order.id, { serviceCode }))}
              className="px-3 py-1 bg-navy text-white text-xs uppercase tracking-wider disabled:opacity-50"
            >
              Generate label
            </button>
          )}
          {subState === "printed" && (
            <>
              <Link
                href={`/admin/orders/${order.id}/packing-slip`}
                target="_blank"
                className="px-3 py-1 border border-border text-xs uppercase tracking-wider"
              >
                Packing slip
              </Link>
              <Link
                href={`/admin/orders/${order.id}/label`}
                target="_blank"
                className="px-3 py-1 border border-border text-xs uppercase tracking-wider"
              >
                Reprint
              </Link>
              <button
                type="button"
                disabled={pending}
                onClick={() => action(() => markDispatched(order.id))}
                className="px-3 py-1 bg-navy text-white text-xs uppercase tracking-wider disabled:opacity-50"
              >
                Mark dispatched
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => action(() => voidLabel(order.id, { reason: "manual void" }))}
                className="px-3 py-1 border border-border text-xs uppercase tracking-wider text-red-700"
              >
                Void
              </button>
            </>
          )}
          {subState === "failed" && (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => action(() => retryLabel(order.id, { serviceCode }))}
                className="px-3 py-1 bg-navy text-white text-xs uppercase tracking-wider disabled:opacity-50"
              >
                Retry
              </button>
              {order.fulfilment.lastError && (
                <span className="text-xs text-red-700" title={order.fulfilment.lastError}>
                  ⚠ {order.fulfilment.lastError.slice(0, 40)}…
                </span>
              )}
            </>
          )}
        </div>
        {error && <p className="text-xs text-red-700 mt-1">{error}</p>}
      </td>
    </tr>
  );
}
```

- [ ] **Step 3: Write `DispatchClient`**

Replace the placeholder:

```tsx
// app/(admin)/admin/dispatch/DispatchClient.tsx
"use client";

import type { Order } from "@/types";
import type { DispatchBatchRun } from "@/types/dispatch";
import { DispatchHeader } from "./DispatchHeader";
import { DispatchRow } from "./DispatchRow";

export function DispatchClient({ orders, lastBatchRun }: {
  orders: Order[];
  lastBatchRun: DispatchBatchRun | null;
}) {
  const printedCount = orders.filter(
    o => o.fulfilment.printerStatus === "printed" && !o.fulfilment.dispatchedAt
  ).length;

  return (
    <div>
      <DispatchHeader lastBatchRun={lastBatchRun} printedCount={printedCount} />
      {orders.length === 0 ? (
        <p className="text-muted">No paid orders awaiting dispatch.</p>
      ) : (
        <table className="w-full text-sm bg-white border border-border">
          <thead className="text-left border-b border-border">
            <tr>
              <th className="p-3 font-medium">Order</th>
              <th className="p-3 font-medium">Date paid</th>
              <th className="p-3 font-medium">Customer</th>
              <th className="p-3 font-medium">Items</th>
              <th className="p-3 font-medium">Service</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => <DispatchRow key={o.id} order={o} />)}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Type-check + lint pass**

Run: `npx tsc --noEmit && npx next lint`

- [ ] **Step 5: Commit**

```bash
git add app/\(admin\)/admin/dispatch
git commit -m "feat(admin): dispatch console — header bar + per-row actions

Header: 'Run batch now' + 'Mark all printed as dispatched ({n})' + last
batch summary. Per row: contextual actions per sub-state (Generate label
/ Packing slip / Reprint / Mark dispatched / Void / Retry).

Refs: spec §1, §3, §4"
```

---

### Task D7: Customer-facing tracking timeline component

**Files:**
- Create: `components/account/TrackingTimeline.tsx`
- Modify: `app/(public)/account/orders/[id]/page.tsx`

- [ ] **Step 1: Write `TrackingTimeline`**

```tsx
// components/account/TrackingTimeline.tsx
import type { TrackingEvent, TrackingMilestone } from "@/types/order";
import { coerceToDate } from "@/lib/utils";

const STAGES: Array<{ id: TrackingMilestone; label: string }> = [
  { id: "collected", label: "Royal Mail collected" },
  { id: "in_transit", label: "In transit" },
  { id: "out_for_delivery", label: "Out for delivery" },
  { id: "delivered", label: "Delivered" },
];

export function TrackingTimeline({ events, lastStatus, trackingNumber }: {
  events: TrackingEvent[];
  lastStatus: TrackingMilestone | null;
  trackingNumber: string | null;
}) {
  if (lastStatus === "failed") {
    return (
      <section className="border border-red-200 bg-red-50 p-4 text-sm">
        <p className="font-medium text-red-900">Delivery problem</p>
        <p className="text-red-900 mt-1">
          We've been notified and will be in touch within one working day.
          If you'd like to act sooner, please contact us at hello@cryogenelaboratories.co.uk.
        </p>
      </section>
    );
  }

  if (events.length === 0) {
    if (!trackingNumber) {
      return (
        <section className="border border-border bg-offwhite p-4 text-sm text-muted">
          Awaiting label generation. Tracking will appear here once your parcel is in the Royal Mail network.
        </section>
      );
    }
    return (
      <section className="border border-border bg-offwhite p-4 text-sm text-muted">
        Awaiting Royal Mail collection. Tracking updates will appear here as your parcel moves.{" "}
        <a
          href={`https://www.royalmail.com/track-your-item#/tracking-results/${encodeURIComponent(trackingNumber)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Check Royal Mail directly
        </a>
        .
      </section>
    );
  }

  // Map events to stages so we can render passed/active/upcoming.
  const reachedStageIndices = new Set<number>();
  for (const event of events) {
    const idx = STAGES.findIndex(s => s.id === event.milestone);
    if (idx >= 0) reachedStageIndices.add(idx);
  }
  const lastReachedIdx = Math.max(-1, ...reachedStageIndices);

  return (
    <section className="border border-border bg-white p-6">
      <p className="label-editorial mb-4">Tracking</p>
      <ol>
        {STAGES.map((stage, idx) => {
          const reached = reachedStageIndices.has(idx);
          const matchingEvent = events.find(e => e.milestone === stage.id);
          const isFinal = idx === lastReachedIdx;
          return (
            <li key={stage.id} className="flex items-start gap-3 py-2">
              <span
                aria-hidden="true"
                className={
                  "inline-block w-3 h-3 rounded-full mt-1.5 flex-shrink-0 " +
                  (reached ? "bg-success-bg border-2 border-success-text" : "bg-offwhite border-2 border-border")
                }
              />
              <div className="flex-1">
                <p className={reached ? "text-body" : "text-muted"}>
                  {stage.label}
                  {isFinal && reached && <span className="ml-2 text-xs text-success-text">(latest)</span>}
                </p>
                {matchingEvent && (
                  <p className="text-xs text-muted">
                    {coerceToDate(matchingEvent.timestamp)?.toLocaleString("en-GB")}
                    {matchingEvent.location && ` — ${matchingEvent.location}`}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
```


- [ ] **Step 2: Mount it on the customer order page**

Open `app/(public)/account/orders/[id]/page.tsx`. Find the section that renders order details and inject the timeline below the order summary:

```tsx
import { TrackingTimeline } from "@/components/account/TrackingTimeline";
// ...
<TrackingTimeline
  events={order.fulfilment.trackingEvents}
  lastStatus={order.fulfilment.lastTrackingStatus}
  trackingNumber={order.fulfilment.trackingNumber}
/>
```

- [ ] **Step 3: Type-check + commit**

```bash
npx tsc --noEmit
git add components/account/TrackingTimeline.tsx app/\(public\)/account/orders
git commit -m "feat(account): customer-facing tracking timeline

Renders five-stage vertical timeline from trackingEvents. Empty state
links to royalmail.com directly. Failed state shows red banner.

Refs: spec §9"
```

---

### Task D8: `/admin/settings` dispatch tab

**Files:**
- Modify: `app/(admin)/admin/settings/page.tsx`

- [ ] **Step 1: Read existing settings page structure**

`cat app/(admin)/admin/settings/page.tsx` — understand whether it uses tabs or a single form.

- [ ] **Step 2: Add a Dispatch section/tab**

Wire a form that calls `setDispatchConfig` (Task C11). Fields:
- `enabled` (checkbox)
- `returnAddress` (line1, line2, city, postcode — country fixed to GB at launch)
- `senderName` (text)
- `obaAccountNumber` (text)
- `defaultServiceCodeByCountry.GB` (select: TPN24 / TPN48)
- `defaultWeightGrams` (number)
- `zebraPrinterDeviceId` (text)
- `trackingWebhookUrl` (text — pre-fill with `${NEXT_PUBLIC_BASE_URL}/api/webhooks/royalmail/tracking`)
- `batchScheduleCron` (read-only, default `"0 13 * * 1-5"`)

Render this as a new section below existing settings, or as a tab. Match the existing UI idiom.

Server action call:

```tsx
"use client";
// ...
import { setDispatchConfig } from "@/app/actions/dispatch-config";

async function handleSave(formData: FormData) {
  const payload = {
    enabled: formData.get("enabled") === "on",
    returnAddress: {
      line1: formData.get("line1") as string,
      line2: (formData.get("line2") as string) || null,
      city: formData.get("city") as string,
      postcode: formData.get("postcode") as string,
      country: "GB" as const,
    },
    senderName: formData.get("senderName") as string,
    defaultServiceCodeByCountry: { GB: formData.get("serviceCode") as "TPN24" | "TPN48" },
    obaAccountNumber: formData.get("oba") as string,
    batchScheduleCron: "0 13 * * 1-5",
    batchScheduleTimezone: "Europe/London",
    defaultWeightGrams: Number(formData.get("weight") ?? 100),
    zebraPrinterDeviceId: formData.get("zebraId") as string,
    trackingWebhookUrl: (formData.get("webhookUrl") as string) || "",
  };
  await setDispatchConfig(payload);
}
```

- [ ] **Step 3: Type-check + commit**

```bash
npx tsc --noEmit
git add app/\(admin\)/admin/settings/page.tsx
git commit -m "feat(admin): /admin/settings dispatch tab

Form fields for return address, sender name, OBA #, default service code,
parcel weight, Zebra device ID, tracking webhook URL, enable toggle.
Hard guard: enabling requires populated address + Zebra ID + OBA #.

Refs: spec §11"
```

---

## Phase D verification gate

- [ ] **Run full type-check + lint + build**

```bash
npx tsc --noEmit && npx next lint && npm run build
```

Expected: all pass.

- [ ] **Manual smoke test against stub** (uses dispatch-smoke-test.md from Task F4 once that exists; for now run inline):

1. `npm run dev`
2. Browse `/admin/dispatch` — verify empty state OR queue rendering depending on seed data
3. If seed data has paid orders: click "Generate label" → label appears, sub-state flips to "Label printed", action buttons change
4. Click "Reprint" → opens label PDF (stub PDF) in a new tab
5. Click "Packing slip" → opens packing slip in a new tab
6. Click "Mark dispatched" → row disappears (status flipped to fulfilled). Customer order page should now show timeline empty state
7. Browse `/admin/orders/{id}` → fulfilment fields populated; status = fulfilled

---

## Phase E — Cloud Function

### Task E1: Daily batch scheduled Cloud Function

**Files:**
- Create: `functions/src/dispatch/runDailyBatch.ts`
- Modify: `functions/src/index.ts`

- [ ] **Step 1: Inspect existing Functions package**

Run: `ls functions/src/ && cat functions/src/index.ts`. Confirm Functions v2 + scheduling patterns.

- [ ] **Step 2: Write the scheduled function**

```ts
// functions/src/dispatch/runDailyBatch.ts
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineString } from "firebase-functions/params";
import { logger } from "firebase-functions/v2";

const APP_BASE_URL = defineString("APP_BASE_URL");
const DISPATCH_BATCH_SECRET = defineString("DISPATCH_BATCH_SECRET");

export const runDailyDispatchBatch = onSchedule(
  {
    schedule: "0 13 * * 1-5",          // Mon–Fri 13:00
    timeZone: "Europe/London",
    region: "europe-west2",
    timeoutSeconds: 540,
    retryConfig: { retryCount: 0 },
  },
  async () => {
    const url = APP_BASE_URL.value() + "/api/admin/dispatch/run-batch";
    logger.info(`Triggering dispatch batch: ${url}`);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "X-Dispatch-Batch-Secret": DISPATCH_BATCH_SECRET.value(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ triggeredBy: "schedule" }),
    });

    const text = await res.text().catch(() => "");
    if (!res.ok) {
      logger.error(`Dispatch batch failed: ${res.status} ${text.slice(0, 500)}`);
      return;
    }
    logger.info(`Dispatch batch result: ${text.slice(0, 500)}`);
  }
);
```

- [ ] **Step 3: Export from `functions/src/index.ts`**

Append:

```ts
export { runDailyDispatchBatch } from "./dispatch/runDailyBatch";
```

- [ ] **Step 4: Build the functions package**

Run: `cd functions && npm run build && cd ..`
Expected: 0 errors. (If TS config differs from Next.js — likely — adjust types accordingly.)

- [ ] **Step 5: Commit**

```bash
git add functions/src/dispatch functions/src/index.ts
git commit -m "feat(functions): runDailyDispatchBatch scheduled Cloud Function

Mon-Fri 13:00 Europe/London. Calls /api/admin/dispatch/run-batch with
DISPATCH_BATCH_SECRET header. retryCount=0 — admin re-triggers manually.

Refs: spec §7"
```

---

## Phase E verification gate

- [ ] **Functions package builds cleanly**

```bash
cd functions && npm run build && cd ..
```

Expected: 0 errors.

- [ ] **Verify deploy command works (does NOT actually deploy)**

```bash
firebase deploy --only functions:runDailyDispatchBatch --dry-run 2>&1 | head -20
```

If `--dry-run` isn't supported, just confirm the function name resolves: `firebase functions:list 2>&1 | grep runDaily` (post-deploy only — skip if not deployed yet).

---

## Phase F — Polish & Handover

### Task F1: Audit log viewer rendering for new event types

**Files:**
- Modify: `app/(admin)/admin/audit-log/AuditLogRow.tsx`
- Modify: `app/(admin)/admin/audit-log/AuditLogDrillDown.tsx`

- [ ] **Step 1: Read existing rendering pattern**

`cat app/(admin)/admin/audit-log/AuditLogRow.tsx` — see how event types are mapped to icons/colours/labels.

- [ ] **Step 2: Add 9 event-type rendering branches in `AuditLogRow`**

Find the existing event-type → label mapping (probably an object or switch). Add:

```ts
"order.label_generated":     { icon: "📦", label: "Label generated" },
"order.label_voided":        { icon: "✖", label: "Label voided" },
"order.dispatched":          { icon: "📮", label: "Dispatched" },
"order.tracking_collected":  { icon: "📤", label: "RM collected" },
"order.tracking_in_transit": { icon: "🚚", label: "In transit" },
"order.tracking_out_for_delivery": { icon: "🛵", label: "Out for delivery" },
"order.tracking_delivered":  { icon: "✅", label: "Delivered" },
"order.tracking_failed":     { icon: "⚠", label: "Delivery failed" },
"order.dispatch_batch_run":  { icon: "🗂", label: "Batch run" },
"config.updated":            { icon: "⚙", label: "Config updated" },
```

(Adjust to match the existing design — emoji vs Lucide icons depending on what the codebase uses. Since `lucide-react` is in package.json, prefer Lucide icons: `Package`, `XCircle`, `Send`, `Inbox`, `Truck`, `Bike`, `CheckCircle2`, `AlertTriangle`, `Layers`, `Settings2`.)

- [ ] **Step 3: Drill-down rendering (`AuditLogDrillDown`)**

For the new event types, render their `metadata` payloads cleanly. Specifically:
- `order.label_generated`: show carrier, trackingNumber (with link to RM tracking), serviceCode
- `order.tracking_*`: show milestone, timestamp, location
- `order.dispatch_batch_run`: show processed/failed counts, durationMs, errors list

Match the existing drill-down idiom — likely a key/value table.

- [ ] **Step 4: Type-check + lint + commit**

```bash
npx tsc --noEmit && npx next lint
git add app/\(admin\)/admin/audit-log
git commit -m "feat(audit): render 10 new event types in audit log viewer

Adds icons + labels for label_generated, label_voided, dispatched, all 5
tracking events, dispatch_batch_run, config.updated. Drill-down renders
fulfilment-specific metadata (tracking number, milestone location, etc).

Refs: spec §2.4, §F1 plan"
```

---

### Task F2: Update `docs/client-queries-sam.md`

**Files:**
- Modify: `docs/client-queries-sam.md`

- [ ] **Step 1: Read current doc**

`cat docs/client-queries-sam.md`

- [ ] **Step 2: Add Phase 3-blocking inputs section**

Append (or replace existing Phase 3 section if present):

```markdown
## Before Phase 3 goes live — Sam's blocking inputs

- [ ] Royal Mail Online Business Account (OBA) opened — record account number
- [ ] Click & Drop API key generated from RM Business Account portal
- [ ] Royal Mail service codes confirmed:
   - Default: Tracked 48 (TPN48) — cheapest tracked, 2-3 working day delivery
   - Optional override: Tracked 24 (TPN24) — premium next-day
- [ ] Return address (Sam's dispatch location) — line 1, line 2, city, postcode (GB)
- [ ] Return-name on label (default: "Cryogene Laboratories" — confirm)
- [ ] **Zebra ZD421d-NW** purchased (network/cloud-capable variant — NOT the bare ZD421)
- [ ] Zebra Print Cloud Connect subscription active (~£5-10/mo, billed by Zebra)
- [ ] Zebra device fingerprint obtained from Zebra portal after registration
- [ ] Zebra developer API key obtained
- [ ] Royal Mail tracking webhook URL registered with RM (post-deploy step):
   `https://cryogenelaboratories.co.uk/api/webhooks/royalmail/tracking`
- [ ] Batch schedule confirmed: 13:00 Mon–Fri Europe/London (default; configurable in `/admin/settings`)

Once all the above are filled, Sam (or David on Sam's behalf) toggles
`config.dispatch.enabled = true` via `/admin/settings` → Dispatch tab.
Until enabled, the system runs against stub adapters — clickable end-to-end
in dev with no real labels printed.
```

- [ ] **Step 3: Commit**

```bash
git add docs/client-queries-sam.md
git commit -m "docs: Phase 3 Sam-blocking inputs checklist

Eleven items Sam needs to action before flipping Phase 3 live in production.

Refs: spec §16"
```

---

### Task F3: Update env-vars handover doc

**Files:**
- Modify: `docs/handover/stage1b-env-vars.md`

- [ ] **Step 1: Promote Phase 3 vars from "DO NOT SET YET" to active**

Read the existing doc, find the Phase 3 block, move it into the active section, and update with the final variable names from spec §11:

```
COURIER_PLATFORM=royalmail            # or "stub"; default "stub"
ROYALMAIL_CLICK_AND_DROP_API_KEY=     # from RM Business Account portal
ROYALMAIL_CLICK_AND_DROP_BASE_URL=https://api.parcel.royalmail.com   # default; sandbox URL during onboarding
ROYALMAIL_TRACKING_WEBHOOK_SECRET=    # HMAC secret for inbound tracking webhooks (admin-generated)

PRINTER_PLATFORM=zebra-cloud          # or "stub"; default "stub"
ZEBRA_CLOUD_API_KEY=                  # from Zebra developer portal
ZEBRA_CLOUD_BASE_URL=https://api.zebra.com   # default

DISPATCH_BATCH_SECRET=                # shared secret between Cloud Function and /api/admin/dispatch/run-batch (admin-generated, 32+ chars)
```

For Cloud Functions (separate env), document:

```bash
firebase functions:secrets:set DISPATCH_BATCH_SECRET
firebase functions:config:set app.base_url="https://cryogenelaboratories.co.uk"
```

(Or use Functions v2 params API per Firebase docs.)

- [ ] **Step 2: Commit**

```bash
git add docs/handover/stage1b-env-vars.md
git commit -m "docs(env-vars): promote Phase 3 variables to active

ROYALMAIL_*, ZEBRA_CLOUD_*, DISPATCH_BATCH_SECRET. Includes Cloud
Functions config commands.

Refs: spec §11"
```

---

### Task F4: Smoke test runbook

**Files:**
- Create: `docs/handover/dispatch-smoke-test.md`

- [ ] **Step 1: Write the runbook**

```markdown
# Dispatch smoke test runbook

Walkthrough validates the dispatch flow end-to-end against stub adapters
before flipping to real Royal Mail credentials. Run after every Phase 3
deploy. ~10 minutes.

## Pre-flight

- `COURIER_PLATFORM` unset OR `=stub` (you should see `stubCarrier` warnings in console at request time)
- `PRINTER_PLATFORM` unset OR `=stub`
- At least one paid order in the database (use admin to manually flip a pending order to paid, or run the seed)
- Logged in as admin

## Steps

1. **Empty queue state.** With no paid orders, browse `/admin/dispatch`. Expected: "No paid orders awaiting dispatch."

2. **Single paid order in queue.** Create a paid order. Refresh `/admin/dispatch`. Expected: order appears with sub-state "In queue", service-code dropdown defaulted to TPN48, action button `[Generate label]`.

3. **Generate label success.** Click `[Generate label]`. Expected:
   - Page reloads
   - Sub-state pill flips to "Label printed" (amber)
   - Actions: `[Packing slip]` `[Reprint]` `[Mark dispatched]` `[Void]`
   - Visit `/admin/orders/{id}` — `fulfilment.trackingNumber` populated, `printerStatus = "printed"`
   - Visit `/admin/audit-log` — new row `order.label_generated`

4. **Idempotency.** Click `[Generate label]` again from a stale tab (open another tab to /admin/dispatch first). Expected: server action returns `{ alreadyGenerated: true }` — no duplicate audit event.

5. **Void label.** Click `[Void]`. Expected:
   - Sub-state flips back to "In queue"
   - `fulfilment.trackingNumber` cleared
   - New audit event `order.label_voided`

6. **Simulated failure.** In the server environment, set `STUB_CARRIER_FAIL_NEXT=1`. From the dispatch console, click `[Generate label]`. Expected: row shows red "Failed" pill with truncated error message and `[Retry]` button.

7. **Retry success.** Click `[Retry]`. Expected: sub-state flips to "Label printed".

8. **Mark dispatched.** Click `[Mark dispatched]`. Expected:
   - Row disappears (status flipped to `fulfilled`)
   - `/admin/orders/{id}` shows status = fulfilled, dispatchedAt + customerEmailedAt populated
   - Resend dashboard shows the OrderDispatched email sent
   - Customer browses `/account/orders/{id}` — TrackingTimeline section visible with "Awaiting Royal Mail collection" state

9. **Inbound tracking webhook.** With the order from step 8, simulate an RM webhook:

   ```bash
   BODY='{"trackingNumber":"<the tracking number>","status":"In transit","timestamp":"2026-05-08T15:00:00Z","location":"Birmingham Mail Centre"}'
   SIG=$(printf "%s" "$BODY" | openssl dgst -sha256 -hmac "$ROYALMAIL_TRACKING_WEBHOOK_SECRET" | awk '{print $2}')
   curl -X POST http://localhost:3000/api/webhooks/royalmail/tracking \
     -H "Content-Type: application/json" \
     -H "X-RoyalMail-Signature: $SIG" \
     -d "$BODY"
   ```
   Expected: 200 OK. Customer page shows "In transit" milestone.

10. **Webhook idempotency.** Run the same curl twice. Expected: second response includes `deduped: true`.

11. **Run batch now.** Create 5 paid orders. Click `[Run batch now]` in dispatch console. Expected: all 5 transition to "Label printed" within 30 seconds. Last-batch summary updates: "5 processed, 0 failed".

12. **Mark all dispatched.** With all 5 in "Label printed" state, click `[Mark all printed as dispatched (5)]`. Confirm dialog. Expected: all flip to fulfilled, 5 emails fan out via Resend.

## After all 12 steps pass

- Switch `COURIER_PLATFORM=royalmail`, set `ROYALMAIL_CLICK_AND_DROP_API_KEY` to sandbox value
- Run steps 2, 3, 5, 8 against the RM sandbox
- Then flip to production keys and run steps 2, 3, 8 once more on a low-value test order
```

- [ ] **Step 2: Commit**

```bash
git add docs/handover/dispatch-smoke-test.md
git commit -m "docs: 12-step dispatch smoke-test runbook

Walks through stub-adapter end-to-end test before flipping to RM/Zebra
credentials. ~10 minutes.

Refs: spec §15"
```

---

### Task F5: Update admin guide

**Files:**
- Modify: `docs/handover/admin-guide.md`

- [ ] **Step 1: Add a "Dispatch console" section**

Insert under the existing Orders section:

```markdown
## Dispatch console

`/admin/dispatch` is your task queue for processing paid orders into dispatched parcels.

### Daily flow (typical)

1. Mon–Fri at 13:00, the system automatically generates labels for all paid orders and prints them on your Zebra printer.
2. After 13:00, walk to your printer. A stack of labels is waiting (one per parcel).
3. Pick stock for each order against its packing slip, pack, seal, attach the label to the box.
4. Once all parcels are packed, return to your laptop and open `/admin/dispatch`.
5. Click **"Mark all printed as dispatched (n)"** at the top of the queue. Confirm the dialog.
6. Customer dispatch emails fan out automatically with tracking numbers.

### Per-order actions

Each row shows the order's current sub-state and contextual buttons:
- **In queue** — `[Generate label]` triggers Click & Drop + prints. Use only for express orders before the daily batch fires.
- **Label printed** — `[Packing slip]` opens the printable picking slip; `[Reprint]` re-fetches the label PDF; `[Mark dispatched]` flips status + emails customer; `[Void]` cancels the label at Royal Mail.
- **Failed** — `[Retry]` re-attempts label generation. Hovering the warning icon shows the error message.

### Run batch now

The header bar `[Run batch now]` button manually triggers the same logic as the daily 13:00 schedule. Use for:
- Saturday/Sunday orders if you choose to dispatch on weekends
- Express orders that arrived after the daily batch fired
- Re-running after fixing a stuck order

### Settings

Configuration lives at `/admin/settings` → Dispatch tab. Editable: return address, sender name, OBA account number, default service code, parcel weight, Zebra device ID, tracking webhook URL. Toggle `enabled` once all required fields are populated to switch from stub to live mode.
```

- [ ] **Step 2: Commit**

```bash
git add docs/handover/admin-guide.md
git commit -m "docs(admin-guide): document dispatch console + daily flow

Refs: spec §1, §11"
```

---

### Task F6: Final verification

- [ ] **Full type-check + lint + build**

```bash
npx tsc --noEmit && npx next lint && npm run build
cd functions && npm run build && cd ..
```

Expected: 0 errors anywhere.

- [ ] **Walk through `docs/handover/dispatch-smoke-test.md` against `npm run dev`**

All 12 steps pass against stub adapters.

- [ ] **Update memory file**

Update `~/.claude/projects/C--Users-david/memory/project_peptide_store.md` (or the right path per MEMORY.md index) with a Phase 3 status block:

```markdown
## Phase 3 Fulfilment (shipped YYYY-MM-DD)

- Spec: docs/superpowers/specs/2026-05-07-fulfilment-phase3-design.md
- Plan: docs/superpowers/plans/2026-05-07-fulfilment-phase3-implementation.md
- Status: code complete; awaiting Sam's blocking inputs (see docs/client-queries-sam.md "Before Phase 3 goes live")
- Live mode: COURIER_PLATFORM=royalmail + Zebra Cloud + dispatchConfig.enabled=true
- Stub mode: any of the above unset → entire flow runs end-to-end with fake labels
```

- [ ] **Final commit (if any uncommitted)**

```bash
git status
git add -A   # if there are loose changes
git commit -m "chore: Phase 3 implementation complete — code done, awaiting Sam's inputs"
```

---

## Final verification gate (full Phase 3)

- [ ] All 6 phases complete
- [ ] All 12 smoke-test steps pass against stubs
- [ ] Type-check, lint, build all green
- [ ] Functions package builds
- [ ] Sam-blocking inputs documented in `docs/client-queries-sam.md`
- [ ] Memory updated

## Post-deploy steps (David, not subagent)

The following are out of scope for the implementation plan — they happen after merge:

1. Deploy Firestore indexes: `firebase deploy --only firestore:indexes`
2. Deploy Firestore rules: `firebase deploy --only firestore:rules`
3. Deploy Cloud Function: `firebase deploy --only functions:runDailyDispatchBatch`
4. Set Cloud Function secrets: `firebase functions:secrets:set DISPATCH_BATCH_SECRET`
5. Set production env vars in Vercel for `COURIER_PLATFORM`, `ROYALMAIL_CLICK_AND_DROP_API_KEY`, `PRINTER_PLATFORM`, `ZEBRA_CLOUD_API_KEY`, `ROYALMAIL_TRACKING_WEBHOOK_SECRET`, `DISPATCH_BATCH_SECRET`
6. Once Sam delivers his blocking inputs, populate `/admin/settings` → Dispatch tab and toggle `enabled = true`
7. Register the tracking webhook URL with Royal Mail (`https://cryogenelaboratories.co.uk/api/webhooks/royalmail/tracking`)
8. Run a single live test order against an internal address before opening to customers
