---
title: Phase 3 — Fulfilment Integration (Royal Mail + Zebra Cloud + Tracking Webhooks)
date: 2026-05-07
status: draft
phase: Phase 3 (SoW Deliverable 2 — £1,250)
---

# Phase 3 — Fulfilment Integration

## Goal

Turn paid orders into dispatched parcels with Royal Mail Click & Drop integration, daily batch printing to a Zebra ZD421-NW via Cloud Connect, full Royal Mail tracking webhook ingestion (five milestones), and a customer-facing tracking timeline.

The system runs **fully automated end-to-end**: paid orders accumulate, a Cloud Function fires Mon–Fri at 13:00 Europe/London to call Click & Drop for each, prints labels to the Zebra cloud printer, captures tracking numbers, and updates each order. Sam walks to the printer, picks his stack, packs, then bulk-marks all dispatched in one click — Resend emails fan out to customers with branded tracking pages rendered from real Royal Mail webhook events.

## Implementation note: external API specifics

Royal Mail Click & Drop and Zebra Cloud Connect both have evolving REST APIs. **Do not implement adapter calls from this spec alone.** Before writing each adapter:

1. Pull the latest official API documentation from each vendor's developer portal.
2. Verify endpoint paths, auth headers, request body shapes, and response envelopes against the live spec.
3. Use the codebase pattern from `lib/payments/` (TrueLayer scaffold) — Zod-validate every external response shape at the trust boundary so drift surfaces immediately, not in production.

The spec below documents the **intended behaviour and contract**, not the wire-level details. The wire-level details belong in the implementation against the live API.

---

## Non-goals

- No returns labels (separate flow, deferred).
- No international shipping at launch — UK-only, enforced via Zod allowlist at the validation boundary. Type system widened so international activation is a one-line allowlist change, not a refactor.
- No multi-package shipments (single parcel per order assumed).
- No batch/lot numbers on packing slips (no `batchNumber` field on `ProductVariant` — Tier 4 retainer upsell 4.7).
- No customer-facing branded tracking page replacing the Royal Mail URL (Tier 4 upsell 4.4) — the *internal* customer order page renders the timeline from `trackingEvents`, but external dispatch emails still link to royalmail.com.
- No SMS/push notifications (Tier 4 upsell 4.5).
- No auto-print on payment / instant-per-order printing (Tier 4 upsell 4.6) — the architecture supports it trivially; deferred for SoW scope.
- No Sendcloud / Shippo carrier implementations (Tier 3 upsell 3.5) — typed stubs reserved.
- No PrintNode printer adapter implementation (typed stub reserved).
- No shipping rate quoting in cart — flat `shippingCostInPence` per existing checkout logic stands.
- No customs declaration UI (typed stub on `OrderLineItem`).
- No backfill of historical orders — fulfilment fields populate from this deploy forward.

---

## Section 1 — Architecture overview

```
lib/fulfilment/
  carriers/
    types.ts            ← CarrierAdapter contract
    royalmail.ts        ← Click & Drop REST implementation (real)
    stub.ts             ← deterministic fake (used when ROYALMAIL_API_KEY unset)
    sendcloud.ts        ← typed stub, throws "not implemented"
    shippo.ts           ← typed stub, throws "not implemented"
    index.ts            ← provider selector — reads COURIER_PLATFORM env
  printers/
    types.ts            ← PrinterAdapter contract
    zebra-cloud.ts      ← Zebra Print Cloud Connect implementation (real)
    stub.ts             ← logs PDF URL, no print (CI / dev default)
    printnode.ts        ← typed stub, reserved
    index.ts            ← provider selector — reads PRINTER_PLATFORM env
  service-codes.ts      ← Royal Mail service-code map (per-country, GB-only at launch)
  packing-slip.ts       ← packing-slip data shaper (server component data)
  tracking.ts           ← TrackingMilestone enum + helpers (collected, in_transit, etc.)
  webhook-verify.ts     ← HMAC verifier for inbound RM webhooks

functions/src/dispatch/
  runDailyBatch.ts      ← scheduled Cloud Function (13:00 Europe/London, Mon–Fri)

app/(admin)/admin/dispatch/
  page.tsx              ← server component — paid-not-yet-printed queue
  DispatchClient.tsx    ← client wrapper — bulk actions, per-row actions

app/(admin)/admin/orders/[id]/
  packing-slip/page.tsx ← printable packing slip (server component, print CSS)
  label/route.ts        ← admin-auth-gated proxy for Click & Drop label PDF

app/(public)/account/orders/[id]/
  TrackingTimeline.tsx  ← customer-facing journey from trackingEvents

app/api/webhooks/royalmail/tracking/route.ts
                        ← inbound RM tracking webhook receiver

app/api/admin/dispatch/run-batch/route.ts
                        ← internal endpoint Cloud Function calls (shared-secret auth)

app/actions/
  fulfilment.ts         ← generateLabel, voidLabel, markDispatched, retryLabel,
                          runBatch, markBatchDispatched (bulk)
  dispatch-config.ts    ← admin-only setter for /admin/settings dispatch tab
```

### Adapter contracts

```ts
// lib/fulfilment/carriers/types.ts
export type CarrierAdapter = {
  createShipment(input: ShipmentInput): Promise<{
    carrierOrderId: string;     // Royal Mail orderIdentifier
    trackingNumber: string;
    labelPdfUrl: string;        // Click & Drop signed URL — TTL applies
  }>;
  voidShipment(carrierOrderId: string): Promise<void>;
  subscribeTracking(input: { trackingNumber: string; webhookUrl: string }): Promise<void>;
};

export type ShipmentInput = {
  orderId: string;
  orderNumber: string;
  destinationAddress: Address;          // country: ISO 3166-1 alpha-2
  senderAddress: Address;               // from dispatchConfig.returnAddress
  senderName: string;                   // from dispatchConfig.senderName
  serviceCode: RoyalMailServiceCode;
  weightGrams: number;                  // computed from line items (constant for v1)
  customs?: CustomsDeclaration | null;  // null for GB; required for international
};
```

```ts
// lib/fulfilment/printers/types.ts
export type PrinterAdapter = {
  printPdf(input: { pdfUrl: string; orderId: string }): Promise<{ jobId: string }>;
  getJobStatus(jobId: string): Promise<"queued" | "printed" | "failed">;
};
```

### Why two layers

The Phase 1 codebase already has `lib/payments/` with a `stub` provider that lets every code path run end-to-end without TrueLayer credentials. We mirror that idiom exactly. Stub adapters return well-formed fake data so the dispatch console is fully clickable in dev with zero credentials. The same trick that let Phase 1 ship lets Phase 3 ship.

---

## Section 2 — Data model additions

### 2.1 — Address widening

`types/customer.ts`:

```ts
// before
country: "GB"
// after
country: string  // ISO 3166-1 alpha-2
```

Type widens; Zod narrows. All Zod address schemas (signup, checkout delivery, admin order edit) gain `country: z.enum(["GB"])`. Going international = swap one enum line.

### 2.2 — Order shape additions

`types/order.ts`:

```ts
// new field
currencyCode: string  // always "GBP" at launch; Zod enforces
```

`OrderFulfilment` already exists. Two new fields added:

```ts
type OrderFulfilment = {
  // existing fields unchanged
  carrier: "royalmail" | "sendcloud" | "shippo" | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  printedAt: Timestamp | Date | null;
  printerStatus: "pending" | "printed" | "failed" | null;
  dispatchedAt: Timestamp | Date | null;
  customerEmailedAt: Timestamp | Date | null;

  // new
  carrierOrderId: string | null;       // RM's orderIdentifier — needed for void
  lastError: string | null;             // surfaced in dispatch row when printerStatus = "failed"
  trackingEvents: TrackingEvent[];      // append-only journal from RM webhooks
  lastTrackingStatus: TrackingMilestone | null;  // denormalised — fast queries
};

type TrackingEvent = {
  milestone: TrackingMilestone;
  timestamp: Timestamp | Date;
  location: string | null;
  raw: Record<string, unknown>;          // RM payload, capped at 1KB
};

type TrackingMilestone =
  | "collected"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "failed";
```

Backwards-compatible — existing orders default new fields to null/empty array on read.

### 2.3 — `OrderLineItem` customs hooks (international stub)

```ts
type OrderLineItem = {
  // existing fields unchanged
  // new optional fields — null for GB, populated by international upsell 3.4
  hsCode: string | null;
  customsValueInPence: number | null;
  customsDescription: string | null;
};
```

### 2.4 — Audit event types

Append to `types/audit.ts` `ALL_AUDIT_EVENT_TYPES`:

```
"order.label_generated",
"order.label_voided",
"order.dispatched",
"order.tracking_collected",
"order.tracking_in_transit",
"order.tracking_out_for_delivery",
"order.tracking_delivered",
"order.tracking_failed",
"order.dispatch_batch_run",   // emitted once per Cloud Function run
```

Audit-log viewer (`AuditLogRow`, `AuditLogDrillDown`) gains rendering branches for each new type.

### 2.5 — New Firestore collections / docs

**`config/dispatch`** (single doc):

```ts
type DispatchConfig = {
  enabled: boolean;                              // explicit opt-in
  returnAddress: Address;                        // shipper's name + address printed on label
  senderName: string;                            // "Cryogene Laboratories"
  defaultServiceCodeByCountry: Record<string, RoyalMailServiceCode>;
                                                 // { GB: "TPN48" } at launch (Tracked 48 — cheapest tracked)
  obaAccountNumber: string;                      // Royal Mail OBA #
  batchScheduleCron: string;                     // "0 13 * * 1-5" — Mon-Fri 13:00 Europe/London
  batchScheduleTimezone: string;                 // "Europe/London"
  defaultWeightGrams: number;                    // 100g default per parcel
};
```

Seeded with safe stub defaults via `scripts/seed-firestore.ts`. `enabled: false` until Sam fills the address fields. When `enabled: false`, carrier selector falls back to stub adapter — dispatch console still works with fake labels.

**`shippingRates`** (single-doc map):

```ts
// document: shippingRates/main
{ rates: { GB: 695 } }   // £6.95 UK at launch
```

Single GB row at launch; international = adding a key, not code.

**`dispatchBatchRuns`** (collection):

Per-run log written by `runBatch()`. Document:

```ts
type DispatchBatchRun = {
  id: string;                                    // batchRun-{ISO timestamp}
  startedAt: Timestamp;
  completedAt: Timestamp | null;
  triggeredBy: "schedule" | "admin";
  triggeredByActor: { uid: string | null; email: string | null };
  ordersProcessed: number;
  ordersFailed: number;
  errors: Array<{ orderId: string; orderNumber: string; message: string }>;
  durationMs: number;
};
```

Surfaced in `/admin/dispatch` header bar so Sam can see "Yesterday's batch: 18 of 18 printed" or "Today's batch: 17 of 18 printed (1 failed)" with a link to the failure details.

### 2.6 — Firestore indexes

Add to `firestore.indexes.json`:

```json
{
  "collectionGroup": "orders",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "fulfilment.printerStatus", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "ASCENDING" }
  ]
}
```

For the dispatch queue read: `status == "paid"` AND `fulfilment.printerStatus IN [null, "failed"]` ORDER BY `createdAt`.

Plus an index for tracking webhook lookups by `trackingNumber`:

```json
{
  "collectionGroup": "orders",
  "fields": [
    { "fieldPath": "fulfilment.trackingNumber", "order": "ASCENDING" }
  ]
}
```

### 2.7 — Firestore rules

`firestore.rules` updates:

- `orders` writes from server only (already enforced).
- `dispatchBatchRuns` admin-read, server-write, no client write.
- `config/dispatch` admin-read, admin-write via server actions only.
- `shippingRates/main` public-read (checkout reads to compute shipping cost), admin-write.

---

## Section 3 — Order state machine

Top-level `OrderStatus` enum unchanged: `pending → paid → fulfilled → cancelled → refunded`.

Dispatch sub-state derived from `OrderFulfilment` fields:

| Fulfilment fields | Sub-state | Dispatch console pill |
|---|---|---|
| `printerStatus = null` | In queue | slate |
| `printerStatus = "printed"`, `dispatchedAt = null` | Label printed, awaiting parcel | amber |
| `printerStatus = "failed"` | Label failed | red |
| `dispatchedAt != null` (status = `fulfilled`) | Dispatched, awaiting tracking | navy |
| `lastTrackingStatus = "collected"` | Royal Mail collected | navy |
| `lastTrackingStatus = "in_transit"` | In transit | navy |
| `lastTrackingStatus = "out_for_delivery"` | Out for delivery | green |
| `lastTrackingStatus = "delivered"` | Delivered | success |
| `lastTrackingStatus = "failed"` | Delivery failed | red |

No new `OrderStatus` enum members. Sub-state is implicit in the data.

---

## Section 4 — Server actions

All four `assertAdmin()`-gated, all writing audit events, all using transactions for state guards.

### `generateLabel(orderId, opts: { serviceCode?: RoyalMailServiceCode })`

1. Read order in transaction.
2. Guard: `status == "paid"` AND `fulfilment.trackingNumber == null`. Else throw `"already_generated"` or `"invalid_status"`.
3. Resolve carrier adapter from `lib/fulfilment/carriers/index.ts`.
4. Resolve service code: `opts.serviceCode ?? dispatchConfig.defaultServiceCodeByCountry[order.customer.address.country]`.
5. Call `carrier.createShipment(...)`.
6. Persist `carrierOrderId`, `trackingNumber`, `labelUrl`, `printerStatus = "pending"`, `printedAt = null`. **The carrier-side label exists at this point — DB write success makes it durable.**
7. Call `printer.printPdf(...)`. On success → set `printerStatus = "printed"`, `printedAt = now`. On failure → set `printerStatus = "failed"`, `lastError = err.message`. **Do NOT void the carrier label** — `labelUrl` is retained so admin can re-print via `[Retry]` from the dispatch row.
8. Call `carrier.subscribeTracking(...)` — fire-and-forget; failure logs but doesn't block.
9. Audit `order.label_generated` with `metadata: { carrier, trackingNumber, serviceCode, labelPdfUrl }`.
10. `revalidatePath("/admin/dispatch")` and `/admin/orders/${id}`.

Idempotency: re-call returns early with the existing `trackingNumber` — no duplicate carrier order, no duplicate audit event.

### `voidLabel(orderId, opts: { reason?: string })`

1. Guard: `fulfilment.trackingNumber != null` AND `dispatchedAt == null`. Voiding after dispatch is a refund, not a void.
2. Call `carrier.voidShipment(carrierOrderId)`.
3. Clear `carrierOrderId`, `trackingNumber`, `labelUrl`, `printerStatus`, `printedAt`. Preserve `trackingEvents` array for audit (in case any milestones already arrived).
4. Audit `order.label_voided` with `metadata: { voidedTrackingNumber, reason }`.

### `markDispatched(orderId)`

1. Guard: `fulfilment.printerStatus == "printed"` AND `dispatchedAt == null`.
2. In transaction: set `dispatchedAt = now`, `customerEmailedAt = now`, flip `status → "fulfilled"`.
3. Audit `order.dispatched`.
4. Send dispatch email via Resend (template below). Failure: `customerEmailedAt` rolled back to null, audit metadata gains `emailError`. Order stays `fulfilled` — packing happened, the email is a side-effect.

### `markBatchDispatched()` (new bulk action)

1. Read all orders where `printerStatus == "printed"` AND `dispatchedAt == null`.
2. For each, run the same logic as `markDispatched` in sequence.
3. Resend supports batch send — single HTTP call, multiple recipients via `resend.batch.send([...])`. Use it.
4. Single audit-log batch: one `order.dispatched` event per order, one wrapping `order.dispatch_batch_run` event with the count.
5. Returns `{ marked, failed, errors }` for the confirmation toast.

### `retryLabel(orderId)`

Identical to `generateLabel` but allows when `printerStatus = "failed"` (resets fields first).

### `runBatch(opts: { triggeredBy: "schedule" | "admin", actor })`

1. Read all orders where `status == "paid"` AND `fulfilment.printerStatus IN [null, "failed"]`, ordered by `createdAt` ASC.
2. For each, in **sequence** (not parallel — Click & Drop rate-limits at 30 req/min):
   - Call `generateLabel` (handles its own idempotency).
   - On per-order failure, log to errors array, continue.
3. Write `dispatchBatchRuns/{id}` document with summary.
4. Audit `order.dispatch_batch_run` once per run.
5. Returns summary.

Available from:
- Cloud Function (Mon–Fri 13:00, `triggeredBy: "schedule"`)
- `/admin/dispatch` "Run batch now" button (`triggeredBy: "admin"`)

### `cancelOrderWithLabelCascade(orderId, reason)`

Wrapper that extends existing `setOrderStatus(id, "cancelled")`:

1. If `fulfilment.trackingNumber != null` AND `dispatchedAt == null` → call `voidLabel` first.
2. Then proceed with existing `setOrderStatus` logic.

Audit log captures both events in sequence.

---

## Section 5 — Royal Mail Click & Drop adapter

### Endpoint contract (Click & Drop API v1)

Base URL: `https://api.parcel.royalmail.com` (production), `https://api.parcel.royalmail.com/sandbox` (sandbox during onboarding).

Auth: Bearer token derived from API key + OBA account number. Token cached for 50 minutes (RM tokens expire at 60 min).

**Create shipment:** `POST /api/v1/orders` with one-order array body. Returns `orderIdentifier` and label URL. Reference: Click & Drop documentation (link in handover).

**Void shipment:** `DELETE /api/v1/orders/{orderIdentifier}`.

**Subscribe tracking webhook:** Royal Mail Tracking API requires shipment to be created with a webhook URL declared in the original `POST /api/v1/orders` body — `shipmentDeliveryNotification: { webhookUrl, secret }`. (Verify this in implementation against the live API spec — RM has tweaked this twice.)

### Service-code map (GB launch)

```ts
// lib/fulfilment/service-codes.ts
export const ROYAL_MAIL_GB_SERVICES = {
  TPN24: { label: "Tracked 24", trackingFlavour: "tracked", maxKg: 20 },
  TPN48: { label: "Tracked 48", trackingFlavour: "tracked", maxKg: 20 },
  // future: SD1, SD2, etc.
} as const;

export type RoyalMailServiceCode = keyof typeof ROYAL_MAIL_GB_SERVICES;
```

Default = `TPN48` (cheapest tracked). Sam can change via `/admin/settings`.

### Stub adapter behaviour

`lib/fulfilment/carriers/stub.ts`:

- Returns deterministic fake `carrierOrderId` (`stub-{orderId}`) and `trackingNumber` (`STUBTRACK{6-char}`).
- `labelPdfUrl` returns `/dev-fixtures/sample-label.pdf` (committed to repo).
- `voidShipment` is a no-op.
- `subscribeTracking` is a no-op but logs the URL.
- Optional query-param trigger: include `?stub_fail=1` in any request that uses the carrier (via env `STUB_CARRIER_FAIL_NEXT=1`) to simulate a 500.

Allows full dispatch flow testing without a Royal Mail account.

---

## Section 6 — Zebra Cloud Connect printer adapter

### Endpoint contract (Zebra Print Cloud Connect)

Base URL: `https://api.zebra.com/v2/devices` (verify in implementation — Zebra's developer portal documents the latest path).

Auth: Bearer token from Zebra developer account.

**Print PDF:** `POST /v2/devices/{deviceFingerprint}/sendpdf` with PDF binary body. Returns `jobId`.

**Job status:** `GET /v2/devices/{deviceFingerprint}/jobs/{jobId}` returns `{ status: "queued" | "printed" | "failed" }`.

The Zebra ZD421-NW is registered with Zebra Cloud Connect during printer setup (handover documentation step). Each printer has a stable `deviceFingerprint` — stored in `dispatchConfig.zebraPrinterDeviceId`.

### Hardware spec for Sam's purchase

Updated recommendation in client-queries doc and handover:

- **Printer:** Zebra ZD421d-NW (direct thermal, network/cloud-capable variant)
- **Subscription:** Zebra Print Cloud Connect (~£5-10/mo, billed by Zebra)
- **Labels:** Royal Mail-compatible 4×6 (102×152mm) thermal direct labels — Sam buys rolls separately
- **Network:** Wired Ethernet to Sam's router preferred over WiFi for reliability

### Stub adapter behaviour

Logs `pdfUrl` and `orderId` to console. Returns synthetic `jobId`. `getJobStatus` returns `"printed"` after a 2-second delay (simulates real cloud queue).

---

## Section 7 — Cloud Function (daily batch)

`functions/src/dispatch/runDailyBatch.ts`:

```ts
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineString } from "firebase-functions/params";

const APP_BASE_URL = defineString("APP_BASE_URL");
const DISPATCH_BATCH_SECRET = defineString("DISPATCH_BATCH_SECRET");

export const runDailyDispatchBatch = onSchedule(
  {
    schedule: "0 13 * * 1-5",          // Mon–Fri 13:00
    timeZone: "Europe/London",
    region: "europe-west2",
    timeoutSeconds: 540,
    retryConfig: { retryCount: 0 },    // do not auto-retry — admin re-triggers from console
  },
  async () => {
    const url = APP_BASE_URL.value() + "/api/admin/dispatch/run-batch";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "X-Dispatch-Batch-Secret": DISPATCH_BATCH_SECRET.value(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ triggeredBy: "schedule" }),
    });
    if (!res.ok) {
      console.error("Dispatch batch failed:", res.status, await res.text());
    }
  }
);
```

Cloud Functions environment is separate from Next.js — set the function params with:
```
firebase functions:secrets:set DISPATCH_BATCH_SECRET
firebase functions:config:set app.base_url="https://cryogenelaboratories.co.uk"   # legacy syntax
```
Or use the v2 params API per Firebase Functions documentation. Mirrors the existing DSAR SLA-warning function pattern exactly.

`app/api/admin/dispatch/run-batch/route.ts`:

- Verifies `X-Dispatch-Batch-Secret` header against `DISPATCH_BATCH_SECRET` env using constant-time compare.
- If `triggeredBy: "admin"`, also requires admin session.
- Calls `runBatch()` server action.
- Returns batch summary as JSON.

---

## Section 8 — Royal Mail tracking webhook

### Receiver

`app/api/webhooks/royalmail/tracking/route.ts`:

1. Verify HMAC signature on `X-RoyalMail-Signature` header against `ROYALMAIL_TRACKING_WEBHOOK_SECRET`. Constant-time compare. Reject 401 on mismatch.
2. Parse body as RM tracking event payload.
3. Look up order by `fulfilment.trackingNumber` (uses index from §2.6).
4. Map RM milestone code to `TrackingMilestone` enum (see mapping table below).
5. De-dupe: if `{milestone, timestamp}` matches any existing event in `trackingEvents`, skip.
6. In transaction: append to `trackingEvents`, set `lastTrackingStatus`.
7. Audit `order.tracking_{milestone}` with full event metadata.
8. If milestone is `delivered`, the customer-facing tracking page reflects it on next render. No additional email sent (deferred — that's upsell 1.4).
9. Return 200 fast — RM retries on non-200. Failure path: log + return 500.

### Milestone mapping

Royal Mail tracking events use a code system. Mapping table (verify exact codes during implementation against live API):

| RM milestone | Our `TrackingMilestone` |
|---|---|
| `Item posted` / `Collection from sender` | `collected` |
| `In transit` / `At sorting hub` / `Departed hub` | `in_transit` |
| `Out for delivery` / `With courier` | `out_for_delivery` |
| `Delivered` | `delivered` |
| `Delivery attempted` / `Returned to sender` / `Lost` | `failed` |

### Defensive notes

- HMAC verify before any DB read.
- 1KB cap on `raw` payload (use the same `clampJsonObject` helper from `lib/audit-log.ts`).
- Webhook retries from RM are common — idempotency via dedup is critical.
- If we receive a webhook for an unknown tracking number (already voided, or test), log + return 200 (RM should not retry).

---

## Section 9 — Customer-facing tracking timeline

`/account/orders/[id]` is an existing page. Add a new section: `<TrackingTimeline />` rendered between the order details and the customer details.

Renders the five-state vertical timeline from `order.fulfilment.trackingEvents`:

```
●  Label generated         — 2026-05-08 13:02
│
●  Royal Mail collected     — 2026-05-08 17:30
│
●  In transit               — 2026-05-09 03:15  (at Birmingham Mail Centre)
│
○  Out for delivery
│
○  Delivered
```

Empty state (no tracking events yet): "Awaiting Royal Mail collection. Tracking updates will appear here as your parcel moves." Plus a fallback link to royalmail.com/track-your-item with the tracking number, for the times when our webhooks lag RM's own tracking page.

If `lastTrackingStatus === "failed"`: red banner with "Delivery problem — we've been notified and will be in touch within one working day. If you'd like to act now, contact us." (Failed-delivery rescue is upsell 1.5; for now Sam handles manually from `/admin/dispatch/exceptions`.)

---

## Section 10 — Email templates

New transactional template via existing `lib/email/send.ts` wrapper.

### `OrderDispatched`

Triggered by `markDispatched` and `markBatchDispatched`. Idempotent on `customerEmailedAt`.

Subject: `Your order {orderNumber} has been dispatched`

Body:
- Greeting with customer first name
- "Your order {orderNumber} is on its way."
- Order summary (line items, qty)
- Tracking number + Royal Mail tracking URL: `https://www.royalmail.com/track-your-item#/tracking-results/{trackingNumber}`
- Expected delivery window per service code (Tracked 48 = 2-3 working days)
- Link to `/account/orders/{id}` for branded timeline view
- Plain-text fallback (Resend handles)
- Footer: existing unsubscribe / preference centre links

No customer email is sent for label generation, void, retry, or batch run — only successful dispatch.

---

## Section 11 — Configuration

### Firestore docs

- `config/dispatch` — see §2.5
- `shippingRates/main` — see §2.5

Both edited via existing `/admin/settings` page (gain new "Dispatch" tab).

### Environment variables

Update `docs/handover/stage1b-env-vars.md` to promote Phase 3 variables from "DO NOT SET YET" to active.

```
COURIER_PLATFORM=royalmail                    # or "stub"; default = "stub"
ROYALMAIL_CLICK_AND_DROP_API_KEY=             # Sam generates from RM Business Account portal
ROYALMAIL_CLICK_AND_DROP_BASE_URL=https://api.parcel.royalmail.com    # default
ROYALMAIL_TRACKING_WEBHOOK_SECRET=            # HMAC secret for inbound tracking webhooks

PRINTER_PLATFORM=zebra-cloud                  # or "stub"; default = "stub"
ZEBRA_CLOUD_API_KEY=                          # Zebra developer portal
ZEBRA_CLOUD_BASE_URL=https://api.zebra.com    # default
ZEBRA_PRINTER_DEVICE_ID=                      # printer fingerprint, set during printer setup

DISPATCH_BATCH_SECRET=                        # shared secret between Cloud Function and /api/admin/dispatch/run-batch
NEXT_PUBLIC_BASE_URL=https://cryogenelaboratories.co.uk    # already exists; needed for webhook URL construction
```

### Provider selector logic

```
if COURIER_PLATFORM == "stub" or unset                         → stub adapter
if COURIER_PLATFORM == "royalmail" AND key present
    AND dispatchConfig.enabled == true                          → Royal Mail adapter
otherwise                                                       → stub adapter (with warn log at boot)
```

Same pattern for printer. This means:
- Dev/staging default to safe stubs.
- Production explicitly opts in twice (env var + Firestore config doc).
- Sam can flip the kill-switch via `/admin/settings` → "Dispatch enabled" toggle without a deploy.

---

## Section 12 — Error handling

| Failure | Behaviour | Audit | Customer impact |
|---|---|---|---|
| Click & Drop 4xx (bad address, etc.) | `printerStatus = "failed"`, `lastError` populated, surfaced in dispatch row | yes | none |
| Click & Drop 5xx / network | Same as above, retryable via `[Retry]` action | yes | none |
| Click & Drop returns label but Zebra cloud print fails | Label created at carrier; printerStatus = "failed"; admin can re-print from dispatch row (re-uses same labelPdfUrl) | yes | none |
| Click & Drop label created but DB write fails | Compensating action: best-effort `voidShipment` call before throwing; if void also fails, log to `errors` collection for manual reconciliation | yes | none |
| `markDispatched` called without label | Action throws, UI shows error, no state change | no (validation, not security) | none |
| `markDispatched` succeeds but Resend fails | Order flips to `fulfilled`, `customerEmailedAt = null`, audit metadata `emailError`, banner in admin dispatch row "email failed — re-send?" | yes | none until customer notices |
| Tracking webhook signature mismatch | Reject 401, log | yes (separate event `webhook.signature_failed`) | none |
| Tracking webhook for unknown tracking number | Log, return 200 | no | none |
| Cloud Function timeout | Function logs, no retry; admin re-triggers from dispatch console | logged in Cloud Logging | dispatched orders pending |
| Admin double-clicks `[Generate label]` | Transaction guard returns early; no duplicate carrier order or audit event | no (expected) | none |
| Order cancelled with label still active | `cancelOrderWithLabelCascade` voids label first, then cancels | both events | none — label voided before charge |

### Reconciliation collection

For the rare case where carrier creates a shipment but our DB write fails *and* compensating void fails, log to a new `dispatchReconciliation` Firestore collection — documents have `{ orderId, carrierOrderId, trackingNumber, error, createdAt }`. Manual triage via `/admin/dispatch/exceptions` page (which also surfaces `tracking_failed` events for upsell 1.5 readiness — empty queue at launch unless errors occur).

---

## Section 13 — International activation runbook

When Sam wants to ship to a new country (deferred upsell 3.4), the changes are:

1. **Validation** — add country code to all Zod address schemas: `country: z.enum(["GB", "DE", ...])`.
2. **Service-code map** — add per-country entries: `defaultServiceCodeByCountry: { GB: "TPN24", DE: "TPL", ... }`.
3. **Royal Mail International services** — add to `lib/fulfilment/service-codes.ts` with international flavour. Reference: Click & Drop documentation for international codes.
4. **Customs declaration UI** — wire `OrderLineItem.hsCode`, `customsValueInPence`, `customsDescription` editing in admin product form.
5. **Customs payload generation** — when `destinationAddress.country !== "GB"`, populate `ShipmentInput.customs` from line items in `generateLabel`.
6. **Shipping rates** — add country rows to `shippingRates/main`.
7. **VAT logic** — when `country` is non-GB, zero-rate the VAT. Logic lives in `lib/checkout/vat.ts` (created on-demand by upsell 3.4).
8. **Currency** — if expanding beyond GBP, widen `Order.currencyCode` Zod enum and update price formatters. TrueLayer EEA support means payment is solved for €.
9. **Address validation** — country-specific postcode regexes; today only GB postcodes are validated.
10. **Country picker in checkout** — single-line addition to delivery form once allowlist widens.

This is documented as a one-page runbook so the upsell scope is bounded and transparent.

---

## Section 14 — Backwards compatibility & migration

Existing orders (Phase 1 stub-payment + the seed data) have no `fulfilment` field populated. On read, missing fields default to:

- `carrier: null`
- `trackingNumber: null`
- `labelUrl: null`
- `printedAt: null`
- `printerStatus: null`
- `dispatchedAt: null`
- `customerEmailedAt: null`
- `carrierOrderId: null`
- `lastError: null`
- `trackingEvents: []`
- `lastTrackingStatus: null`
- `currencyCode: "GBP"` (Order shape)
- `country: "GB"` (Address shape — already enforced)

No migration script needed — the type widening is read-tolerant (defaults applied at the data-access layer in `lib/orders.ts`).

---

## Section 15 — Testing approach

Following the codebase convention (no test suite), this work relies on:

1. **Stub adapters as integration substrate** — every code path runs end-to-end against stubs in dev, including audit-log writes. If the structural correctness holds against stubs, the wiring is proven.
2. **Manual smoke-test runbook** in `docs/handover/dispatch-smoke-test.md`. Twelve steps walked through against stubs before flipping to real Royal Mail credentials:
   1. Empty queue → "no paid orders" state
   2. Single paid order appears in queue
   3. Click `[Generate label]` → success, row shows printed pill, `[Mark dispatched]` button appears
   4. Double-click `[Generate label]` → idempotent, no duplicate
   5. Click `[Void label]` → returns to "in queue" state
   6. Trigger `?stub_fail=1` → row shows failed pill with `[Retry]`
   7. Click `[Retry]` → succeeds, row shows printed pill
   8. Click `[Mark dispatched]` → status flips, customer email lands (Resend dashboard)
   9. Customer's `/account/orders/{id}` shows the timeline with one milestone (label generated, awaiting collection)
   10. Simulate inbound webhook via curl with valid HMAC → milestone appears on customer page
   11. `[Run batch now]` with 5 paid orders → all process in sequence, batch run logged, dispatch row pills update
   12. `[Mark all dispatched]` → 5 emails fan out, all flip to fulfilled
3. **Royal Mail sandbox** — once Sam has his OBA, smoke test against `https://api.parcel.royalmail.com/sandbox` before flipping to live. One env var swap.
4. **Type-level guarantees** — `CarrierAdapter` and `PrinterAdapter` interfaces + Zod parsing of all RM/Zebra responses catch obvious shape drifts.

---

## Section 16 — Sam-blocking inputs (tracked separately)

Items requiring Sam to act before flipping enabled:

- [ ] Royal Mail Online Business Account (OBA) opened, account number recorded
- [ ] Click & Drop API key generated from OBA portal
- [ ] Click & Drop service codes confirmed (default Tracked 48, override Tracked 24 if Sam wants premium)
- [ ] Return address (Sam's dispatch location) — line 1, 2, city, postcode
- [ ] Return-name on label (likely "Cryogene Laboratories" but confirm)
- [ ] Zebra ZD421d-NW purchased
- [ ] Zebra Cloud Connect subscription active
- [ ] Zebra device fingerprint obtained from Zebra portal after registration
- [ ] Zebra developer API key
- [ ] Royal Mail tracking webhook URL registered with RM (post-deploy step)
- [ ] Confirm batch schedule: 13:00 Mon-Fri Europe/London (default; Sam can change in `/admin/settings`)

Captured in `docs/client-queries-sam.md` for cross-session continuity.

---

## Section 17 — Out-of-scope reservations (typed stubs)

These exist as TypeScript types or enum members but are unimplemented. Implementing them is the relevant retainer/upsell path:

- `Address.country` widened to allow international (Zod gates GB at launch) — upsell 3.4
- `Order.currencyCode` field (always "GBP" at launch) — upsell 3.4
- `OrderLineItem.hsCode`, `customsValueInPence`, `customsDescription` — upsell 3.4
- `Carrier` enum members `sendcloud` and `shippo` — upsell 3.5
- `PrinterAdapter` PrintNode implementation — replaces Zebra if needed
- `ProductVariant.batchNumber` — upsell 4.7 (batch/lot on packing slip)
- `/admin/dispatch/exceptions` page — exists at launch with empty state, populated by upsells 1.5 + reconciliation events

---

## Section 18 — Open questions

None outstanding — design fully scoped. Implementation plan to follow.

---

## Decisions log

- 2026-05-06: Royal Mail Click & Drop chosen as sole live carrier at launch (vs Sendcloud/Shippo). Reason: cheapest UK domestic, native API, Sam already has/can-open OBA in <24h.
- 2026-05-06: Zebra Print Cloud Connect chosen as printer transport (vs PrintNode, browser-print, on-prem print server). Reason: full automation requires cloud transport; Zebra-native avoids third-party vendor; bundled with hardware purchase Sam will make.
- 2026-05-06: Click-to-print abandoned in favour of daily batch. Reason: David clarified target operating model — orders accumulate, single daily print cycle, Sam packs all at once.
- 2026-05-07: Schedule fixed to 13:00 Mon–Fri Europe/London (configurable). Reason: matches Sam's working pattern.
- 2026-05-07: Top-level `OrderStatus` enum unchanged; sub-state derived from `OrderFulfilment` fields. Reason: avoid migration over 9+ files; richer audit events than coarse status changes.
- 2026-05-07: Tracking webhooks captured at launch (not deferred). Reason: data foundation for five Tier 1/2/4 upsells at near-zero marginal cost.
- 2026-05-07: International readiness via type widening + Zod narrowing. Reason: cheapest possible hedge; activation is data + allowlist, not refactor.
- 2026-05-07: Customer-facing tracking timeline rendered at launch. Reason: 30 minutes of UI work, large UX upgrade vs raw RM URL link.
