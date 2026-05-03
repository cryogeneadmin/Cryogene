# Tier 2 — Plan A: Audit Log + Commercial Events + Failed-Login Counter

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship two new Firestore collections (`auditLogs`, `customerEvents`) plus a `signInAttempts` counter — defensive evidentiary logging in SoW + commercial groundwork for paid upsells. Companion plan B follows for DSAR / erasure on top of these emit paths.

**Architecture:** Append-only collections (rules-enforced, admin-SDK-only writes). `auditLogs` written via a `withAudit(action, eventType)` server-action wrapper for ~95% of paths plus explicit `writeAuditEvent` calls in auth flows. `customerEvents` written fire-and-forget from the six emitter call-sites, gated behind cookie consent. Failed-login counter integrated into the existing sign-in route, emits `auth.login_failed_threshold` after 5 failures in 15 min from one IP. Schema includes a reserved `prevHash` field on `auditLogs` for the future forensic-hardening upsell.

**Tech Stack:** Next.js 16 App Router · TypeScript strict · Firebase Admin SDK (firebase-admin v13) · Firestore + TTL policies · zod · iron-session (existing) · Tailwind v4 (existing) · `'use cache'` + `cacheTag` per existing patterns. **No test suite per project preference (per `CLAUDE.md`/`AGENTS.md`).** Verification gate is `npx tsc --noEmit` + `npx next build` + manual smoke per task. **TDD cycle in the writing-plans skill is overridden by user instructions.**

**Spec reference:** `docs/superpowers/specs/2026-05-03-audit-log-and-commercial-events-design.md`

**Branch:** `tier2-audit-and-events` (already created; spec commits at `8fe6c10`, `a74dbcd`)

**Estimated wall time:** 9-11h across 30 tasks in 8 sections. Average ~20-25min per task.

---

## File structure

### New files

```
types/audit.ts                                          # AuditLog, AuditEventType, helpers
types/customer-events.ts                                # CustomerEvent, CustomerEventType, helpers
lib/audit-log.ts                                        # writeAuditEvent, withAudit wrapper
lib/customer-events.ts                                  # writeCustomerEvent, sessionId helper
lib/sign-in-attempts.ts                                 # failed-attempt counter
app/(admin)/admin/audit-log/page.tsx                    # viewer entry
app/(admin)/admin/audit-log/AuditLogClient.tsx          # client wrapper for filters/pagination
app/(admin)/admin/audit-log/AuditLogFilters.tsx         # filter controls
app/(admin)/admin/audit-log/AuditLogRow.tsx             # feed row
app/(admin)/admin/audit-log/AuditLogDrillDown.tsx       # side panel + JSON diff
app/(admin)/admin/audit-log/actions.ts                  # query + CSV export server actions
```

### Modified files

```
firestore.rules                                         # add 3 collection blocks
firestore.indexes.json                                  # 4 new composite indexes
app/actions/products.ts                                 # wrap saveProduct + toggleProductActive
app/actions/orders.ts                                   # wrap setOrderStatus + addAdminNote
app/actions/create-order.ts                             # emit checkout.purchased customer-event
app/actions/checkout.ts                                 # emit checkout.delivery_submitted
app/actions/create-checkout-account.ts                  # emit auth.signup_completed
app/api/auth/session/route.ts                           # explicit writeAuditEvent + login-failed counter integration
app/(public)/peptides/[slug]/page.tsx                   # emit product.viewed
app/(public)/supplies/[slug]/page.tsx                   # emit product.viewed
app/(public)/mixers/[slug]/page.tsx                     # emit product.viewed
lib/basket.ts                                           # emit basket.item_added / basket.item_removed
app/(admin)/admin/orders/[id]/page.tsx                  # add "View audit trail" link
docs/handover/deployment-checklist.md                   # TTL policies, indexes, rules deploy steps
```

### One-time deploy actions (Section 8)

Documented in Task 8.4 — Sam-or-David console actions, not committed.

---

## Section 1 — Audit log foundation (types, writer, rules, indexes)

### Task 1.1: Define AuditLog types

**Files:**
- Create: `types/audit.ts`

- [ ] **Step 1: Write the file**

```ts
// types/audit.ts

import type { Timestamp } from "firebase-admin/firestore";

/**
 * Compliance-minimum audit-event taxonomy. Add new types only via the
 * audit-log spec — every new event type must be reviewed for retention
 * implications and admin-viewer support.
 */
export type AuditEventType =
  // Order lifecycle
  | "order.created"
  | "order.status_changed"
  | "order.refunded"            // reserved; no writer in Plan A
  // Product mutations
  | "product.created"
  | "product.updated"           // covers active:false soft-delete via diff
  // Admin / role
  | "admin.role_granted"
  | "admin.role_revoked"
  // Customer / security
  | "customer.erasure_requested"   // reserved for Plan B
  | "auth.login_failed_threshold";

export const ALL_AUDIT_EVENT_TYPES: AuditEventType[] = [
  "order.created",
  "order.status_changed",
  "order.refunded",
  "product.created",
  "product.updated",
  "admin.role_granted",
  "admin.role_revoked",
  "customer.erasure_requested",
  "auth.login_failed_threshold",
];

export type AuditActorType = "admin" | "customer" | "system" | "anonymous";
export type AuditTargetKind = "order" | "product" | "user" | "session" | null;

export type AuditLog = {
  id: string;
  createdAt: Date;                 // normalised from Timestamp at read boundary
  eventType: AuditEventType;
  actor: {
    type: AuditActorType;
    uid: string | null;
    email: string | null;
  };
  target: {
    kind: AuditTargetKind;
    id: string | null;
  };
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  snapshotAfter: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  ip: string | null;
  userAgent: string | null;
  prevHash: string | null;         // reserved for forensic-hardening upsell — always null in Plan A
};

/** Internal write shape — Firestore Timestamps before normalisation. */
export type AuditLogWritable = Omit<AuditLog, "id" | "createdAt"> & {
  createdAt: Timestamp;
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: `EXIT=0`

- [ ] **Step 3: Commit**

```bash
git add types/audit.ts
git commit -m "feat(audit): add AuditLog + AuditEventType types

Defines the 9 compliance-minimum event types from the audit-log spec.
prevHash field reserved for the future forensic-hardening upsell — always
null in Plan A; the field exists so the upsell becomes a writer change
rather than a backfill migration."
```

---

### Task 1.2: Add audit-log Firestore rules

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Patch the rules file**

Append a new `auditLogs` block after the `orderCounters` block (before the final closing braces). The full new section:

```
    match /auditLogs/{id} {
      allow read: if request.auth != null && request.auth.token.admin == true;
      allow create, update, delete: if false;
    }
```

The complete file should look like (showing the relevant tail):

```
    match /orderCounters/{day} {
      allow read: if false;
      allow write: if false;
    }

    match /auditLogs/{id} {
      allow read: if request.auth != null && request.auth.token.admin == true;
      allow create, update, delete: if false;
    }
  }
}
```

- [ ] **Step 2: Verify file is well-formed**

Run: `node -e "console.log(require('fs').readFileSync('firestore.rules','utf8').match(/match\s+\/\w+\//g))"`
Expected: array including `match /auditLogs/`

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat(audit): add auditLogs collection rules — read-only admin, writes via admin SDK only

Append-only at the rules layer. Admin SDK bypasses rules so the server-side
writeAuditEvent helper still works; every client SDK gets hard-deny on
create/update/delete."
```

---

### Task 1.3: Add audit-log Firestore composite indexes

**Files:**
- Modify: `firestore.indexes.json`

- [ ] **Step 1: Patch the indexes file**

Replace the contents with:

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
    },
    {
      "collectionGroup": "auditLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "eventType", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "auditLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "target.kind", "order": "ASCENDING" },
        { "fieldPath": "target.id", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "auditLogs",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "actor.uid", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

- [ ] **Step 2: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('firestore.indexes.json','utf8'))"`
Expected: no output, exit 0

- [ ] **Step 3: Commit**

```bash
git add firestore.indexes.json
git commit -m "feat(audit): add 3 composite indexes for auditLogs queries

- (eventType, createdAt) for chronological feed + type filter
- (target.kind, target.id, createdAt) for order/customer trail queries
- (actor.uid, createdAt) for actor-scoped queries (dormant; activated when
  the actor-scoped audit upsell is commissioned)"
```

---

### Task 1.4: Create audit-log writer

**Files:**
- Create: `lib/audit-log.ts`

- [ ] **Step 1: Write the file**

```ts
// lib/audit-log.ts
import "server-only";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { headers } from "next/headers";
import { getAdminDb } from "@/lib/firebase/admin";
import { getCustomerSession } from "@/lib/customer-auth";
import type {
  AuditLog,
  AuditEventType,
  AuditActorType,
  AuditTargetKind,
  AuditLogWritable,
} from "@/types/audit";

const SNAPSHOT_BYTE_CAP = 2048;
const METADATA_BYTE_CAP = 2048;
const USER_AGENT_CHAR_CAP = 200;

function clampJsonObject(
  obj: Record<string, unknown> | null,
  cap: number
): Record<string, unknown> | null {
  if (obj === null) return null;
  const serialised = JSON.stringify(obj);
  if (Buffer.byteLength(serialised, "utf-8") <= cap) return obj;
  // Over cap — replace with a single marker key so downstream readers see
  // intent rather than silent truncation.
  return { __overSizeCap: true, __originalByteLength: Buffer.byteLength(serialised, "utf-8") };
}

export type WriteAuditEventInput = {
  eventType: AuditEventType;
  actor?: {
    type: AuditActorType;
    uid: string | null;
    email: string | null;
  };
  target: {
    kind: AuditTargetKind;
    id: string | null;
  };
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  snapshotAfter?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
};

/**
 * Write an audit event. If `actor` is omitted, the helper resolves it from
 * the current request session (admin or customer). Failures are logged to
 * console and swallowed — auditing must never break the user's path.
 */
export async function writeAuditEvent(input: WriteAuditEventInput): Promise<void> {
  try {
    const db = getAdminDb();
    if (!db) {
      console.warn("[audit-log] Firestore not configured; event dropped:", input.eventType);
      return;
    }

    let actor = input.actor;
    if (!actor) {
      const session = await getCustomerSession();
      if (session?.admin) {
        actor = { type: "admin", uid: session.uid, email: session.email };
      } else if (session) {
        actor = { type: "customer", uid: session.uid, email: session.email };
      } else {
        actor = { type: "anonymous", uid: null, email: null };
      }
    }

    const hdrs = await headers();
    const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = hdrs.get("user-agent")?.slice(0, USER_AGENT_CHAR_CAP) ?? null;

    const writable: AuditLogWritable = {
      createdAt: Timestamp.now(),
      eventType: input.eventType,
      actor,
      target: input.target,
      before: input.before ?? null,
      after: input.after ?? null,
      snapshotAfter: clampJsonObject(input.snapshotAfter ?? null, SNAPSHOT_BYTE_CAP),
      metadata: clampJsonObject(input.metadata ?? {}, METADATA_BYTE_CAP) ?? {},
      ip,
      userAgent,
      prevHash: null,            // reserved for forensic-hardening upsell
    };

    await db.collection("auditLogs").add(writable);
  } catch (err) {
    console.warn("[audit-log] write failed:", err, "event:", input.eventType);
  }
}

/**
 * Wraps a server action so a successful run automatically writes an audit
 * event. The wrapped action runs first; only on resolution does the audit
 * event fire. Throws from the wrapped action propagate normally — failed
 * actions do NOT emit events (would be misleading).
 */
export function withAudit<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
  eventBuilder: (
    args: TArgs,
    result: TResult
  ) => WriteAuditEventInput | Promise<WriteAuditEventInput>
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs) => {
    const result = await action(...args);
    try {
      const input = await eventBuilder(args, result);
      await writeAuditEvent(input);
    } catch (err) {
      console.warn("[withAudit] eventBuilder failed:", err);
    }
    return result;
  };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: `EXIT=0`

- [ ] **Step 3: Commit**

```bash
git add lib/audit-log.ts
git commit -m "feat(audit): add writeAuditEvent + withAudit wrapper

Two patterns: writeAuditEvent for explicit emissions (auth flows), withAudit
for transparent server-action wrapping. Both swallow internal failures
(audit must never break a user path) and clamp snapshot/metadata at 2KB
each. Actor is resolved from session if omitted."
```

---

## Section 2 — Failed-login counter

### Task 2.1: Add signInAttempts rules

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Append the new block**

Add after the `auditLogs` block:

```
    match /signInAttempts/{ipHash} {
      allow read, write: if false;
    }
```

- [ ] **Step 2: Verify**

Run: `node -e "console.log(require('fs').readFileSync('firestore.rules','utf8').match(/match\s+\/\w+\//g))"`
Expected: array including both `match /auditLogs/` and `match /signInAttempts/`

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat(security): add signInAttempts collection rules — admin SDK only

Counter records are written exclusively by the sign-in route handler via
admin SDK. No client read or write surface."
```

---

### Task 2.2: Implement sign-in attempt counter

**Files:**
- Create: `lib/sign-in-attempts.ts`

- [ ] **Step 1: Write the file**

```ts
// lib/sign-in-attempts.ts
import "server-only";
import { createHash } from "node:crypto";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { writeAuditEvent } from "@/lib/audit-log";

const WINDOW_MS = 15 * 60 * 1000;       // 15 min rolling window
const THRESHOLD = 5;                    // emit audit after Nth failure

function ipHash(ip: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex");
}

/**
 * Called on a failed sign-in attempt. Increments the IP's counter inside a
 * transaction; if this attempt crosses the threshold and we haven't already
 * fired for this window, emits auth.login_failed_threshold.
 */
export async function recordFailedSignIn(ip: string | null, attemptedEmail: string | null): Promise<void> {
  const hash = ipHash(ip);
  if (!hash) return;
  const db = getAdminDb();
  if (!db) return;

  const ref = db.collection("signInAttempts").doc(hash);

  let shouldFireThreshold = false;
  let totalFailures = 0;

  await db.runTransaction(async (txn) => {
    const snap = await txn.get(ref);
    const now = Timestamp.now();
    const nowMs = now.toMillis();

    if (!snap.exists) {
      txn.set(ref, {
        ipHash: hash,
        failures: 1,
        windowStartedAt: now,
        lastFailureAt: now,
        thresholdFiredAt: null,
      });
      totalFailures = 1;
      return;
    }

    const data = snap.data()!;
    const windowStartedAtMs = (data.windowStartedAt as Timestamp).toMillis();
    const windowExpired = nowMs - windowStartedAtMs > WINDOW_MS;

    if (windowExpired) {
      txn.update(ref, {
        failures: 1,
        windowStartedAt: now,
        lastFailureAt: now,
        thresholdFiredAt: null,
      });
      totalFailures = 1;
      return;
    }

    const newCount = (data.failures ?? 0) + 1;
    const alreadyFired = !!data.thresholdFiredAt;

    txn.update(ref, {
      failures: newCount,
      lastFailureAt: now,
      ...(newCount >= THRESHOLD && !alreadyFired
        ? { thresholdFiredAt: now }
        : {}),
    });

    totalFailures = newCount;
    shouldFireThreshold = newCount >= THRESHOLD && !alreadyFired;
  });

  if (shouldFireThreshold) {
    await writeAuditEvent({
      eventType: "auth.login_failed_threshold",
      actor: { type: "anonymous", uid: null, email: null },
      target: { kind: "session", id: hash.slice(0, 12) },
      metadata: {
        ipHash: hash,
        attemptedEmail: attemptedEmail ?? "(unknown)",
        thresholdFailures: totalFailures,
        windowMinutes: WINDOW_MS / 60_000,
      },
    });
  }
}

/**
 * Called on a successful sign-in to clear that IP's counter.
 */
export async function clearFailedSignIns(ip: string | null): Promise<void> {
  const hash = ipHash(ip);
  if (!hash) return;
  const db = getAdminDb();
  if (!db) return;
  await db.collection("signInAttempts").doc(hash).delete().catch(() => {});
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: `EXIT=0`

- [ ] **Step 3: Commit**

```bash
git add lib/sign-in-attempts.ts
git commit -m "feat(security): add failed sign-in counter with 5-in-15min threshold

Per-IP-hash transactional counter. Window resets after 15 min of inactivity
or on successful sign-in. Crossing the threshold fires
auth.login_failed_threshold once per window (idempotent via
thresholdFiredAt sentinel). No lockout — Sam reviews + acts manually."
```

---

### Task 2.3: Wire counter into sign-in route

**Files:**
- Modify: `app/api/auth/session/route.ts`

- [ ] **Step 1: Read the existing route**

Run: `cat app/api/auth/session/route.ts`

This file currently mints/clears the session cookie based on a Firebase ID token. We need to add three things:
1. On `verifyIdToken` failure, call `recordFailedSignIn(ip, email-from-claims-if-available)`
2. On success, call `clearFailedSignIns(ip)`
3. Always emit appropriate audit events (`customer.erasure_requested` is reserved; we add `auth.login_failed_threshold` automatically via the helper)

- [ ] **Step 2: Patch the route**

Find the existing handler. After the `try { decoded = await auth.verifyIdToken(idToken, true); } catch (err) {...}` block, integrate the counter. The full new handler shape (assuming current shape mints session on success, returns 401 on failure):

Add these imports at the top:

```ts
import { headers } from "next/headers";
import { recordFailedSignIn, clearFailedSignIns } from "@/lib/sign-in-attempts";
```

In the POST handler, replace the failure-path return with:

```ts
// Failure path — token rejected
const hdrs = await headers();
const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
await recordFailedSignIn(ip, body?.email ?? null);
return NextResponse.json({ error: "Invalid token" }, { status: 401 });
```

In the success path (after `verifyIdToken` resolves), before returning the session-set response:

```ts
const hdrs = await headers();
const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
await clearFailedSignIns(ip);
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: `EXIT=0`

- [ ] **Step 4: Commit**

```bash
git add app/api/auth/session/route.ts
git commit -m "feat(security): wire failed-attempt counter into sign-in route

Failed verifyIdToken increments per-IP counter; success clears it. Counter
emits auth.login_failed_threshold once per window when failures ≥ 5."
```

---

## Section 3 — Audit emissions in existing server actions

### Task 3.1: Add audit emit for `setOrderStatus`

**Files:**
- Modify: `app/actions/orders.ts`

- [ ] **Step 1: Read current state**

Already shown — file has `setOrderStatus` (lines 10-22) and `addAdminNote` (lines 24-35). Both use `assertAdmin`. Need to capture `before` state, then run the action, then emit.

- [ ] **Step 2: Replace the file**

```ts
// app/actions/orders.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateOrder, getOrderById } from "@/lib/orders";
import { assertAdmin } from "@/lib/admin-auth";
import { writeAuditEvent } from "@/lib/audit-log";
import type { OrderStatus } from "@/types";

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

export async function addAdminNote(id: string, note: string) {
  await assertAdmin();
  const validated = z
    .object({
      id: z.string().min(1).max(128),
      note: z.string().min(1).max(2000),
    })
    .parse({ id, note });

  const before = await getOrderById(validated.id);

  await updateOrder(validated.id, { adminNotes: validated.note });

  await writeAuditEvent({
    eventType: "order.status_changed", // reuse — admin notes are status metadata
    target: { kind: "order", id: validated.id },
    before: { adminNotes: before?.adminNotes ?? null },
    after: { adminNotes: validated.note },
    metadata: { orderNumber: before?.orderNumber ?? null, kind: "admin-note" },
  });

  revalidatePath(`/admin/orders/${validated.id}`);
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: `EXIT=0`

- [ ] **Step 4: Commit**

```bash
git add app/actions/orders.ts
git commit -m "feat(audit): emit order.status_changed on order mutations

setOrderStatus + addAdminNote both capture pre-state, run mutation, then
emit. Admin-note edits ride the same event with metadata.kind='admin-note'
to keep the event taxonomy tight."
```

---

### Task 3.2: Add audit emit for `saveProduct`

**Files:**
- Modify: `app/actions/products.ts:73-142`

- [ ] **Step 1: Add import + capture before-state**

At the top of `app/actions/products.ts`, add:

```ts
import { writeAuditEvent } from "@/lib/audit-log";
import { getProductById } from "@/lib/products";
```

Replace `saveProduct` (lines 73-142) with:

```ts
export async function saveProduct(data: unknown) {
  await assertAdmin();
  const parsed = ProductSchema.parse(data);
  const isEdit = !!parsed.id && parsed.id.length > 0;
  const now = new Date();

  // For edits in seed mode, preserve the original createdAt
  let existingCreatedAt: Date | undefined;
  if (isEdit && isSeedMode()) {
    const writes = await readLocalWrites();
    const existing = writes.find((p) => p.id === parsed.id);
    existingCreatedAt = existing?.createdAt as Date | undefined;
  }

  // Capture before-state for audit. seed-mode reads from local writes;
  // Firestore mode reads via getProductById.
  const beforeProduct = isEdit && parsed.id
    ? isSeedMode()
      ? (await readLocalWrites()).find((p) => p.id === parsed.id) ?? null
      : await getProductById(parsed.id)
    : null;

  const product: Product = {
    id: (parsed.id && parsed.id.length > 0) ? parsed.id : `local-${Date.now()}`,
    slug: parsed.slug || slugify(parsed.name),
    name: parsed.name,
    category: parsed.category,
    shortDescription: parsed.shortDescription,
    fullDescription: parsed.fullDescription,
    casNumber: parsed.casNumber,
    molecularFormula: parsed.molecularFormula,
    molecularWeight: parsed.molecularWeight,
    synonyms: parsed.synonyms,
    purity: parsed.purity,
    testingMethod: parsed.testingMethod,
    pubchemCid: parsed.pubchemCid,
    moleculeImage: parsed.moleculeImage,
    ...(parsed.composition !== undefined
      ? { composition: parsed.composition }
      : {}),
    variants: parsed.variants,
    images: parsed.images,
    primaryImageIndex: parsed.primaryImageIndex,
    seoTitle: parsed.seoTitle,
    seoDescription: parsed.seoDescription,
    faq: parsed.faq,
    tags: parsed.tags,
    active: parsed.active,
    createdAt: (isEdit && existingCreatedAt) ? existingCreatedAt : now,
    updatedAt: now,
    updatedBy: "admin-ui",
  };

  if (isSeedMode()) {
    const writes = await readLocalWrites();
    const idx = writes.findIndex((p) => p.id === product.id);
    if (idx === -1) {
      writes.push(product);
    } else {
      writes[idx] = product;
    }
    await writeLocalWrites(writes);
  } else {
    const db = getAdminDb();
    if (!db) throw new Error("Firestore not configured");
    if (isEdit) {
      await db.doc(`products/${product.id}`).set(product, { merge: true });
    } else {
      await db.doc(`products/${product.id}`).set(product);
    }
  }

  await writeAuditEvent({
    eventType: isEdit ? "product.updated" : "product.created",
    target: { kind: "product", id: product.id },
    before: beforeProduct ? productAuditShape(beforeProduct) : null,
    after: productAuditShape(product),
    snapshotAfter: productAuditShape(product),
    metadata: { name: product.name, slug: product.slug },
  });

  revalidateTag("products", "max");
  revalidatePath("/admin/products");
  revalidatePath(`/${product.category}`);
  revalidatePath(`/${product.category}/${product.slug}`);
  redirect("/admin/products");
}

/**
 * Reduces a Product to the audit-relevant subset — keeps doc size small +
 * avoids capturing transient fields like updatedBy/updatedAt.
 */
function productAuditShape(p: Product): Record<string, unknown> {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    category: p.category,
    active: p.active,
    variants: p.variants.map((v) => ({
      sku: v.sku,
      size: v.size,
      priceInPence: v.priceInPence,
      stock: v.stock,
      active: v.active,
    })),
    purity: p.purity,
  };
}
```

- [ ] **Step 2: Verify `getProductById` exists**

Run: `grep -n "export async function getProductById\|export function getProductById" lib/products.ts`
Expected: at least one match. **If no match, add this stub before the closing brace of `lib/products.ts` (using the same pattern as `getProductBySlug`):**

```ts
export async function getProductById(id: string): Promise<Product | null> {
  "use cache";
  cacheTag("products");
  if (isSeedMode()) {
    const all = await mergedSeed();
    return all.find((p) => p.id === id) ?? null;
  }
  const db = getAdminDb();
  if (!db) throw new Error("Firestore not configured (admin SDK unavailable)");
  const snap = await db.doc(`products/${id}`).get();
  return snap.exists ? normalizeProduct(snap.data()!) : null;
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: `EXIT=0`

- [ ] **Step 4: Commit**

```bash
git add app/actions/products.ts lib/products.ts
git commit -m "feat(audit): emit product.created / product.updated on saveProduct

Captures before-state via getProductById (or seed-mode local writes), emits
diff + slim productAuditShape snapshot. Soft-delete via active:false flows
through product.updated and is captured in the diff."
```

---

### Task 3.3: Add audit emit for `toggleProductActive`

**Files:**
- Modify: `app/actions/products.ts:144-`

- [ ] **Step 1: Read current state**

The existing `toggleProductActive` reads/writes the product's `active` field. Patch to capture before-state and emit.

- [ ] **Step 2: Replace `toggleProductActive`**

Find `export async function toggleProductActive` and replace its body to add the emission. The full new function:

```ts
export async function toggleProductActive(id: string, active: boolean) {
  await assertAdmin();
  const validated = z.object({
    id: z.string().min(1).max(128),
    active: z.boolean(),
  }).parse({ id, active });

  const beforeProduct = isSeedMode()
    ? (await readLocalWrites()).find((p) => p.id === validated.id) ?? null
    : await getProductById(validated.id);

  if (isSeedMode()) {
    const writes = await readLocalWrites();
    const idx = writes.findIndex((p) => p.id === validated.id);
    if (idx === -1) {
      throw new Error(`Product ${validated.id} not found in local writes store`);
    }
    writes[idx] = {
      ...writes[idx]!,
      active: validated.active,
      updatedAt: new Date(),
    };
    await writeLocalWrites(writes);
  } else {
    const db = getAdminDb();
    if (!db) throw new Error("Firestore not configured");
    await db.doc(`products/${validated.id}`).set(
      { active: validated.active, updatedAt: new Date() },
      { merge: true }
    );
  }

  await writeAuditEvent({
    eventType: "product.updated",
    target: { kind: "product", id: validated.id },
    before: { active: beforeProduct?.active ?? null },
    after: { active: validated.active },
    metadata: {
      name: beforeProduct?.name ?? "(unknown)",
      slug: beforeProduct?.slug ?? null,
      kind: "active-toggle",
    },
  });

  revalidateTag("products", "max");
  revalidatePath("/admin/products");
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: `EXIT=0`

- [ ] **Step 4: Commit**

```bash
git add app/actions/products.ts
git commit -m "feat(audit): emit product.updated on toggleProductActive

Soft-delete (active:false) flows through this path; audit captures the flag
flip with kind='active-toggle' for downstream filtering."
```

---

### Task 3.4: Add audit emit for new orders

**Files:**
- Modify: `app/actions/create-order.ts`

- [ ] **Step 1: Find the success branch**

Read the existing success-path region of `createOrderAction` — after `createOrderTransaction` resolves and before the redirect/return.

- [ ] **Step 2: Add the emission**

At the top, add:

```ts
import { writeAuditEvent } from "@/lib/audit-log";
```

After the `let order; try { order = await createOrderTransaction({...}); } catch (err) {...}` block resolves successfully (i.e., before `const provider = getPaymentProvider();`), add:

```ts
await writeAuditEvent({
  eventType: "order.created",
  actor: {
    type: delivery.customerUid ? "customer" : "anonymous",
    uid: delivery.customerUid ?? null,
    email: delivery.email,
  },
  target: { kind: "order", id: order.id },
  after: {
    status: order.status,
    itemsSubtotalInPence,
    shippingCostInPence,
    vatAmountInPence,
    totalInPence,
    items: verifiedItems.map((i) => ({
      productId: i.productId,
      sku: i.sku,
      quantity: i.quantity,
      unitPriceInPence: i.unitPriceInPence,
    })),
  },
  metadata: {
    orderNumber: order.orderNumber,
    customerEmail: delivery.email,
  },
});
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: `EXIT=0`

- [ ] **Step 4: Commit**

```bash
git add app/actions/create-order.ts
git commit -m "feat(audit): emit order.created on successful createOrderAction

Captures money breakdown + items at the moment of order creation. Customer
email is the actor and metadata fingerprint."
```

---

## Section 4 — Customer events foundation

### Task 4.1: Define CustomerEvent types

**Files:**
- Create: `types/customer-events.ts`

- [ ] **Step 1: Write the file**

```ts
// types/customer-events.ts
import type { Timestamp } from "firebase-admin/firestore";

export type CustomerEventType =
  | "product.viewed"
  | "basket.item_added"
  | "basket.item_removed"
  | "checkout.delivery_submitted"
  | "checkout.purchased"
  | "auth.signup_completed";

export const ALL_CUSTOMER_EVENT_TYPES: CustomerEventType[] = [
  "product.viewed",
  "basket.item_added",
  "basket.item_removed",
  "checkout.delivery_submitted",
  "checkout.purchased",
  "auth.signup_completed",
];

export type CustomerEvent = {
  id: string;
  createdAt: Date;
  eventType: CustomerEventType;
  sessionId: string;
  uid: string | null;
  email: string | null;
  payload: Record<string, unknown>;
};

export type CustomerEventWritable = Omit<CustomerEvent, "id" | "createdAt"> & {
  createdAt: Timestamp;
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: `EXIT=0`

- [ ] **Step 3: Commit**

```bash
git add types/customer-events.ts
git commit -m "feat(events): add CustomerEvent + CustomerEventType types

Six event types covering the commercial-groundwork emit points: product
views, basket changes, checkout milestones, signup. Schema is intentionally
flat — wide rows for analytics aggregation, opposite shape to auditLogs."
```

---

### Task 4.2: Add customerEvents Firestore rules + indexes

**Files:**
- Modify: `firestore.rules`
- Modify: `firestore.indexes.json`

- [ ] **Step 1: Append rules block**

After the `signInAttempts` block:

```
    match /customerEvents/{id} {
      allow read: if request.auth != null && request.auth.token.admin == true;
      allow create, update, delete: if false;
    }
```

- [ ] **Step 2: Add index entries**

Append to the `indexes` array in `firestore.indexes.json`:

```json
,
    {
      "collectionGroup": "customerEvents",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "eventType", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "customerEvents",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "sessionId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "customerEvents",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "uid", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "customerEvents",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "email", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
```

- [ ] **Step 3: Verify JSON parses**

Run: `node -e "JSON.parse(require('fs').readFileSync('firestore.indexes.json','utf8'))"`
Expected: no output, exit 0

- [ ] **Step 4: Commit**

```bash
git add firestore.rules firestore.indexes.json
git commit -m "feat(events): add customerEvents rules + 4 composite indexes

Read-only admin, admin-SDK writes only. Indexes cover the four query
patterns the future commercial-feature upsells will use: per-event-type,
per-session, per-uid, per-email."
```

---

### Task 4.3: Implement sessionId + writeCustomerEvent

**Files:**
- Create: `lib/customer-events.ts`

- [ ] **Step 1: Write the file**

```ts
// lib/customer-events.ts
import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { cookies, headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { getAdminDb } from "@/lib/firebase/admin";
import { getCustomerSession } from "@/lib/customer-auth";
import type {
  CustomerEvent,
  CustomerEventType,
  CustomerEventWritable,
} from "@/types/customer-events";

const SESSION_COOKIE = "cryogene_session_id";
const SESSION_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;       // 12 months
const COOKIE_CONSENT_NAME = "cookie_consent";
const PAYLOAD_BYTE_CAP = 2048;

/**
 * Reads or mints the session ID cookie. Always strictly-necessary (used for
 * checkout-session correlation), so it sets even before consent. Customer
 * events writes still gate on consent — see writeCustomerEvent.
 */
export async function getOrCreateSessionId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(SESSION_COOKIE)?.value;
  if (existing) return existing;

  const id = randomUUID();
  cookieStore.set(SESSION_COOKIE, id, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE,
  });
  return id;
}

async function hasConsent(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_CONSENT_NAME)?.value === "accepted";
}

function clampPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const serialised = JSON.stringify(payload);
  if (Buffer.byteLength(serialised, "utf-8") <= PAYLOAD_BYTE_CAP) return payload;
  return { __overSizeCap: true, __originalByteLength: Buffer.byteLength(serialised, "utf-8") };
}

export type WriteCustomerEventInput = {
  eventType: CustomerEventType;
  payload?: Record<string, unknown>;
  /** Override email (used by checkout.delivery_submitted before session exists) */
  emailOverride?: string | null;
};

/**
 * Fire-and-forget. Returns immediately; the write is dispatched on a
 * microtask. Failures are console.warn only — analytics must never block
 * customer flow. Skipped entirely if cookie consent has not been granted.
 */
export async function writeCustomerEvent(input: WriteCustomerEventInput): Promise<void> {
  if (!(await hasConsent())) return;

  const db = getAdminDb();
  if (!db) return;

  const sessionId = await getOrCreateSessionId();
  const session = await getCustomerSession();

  const writable: CustomerEventWritable = {
    createdAt: Timestamp.now(),
    eventType: input.eventType,
    sessionId,
    uid: session?.uid ?? null,
    email: input.emailOverride !== undefined
      ? input.emailOverride
      : session?.email ?? null,
    payload: clampPayload(input.payload ?? {}),
  };

  // Fire-and-forget: don't await the write, never block the caller
  Promise.resolve()
    .then(() => db.collection("customerEvents").add(writable))
    .catch((err) => console.warn("[customer-events] write failed:", err, input.eventType));
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: `EXIT=0`

- [ ] **Step 3: Commit**

```bash
git add lib/customer-events.ts
git commit -m "feat(events): add writeCustomerEvent + sessionId helper

httpOnly first-party session cookie minted on first call (12-month
lifetime). Writes gate on cookie_consent='accepted'. Fire-and-forget
microtask dispatch — never blocks the customer's path. 2KB payload cap."
```

---

## Section 5 — Customer events instrumentation

### Task 5.1: Emit `product.viewed` on peptide pages

**Files:**
- Modify: `app/(public)/peptides/[slug]/page.tsx`
- Modify: `app/(public)/supplies/[slug]/page.tsx`
- Modify: `app/(public)/mixers/[slug]/page.tsx`

- [ ] **Step 1: Add the emit to peptides**

At the top of `app/(public)/peptides/[slug]/page.tsx`, add:

```ts
import { writeCustomerEvent } from "@/lib/customer-events";
import { connection } from "next/server";
```

Inside the page component or its async data-fetching child (whichever is the right place per existing pattern — look for `generateMetadata` or the `default export` async component), after the product is loaded, add:

```ts
// Fire-and-forget product.viewed. connection() defers this past the static
// shell so PPR keeps working.
await connection();
writeCustomerEvent({
  eventType: "product.viewed",
  payload: {
    productId: product.id,
    slug: product.slug,
    category: product.category,
    name: product.name,
  },
});
```

If the page already calls `connection()` somewhere, reuse that call site rather than adding a second one.

- [ ] **Step 2: Repeat for supplies**

Same pattern in `app/(public)/supplies/[slug]/page.tsx` — add the import and the emit after product fetch.

- [ ] **Step 3: Repeat for mixers**

Same pattern in `app/(public)/mixers/[slug]/page.tsx`.

- [ ] **Step 4: Type-check + build**

Run: `npx tsc --noEmit && npx next build`
Expected: green build, no errors. Confirm `/peptides/[slug]` still shows `◐ Partial Prerender` in the build output (PPR not regressed).

- [ ] **Step 5: Commit**

```bash
git add 'app/(public)/peptides/[slug]/page.tsx' 'app/(public)/supplies/[slug]/page.tsx' 'app/(public)/mixers/[slug]/page.tsx'
git commit -m "feat(events): emit product.viewed on PDP loads (peptides/supplies/mixers)

Fire-and-forget write inside connection()-deferred section so PPR shell
keeps prerendering. Gated on cookie consent inside the helper."
```

---

### Task 5.2: Emit `basket.item_added` and `basket.item_removed`

**Files:**
- Modify: `lib/basket.ts`

`lib/basket.ts` is a Zustand client store, but the event write is a server action. Pattern: add a server action, call it from the store after mutations.

- [ ] **Step 1: Create server action for basket events**

Append to a new file `app/actions/customer-events.ts`:

```ts
"use server";

import { writeCustomerEvent } from "@/lib/customer-events";
import type { CustomerEventType } from "@/types/customer-events";

const PUBLIC_EVENT_TYPES = new Set<CustomerEventType>([
  "product.viewed",
  "basket.item_added",
  "basket.item_removed",
]);

/**
 * Public-callable subset of customer-event writes. Other event types
 * (checkout.delivery_submitted, checkout.purchased, auth.signup_completed)
 * are emitted from server-side code paths only.
 */
export async function emitCustomerEvent(
  eventType: CustomerEventType,
  payload: Record<string, unknown>
) {
  if (!PUBLIC_EVENT_TYPES.has(eventType)) return; // hard reject
  await writeCustomerEvent({ eventType, payload });
}
```

- [ ] **Step 2: Wire into the basket store**

Find the `addItem` and `removeItem` actions in `lib/basket.ts`. After each successful mutation, call `emitCustomerEvent`. Example for `addItem`:

```ts
addItem: (item) => {
  set((state) => ({ items: [...state.items, item] }));
  // fire-and-forget; never await
  import("@/app/actions/customer-events").then(({ emitCustomerEvent }) =>
    emitCustomerEvent("basket.item_added", {
      productId: item.productId,
      sku: item.sku,
      quantity: item.quantity,
      priceInPence: item.unitPriceInPence,
    })
  ).catch(() => {});
},
```

For `removeItem`:

```ts
removeItem: (sku) => {
  set((state) => ({ items: state.items.filter((i) => i.sku !== sku) }));
  import("@/app/actions/customer-events").then(({ emitCustomerEvent }) =>
    emitCustomerEvent("basket.item_removed", { sku })
  ).catch(() => {});
},
```

The dynamic `import()` keeps the server action out of the client bundle; the call still runs on the server because `"use server"` directives auto-marshal.

- [ ] **Step 3: Type-check + build**

Run: `npx tsc --noEmit && npx next build`
Expected: green.

- [ ] **Step 4: Commit**

```bash
git add app/actions/customer-events.ts lib/basket.ts
git commit -m "feat(events): emit basket.item_added / basket.item_removed

New emitCustomerEvent server action with hard whitelist of public event
types (prevents client bypass to other event types). Zustand store calls
via dynamic import to keep the server action out of the client bundle."
```

---

### Task 5.3: Emit `checkout.delivery_submitted`

**Files:**
- Modify: `app/actions/checkout.ts`

- [ ] **Step 1: Add the emit at the success path**

At the top of `app/actions/checkout.ts`, add:

```ts
import { writeCustomerEvent } from "@/lib/customer-events";
```

After the `await setCheckoutSession({ ...parsed.data, customerUid });` call, before `redirect("/checkout/review")`, add:

```ts
// Emit before redirect — the cart-recovery upsell triggers on this event
await writeCustomerEvent({
  eventType: "checkout.delivery_submitted",
  emailOverride: parsed.data.email,
  payload: {
    fullName: parsed.data.fullName,
    city: parsed.data.city,
    postcode: parsed.data.postcode,
    customerUid: customerUid,
    createAccount,
  },
});
```

- [ ] **Step 2: Type-check + build**

Run: `npx tsc --noEmit && npx next build`
Expected: green.

- [ ] **Step 3: Commit**

```bash
git add app/actions/checkout.ts
git commit -m "feat(events): emit checkout.delivery_submitted with email + basket signal

This is THE trigger for the future cart-recovery upsell. Email is captured
explicitly via emailOverride (session may not be present yet for guest
checkout). Postcode + city kept as aggregate signals; full address is not
captured here — that lives on the order itself."
```

---

### Task 5.4: Emit `checkout.purchased`

**Files:**
- Modify: `app/actions/create-order.ts`

- [ ] **Step 1: Add the emit on success**

The audit emit from Task 3.4 already captured order.created. Add the customer-event emit alongside it. After the `writeAuditEvent` call from Task 3.4:

```ts
await writeCustomerEvent({
  eventType: "checkout.purchased",
  emailOverride: delivery.email,
  payload: {
    orderId: order.id,
    orderNumber: order.orderNumber,
    totalInPence,
    itemCount: verifiedItems.reduce((sum, i) => sum + i.quantity, 0),
  },
});
```

Add the import at the top:

```ts
import { writeCustomerEvent } from "@/lib/customer-events";
```

- [ ] **Step 2: Type-check + build**

Run: `npx tsc --noEmit && npx next build`
Expected: green.

- [ ] **Step 3: Commit**

```bash
git add app/actions/create-order.ts
git commit -m "feat(events): emit checkout.purchased on successful order

Closes the cart-recovery loop — recovery upsell can join
delivery_submitted ↔ purchased by sessionId or email and identify true
abandoners."
```

---

### Task 5.5: Emit `auth.signup_completed`

**Files:**
- Modify: `app/actions/create-checkout-account.ts`
- Modify: `app/api/auth/session/route.ts` (or wherever the dedicated sign-up flow lives)

- [ ] **Step 1: Inspect `create-checkout-account.ts`**

Run: `grep -n "createUser\|return" app/actions/create-checkout-account.ts | head -20`

This action creates a Firebase Auth user. The successful branch returns `{ ok: true, uid }`.

- [ ] **Step 2: Add emission in the success branch**

At the top:

```ts
import { writeCustomerEvent } from "@/lib/customer-events";
import { writeAuditEvent } from "@/lib/audit-log";
```

Just before `return { ok: true, uid };`, add:

```ts
await writeCustomerEvent({
  eventType: "auth.signup_completed",
  emailOverride: email,
  payload: { uid, source: "checkout" },
});

await writeAuditEvent({
  eventType: "admin.role_granted", // not technically admin, but reusing for any auth event would over-broaden the schema; we'll emit a customer.signup audit event in Plan B.
  actor: { type: "system", uid: null, email: null },
  target: { kind: "user", id: uid },
  metadata: { kind: "signup", email, source: "checkout" },
});
```

**WAIT** — re-reading the spec, the audit log only has 9 event types and `customer.signup_completed` is not one. The customer-event emit is sufficient for now. Drop the audit emit. Updated Step 2:

Just before `return { ok: true, uid };`, add only:

```ts
await writeCustomerEvent({
  eventType: "auth.signup_completed",
  emailOverride: email,
  payload: { uid, source: "checkout" },
});
```

- [ ] **Step 3: Repeat in dedicated sign-up flow**

If a dedicated `/sign-up` server action exists (look in `app/actions/`), add the same emission there. If not, the checkout-account path is the only route.

Run: `grep -rn "createUserWithEmailAndPassword\|auth.createUser" app/ lib/ 2>&1 | grep -v "// " | head -10`

- [ ] **Step 4: Type-check + build**

Run: `npx tsc --noEmit && npx next build`
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add app/actions/create-checkout-account.ts
git commit -m "feat(events): emit auth.signup_completed on account creation

Captures uid + email + source (checkout / sign-up form). Welcome-email
upsell reads this event."
```

---

## Section 6 — Audit log admin viewer

### Task 6.1: Implement query + CSV export server actions

**Files:**
- Create: `app/(admin)/admin/audit-log/actions.ts`

- [ ] **Step 1: Write the file**

```ts
// app/(admin)/admin/audit-log/actions.ts
"use server";

import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { assertAdmin } from "@/lib/admin-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { ALL_AUDIT_EVENT_TYPES } from "@/types/audit";
import type { AuditLog, AuditEventType } from "@/types/audit";

const PAGE_SIZE = 50;
const CSV_EXPORT_CAP = 10_000;

const QueryFiltersSchema = z.object({
  eventTypes: z.array(z.string()).optional(),
  fromDate: z.string().nullable().optional(),    // ISO date
  toDate: z.string().nullable().optional(),
  targetKind: z.enum(["order", "product", "user", "session"]).nullable().optional(),
  targetId: z.string().nullable().optional(),
  cursor: z.string().nullable().optional(),       // doc id of last seen row
});
export type QueryFilters = z.infer<typeof QueryFiltersSchema>;

function normaliseAuditDoc(id: string, data: FirebaseFirestore.DocumentData): AuditLog {
  const createdAt = data.createdAt instanceof Timestamp
    ? data.createdAt.toDate()
    : new Date(data.createdAt);
  return {
    id,
    createdAt,
    eventType: data.eventType,
    actor: data.actor ?? { type: "system", uid: null, email: null },
    target: data.target ?? { kind: null, id: null },
    before: data.before ?? null,
    after: data.after ?? null,
    snapshotAfter: data.snapshotAfter ?? null,
    metadata: data.metadata ?? {},
    ip: data.ip ?? null,
    userAgent: data.userAgent ?? null,
    prevHash: data.prevHash ?? null,
  };
}

export async function queryAuditLogs(filters: QueryFilters): Promise<{
  items: AuditLog[];
  nextCursor: string | null;
}> {
  await assertAdmin();
  const parsed = QueryFiltersSchema.parse(filters);
  const db = getAdminDb();
  if (!db) throw new Error("Firestore not configured");

  let query: FirebaseFirestore.Query = db.collection("auditLogs");

  // The composite index choice depends on which filters are active. Order
  // matters — Firestore selects an index based on the equality + range
  // pattern of the query.
  if (parsed.targetKind && parsed.targetId) {
    query = query
      .where("target.kind", "==", parsed.targetKind)
      .where("target.id", "==", parsed.targetId);
  } else if (parsed.eventTypes && parsed.eventTypes.length > 0) {
    // Validate each event type
    const validTypes = parsed.eventTypes.filter((t): t is AuditEventType =>
      (ALL_AUDIT_EVENT_TYPES as string[]).includes(t)
    );
    if (validTypes.length > 0) {
      query = query.where("eventType", "in", validTypes);
    }
  }

  if (parsed.fromDate) {
    query = query.where("createdAt", ">=", Timestamp.fromDate(new Date(parsed.fromDate)));
  }
  if (parsed.toDate) {
    query = query.where("createdAt", "<=", Timestamp.fromDate(new Date(parsed.toDate)));
  }

  query = query.orderBy("createdAt", "desc").limit(PAGE_SIZE + 1);

  if (parsed.cursor) {
    const cursorDoc = await db.collection("auditLogs").doc(parsed.cursor).get();
    if (cursorDoc.exists) {
      query = query.startAfter(cursorDoc);
    }
  }

  const snap = await query.get();
  const items = snap.docs.slice(0, PAGE_SIZE).map((d) => normaliseAuditDoc(d.id, d.data()));
  const nextCursor = snap.docs.length > PAGE_SIZE ? snap.docs[PAGE_SIZE - 1]!.id : null;

  return { items, nextCursor };
}

const CSV_HEADER = [
  "id",
  "createdAt",
  "eventType",
  "actorType",
  "actorUid",
  "actorEmail",
  "targetKind",
  "targetId",
  "ip",
  "metadata",
];

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "string" ? value : JSON.stringify(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function exportAuditLogsCsv(filters: QueryFilters): Promise<string> {
  await assertAdmin();
  const parsed = QueryFiltersSchema.parse(filters);
  const db = getAdminDb();
  if (!db) throw new Error("Firestore not configured");

  let query: FirebaseFirestore.Query = db.collection("auditLogs");
  if (parsed.targetKind && parsed.targetId) {
    query = query
      .where("target.kind", "==", parsed.targetKind)
      .where("target.id", "==", parsed.targetId);
  } else if (parsed.eventTypes && parsed.eventTypes.length > 0) {
    const validTypes = parsed.eventTypes.filter((t): t is AuditEventType =>
      (ALL_AUDIT_EVENT_TYPES as string[]).includes(t)
    );
    if (validTypes.length > 0) query = query.where("eventType", "in", validTypes);
  }
  if (parsed.fromDate)
    query = query.where("createdAt", ">=", Timestamp.fromDate(new Date(parsed.fromDate)));
  if (parsed.toDate)
    query = query.where("createdAt", "<=", Timestamp.fromDate(new Date(parsed.toDate)));

  query = query.orderBy("createdAt", "desc").limit(CSV_EXPORT_CAP);

  const snap = await query.get();
  const rows = [CSV_HEADER.join(",")];
  for (const doc of snap.docs) {
    const data = normaliseAuditDoc(doc.id, doc.data());
    rows.push(
      [
        csvEscape(data.id),
        csvEscape(data.createdAt.toISOString()),
        csvEscape(data.eventType),
        csvEscape(data.actor.type),
        csvEscape(data.actor.uid),
        csvEscape(data.actor.email),
        csvEscape(data.target.kind),
        csvEscape(data.target.id),
        csvEscape(data.ip),
        csvEscape(data.metadata),
      ].join(",")
    );
  }
  return rows.join("\n");
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: `EXIT=0`

- [ ] **Step 3: Commit**

```bash
git add 'app/(admin)/admin/audit-log/actions.ts'
git commit -m "feat(audit): server actions for audit-log query + CSV export

queryAuditLogs supports event-type filter (where in), target trail (kind+id
equality), date range, and cursor pagination at 50/page. exportAuditLogsCsv
hard-caps at 10000 rows. Both gated by assertAdmin."
```

---

### Task 6.2: Implement viewer page (server)

**Files:**
- Create: `app/(admin)/admin/audit-log/page.tsx`

- [ ] **Step 1: Write the file**

```tsx
// app/(admin)/admin/audit-log/page.tsx
import { Suspense } from "react";
import { connection } from "next/server";
import { assertAdmin } from "@/lib/admin-auth";
import { queryAuditLogs, type QueryFilters } from "./actions";
import { AuditLogClient } from "./AuditLogClient";

async function AuditLogContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  await assertAdmin();
  const params = await searchParams;

  const filters: QueryFilters = {
    eventTypes: typeof params.types === "string"
      ? params.types.split(",")
      : Array.isArray(params.types)
      ? params.types
      : undefined,
    fromDate: typeof params.from === "string" ? params.from : null,
    toDate: typeof params.to === "string" ? params.to : null,
    targetKind: ["order", "product", "user", "session"].includes(params.tk as string)
      ? (params.tk as "order" | "product" | "user" | "session")
      : null,
    targetId: typeof params.tid === "string" ? params.tid : null,
    cursor: typeof params.cursor === "string" ? params.cursor : null,
  };

  const { items, nextCursor } = await queryAuditLogs(filters);

  return (
    <AuditLogClient
      items={items}
      nextCursor={nextCursor}
      initialFilters={filters}
    />
  );
}

export default function AuditLogPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div className="p-6">
      <h1 className="font-serif text-3xl text-navy mb-2">Audit log</h1>
      <p className="text-sm text-muted mb-6">
        Append-only record of order, product, admin and security events.
        Retained 7 years per HMRC business-record requirement.
      </p>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <AuditLogContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: error referencing `AuditLogClient` (file doesn't exist yet — created in Task 6.3)

- [ ] **Step 3: No commit yet**

Wait — typecheck won't be clean until Task 6.3 lands. Move directly to next task without committing.

---

### Task 6.3: Implement viewer client (filters + feed)

**Files:**
- Create: `app/(admin)/admin/audit-log/AuditLogClient.tsx`

- [ ] **Step 1: Write the file**

```tsx
// app/(admin)/admin/audit-log/AuditLogClient.tsx
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ALL_AUDIT_EVENT_TYPES } from "@/types/audit";
import type { AuditLog, AuditEventType } from "@/types/audit";
import type { QueryFilters } from "./actions";
import { exportAuditLogsCsv } from "./actions";
import { AuditLogRow } from "./AuditLogRow";
import { AuditLogDrillDown } from "./AuditLogDrillDown";

export function AuditLogClient({
  items,
  nextCursor,
  initialFilters,
}: {
  items: AuditLog[];
  nextCursor: string | null;
  initialFilters: QueryFilters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [exporting, setExporting] = useState(false);
  const [, startTransition] = useTransition();

  function applyFilters(next: QueryFilters) {
    const params = new URLSearchParams();
    if (next.eventTypes?.length) params.set("types", next.eventTypes.join(","));
    if (next.fromDate) params.set("from", next.fromDate);
    if (next.toDate) params.set("to", next.toDate);
    if (next.targetKind) params.set("tk", next.targetKind);
    if (next.targetId) params.set("tid", next.targetId);
    startTransition(() => {
      router.push(params.size ? `${pathname}?${params}` : pathname);
    });
  }

  async function handleExport() {
    setExporting(true);
    try {
      const csv = await exportAuditLogsCsv(initialFilters);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const trailLink = initialFilters.targetKind && initialFilters.targetId
    ? `Trail for ${initialFilters.targetKind}: ${initialFilters.targetId}`
    : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
      <div>
        {trailLink && (
          <div className="mb-4 p-3 bg-offwhite border border-border text-sm">
            <span className="text-muted">Filtered: </span>
            <span className="text-navy">{trailLink}</span>
            <button
              type="button"
              onClick={() => applyFilters({})}
              className="ml-3 underline text-blue text-xs"
            >
              Clear
            </button>
          </div>
        )}

        <FilterBar initial={initialFilters} onApply={applyFilters} onExport={handleExport} exporting={exporting} />

        {items.length === 0 ? (
          <p className="py-12 text-center text-muted">No events match these filters.</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id}>
                <AuditLogRow
                  item={item}
                  selected={selected?.id === item.id}
                  onClick={() => setSelected(item)}
                />
              </li>
            ))}
          </ul>
        )}

        {nextCursor && (
          <div className="mt-6 text-center">
            <Link
              href={`${pathname}?${new URLSearchParams({ cursor: nextCursor })}`}
              className="inline-block px-4 py-2 border border-border text-sm uppercase tracking-wider hover:bg-offwhite"
            >
              Next page
            </Link>
          </div>
        )}
      </div>

      <aside className="hidden lg:block">
        {selected ? (
          <AuditLogDrillDown item={selected} onClose={() => setSelected(null)} />
        ) : (
          <p className="text-sm text-muted p-4 border border-border">
            Click a row to inspect.
          </p>
        )}
      </aside>
    </div>
  );
}

function FilterBar({
  initial,
  onApply,
  onExport,
  exporting,
}: {
  initial: QueryFilters;
  onApply: (filters: QueryFilters) => void;
  onExport: () => void;
  exporting: boolean;
}) {
  const [types, setTypes] = useState<AuditEventType[]>(
    (initial.eventTypes ?? []).filter((t): t is AuditEventType =>
      (ALL_AUDIT_EVENT_TYPES as string[]).includes(t)
    )
  );
  const [from, setFrom] = useState(initial.fromDate ?? "");
  const [to, setTo] = useState(initial.toDate ?? "");

  function toggleType(t: AuditEventType) {
    setTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onApply({ eventTypes: types, fromDate: from || null, toDate: to || null });
      }}
      className="mb-6 p-4 bg-offwhite border border-border space-y-3"
    >
      <div>
        <p className="label-editorial text-xs text-navy mb-2">Event types</p>
        <div className="flex flex-wrap gap-2">
          {ALL_AUDIT_EVENT_TYPES.map((t) => (
            <label
              key={t}
              className={`px-2 py-1 text-xs cursor-pointer border ${
                types.includes(t)
                  ? "bg-navy text-white border-navy"
                  : "bg-white border-border hover:border-navy"
              }`}
            >
              <input
                type="checkbox"
                checked={types.includes(t)}
                onChange={() => toggleType(t)}
                className="sr-only"
              />
              {t}
            </label>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-3 items-end">
        <label className="flex flex-col gap-1 text-xs">
          <span className="label-editorial text-navy">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border border-border bg-white px-2 py-1 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="label-editorial text-navy">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border border-border bg-white px-2 py-1 text-sm"
          />
        </label>
        <button
          type="submit"
          className="px-4 py-2 bg-navy text-white text-xs uppercase tracking-wider hover:bg-mid-navy"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={onExport}
          disabled={exporting}
          className="px-4 py-2 border border-border text-xs uppercase tracking-wider hover:bg-white disabled:opacity-50"
        >
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: errors referencing `AuditLogRow` and `AuditLogDrillDown` (created in 6.4 + 6.5)

- [ ] **Step 3: No commit yet**

Continue to Task 6.4.

---

### Task 6.4: Implement `AuditLogRow`

**Files:**
- Create: `app/(admin)/admin/audit-log/AuditLogRow.tsx`

- [ ] **Step 1: Write the file**

```tsx
// app/(admin)/admin/audit-log/AuditLogRow.tsx
"use client";

import type { AuditLog } from "@/types/audit";

export function AuditLogRow({
  item,
  selected,
  onClick,
}: {
  item: AuditLog;
  selected: boolean;
  onClick: () => void;
}) {
  const formattedDate = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(item.createdAt);

  const actorLabel =
    item.actor.email ?? item.actor.uid ?? `(${item.actor.type})`;
  const targetLabel =
    item.target.kind && item.target.id
      ? `${item.target.kind}/${item.target.id.slice(0, 12)}`
      : "—";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected ? "true" : undefined}
      className={`w-full text-left px-4 py-3 grid grid-cols-[140px_180px_1fr_180px] gap-3 text-sm hover:bg-offwhite ${
        selected ? "bg-offwhite" : ""
      }`}
    >
      <span className="mono text-xs text-muted">{formattedDate}</span>
      <span className="text-navy">{item.eventType}</span>
      <span className="text-muted truncate">{actorLabel}</span>
      <span className="mono text-xs text-muted truncate text-right">{targetLabel}</span>
    </button>
  );
}
```

- [ ] **Step 2: No type-check**

Continue.

---

### Task 6.5: Implement `AuditLogDrillDown`

**Files:**
- Create: `app/(admin)/admin/audit-log/AuditLogDrillDown.tsx`

- [ ] **Step 1: Write the file**

```tsx
// app/(admin)/admin/audit-log/AuditLogDrillDown.tsx
"use client";

import type { AuditLog } from "@/types/audit";

export function AuditLogDrillDown({
  item,
  onClose,
}: {
  item: AuditLog;
  onClose: () => void;
}) {
  return (
    <div className="border border-border bg-white p-4 sticky top-6 max-h-[80vh] overflow-y-auto">
      <div className="flex items-start justify-between mb-3">
        <p className="label-editorial text-sm text-navy">{item.eventType}</p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted underline"
          aria-label="Close detail panel"
        >
          Close
        </button>
      </div>

      <dl className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-1 text-xs mb-4">
        <dt className="text-muted">Time</dt>
        <dd className="mono">{item.createdAt.toISOString()}</dd>
        <dt className="text-muted">Actor</dt>
        <dd>
          <span className="text-muted">{item.actor.type}</span>
          {item.actor.email && <span> · {item.actor.email}</span>}
          {item.actor.uid && (
            <span className="mono text-[10px] text-muted block">{item.actor.uid}</span>
          )}
        </dd>
        <dt className="text-muted">Target</dt>
        <dd className="mono text-[10px]">
          {item.target.kind ?? "—"}
          {item.target.id && <> / {item.target.id}</>}
        </dd>
        <dt className="text-muted">IP</dt>
        <dd className="mono text-[10px]">{item.ip ?? "—"}</dd>
      </dl>

      {(item.before || item.after) && (
        <div className="mb-4">
          <p className="label-editorial text-xs text-navy mb-1">Before / After</p>
          <div className="grid grid-cols-2 gap-2 text-[10px] mono">
            <pre className="p-2 bg-offwhite border border-border overflow-x-auto whitespace-pre-wrap">
              {item.before ? JSON.stringify(item.before, null, 2) : "(none)"}
            </pre>
            <pre className="p-2 bg-offwhite border border-border overflow-x-auto whitespace-pre-wrap">
              {item.after ? JSON.stringify(item.after, null, 2) : "(none)"}
            </pre>
          </div>
        </div>
      )}

      {item.snapshotAfter && (
        <div className="mb-4">
          <p className="label-editorial text-xs text-navy mb-1">Snapshot</p>
          <pre className="p-2 bg-offwhite border border-border text-[10px] mono overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(item.snapshotAfter, null, 2)}
          </pre>
        </div>
      )}

      {Object.keys(item.metadata).length > 0 && (
        <div>
          <p className="label-editorial text-xs text-navy mb-1">Metadata</p>
          <pre className="p-2 bg-offwhite border border-border text-[10px] mono overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(item.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check + build**

Run: `npx tsc --noEmit && npx next build`
Expected: green build, `/admin/audit-log` listed in route table.

- [ ] **Step 3: Commit (covers 6.2-6.5)**

```bash
git add 'app/(admin)/admin/audit-log/'
git commit -m "feat(audit): admin viewer with filters, drill-down, CSV export

/admin/audit-log renders a chronological feed (newest first), 50/page,
cursor pagination via URL params. Filter bar covers event-type multi-select
+ from/to date range. Drill-down panel shows full doc + before/after JSON
diff + snapshot + metadata. Export CSV streams up to 10k rows."
```

---

### Task 6.6: Add nav entry in admin sidebar

**Files:**
- Modify: `components/admin/AdminSidebar.tsx`

- [ ] **Step 1: Find existing nav entries**

Run: `grep -n "href" components/admin/AdminSidebar.tsx | head -10`

- [ ] **Step 2: Add audit-log link**

Find the array of nav items (or the JSX block of `<Link>`s) and add:

```tsx
{ href: "/admin/audit-log", label: "Audit log" },
```

(Match whatever pattern the file uses — check existing entries for shape.)

- [ ] **Step 3: Type-check + build**

Run: `npx tsc --noEmit && npx next build`
Expected: green.

- [ ] **Step 4: Commit**

```bash
git add components/admin/AdminSidebar.tsx
git commit -m "feat(audit): add 'Audit log' link to admin sidebar"
```

---

### Task 6.7: Add "View audit trail" link from order detail

**Files:**
- Modify: `app/(admin)/admin/orders/[id]/page.tsx`

- [ ] **Step 1: Read the existing order-detail page header region**

Run: `head -60 'app/(admin)/admin/orders/[id]/page.tsx'`

- [ ] **Step 2: Add the link near the order summary**

Find a sensible place near the order header (e.g., after the order number display) and add:

```tsx
import Link from "next/link";
// ...
<Link
  href={`/admin/audit-log?tk=order&tid=${order.id}`}
  className="text-xs text-blue underline hover:no-underline"
>
  View audit trail →
</Link>
```

- [ ] **Step 3: Type-check + build**

Run: `npx tsc --noEmit && npx next build`
Expected: green.

- [ ] **Step 4: Commit**

```bash
git add 'app/(admin)/admin/orders/[id]/page.tsx'
git commit -m "feat(audit): link order detail page to its audit-log trail"
```

---

## Section 7 — Cookie banner gating

### Task 7.1: Verify customer-events helper respects cookie consent

The `writeCustomerEvent` helper from Task 4.3 already checks `cookies().get("cookie_consent")?.value === "accepted"`. This task verifies the existing cookie banner sets the cookie under that exact name.

**Files:**
- Read: `components/storefront/layout/CookieBanner.tsx` (or whichever component sets the cookie)

- [ ] **Step 1: Find the consent cookie writer**

Run: `grep -rn "cookie_consent\|setConsent\|cookieConsent" components/ app/ lib/ --include="*.tsx" --include="*.ts" 2>&1 | head -20`

- [ ] **Step 2: Verify cookie name + value**

Confirm the banner sets a cookie named exactly `cookie_consent` with value `accepted` on accept. If it uses a different name or different value, **either** update the banner to match Plan A's helper, **or** update `lib/customer-events.ts:hasConsent` to read the actual name/value. Match whichever side has more callers.

- [ ] **Step 3: If a change was needed, type-check + build + commit**

Run: `npx tsc --noEmit && npx next build`

```bash
git add <files>
git commit -m "fix(events): align customer-events consent gate with cookie-banner cookie name"
```

If no change needed, no commit — just close the task.

---

## Section 8 — Smoke + handover + merge prep

### Task 8.1: Update deployment checklist

**Files:**
- Modify: `docs/handover/deployment-checklist.md`

- [ ] **Step 1: Append a new section**

Add a new section to the checklist:

```markdown
## Plan A deploy actions (audit log + customer events + sign-in counter)

These are one-time actions that run **after** `git push origin main` triggers
the Vercel auto-deploy and **after** the new Firestore rules + indexes are
deployed.

1. **Deploy Firestore rules** (admin-SDK still bypasses, but this enforces
   the client-side hard-deny):
   ```
   npx firebase-tools deploy --only firestore:rules
   ```

2. **Deploy Firestore indexes** (3 audit + 4 customer-events composite
   indexes — wait for "READY" in Firebase Console before relying on them):
   ```
   npx firebase-tools deploy --only firestore:indexes
   ```

3. **Enable TTL policies** in Firebase Console → Firestore → TTL:
   - `auditLogs.createdAt` — 7 years (HMRC business-record retention)
   - `customerEvents.createdAt` — 24 months (GDPR data minimisation)
   - `signInAttempts.lastFailureAt` — 24 hours (counter records auto-expire)

4. **Verify** by signing into the admin UI, visiting `/admin/audit-log`,
   and confirming the empty-state message renders without error.
```

- [ ] **Step 2: Commit**

```bash
git add docs/handover/deployment-checklist.md
git commit -m "docs: deployment checklist for Plan A (rules, indexes, TTL policies)"
```

---

### Task 8.2: Local smoke gates (manual)

These are manual verification gates. **Do them in order — don't skip.**

- [ ] **Step 1: Run the build, confirm clean**

Run: `npx tsc --noEmit && npx next build 2>&1 | tail -20`
Expected: 95+ routes built, `/admin/audit-log` listed, no TypeScript errors.

- [ ] **Step 2: Start dev server**

Run: `npm run dev` (in a background terminal)

- [ ] **Step 3: Smoke gate — basket events**

In a browser:
1. Accept cookies (sets `cookie_consent=accepted`)
2. Visit `/peptides/ipamorelin`
3. Add to basket (any variant)
4. Remove from basket
5. Open Firebase Console → Firestore → `customerEvents` — should see 3 docs: `product.viewed`, `basket.item_added`, `basket.item_removed`

If empty, check browser dev-tools network tab for the server-action call. If it shows 200 but no docs, check Firebase Admin SDK env vars are set correctly.

- [ ] **Step 4: Smoke gate — admin viewer**

1. Sign in as admin (or use `ADMIN_DEV_BYPASS=1` in `.env.local` if set up)
2. Visit `/admin/audit-log` — should render empty-state initially
3. Edit a product (e.g. toggle active flag) — refresh the audit log page
4. Confirm one `product.updated` row appears with the diff visible in drill-down

- [ ] **Step 5: Smoke gate — failed-login counter**

1. Open `/sign-in`
2. Submit wrong password 5 times in quick succession
3. Open Firebase Console → Firestore → `signInAttempts` — single doc should exist with `failures: 5`, `thresholdFiredAt: <timestamp>`
4. Open `/admin/audit-log` filtered to `auth.login_failed_threshold` — one event should appear

- [ ] **Step 6: Smoke gate — CSV export**

1. On `/admin/audit-log`, click "Export CSV" with no filters
2. Browser downloads `audit-log-YYYY-MM-DD.csv`
3. Open it; confirm headers + rows match the on-screen feed

- [ ] **Step 7: Stop dev server**

(No commit — manual verification only)

---

### Task 8.3: Final review + merge prep

- [ ] **Step 1: Confirm branch state**

Run: `git log --oneline main..HEAD | head -30`
Expected: ~30 commits across Sections 1-8.

- [ ] **Step 2: Run final type-check + build**

Run: `npx tsc --noEmit && npx next build 2>&1 | tail -10`
Expected: green.

- [ ] **Step 3: Push branch (do NOT merge yet — Plan B builds on top)**

```bash
git push origin tier2-audit-and-events
```

- [ ] **Step 4: STOP — Plan A is complete. Hand back to David for review before starting Plan B.**

Do not merge to main yet. Plan B (DSAR/erasure) builds directly on top of these emit paths and will land on the same branch.

---

## Self-review checklist (run after writing tasks)

1. **Spec coverage:**
   - ✅ 9 audit event types — all defined in `types/audit.ts` Task 1.1
   - ✅ AuditLog schema with `prevHash` reserved — Task 1.1
   - ✅ Three composite indexes — Task 1.3
   - ✅ Rules-enforced append-only — Task 1.2
   - ✅ `withAudit` wrapper + explicit `writeAuditEvent` — Task 1.4
   - ✅ Audit emissions in 4 server actions — Tasks 3.1-3.4
   - ✅ 7-year TTL — Task 8.1 documents the console action
   - ✅ Admin viewer with feed + filters + drill-down + CSV — Tasks 6.1-6.7
   - ✅ Order trail link — Task 6.7
   - ✅ 6 customer-event types — Task 4.1
   - ✅ Customer-events writer + sessionId — Task 4.3
   - ✅ 6 emitter call-sites — Tasks 5.1-5.5
   - ✅ Consent gating — Task 4.3 + verified Task 7.1
   - ✅ Failed-login counter — Tasks 2.2-2.3
   - ✅ 24-month customer-events TTL — Task 8.1

2. **Placeholder scan:** no TBDs, no "implement later", no "similar to Task N" without code. Each task has runnable code or commands.

3. **Type consistency:** `AuditEventType` enum referenced consistently across `types/audit.ts`, `lib/audit-log.ts`, `app/(admin)/admin/audit-log/actions.ts`. `WriteAuditEventInput` matches the call-site shape in Tasks 3.1-3.4.

4. **Customer-trail link:** spec mentioned a customer-trail link on `/admin/customers/[uid]`. Plan A doesn't have a separate `/admin/customers/[uid]` page; that's handled in Plan B as part of DSAR. **Action:** mention this in Plan B as a small carry-over task.

---

**Plan A complete. ~30 tasks across 8 sections, ~9-11h estimated. Ready to execute.**
