---
title: Audit Log + Commercial Event Groundwork
date: 2026-05-03
status: draft
phase: Tier 2 (post-launch hardening)
---

# Audit Log + Commercial Event Groundwork

## Goal

Ship two complementary Firestore collections:

1. **`auditLogs`** — append-only evidentiary record for compliance + forensic queries. **In SoW Phase 1.** Defensive control protecting Sam's reputation and regulatory posture.
2. **`customerEvents`** — silent capture of customer behaviour (six event types) to seed future commercial upsells. **Foundation for paid Tier 1/2 upsells; no consumer features ship now.**

The collections are deliberately separate — they have opposite shapes on retention, write path, query pattern, schema, and volume. Conflating them would mis-cost both.

## Non-goals

- No consumer features for `customerEvents` (no recovery emails, no dashboard, no A/B framework). Those are paid upsells per `Upsell-Catalogue.docx`.
- No real-time admin tail, saved presets, annotations, or daily digests for `auditLogs`. Deferred to upsell.
- No hash-chained writer. The `prevHash` field is reserved at launch (always-null) so the future "forensic hardening" upsell is a writer change, not a schema migration.
- No actor-scoped audit queries ("show me everything Sam did Thursday"). Schema supports it; index is dormant.
- No backfill of historical data. Both collections start empty at deploy.

---

## Section 1 — `auditLogs`

### Event types (compliance-minimum, 9)

| Type | Fires when |
|---|---|
| `order.created` | New order written via `createOrderAction` |
| `order.status_changed` | Status mutation in `updateOrderStatus` |
| `order.refunded` | Future refund path (event type reserved; no writer in Tier 2) |
| `product.created` | New product written via `createProductAction` |
| `product.updated` | Product mutation via `updateProductAction` (price, stock, active, content). Note: products are soft-deleted via `active: false`; that mutation flows through `product.updated` and is captured in the diff. |
| `admin.role_granted` | Custom claim `admin: true` set on a user via `set-admin-claim.ts` script wrapper |
| `admin.role_revoked` | Custom claim removed via the same script |
| `customer.erasure_requested` | Forward-compatible with #12 DSAR; event type reserved, no writer in Tier 2 |
| `auth.login_failed_threshold` | Five failed sign-in attempts within 15 min from one IP. **Requires building the failed-attempt counter as part of this Tier 2 work** — see Section 1.4 below. |

Successful logins are explicitly NOT logged (volume + zero evidentiary value).

### Document schema

```ts
type AuditLog = {
  id: string;                          // Firestore auto-id
  createdAt: Timestamp;                // server time; indexed for TTL + filter
  eventType: AuditEventType;           // enum above
  actor: {
    type: "admin" | "customer" | "system" | "anonymous";
    uid: string | null;                // null for anonymous
    email: string | null;              // snapshot at write time
  };
  target: {
    kind: "order" | "product" | "user" | "session" | null;
    id: string | null;
  };
  before: Record<string, unknown> | null;        // changed fields only
  after: Record<string, unknown> | null;         // changed fields only
  snapshotAfter: Record<string, unknown> | null; // full doc; 2KB cap
  metadata: Record<string, unknown>;             // open bag; 2KB cap
  ip: string | null;                             // from x-forwarded-for
  userAgent: string | null;                      // truncated 200 chars
  prevHash: string | null;                       // RESERVED for forensic hardening upsell — always null in Tier 2
};
```

The `prevHash` field is intentionally part of the launch schema. The forensic-hardening upsell becomes a one-line writer change rather than a backfill migration.

### Indexes

- `(eventType ASC, createdAt DESC)` — type filter + chronological feed
- `(target.kind ASC, target.id ASC, createdAt DESC)` — order trail + customer trail
- `(actor.uid ASC, createdAt DESC)` — dormant; activated when actor-scoped audit upsell ships
- TTL field: `createdAt`, lifespan 7 years (HMRC business-record duration)

### Write paths

Two patterns:

**Pattern A — `withAudit(action, eventType)` wrapper.** ~95% of audited paths. Used by every `app/actions/*.ts` server action that mutates state. The wrapper:
1. Reads the session from cookies (actor)
2. Reads the target document state (for `before`/`snapshotAfter`)
3. Runs the wrapped action
4. On success, writes the audit event with full diff

Failures inside the wrapped action propagate normally — no audit event is written for failed mutations (would be misleading). Failures inside the audit write are logged to console and swallowed; the action result is preserved (audit must never break the user's path).

**Pattern B — explicit `writeAuditEvent({...})` calls.** Only used in:
- Auth route handlers (`/api/auth/session`, sign-up, password reset) — these don't go through `withAudit`-wrapped server actions
- The login-failed-threshold path inside `getCustomerSession` / sign-in attempt counter

### Security rules

```
match /auditLogs/{id} {
  allow read: if request.auth != null && request.auth.token.admin == true;
  allow create, update, delete: if false;  // admin SDK only — no client write path
}
```

Admin SDK bypasses rules. All client SDKs (web, future mobile) get hard-deny. This is the "rules-enforced append-only" posture from the brainstorm — no special tamper-resistance machinery, just a denied client surface.

### Admin viewer (`/admin/audit-log`)

| Capability | Implementation |
|---|---|
| Chronological feed | Cursor-paginated 50/page, `startAfter(lastDoc)` |
| Filter by event type | Multi-select; query uses `where("eventType", "in", [...])` |
| Filter by date range | `where("createdAt", ">=" / "<=" )` |
| Drill-down | Row click opens side panel with full doc + before/after rendered as side-by-side JSON diff |
| Order trail | Link from `/admin/orders/[id]` → `/admin/audit-log?target=order:[id]` |
| Customer trail | Link from `/admin/customers/[uid]` → `/admin/audit-log?target=user:[uid]` |
| CSV export | Server action streams paginated query through CSV transform; hard cap 10,000 rows per export to bound memory |

### Retention

Firestore TTL policy on `createdAt` field, 7-year retention. **One-time admin action** to enable in Firebase Console (Firestore → TTL → add policy on `auditLogs.createdAt`). Documented in `docs/handover/deployment-checklist.md` as a Sam-or-David action; not deploy-blocking (TTL only affects deletion of old data, not new writes).

### 1.4 Failed-login counter (new infrastructure required by `auth.login_failed_threshold`)

A small Firestore collection `signInAttempts/` keyed by IP hash (SHA-256 of `x-forwarded-for`) with shape:

```ts
type SignInAttempt = {
  ipHash: string;
  failures: number;
  windowStartedAt: Timestamp;
  lastFailureAt: Timestamp;
};
```

Sign-in route handler logic:
1. On failed sign-in, transactionally increment the counter for the caller's IP hash. If the existing `windowStartedAt` is older than 15 min, reset both `failures` and `windowStartedAt` to the current attempt.
2. After increment, if `failures` ≥ 5 within the 15-min window, emit `auth.login_failed_threshold` audit event (idempotency: only fire once per window — track via a `thresholdFiredAt` field or skip emission if already > 5).
3. On successful sign-in, delete the counter doc for that IP hash.
4. TTL policy on `lastFailureAt`, 24-hour lifespan — counter records auto-expire so the collection doesn't grow unbounded.

Threshold (5 in 15 min) and lockout behaviour (none — we log, we don't block) are conservative defaults. Locking-out is explicitly out of scope for Tier 2; the audit event is enough for now. Sam can review and act manually.

---

## Section 2 — `customerEvents`

### Event types (six)

| Type | Captures |
|---|---|
| `product.viewed` | `productId`, `sku`, `sessionId`, `referrer` |
| `basket.item_added` | `productId`, `sku`, `quantity`, `priceInPence` |
| `basket.item_removed` | `productId`, `sku` |
| `checkout.delivery_submitted` | `email`, `basketSnapshot` (the cart-recovery trigger) |
| `checkout.purchased` | `orderId`, `totalInPence` |
| `auth.signup_completed` | `uid`, `email` |

### Document schema

```ts
type CustomerEvent = {
  id: string;
  createdAt: Timestamp;        // indexed; TTL 24 months
  eventType: CustomerEventType;
  sessionId: string;           // anonymous identifier; survives auth
  uid: string | null;          // populated after sign-in / sign-up / delivery-form submission
  email: string | null;        // populated only after delivery-form submission or sign-up
  payload: Record<string, unknown>; // event-type-specific; capped at 2KB
};
```

`sessionId` propagates from a httpOnly first-party cookie set on first page view (random UUIDv7 — sortable by time). The cookie has 12-month expiry. The same `sessionId` ties together `product.viewed` and `basket.item_added` events from the same user before they identify themselves.

### Indexes

- `(eventType ASC, createdAt DESC)` — for any future per-event-type queries
- `(sessionId ASC, createdAt DESC)` — session reconstruction (cart recovery + funnel walks)
- `(uid ASC, createdAt DESC)` — customer-scoped queries (LTV, cohort)
- `(email ASC, createdAt DESC)` — cart-recovery email lookup
- TTL field: `createdAt`, lifespan 24 months

### Write paths

Single helper: `lib/customer-events.ts → writeCustomerEvent(eventType, payload)`. Called from:

| Caller | Event |
|---|---|
| `app/(public)/peptides/[slug]/page.tsx` (RSC, async) | `product.viewed` |
| `lib/basket.ts` (client store) `addItem` | `basket.item_added` |
| `lib/basket.ts` `removeItem` | `basket.item_removed` |
| `app/actions/checkout.ts → setDeliveryDetails` | `checkout.delivery_submitted` |
| `app/actions/create-order.ts → createOrderAction` (success branch) | `checkout.purchased` |
| `app/api/auth/session/route.ts` (sign-up flow) | `auth.signup_completed` |

Writes are **fire-and-forget** — the helper enqueues the write but does not await it before returning to the caller. A failed customer-events write must NEVER block a customer's flow. Use `Promise.resolve().then(() => write())` pattern with a console.warn on failure.

For `product.viewed` from RSCs, batching at request boundary is fine; the write happens in a `connection()`-deferred section so the static shell isn't gated on the event write.

### Consent gating

Customer events write only when the cookie banner is accepted. The writer reads `cookies().get('cookie_consent')`; if absent or `"declined"`, the call is a no-op. This already aligns with the existing ICO-compliant cookie banner.

`sessionId` is set unconditionally on first visit (it's a strictly-necessary functional cookie for things like checkout-session correlation), but no `customerEvents` writes happen until consent.

### Security rules

```
match /customerEvents/{id} {
  allow read: if request.auth != null && request.auth.token.admin == true;
  allow create, update, delete: if false;  // admin SDK only
}
```

Same posture as `auditLogs`. No customer-side or marketing-side access; future upsells (recovery emails, dashboard) will read via admin SDK in Cloud Functions or server actions.

### Retention

24 months. Long enough for cohort analysis (12-month retention curves with a 12-month look-back) and seasonal patterns. Beyond that, GDPR data minimisation principle says we should delete; if the upsell needs longer windows we can extend by config later.

### Visibility — there is no admin viewer

`customerEvents` writes from launch but Sam never sees these events through the admin UI. The viewer (`/admin/insights`) is the **Funnel + cohort dashboard upsell** (Tier 2.1, ~£2,500). Sam's ability to *see* the data is the paid feature; the data itself is groundwork.

---

## Section 3 — Future paid upsells (referenced from this spec)

See `OneDrive/01 Clients/Sam Cowling - Cryogene Peptide Store/Upsell-Catalogue.docx` for the full catalogue. Specs in this category that build directly on top of this groundwork:

- **3.3 Forensic audit hardening (~£1,500)** — `prevHash` field already in schema; ship the hash-chained writer + verification script + optional external anchoring.
- **1.1 Abandoned-cart recovery (~£1,500)** — reads `checkout.delivery_submitted` events without a matching `checkout.purchased` from the same `sessionId` or `email`; sends 3-email Resend sequence.
- **1.2 Restock notifications (~£800)** — needs new `productSubscriptions` collection; reads `product.viewed` for "people who wanted this" signal.
- **1.3 Welcome / first-order sequence (~£600)** — reads `auth.signup_completed` and `checkout.purchased`.
- **2.1 Funnel + cohort dashboard (~£2,500)** — admin viewer over `customerEvents` with funnel chart, cohort retention table, LTV-by-cohort.
- **2.2 Inventory forecasting (~£1,000)** — reads order history (already exists) + audit log stock changes.
- **3.1 Discount code system (~£1,500)** — net-new; prerequisite for promo-coded recovery emails.
- **3.2 A/B testing framework (~£3,000)** — uses `sessionId` for sticky variant assignment.
- **4.3 Referral / affiliate attribution (~£2,000)** — uses `sessionId` for first-touch UTM capture.

---

## Section 4 — File plan

### New files

- `lib/audit-log.ts` — `writeAuditEvent`, `withAudit` wrapper, types
- `lib/customer-events.ts` — `writeCustomerEvent`, types, sessionId helper
- `lib/sign-in-attempts.ts` — failed-attempt counter helpers
- `app/(admin)/admin/audit-log/page.tsx` — viewer entry
- `app/(admin)/admin/audit-log/components/AuditLogFilters.tsx` — filter controls
- `app/(admin)/admin/audit-log/components/AuditLogRow.tsx` — feed row
- `app/(admin)/admin/audit-log/components/AuditLogDrillDown.tsx` — side panel diff renderer
- `app/(admin)/admin/audit-log/actions.ts` — query + CSV export server actions
- `types/audit.ts` — `AuditLog`, `AuditEventType`, related types
- `types/customer-events.ts` — `CustomerEvent`, `CustomerEventType`

### Modified files

- `firestore.rules` — add `auditLogs` and `customerEvents` collection blocks
- `firestore.indexes.json` — add new composite indexes
- All `app/actions/*.ts` — wrap state-mutating exports with `withAudit`
- `app/api/auth/session/route.ts` — explicit `writeAuditEvent` for auth events + `writeCustomerEvent` for `auth.signup_completed`
- `app/(public)/peptides/[slug]/page.tsx`, `app/(public)/supplies/[slug]/page.tsx`, `app/(public)/mixers/[slug]/page.tsx` — `writeCustomerEvent('product.viewed')`
- `lib/basket.ts` — emit `basket.item_added`/`basket.item_removed`
- `app/actions/checkout.ts` — emit `checkout.delivery_submitted`
- `app/actions/create-order.ts` — emit `checkout.purchased` after successful order
- `app/(admin)/admin/orders/[id]/page.tsx` — add "View audit trail" link
- `app/(admin)/admin/customers/[uid]/page.tsx` — add "View audit trail" link
- `docs/handover/deployment-checklist.md` — TTL policy enable step for both collections

### One-time deploy actions

1. Enable TTL policy on `auditLogs.createdAt` (7 years) — Firebase Console
2. Enable TTL policy on `customerEvents.createdAt` (24 months) — Firebase Console
3. Enable TTL policy on `signInAttempts.lastFailureAt` (24 hours) — Firebase Console
4. Deploy new composite indexes via `firebase deploy --only firestore:indexes`
5. Deploy updated security rules via `firebase deploy --only firestore:rules`

---

## Section 5 — Test gates

No automated test suite per project preference. Manual smoke gates:

1. Create a product as admin → check `/admin/audit-log` shows `product.created` with full snapshot
2. Update product price → check event shows `before`/`after` diff with only price field
3. Place order via stub payment → check `order.created` event with line items snapshot
4. Trigger 5 failed login attempts → check `auth.login_failed_threshold` event fires
5. Browse a product page (with cookie consent) → check `customerEvents` collection has `product.viewed`
6. Decline cookie consent, browse product page → confirm no `customerEvents` written
7. Submit delivery form → check `checkout.delivery_submitted` with email + basket snapshot
8. Complete order → check `checkout.purchased` correlates by `sessionId`
9. Filter `/admin/audit-log` by event type + date range → results match
10. Drill-down on event → diff renders, full snapshot visible
11. CSV export of filtered view → downloads valid CSV, row count matches filter
12. Order trail link on `/admin/orders/[id]` → opens audit log pre-filtered to that order
13. Attempt direct client-SDK write to `auditLogs` (browser console) → permission-denied
14. Attempt direct client-SDK write to `customerEvents` → permission-denied

---

## Open questions / known unknowns

None remaining from brainstorm. All six design calls (scope, viewer features, tamper-resistance, retention, write pattern, schema) locked.

## Out of scope (to be clear)

- Email infrastructure for any recovery / welcome flow (Tier 1 upsell)
- Admin viewer for `customerEvents` (Tier 2.1 upsell)
- Hash-chained writer (Tier 3.3 upsell — `prevHash` field reserved)
- DSAR / erasure plumbing (#12 — separate spec)
- Real-time tail, saved filters, annotations, daily digests for audit log (deferred)

## Estimated scope

- Audit log: ~6-8h (writer + wrapper + viewer + indexes + rules + test gates)
- Failed-login counter: ~45min-1h (sign-in attempts collection, integration, threshold logic)
- Customer events groundwork: ~1.5-2h (writer + sessionId + 6 emitters + indexes + rules)
- **Combined: ~9-11h**, single implementation plan, single PR/branch (`tier2-audit-and-events`)
