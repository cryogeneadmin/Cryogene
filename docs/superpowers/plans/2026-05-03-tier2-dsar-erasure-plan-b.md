# Tier 2 — Plan B: DSAR / Erasure Plumbing

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship UK GDPR data-rights handling on top of Plan A's audit-log + customer-events foundations. Four statutory rights (access / rectification / erasure / object-to-marketing) with hybrid customer-facing + admin-tool flow + SLA enforcement.

**Architecture:** A `dataRightsRequests` collection captures every request. Logged-in customers self-serve at `/account/data`; everyone else uses `/data-rights` with email-confirmation challenge. Admin works the queue at `/admin/data-rights`. Marketing-objection auto-processes; rectification self-serves; access auto-bundles ZIP with manual send; erasure is two-step manual with typed-email confirmation. Erasure scrubs PII from `auditLogs` referencing the customer, anonymises orders (HMRC reconciliation), deletes auth user + customer doc + `customerEvents` + `enquiries`. Daily Cloud Function emails Sam if any request is < 7 days from deadline.

**Tech Stack:** Next.js 16 App Router + Firebase Admin SDK + Firestore TTL + Resend + jszip (new dependency) + jose (already a transitive dep, used directly for verification token signing) + Firebase Functions v2 (new — first Cloud Function in the project).

**Spec reference:** `docs/superpowers/specs/2026-05-03-dsar-erasure-design.md`

**Branch:** `tier2-audit-and-events` (continues from Plan A — same branch, no new branch needed)

**Estimated wall time:** 14-16h across 38 tasks in 12 sections.

**Prerequisites:** Plan A must be complete and pushed to the same branch — Plan B references types from `types/audit.ts` (extends the AuditEventType enum) and uses `writeAuditEvent` from `lib/audit-log.ts`.

---

## File structure

### New files

```
types/data-rights.ts                                              # request, consent, history
lib/data-rights.ts                                                # request creation, verification token
lib/marketing-consent.ts                                          # consent state read/write + history append
lib/erasure.ts                                                    # erasure executor + preview builder
lib/data-export.ts                                                # ZIP bundle generator
lib/email.ts                                                      # Resend wrapper with branded sender
lib/email-templates/verification.ts                               # public-form verification email
lib/email-templates/access-export.ts                              # export-ready email
lib/email-templates/erasure-confirmed.ts                          # erasure receipt
lib/email-templates/marketing-objection.ts                        # marketing opt-out confirmation
lib/email-templates/sla-warning.ts                                # internal Sam-only warning
app/(public)/data-rights/page.tsx                                 # public form
app/(public)/data-rights/PublicDataRightsForm.tsx                 # client form
app/(public)/data-rights/verify/[token]/page.tsx                  # verification handler
app/(public)/data-rights/marketing-revoked/page.tsx               # post-unsubscribe landing
app/(public)/account/data/page.tsx                                # logged-in self-serve hub
app/(public)/account/data/AccountDataClient.tsx                   # client buttons + toggle
app/(admin)/admin/data-rights/page.tsx                            # queue list
app/(admin)/admin/data-rights/[id]/page.tsx                       # detail dispatcher
app/(admin)/admin/data-rights/[id]/AccessRequestPanel.tsx         # access detail UI
app/(admin)/admin/data-rights/[id]/ErasureRequestPanel.tsx        # erasure detail UI
app/(admin)/admin/data-rights/[id]/RectificationRequestPanel.tsx  # rectification info panel
app/(admin)/admin/data-rights/[id]/ObjectionRequestPanel.tsx      # objection info panel
app/(admin)/admin/data-rights/[id]/actions.ts                     # generate-export, run-erasure, etc.
app/(admin)/admin/customers/[uid]/page.tsx                        # carry-over from Plan A spec — customer detail with audit-trail link
app/api/data-rights/access/route.ts                               # POST handler logged-in access request
app/api/data-rights/erasure/route.ts                              # POST handler logged-in erasure request
app/api/data-rights/objection/route.ts                            # POST handler instant marketing toggle
app/api/data-rights/public/route.ts                               # POST handler public form
app/api/data-rights/unsubscribe/[token]/route.ts                  # one-click unsubscribe link target
functions/package.json                                             # new Firebase Functions package
functions/tsconfig.json                                            # functions TS config
functions/src/index.ts                                             # exports slaWarnings
functions/src/sla-warnings.ts                                     # SLA-warning scheduled function
functions/src/email.ts                                             # functions-side Resend wrapper
.firebaserc                                                        # may need 'functions' added if not present
```

### Modified files

```
firestore.rules                                                    # 2 new collection blocks
firestore.indexes.json                                              # 4 new composite indexes
types/audit.ts                                                      # extend AuditEventType enum (8 new events)
types/customer.ts                                                   # replace marketingOptIn with marketingConsent
lib/checkout-session.ts                                             # add marketingConsent to DeliveryDataSchema
lib/customers.ts                                                    # consent read helper (replaces marketingOptIn references)
app/actions/checkout.ts                                             # capture consent + write history on order completion
app/actions/create-checkout-account.ts                              # capture consent on signup
app/actions/create-order.ts                                         # consent capture (path varies — see Task A.5)
components/storefront/checkout/DeliveryForm.tsx                     # marketing tickbox below T&C
components/storefront/auth/SignUpForm.tsx                           # marketing tickbox below research-use
components/storefront/account/AccountLayout.tsx                     # add "Data & privacy" nav item
components/storefront/layout/Footer.tsx                             # "Your data rights" link in Legal column
app/(public)/privacy/page.tsx                                       # copy update describing four rights
docs/handover/deployment-checklist.md                               # Plan B deploy actions
package.json                                                        # add jszip + firebase-functions
```

### One-time deploy actions (Section 12)

Documented in Task 12.1.

---

## Section A — Marketing consent foundation

### Task A.1: Define MarketingConsent type + schema

**Files:**
- Create: `types/data-rights.ts`

- [ ] **Step 1: Write the file**

```ts
// types/data-rights.ts
import type { Timestamp } from "firebase-admin/firestore";

export type ConsentSource =
  | "checkout"
  | "signup"
  | "post-purchase"
  | "withdrawal"
  | "admin-override"
  | "unsubscribe-link";

export type MarketingConsent = {
  granted: boolean;
  grantedAt: Date | null;
  withdrawnAt: Date | null;
  source: ConsentSource;
};

export type MarketingConsentEntry = {
  id: string;
  granted: boolean;
  changedAt: Date;
  source: ConsentSource;
  ipHash: string | null;
  userAgent: string | null;
};

/** Internal write shape for Firestore — Timestamps before normalisation. */
export type MarketingConsentEntryWritable = Omit<MarketingConsentEntry, "id" | "changedAt"> & {
  changedAt: Timestamp;
};

export type DataRightType =
  | "access"
  | "rectification"
  | "erasure"
  | "objection";

export type DataRightSource = "account" | "public" | "unsubscribe-link";

export type DataRightStatus =
  | "pending_email_verification"
  | "queued"
  | "in_progress"
  | "completed"
  | "rejected";

export type DataRightsRequest = {
  id: string;
  createdAt: Date;
  type: DataRightType;
  source: DataRightSource;
  requester: {
    email: string;
    uid: string | null;
    emailVerifiedAt: Date | null;
  };
  status: DataRightStatus;
  deadline: Date;
  respondedAt: Date | null;
  responseArtefactRef: string | null;
  rejectionReason: string | null;
  notes: string | null;
  slaWarningsSentAt: Date[];
  message: string | null;
};

export type DataRightsRequestWritable = Omit<
  DataRightsRequest,
  "id" | "createdAt" | "deadline" | "respondedAt" | "slaWarningsSentAt"
> & {
  createdAt: Timestamp;
  deadline: Timestamp;
  respondedAt: Timestamp | null;
  slaWarningsSentAt: Timestamp[];
  requester: Omit<DataRightsRequest["requester"], "emailVerifiedAt"> & {
    emailVerifiedAt: Timestamp | null;
  };
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: `EXIT=0`

- [ ] **Step 3: Commit**

```bash
git add types/data-rights.ts
git commit -m "feat(dsar): add MarketingConsent + DataRightsRequest types"
```

---

### Task A.2: Replace `marketingOptIn` boolean on Customer type

**Files:**
- Modify: `types/customer.ts`
- Modify: `app/actions/create-checkout-account.ts:51-63`

- [ ] **Step 1: Update the type**

Replace the contents of `types/customer.ts` with:

```ts
import type { Timestamp } from "firebase/firestore";
import type { Address } from "./order";
import type { MarketingConsent } from "./data-rights";

export type Customer = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  defaultAddress: Address | null;
  researchInstitution: string | null;
  /** Per UK GDPR + ICO: explicit grant + provenance + withdrawal mechanism. */
  marketingConsent: MarketingConsent;
  orderCount: number;
  lifetimeValueInPence: number;
  createdAt: Timestamp | Date;
  lastLoginAt: Timestamp | Date;
};
```

- [ ] **Step 2: Find all references to `marketingOptIn`**

Run: `grep -rn "marketingOptIn" --include="*.ts" --include="*.tsx" . 2>&1 | grep -v node_modules`

Expected: hits in `app/actions/create-checkout-account.ts:58`, possibly other places. Replace each with `marketingConsent: { granted: false, grantedAt: null, withdrawnAt: null, source: "signup" }` or whatever source matches the call-site. Specifically in `create-checkout-account.ts`:

```ts
const newCustomer = {
  id: uid,
  email: parsed.data.email,
  name: "",
  phone: null,
  defaultAddress: null,
  researchInstitution: null,
  marketingConsent: {
    granted: false,
    grantedAt: null,
    withdrawnAt: null,
    source: "signup" as const,
  },
  orderCount: 0,
  lifetimeValueInPence: 0,
  createdAt: now,
  lastLoginAt: now,
} as Customer;
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: `EXIT=0`. If any other files referenced `marketingOptIn` they will surface now — fix each by mapping to the new shape.

- [ ] **Step 4: Commit**

```bash
git add types/customer.ts app/actions/create-checkout-account.ts
git commit -m "feat(dsar): replace marketingOptIn boolean with structured MarketingConsent

Per UK GDPR + ICO requirement to capture provenance + withdrawal mechanism,
not just a boolean. Existing customers (zero in production) will have
undefined marketingConsent on read — treated as 'no consent' downstream."
```

---

### Task A.3: Add marketing-consent rules

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Tighten customers + add subcollection block**

Replace the existing `customers/{uid}` block:

```
    match /customers/{uid} {
      allow read: if request.auth.uid == uid || request.auth.token.admin == true;
      allow create, update: if request.auth.uid == uid;
      allow delete: if false;
    }
```

with:

```
    match /customers/{uid} {
      allow read: if request.auth.uid == uid || request.auth.token.admin == true;
      allow create, update: if request.auth.uid == uid;
      allow delete: if false;

      // History subcollection is admin-SDK only; both readers and writers
      // go through server-side helpers that already enforce ownership.
      match /marketingConsentHistory/{entryId} {
        allow read: if request.auth.token.admin == true;
        allow create, update, delete: if false;
      }
    }
```

- [ ] **Step 2: Verify**

Run: `node -e "console.log(require('fs').readFileSync('firestore.rules','utf8').match(/marketingConsentHistory/))"`
Expected: `[ 'marketingConsentHistory' ]`

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat(dsar): add marketingConsentHistory subcollection rules — admin-SDK only"
```

---

### Task A.4: Implement marketing-consent helper

**Files:**
- Create: `lib/marketing-consent.ts`

- [ ] **Step 1: Write the file**

```ts
// lib/marketing-consent.ts
import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { getAdminDb } from "@/lib/firebase/admin";
import type {
  ConsentSource,
  MarketingConsent,
  MarketingConsentEntryWritable,
} from "@/types/data-rights";

function ipHash(ip: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex");
}

/**
 * Update a customer's marketing-consent state and append a history entry.
 * Called from: checkout (granting at order time), signup, /account/data
 * toggle, public /data-rights objection, unsubscribe link.
 *
 * Idempotent — calling with the same `granted` value still appends a
 * history entry (the entry is the authoritative trail).
 */
export async function setMarketingConsent(
  uid: string,
  granted: boolean,
  source: ConsentSource
): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Firestore not configured");

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = hdrs.get("user-agent")?.slice(0, 200) ?? null;
  const now = Timestamp.now();

  const consent: Omit<MarketingConsent, "grantedAt" | "withdrawnAt"> & {
    grantedAt: Timestamp | null;
    withdrawnAt: Timestamp | null;
  } = {
    granted,
    grantedAt: granted ? now : null,
    withdrawnAt: !granted ? now : null,
    source,
  };

  const customerRef = db.doc(`customers/${uid}`);
  const historyRef = customerRef.collection("marketingConsentHistory").doc();

  const entry: MarketingConsentEntryWritable = {
    granted,
    changedAt: now,
    source,
    ipHash: ipHash(ip),
    userAgent,
  };

  await db.runTransaction(async (txn) => {
    const customerSnap = await txn.get(customerRef);
    if (!customerSnap.exists) {
      throw new Error(`Customer ${uid} does not exist`);
    }

    // Preserve existing grantedAt if state was already granted and we're
    // re-confirming — only stamp a new grantedAt when state changes from
    // not-granted to granted.
    const existing = customerSnap.data()?.marketingConsent;
    const existingGranted = existing?.granted === true;
    const finalConsent = {
      ...consent,
      grantedAt:
        granted && existingGranted && existing?.grantedAt
          ? existing.grantedAt
          : consent.grantedAt,
    };

    txn.update(customerRef, { marketingConsent: finalConsent });
    txn.set(historyRef, entry);
  });
}

/**
 * Read current consent state. Returns a default 'not granted' if the field
 * is absent (legacy customers from before this migration).
 */
export async function getMarketingConsent(uid: string): Promise<MarketingConsent> {
  const db = getAdminDb();
  if (!db) throw new Error("Firestore not configured");
  const snap = await db.doc(`customers/${uid}`).get();
  const data = snap.data();
  if (!data?.marketingConsent) {
    return {
      granted: false,
      grantedAt: null,
      withdrawnAt: null,
      source: "withdrawal",
    };
  }
  const c = data.marketingConsent;
  return {
    granted: c.granted === true,
    grantedAt: c.grantedAt instanceof Timestamp ? c.grantedAt.toDate() : null,
    withdrawnAt: c.withdrawnAt instanceof Timestamp ? c.withdrawnAt.toDate() : null,
    source: c.source ?? "withdrawal",
  };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: `EXIT=0`

- [ ] **Step 3: Commit**

```bash
git add lib/marketing-consent.ts
git commit -m "feat(dsar): add marketing-consent helper with history trail

setMarketingConsent transactionally updates customer doc + appends history
entry with IP hash + UA. Preserves grantedAt if state was already granted
(idempotent re-confirmations don't overwrite the original grant time)."
```

---

### Task A.5: Capture marketing consent at checkout

**Files:**
- Modify: `lib/checkout-session.ts:7-21` (extend schema)
- Modify: `components/storefront/checkout/DeliveryForm.tsx`
- Modify: `app/actions/checkout.ts` (parse + persist)
- Modify: `app/actions/create-order.ts` (write consent on order success)

- [ ] **Step 1: Extend `DeliveryDataSchema`**

Replace the schema in `lib/checkout-session.ts`:

```ts
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
  marketingOptIn: z.boolean().default(false),  // NEW — captured at checkout
  customerUid: z.string().nullable().optional(),
});
```

- [ ] **Step 2: Add the tickbox to `DeliveryForm.tsx`**

Find the existing T&C / research-use tickbox region. Add a new tickbox **below** them (separate from T&C):

```tsx
<label className="flex items-start gap-3 cursor-pointer mt-3">
  <input
    type="checkbox"
    name="marketingOptIn"
    defaultChecked={false}
    className="mt-1 accent-navy"
  />
  <span className="text-sm text-navy">
    Email me about new products and special offers. You can unsubscribe at
    any time.
  </span>
</label>
```

The `name="marketingOptIn"` matters — the FormData parser in `saveDeliveryStep` reads by name.

- [ ] **Step 3: Parse the checkbox in `saveDeliveryStep`**

In `app/actions/checkout.ts`, modify the `parsed` object to include `marketingOptIn`:

```ts
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
  marketingOptIn: formData.get("marketingOptIn") === "on",  // NEW
  customerUid: null,
});
```

- [ ] **Step 4: Persist consent on order completion**

In `app/actions/create-order.ts`, after the order is successfully created and after the audit/customer-events emissions from Plan A, add a consent write **only if the customer has a uid** (anonymous orders have no customer doc to write to):

```ts
import { setMarketingConsent } from "@/lib/marketing-consent";
// ...

// If the customer registered AND opted in at checkout, write consent.
if (delivery.customerUid && delivery.marketingOptIn) {
  try {
    await setMarketingConsent(
      delivery.customerUid,
      true,
      "checkout"
    );
  } catch (err) {
    console.warn("[checkout] marketing-consent write failed:", err);
  }
}
```

- [ ] **Step 5: Type-check + build**

Run: `npx tsc --noEmit && npx next build`
Expected: green; checkout flow renders with the new tickbox.

- [ ] **Step 6: Commit**

```bash
git add lib/checkout-session.ts components/storefront/checkout/DeliveryForm.tsx app/actions/checkout.ts app/actions/create-order.ts
git commit -m "feat(dsar): capture marketing consent at checkout via separate tickbox

Tickbox is unticked by default, sits BELOW the T&C tickbox (separate
purpose per ICO/PECR). Consent + history persist only after successful
order placement, only for registered (non-guest) customers."
```

---

### Task A.6: Capture marketing consent at signup

**Files:**
- Modify: `components/storefront/auth/SignUpForm.tsx`
- Modify: the sign-up server action (find via grep)

- [ ] **Step 1: Find the sign-up action**

Run: `grep -rn "createUserWithEmailAndPassword" --include="*.ts" --include="*.tsx" components/ app/ 2>&1 | head -5`

The sign-up form likely calls `createUserWithEmailAndPassword` client-side then POSTs the ID token to `/api/auth/session`. The customer doc is created by `createCheckoutAccount` (already in Plan A). For sign-up specifically, there may be a different path. Identify the actual flow from the SignUpForm.

- [ ] **Step 2: Add tickbox to SignUpForm.tsx**

Below the existing research-use confirmation tickbox in `SignUpForm.tsx`:

```tsx
<label className="flex items-start gap-3 cursor-pointer mt-3">
  <input
    type="checkbox"
    name="marketingOptIn"
    defaultChecked={false}
    className="mt-1 accent-navy"
  />
  <span className="text-sm text-navy">
    Email me about new products and special offers. You can unsubscribe at
    any time.
  </span>
</label>
```

- [ ] **Step 3: Capture and persist on successful signup**

In whichever action handles sign-up (likely an `onSubmit` calling Firebase client SDK directly, then POST `/api/auth/session`), after the auth user is created, call:

```ts
import { setMarketingConsent } from "@/lib/marketing-consent";

// after newCustomer is upserted in createCheckoutAccount or equivalent
if (marketingOptIn) {
  await setMarketingConsent(uid, true, "signup");
}
```

If the signup is purely client-side (no server action), you'll need a small new API route like `/api/customer/marketing-consent` that takes `{ granted, source }` and calls `setMarketingConsent` after verifying the session cookie. Path of least resistance: extend `createCheckoutAccount` to take an optional `marketingOptIn` boolean.

- [ ] **Step 4: Type-check + build**

Run: `npx tsc --noEmit && npx next build`
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add components/storefront/auth/SignUpForm.tsx <action-file>
git commit -m "feat(dsar): capture marketing consent at signup via separate tickbox"
```

---

## Section B — DataRightsRequests collection foundation

### Task B.1: Add Firestore rules for `dataRightsRequests`

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Add the new block**

Append after `customerEvents`:

```
    match /dataRightsRequests/{id} {
      allow read: if request.auth != null && request.auth.token.admin == true;
      allow create, update, delete: if false;
    }
```

- [ ] **Step 2: Verify + commit**

Run: `node -e "console.log(require('fs').readFileSync('firestore.rules','utf8').match(/dataRightsRequests/))"`
Expected: `[ 'dataRightsRequests' ]`

```bash
git add firestore.rules
git commit -m "feat(dsar): add dataRightsRequests rules — admin-SDK only"
```

---

### Task B.2: Add Firestore indexes for the queue

**Files:**
- Modify: `firestore.indexes.json`

- [ ] **Step 1: Add 2 new index entries**

Append to the `indexes` array:

```json
,
    {
      "collectionGroup": "dataRightsRequests",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "deadline", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "dataRightsRequests",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "requester.email", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
```

- [ ] **Step 2: Verify JSON parses**

Run: `node -e "JSON.parse(require('fs').readFileSync('firestore.indexes.json','utf8'))"`
Expected: no output, exit 0

- [ ] **Step 3: Commit**

```bash
git add firestore.indexes.json
git commit -m "feat(dsar): add 2 composite indexes for dataRightsRequests queue"
```

---

### Task B.3: Implement `lib/data-rights.ts` core helpers

**Files:**
- Create: `lib/data-rights.ts`

- [ ] **Step 1: Write the file**

```ts
// lib/data-rights.ts
import "server-only";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { getAdminDb } from "@/lib/firebase/admin";
import { writeAuditEvent } from "@/lib/audit-log";
import type {
  DataRightsRequest,
  DataRightsRequestWritable,
  DataRightType,
  DataRightSource,
} from "@/types/data-rights";

const SLA_DAYS = 30;
const VERIFICATION_TTL_HOURS = 24;
const MAX_PUBLIC_PER_IP_PER_DAY = 3;

function getJwtSecret(): Uint8Array {
  const raw = process.env.DATA_RIGHTS_JWT_SECRET;
  if (!raw) throw new Error("DATA_RIGHTS_JWT_SECRET is not configured");
  return new TextEncoder().encode(raw);
}

export async function signVerificationToken(
  requestId: string,
  email: string
): Promise<string> {
  return new SignJWT({ requestId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${VERIFICATION_TTL_HOURS}h`)
    .sign(getJwtSecret());
}

export async function verifyVerificationToken(
  token: string
): Promise<{ requestId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (typeof payload.requestId !== "string" || typeof payload.email !== "string") {
      return null;
    }
    return { requestId: payload.requestId, email: payload.email };
  } catch {
    return null;
  }
}

function normaliseRequest(
  id: string,
  data: FirebaseFirestore.DocumentData
): DataRightsRequest {
  const tsToDate = (v: unknown): Date | null =>
    v instanceof Timestamp ? v.toDate() : v ? new Date(v as string) : null;
  return {
    id,
    createdAt: tsToDate(data.createdAt) ?? new Date(),
    type: data.type,
    source: data.source,
    requester: {
      email: data.requester?.email ?? "",
      uid: data.requester?.uid ?? null,
      emailVerifiedAt: tsToDate(data.requester?.emailVerifiedAt),
    },
    status: data.status,
    deadline: tsToDate(data.deadline) ?? new Date(),
    respondedAt: tsToDate(data.respondedAt),
    responseArtefactRef: data.responseArtefactRef ?? null,
    rejectionReason: data.rejectionReason ?? null,
    notes: data.notes ?? null,
    slaWarningsSentAt: Array.isArray(data.slaWarningsSentAt)
      ? data.slaWarningsSentAt.map((ts: unknown) => tsToDate(ts)).filter((d): d is Date => d !== null)
      : [],
    message: data.message ?? null,
  };
}

export type CreateRequestInput = {
  type: DataRightType;
  source: DataRightSource;
  email: string;
  uid: string | null;
  message: string | null;
  /** True when identity is already proven (logged-in customer); skips
   *  email verification and starts the SLA clock immediately. */
  preVerified: boolean;
};

export async function createDataRightsRequest(
  input: CreateRequestInput
): Promise<{ id: string; status: "pending_email_verification" | "queued" }> {
  const db = getAdminDb();
  if (!db) throw new Error("Firestore not configured");

  const now = Timestamp.now();
  const status = input.preVerified ? "queued" : "pending_email_verification";
  const deadline = input.preVerified
    ? Timestamp.fromMillis(now.toMillis() + SLA_DAYS * 24 * 60 * 60 * 1000)
    : now; // placeholder; replaced when verification completes

  const writable: DataRightsRequestWritable = {
    createdAt: now,
    type: input.type,
    source: input.source,
    requester: {
      email: input.email,
      uid: input.uid,
      emailVerifiedAt: input.preVerified ? now : null,
    },
    status,
    deadline,
    respondedAt: null,
    responseArtefactRef: null,
    rejectionReason: null,
    notes: null,
    slaWarningsSentAt: [],
    message: input.message,
  };

  const ref = await db.collection("dataRightsRequests").add(writable);

  if (input.preVerified) {
    const auditEventType =
      input.type === "access" ? "customer.access_requested"
      : input.type === "rectification" ? "customer.rectification_requested"
      : input.type === "erasure" ? "customer.erasure_requested"
      : "customer.objection_received";

    await writeAuditEvent({
      eventType: auditEventType,
      target: { kind: "user", id: input.uid },
      metadata: { requestId: ref.id, email: input.email, source: input.source },
    });
  }

  return { id: ref.id, status };
}

export async function markRequestVerified(
  requestId: string,
  email: string
): Promise<{ ok: true; type: DataRightType } | { ok: false; reason: string }> {
  const db = getAdminDb();
  if (!db) throw new Error("Firestore not configured");
  const ref = db.doc(`dataRightsRequests/${requestId}`);

  const result = await db.runTransaction(async (txn) => {
    const snap = await txn.get(ref);
    if (!snap.exists) return { ok: false as const, reason: "not_found" };
    const data = snap.data()!;
    if (data.requester?.email !== email) {
      return { ok: false as const, reason: "email_mismatch" };
    }
    if (data.status !== "pending_email_verification") {
      return { ok: false as const, reason: "already_verified_or_complete" };
    }

    const now = Timestamp.now();
    const deadline = Timestamp.fromMillis(now.toMillis() + SLA_DAYS * 24 * 60 * 60 * 1000);

    // If a customer with this email exists, populate uid
    const auth = (await import("@/lib/firebase/admin")).getAdminAuthSdk();
    let uid: string | null = data.requester?.uid ?? null;
    if (!uid && auth) {
      try {
        const user = await auth.getUserByEmail(email);
        uid = user.uid;
      } catch {
        uid = null;
      }
    }

    txn.update(ref, {
      status: "queued",
      deadline,
      "requester.emailVerifiedAt": now,
      "requester.uid": uid,
    });

    return { ok: true as const, type: data.type as DataRightType };
  });

  if (result.ok) {
    const auditEventType =
      result.type === "access" ? "customer.access_requested"
      : result.type === "rectification" ? "customer.rectification_requested"
      : result.type === "erasure" ? "customer.erasure_requested"
      : "customer.objection_received";

    await writeAuditEvent({
      eventType: auditEventType,
      target: { kind: "user", id: null },
      metadata: { requestId, email, source: "public", verified: true },
    });
  }

  return result;
}

export async function getRequestById(id: string): Promise<DataRightsRequest | null> {
  const db = getAdminDb();
  if (!db) throw new Error("Firestore not configured");
  const snap = await db.doc(`dataRightsRequests/${id}`).get();
  return snap.exists ? normaliseRequest(snap.id, snap.data()!) : null;
}

export async function listRequests(
  filters: { status?: DataRightStatus; type?: DataRightType } = {}
): Promise<DataRightsRequest[]> {
  const db = getAdminDb();
  if (!db) throw new Error("Firestore not configured");
  let q: FirebaseFirestore.Query = db.collection("dataRightsRequests");
  if (filters.status) q = q.where("status", "==", filters.status);
  if (filters.type) q = q.where("type", "==", filters.type);
  q = q.orderBy("deadline", "asc").limit(200);
  const snap = await q.get();
  return snap.docs.map((d) => normaliseRequest(d.id, d.data()));
}

// Public-form rate limiting (cheap in-Firestore counter; not as robust as a
// dedicated rate-limit service but adequate for this scale).
export async function checkPublicFormRateLimit(ipHash: string): Promise<boolean> {
  const db = getAdminDb();
  if (!db) return true;
  const dayKey = new Date().toISOString().slice(0, 10);
  const ref = db.doc(`publicFormCounters/${ipHash}_${dayKey}`);
  const result = await db.runTransaction(async (txn) => {
    const snap = await txn.get(ref);
    const current = snap.exists ? (snap.data()?.count ?? 0) : 0;
    if (current >= MAX_PUBLIC_PER_IP_PER_DAY) return false;
    txn.set(ref, { count: current + 1, updatedAt: Timestamp.now() }, { merge: true });
    return true;
  });
  return result;
}

// Imported above
type DataRightStatus = DataRightsRequest["status"];
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: `EXIT=0`

- [ ] **Step 3: Commit**

```bash
git add lib/data-rights.ts
git commit -m "feat(dsar): core data-rights helpers — JWT verification, request CRUD, rate limit

createDataRightsRequest: handles both pre-verified (logged-in) and
unverified (public form) flows. markRequestVerified: token validation +
deadline stamp + uid backfill from auth. listRequests: queue feed.
checkPublicFormRateLimit: 3 per IP per day."
```

---

### Task B.4: Add public-form counter rules

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Add block**

```
    match /publicFormCounters/{key} {
      allow read, write: if false;
    }
```

- [ ] **Step 2: Commit**

```bash
git add firestore.rules
git commit -m "feat(dsar): publicFormCounters rules — admin-SDK only"
```

---

## Section C — Extend AuditEventType for DSAR events

### Task C.1: Add 8 new event types to existing enum

**Files:**
- Modify: `types/audit.ts`

- [ ] **Step 1: Patch the enum**

Replace the `AuditEventType` union and `ALL_AUDIT_EVENT_TYPES` array:

```ts
export type AuditEventType =
  // Order lifecycle (Plan A)
  | "order.created"
  | "order.status_changed"
  | "order.refunded"
  // Product mutations (Plan A)
  | "product.created"
  | "product.updated"
  // Admin / role (Plan A)
  | "admin.role_granted"
  | "admin.role_revoked"
  // Security (Plan A)
  | "auth.login_failed_threshold"
  // Customer rights (Plan B — new)
  | "customer.access_requested"
  | "customer.access_completed"
  | "customer.rectification_requested"
  | "customer.rectification_completed"
  | "customer.erasure_requested"
  | "customer.erasure_completed"
  | "customer.objection_received"
  | "customer.objection_processed"
  | "customer.rights_request_rejected";

export const ALL_AUDIT_EVENT_TYPES: AuditEventType[] = [
  "order.created",
  "order.status_changed",
  "order.refunded",
  "product.created",
  "product.updated",
  "admin.role_granted",
  "admin.role_revoked",
  "auth.login_failed_threshold",
  "customer.access_requested",
  "customer.access_completed",
  "customer.rectification_requested",
  "customer.rectification_completed",
  "customer.erasure_requested",
  "customer.erasure_completed",
  "customer.objection_received",
  "customer.objection_processed",
  "customer.rights_request_rejected",
];
```

(Removes `customer.erasure_requested` from Plan A's reserved-no-writer placeholder — it now fires for real.)

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: `EXIT=0`

- [ ] **Step 3: Commit**

```bash
git add types/audit.ts
git commit -m "feat(audit): extend AuditEventType with 9 DSAR event types

8 are new; customer.erasure_requested upgrades from Plan A's reserved
placeholder to active emission via DSAR helpers."
```

---

## Section D — Public flow (`/data-rights`)

### Task D.1: Build the public form server page

**Files:**
- Create: `app/(public)/data-rights/page.tsx`

- [ ] **Step 1: Write the file**

```tsx
// app/(public)/data-rights/page.tsx
import { PublicDataRightsForm } from "./PublicDataRightsForm";

export const metadata = {
  title: "Your Data Rights — Cryogene Laboratories",
  description:
    "Request access to your data, correction, erasure, or to opt out of marketing.",
};

export default function DataRightsPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="font-serif text-4xl text-navy mb-3">Your data rights</h1>
      <p className="text-muted mb-8">
        Under UK GDPR you have the right to access your data, correct it,
        request erasure, or object to direct marketing. Submit a request
        below and we'll respond within 30 days. We'll send a verification
        email to confirm it's really you.
      </p>
      <PublicDataRightsForm />
    </div>
  );
}
```

- [ ] **Step 2: No commit yet**

Continue to D.2.

---

### Task D.2: Build the client form component

**Files:**
- Create: `app/(public)/data-rights/PublicDataRightsForm.tsx`

- [ ] **Step 1: Write the file**

```tsx
// app/(public)/data-rights/PublicDataRightsForm.tsx
"use client";

import { useState, useTransition } from "react";

type RequestType = "access" | "rectification" | "erasure" | "objection";

const RIGHT_LABELS: Record<RequestType, string> = {
  access: "Send me a copy of my data",
  rectification: "Correct my data (link to settings if you have an account)",
  erasure: "Erase my account and personal data",
  objection: "Stop sending me marketing emails",
};

export function PublicDataRightsForm() {
  const [type, setType] = useState<RequestType>("access");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Honeypot — if filled, bot. Drop silently.
    const honeypot = (e.currentTarget as HTMLFormElement).querySelector<HTMLInputElement>(
      'input[name="website"]'
    )?.value;
    if (honeypot) {
      setSubmitted(true);
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/data-rights/public", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ type, email, message }),
        });
        if (res.status === 429) {
          setError("Too many requests from your network. Please try again tomorrow.");
          return;
        }
        if (!res.ok) {
          setError("Could not submit your request. Please try again.");
          return;
        }
        setSubmitted(true);
      } catch {
        setError("Could not submit your request. Please try again.");
      }
    });
  }

  if (submitted) {
    return (
      <div className="bg-offwhite border border-border p-6">
        <h2 className="font-serif text-xl text-navy mb-2">Check your inbox</h2>
        <p className="text-sm text-muted">
          We've sent a confirmation email to {email}. Click the link inside to
          verify your request — it expires in 24 hours. Once verified, we'll
          respond within 30 days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="label-editorial text-sm text-navy mb-2">
          What would you like us to do?
        </legend>
        {(Object.entries(RIGHT_LABELS) as [RequestType, string][]).map(([value, label]) => (
          <label key={value} className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="type"
              value={value}
              checked={type === value}
              onChange={() => setType(value)}
              className="mt-1 accent-navy"
              required
            />
            <span className="text-sm text-navy">{label}</span>
          </label>
        ))}
      </fieldset>

      <label className="block">
        <span className="label-editorial text-sm text-navy block mb-1">
          Your email
        </span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-border bg-white px-3 py-2"
          maxLength={320}
        />
      </label>

      <label className="block">
        <span className="label-editorial text-sm text-navy block mb-1">
          Anything else? (optional)
        </span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={1000}
          rows={4}
          className="w-full border border-border bg-white px-3 py-2"
        />
      </label>

      <input type="text" name="website" className="hidden" tabIndex={-1} aria-hidden="true" />

      {error && <p className="text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        className="px-6 py-3 bg-navy text-white uppercase tracking-wider text-xs hover:bg-mid-navy"
      >
        Submit request
      </button>
    </form>
  );
}
```

- [ ] **Step 2: No commit yet**

Continue to D.3.

---

### Task D.3: Build the public POST handler

**Files:**
- Create: `app/api/data-rights/public/route.ts`

- [ ] **Step 1: Write the file**

```ts
// app/api/data-rights/public/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import {
  createDataRightsRequest,
  signVerificationToken,
  checkPublicFormRateLimit,
} from "@/lib/data-rights";
import { sendVerificationEmail } from "@/lib/email-templates/verification";

const InputSchema = z.object({
  type: z.enum(["access", "rectification", "erasure", "objection"]),
  email: z.string().email().max(320),
  message: z.string().max(1000).optional().default(""),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipHash = createHash("sha256").update(ip).digest("hex");

  const allowed = await checkPublicFormRateLimit(ipHash);
  if (!allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const { id } = await createDataRightsRequest({
    type: parsed.data.type,
    source: "public",
    email: parsed.data.email,
    uid: null,
    message: parsed.data.message || null,
    preVerified: false,
  });

  const token = await signVerificationToken(id, parsed.data.email);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://cryogene.co.uk";
  const verifyUrl = `${baseUrl}/data-rights/verify/${encodeURIComponent(token)}`;

  await sendVerificationEmail({
    to: parsed.data.email,
    requestType: parsed.data.type,
    verifyUrl,
  });

  return NextResponse.json({ ok: true, id });
}
```

- [ ] **Step 2: No commit yet — the email helper is created later in Section J**

Continue to D.4.

---

### Task D.4: Build the verification page

**Files:**
- Create: `app/(public)/data-rights/verify/[token]/page.tsx`

- [ ] **Step 1: Write the file**

```tsx
// app/(public)/data-rights/verify/[token]/page.tsx
import { Suspense } from "react";
import { connection } from "next/server";
import { verifyVerificationToken, markRequestVerified } from "@/lib/data-rights";

async function VerifyContent({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await connection();
  const { token } = await params;
  const decoded = await verifyVerificationToken(token);

  if (!decoded) {
    return (
      <div className="bg-compliance-amber-bg border border-compliance-amber-border p-6">
        <h2 className="font-serif text-xl text-compliance-amber-text mb-2">
          Link expired or invalid
        </h2>
        <p className="text-sm text-compliance-amber-text">
          Verification links expire 24 hours after they're sent. Please submit
          your request again at <a href="/data-rights" className="underline">cryogene.co.uk/data-rights</a>.
        </p>
      </div>
    );
  }

  const result = await markRequestVerified(decoded.requestId, decoded.email);

  if (!result.ok) {
    return (
      <div className="bg-compliance-amber-bg border border-compliance-amber-border p-6">
        <h2 className="font-serif text-xl text-compliance-amber-text mb-2">
          Could not verify request
        </h2>
        <p className="text-sm text-compliance-amber-text">
          {result.reason === "already_verified_or_complete"
            ? "This request has already been verified, or has already been completed."
            : "The link did not match an active request. Please submit a new request if needed."}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-offwhite border border-border p-6">
      <h2 className="font-serif text-xl text-navy mb-2">Request verified</h2>
      <p className="text-sm text-muted">
        Thank you. Your request is now in our queue. We'll respond within 30
        days at the email you provided.
      </p>
    </div>
  );
}

export default function VerifyPage(props: {
  params: Promise<{ token: string }>;
}) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="font-serif text-3xl text-navy mb-6">Verify your request</h1>
      <Suspense fallback={<p className="text-muted">Verifying…</p>}>
        <VerifyContent params={props.params} />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 2: Commit (covers D.1-D.4)**

Type-check first:
```bash
npx tsc --noEmit
```

Will fail because `sendVerificationEmail` doesn't exist yet (Section J). That's expected — Plan B builds in waves and J completes the chain. To unblock the build temporarily, add a stub in `lib/email-templates/verification.ts` that just `console.log`s. Section J replaces it.

Stub:
```ts
// lib/email-templates/verification.ts (stub — real implementation in Task J.2)
import "server-only";
export async function sendVerificationEmail(input: {
  to: string;
  requestType: string;
  verifyUrl: string;
}): Promise<void> {
  console.log("[stub] verification email", input);
}
```

Run: `npx tsc --noEmit && npx next build`
Expected: green.

```bash
git add 'app/(public)/data-rights' 'app/api/data-rights/public' lib/email-templates/verification.ts
git commit -m "feat(dsar): public /data-rights form + verification flow

Public form with 4-radio request type, email-required, optional message,
honeypot, IP rate limit (3 per day). POST handler creates request as
pending_email_verification, signs JWT, dispatches verification email
(stub for now — replaced in Section J). Verification page validates token
and flips status to queued + sets 30-day deadline."
```

---

## Section E — Logged-in flow (`/account/data`)

### Task E.1: Build the account-data server page

**Files:**
- Create: `app/(public)/account/data/page.tsx`

- [ ] **Step 1: Write the file**

```tsx
// app/(public)/account/data/page.tsx
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getCustomerSession } from "@/lib/customer-auth";
import { getCustomerById } from "@/lib/customers";
import { getMarketingConsent } from "@/lib/marketing-consent";
import { AccountDataClient } from "./AccountDataClient";

async function AccountDataContent() {
  await connection();
  const session = await getCustomerSession();
  if (!session) redirect("/sign-in?redirect=/account/data");

  const customer = await getCustomerById(session.uid);
  const consent = await getMarketingConsent(session.uid);

  return (
    <AccountDataClient
      customerEmail={session.email ?? customer?.email ?? ""}
      orderCount={customer?.orderCount ?? 0}
      createdAt={customer?.createdAt ? new Date(customer.createdAt as Date).toISOString() : null}
      marketingGranted={consent.granted}
    />
  );
}

export default function AccountDataPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="font-serif text-4xl text-navy mb-3">Data &amp; privacy</h1>
      <p className="text-muted mb-8">
        See a summary of the data we hold on you, exercise your UK GDPR rights,
        and manage your marketing email preferences.
      </p>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <AccountDataContent />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 2: No commit yet**

Continue to E.2.

---

### Task E.2: Build the account-data client UI

**Files:**
- Create: `app/(public)/account/data/AccountDataClient.tsx`

- [ ] **Step 1: Write the file**

```tsx
// app/(public)/account/data/AccountDataClient.tsx
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

export function AccountDataClient({
  customerEmail,
  orderCount,
  createdAt,
  marketingGranted,
}: {
  customerEmail: string;
  orderCount: number;
  createdAt: string | null;
  marketingGranted: boolean;
}) {
  const [granted, setGranted] = useState(marketingGranted);
  const [busy, setBusy] = useState(false);
  const [accessSent, setAccessSent] = useState(false);
  const [erasureSent, setErasureSent] = useState(false);
  const [showErasureConfirm, setShowErasureConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function toggleMarketing(next: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/data-rights/objection", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ granted: next, source: "withdrawal" }),
      });
      if (!res.ok) {
        setError("Could not update preference. Please try again.");
        return;
      }
      setGranted(next);
    } finally {
      setBusy(false);
    }
  }

  async function requestAccess() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/data-rights/access", { method: "POST" });
      if (!res.ok) {
        setError("Could not submit access request. Please try again.");
        return;
      }
      setAccessSent(true);
    } finally {
      setBusy(false);
    }
  }

  async function requestErasure() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/data-rights/erasure", { method: "POST" });
      if (!res.ok) {
        setError("Could not submit erasure request. Please try again.");
        return;
      }
      setErasureSent(true);
      setShowErasureConfirm(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="bg-offwhite border border-border p-6">
        <h2 className="font-serif text-xl text-navy mb-3">Your data summary</h2>
        <dl className="grid grid-cols-[140px_1fr] gap-y-1 text-sm">
          <dt className="text-muted">Email</dt>
          <dd className="text-navy">{customerEmail}</dd>
          <dt className="text-muted">Orders</dt>
          <dd className="text-navy">{orderCount}</dd>
          {createdAt && (
            <>
              <dt className="text-muted">Account opened</dt>
              <dd className="text-navy mono text-xs">
                {new Date(createdAt).toLocaleDateString("en-GB")}
              </dd>
            </>
          )}
        </dl>
      </section>

      <section className="border border-border p-6">
        <h2 className="font-serif text-xl text-navy mb-3">Marketing emails</h2>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={granted}
            disabled={busy}
            onChange={(e) => toggleMarketing(e.target.checked)}
            className="mt-1 accent-navy"
          />
          <span className="text-sm text-navy">
            Email me about new products and special offers. You can unsubscribe
            at any time.
          </span>
        </label>
      </section>

      <section className="border border-border p-6">
        <h2 className="font-serif text-xl text-navy mb-3">Download your data</h2>
        <p className="text-sm text-muted mb-4">
          We'll prepare a ZIP containing your profile, orders, and a record of
          our data interactions. You'll receive an email within 30 days.
        </p>
        {accessSent ? (
          <p className="text-sm text-navy">
            Request received. We'll email you the bundle.
          </p>
        ) : (
          <button
            type="button"
            onClick={requestAccess}
            disabled={busy}
            className="px-4 py-2 bg-navy text-white text-xs uppercase tracking-wider hover:bg-mid-navy disabled:opacity-50"
          >
            Request data export
          </button>
        )}
      </section>

      <section className="border border-border p-6">
        <h2 className="font-serif text-xl text-navy mb-3">Update your details</h2>
        <Link
          href="/account/settings"
          className="text-sm text-blue underline hover:no-underline"
        >
          Go to account settings →
        </Link>
      </section>

      <section className="border border-border p-6">
        <h2 className="font-serif text-xl text-navy mb-3">Close your account</h2>
        <p className="text-sm text-muted mb-4">
          We'll erase your personal data. Order records are retained anonymously
          for 6 years to satisfy HMRC tax-record requirements (UK Companies Act).
        </p>
        {erasureSent ? (
          <p className="text-sm text-navy">
            Erasure request queued. We'll email you when it completes.
          </p>
        ) : !showErasureConfirm ? (
          <button
            type="button"
            onClick={() => setShowErasureConfirm(true)}
            className="px-4 py-2 border border-navy text-navy text-xs uppercase tracking-wider hover:bg-offwhite"
          >
            Close my account
          </button>
        ) : (
          <div className="bg-compliance-amber-bg border border-compliance-amber-border p-4">
            <p className="text-sm text-compliance-amber-text mb-3">
              Are you sure? This will erase your account. Orders are retained
              anonymously and you'll lose access to past order records.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={requestErasure}
                disabled={busy}
                className="px-4 py-2 bg-navy text-white text-xs uppercase tracking-wider"
              >
                Yes, queue erasure
              </button>
              <button
                type="button"
                onClick={() => setShowErasureConfirm(false)}
                className="px-4 py-2 border border-border text-xs uppercase tracking-wider"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {error && <p className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: No commit yet — D handlers in E.3**

Continue to E.3.

---

### Task E.3: Build the three logged-in API handlers

**Files:**
- Create: `app/api/data-rights/access/route.ts`
- Create: `app/api/data-rights/erasure/route.ts`
- Create: `app/api/data-rights/objection/route.ts`

- [ ] **Step 1: Write `access/route.ts`**

```ts
// app/api/data-rights/access/route.ts
import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-auth";
import { createDataRightsRequest } from "@/lib/data-rights";

export async function POST() {
  const session = await getCustomerSession();
  if (!session?.email) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const { id } = await createDataRightsRequest({
    type: "access",
    source: "account",
    email: session.email,
    uid: session.uid,
    message: null,
    preVerified: true,
  });
  return NextResponse.json({ ok: true, id });
}
```

- [ ] **Step 2: Write `erasure/route.ts`**

```ts
// app/api/data-rights/erasure/route.ts
import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-auth";
import { createDataRightsRequest } from "@/lib/data-rights";

export async function POST() {
  const session = await getCustomerSession();
  if (!session?.email) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const { id } = await createDataRightsRequest({
    type: "erasure",
    source: "account",
    email: session.email,
    uid: session.uid,
    message: null,
    preVerified: true,
  });
  return NextResponse.json({ ok: true, id });
}
```

- [ ] **Step 3: Write `objection/route.ts`**

```ts
// app/api/data-rights/objection/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCustomerSession } from "@/lib/customer-auth";
import { setMarketingConsent } from "@/lib/marketing-consent";
import { writeAuditEvent } from "@/lib/audit-log";
import { sendObjectionConfirmedEmail } from "@/lib/email-templates/marketing-objection";

const InputSchema = z.object({
  granted: z.boolean(),
  source: z.enum(["withdrawal", "post-purchase"]).default("withdrawal"),
});

export async function POST(req: NextRequest) {
  const session = await getCustomerSession();
  if (!session?.email) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await setMarketingConsent(session.uid, parsed.data.granted, parsed.data.source);

  await writeAuditEvent({
    eventType: "customer.objection_received",
    target: { kind: "user", id: session.uid },
    metadata: { granted: parsed.data.granted, source: parsed.data.source },
  });

  await writeAuditEvent({
    eventType: "customer.objection_processed",
    target: { kind: "user", id: session.uid },
    metadata: { granted: parsed.data.granted, source: parsed.data.source },
  });

  // Send confirmation email only when withdrawing (granting from settings
  // is implicit confirmation via the UI state)
  if (!parsed.data.granted) {
    await sendObjectionConfirmedEmail({ to: session.email });
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Add stub for marketing-objection email**

Stub: `lib/email-templates/marketing-objection.ts`

```ts
// lib/email-templates/marketing-objection.ts (stub — real impl in J)
import "server-only";
export async function sendObjectionConfirmedEmail(input: { to: string }): Promise<void> {
  console.log("[stub] marketing-objection email", input);
}
```

- [ ] **Step 5: Type-check + build**

Run: `npx tsc --noEmit && npx next build`
Expected: green.

- [ ] **Step 6: Commit (covers E.1-E.3)**

```bash
git add 'app/(public)/account/data' 'app/api/data-rights/access' 'app/api/data-rights/erasure' 'app/api/data-rights/objection' lib/email-templates/marketing-objection.ts
git commit -m "feat(dsar): logged-in /account/data hub + 3 API handlers

/account/data renders a data summary, marketing toggle (instant), 'Download
my data' (request only — admin actions later), and 'Close my account' with
two-step confirmation modal. The API handlers create pre-verified requests
(session proves identity), so SLA clock starts immediately. Objection
handler is the only one that's auto-processed (instant flag flip + 2 audit
events + confirmation email)."
```

---

## Section F — Admin queue + handlers

### Task F.1: Build the queue list page

**Files:**
- Create: `app/(admin)/admin/data-rights/page.tsx`

- [ ] **Step 1: Write the file**

```tsx
// app/(admin)/admin/data-rights/page.tsx
import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { assertAdmin } from "@/lib/admin-auth";
import { listRequests } from "@/lib/data-rights";

const TYPE_LABELS: Record<string, string> = {
  access: "Access",
  rectification: "Rectification",
  erasure: "Erasure",
  objection: "Objection",
};

const STATUS_LABELS: Record<string, string> = {
  pending_email_verification: "Awaiting email confirmation",
  queued: "Queued",
  in_progress: "In progress",
  completed: "Completed",
  rejected: "Rejected",
};

function daysRemaining(deadline: Date): number {
  return Math.floor((deadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function chipClass(days: number): string {
  if (days < 7) return "bg-red-100 text-red-900";
  if (days < 14) return "bg-compliance-amber-bg text-compliance-amber-text";
  return "bg-offwhite text-muted";
}

async function QueueContent() {
  await connection();
  await assertAdmin();
  const requests = await listRequests();

  return (
    <ul className="divide-y divide-border">
      {requests.length === 0 ? (
        <li className="py-12 text-center text-muted">No data-rights requests yet.</li>
      ) : (
        requests.map((r) => {
          const days = daysRemaining(r.deadline);
          return (
            <li key={r.id}>
              <Link
                href={`/admin/data-rights/${r.id}`}
                className="grid grid-cols-[120px_180px_1fr_140px_100px] gap-3 px-4 py-3 text-sm hover:bg-offwhite items-center"
              >
                <span className="text-navy">{TYPE_LABELS[r.type] ?? r.type}</span>
                <span className="text-muted truncate">{r.requester.email}</span>
                <span className="text-xs text-muted">{STATUS_LABELS[r.status] ?? r.status}</span>
                <span className="mono text-[10px] text-muted">
                  {r.createdAt.toLocaleDateString("en-GB")}
                </span>
                <span className={`text-xs px-2 py-1 text-center ${chipClass(days)}`}>
                  {r.status === "completed" || r.status === "rejected"
                    ? "—"
                    : `${days}d`}
                </span>
              </Link>
            </li>
          );
        })
      )}
    </ul>
  );
}

export default function DataRightsQueuePage() {
  return (
    <div className="p-6">
      <h1 className="font-serif text-3xl text-navy mb-2">Data rights queue</h1>
      <p className="text-sm text-muted mb-6">
        UK GDPR requires response within 30 days. Sorted by deadline ascending.
      </p>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <QueueContent />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 2: No commit yet**

Continue to F.2.

---

### Task F.2: Build the detail-page dispatcher

**Files:**
- Create: `app/(admin)/admin/data-rights/[id]/page.tsx`

- [ ] **Step 1: Write the file**

```tsx
// app/(admin)/admin/data-rights/[id]/page.tsx
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { assertAdmin } from "@/lib/admin-auth";
import { getRequestById } from "@/lib/data-rights";
import { AccessRequestPanel } from "./AccessRequestPanel";
import { ErasureRequestPanel } from "./ErasureRequestPanel";
import { RectificationRequestPanel } from "./RectificationRequestPanel";
import { ObjectionRequestPanel } from "./ObjectionRequestPanel";

async function RequestDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  await assertAdmin();
  const { id } = await params;
  const request = await getRequestById(id);
  if (!request) notFound();

  switch (request.type) {
    case "access":
      return <AccessRequestPanel request={request} />;
    case "erasure":
      return <ErasureRequestPanel request={request} />;
    case "rectification":
      return <RectificationRequestPanel request={request} />;
    case "objection":
      return <ObjectionRequestPanel request={request} />;
  }
}

export default function RequestDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="p-6 max-w-4xl">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <RequestDetail params={props.params} />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 2: No commit yet — panels in F.3-F.6**

Continue to F.3.

---

### Task F.3: Build the access-request panel

**Files:**
- Create: `app/(admin)/admin/data-rights/[id]/AccessRequestPanel.tsx`

- [ ] **Step 1: Write the file**

```tsx
// app/(admin)/admin/data-rights/[id]/AccessRequestPanel.tsx
"use client";

import { useState } from "react";
import type { DataRightsRequest } from "@/types/data-rights";
import { generateAndSendAccessExport } from "./actions";

export function AccessRequestPanel({ request }: { request: DataRightsRequest }) {
  const [busy, setBusy] = useState(false);
  const [sentAt, setSentAt] = useState<string | null>(
    request.respondedAt?.toISOString() ?? null
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setBusy(true);
    setError(null);
    try {
      const res = await generateAndSendAccessExport(request.id);
      if (!res.ok) {
        setError(res.reason);
        return;
      }
      setSentAt(new Date().toISOString());
    } catch {
      setError("Failed to send. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-serif text-3xl text-navy mb-2">Access request</h1>
      <RequestHeader request={request} />

      <section className="border border-border p-6 mt-6">
        <h2 className="label-editorial text-sm text-navy mb-3">Action</h2>
        {sentAt ? (
          <div className="text-sm text-navy">
            Bundle sent {new Date(sentAt).toLocaleDateString("en-GB")}.{" "}
            <span className="text-muted">Request marked complete.</span>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted mb-4">
              Click below to generate the export bundle (profile + orders +
              events + audit log + enquiries + consent history) and email it
              to {request.requester.email}.
            </p>
            <button
              type="button"
              onClick={handleSend}
              disabled={busy}
              className="px-4 py-2 bg-navy text-white text-xs uppercase tracking-wider hover:bg-mid-navy disabled:opacity-50"
            >
              {busy ? "Generating…" : "Generate + send bundle"}
            </button>
            {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
          </>
        )}
      </section>
    </div>
  );
}

function RequestHeader({ request }: { request: DataRightsRequest }) {
  return (
    <dl className="grid grid-cols-[140px_1fr] gap-y-1 text-sm bg-offwhite p-4 border border-border">
      <dt className="text-muted">Requester</dt>
      <dd className="text-navy">
        {request.requester.email}
        {request.requester.uid && (
          <span className="ml-2 mono text-xs text-muted">
            uid: {request.requester.uid}
          </span>
        )}
      </dd>
      <dt className="text-muted">Source</dt>
      <dd className="text-navy">{request.source}</dd>
      <dt className="text-muted">Created</dt>
      <dd className="text-navy mono text-xs">{request.createdAt.toLocaleString("en-GB")}</dd>
      <dt className="text-muted">Deadline</dt>
      <dd className="text-navy mono text-xs">{request.deadline.toLocaleString("en-GB")}</dd>
      {request.message && (
        <>
          <dt className="text-muted">Message</dt>
          <dd className="text-navy whitespace-pre-wrap">{request.message}</dd>
        </>
      )}
    </dl>
  );
}
```

- [ ] **Step 2: No commit yet**

Continue to F.4.

---

### Task F.4: Build the erasure-request panel

**Files:**
- Create: `app/(admin)/admin/data-rights/[id]/ErasureRequestPanel.tsx`

- [ ] **Step 1: Write the file**

```tsx
// app/(admin)/admin/data-rights/[id]/ErasureRequestPanel.tsx
"use client";

import { useState, useTransition } from "react";
import type { DataRightsRequest } from "@/types/data-rights";
import { previewErasure, runErasure, type ErasurePreview } from "./actions";

export function ErasureRequestPanel({ request }: { request: DataRightsRequest }) {
  const [preview, setPreview] = useState<ErasurePreview | null>(null);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(
    request.respondedAt?.toISOString() ?? null
  );
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function loadPreview() {
    setBusy(true);
    setError(null);
    try {
      const result = await previewErasure(request.id);
      setPreview(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleRun() {
    if (confirmEmail !== request.requester.email) {
      setError("Confirmation email does not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await runErasure(request.id, confirmEmail);
      if (!result.ok) {
        setError(result.reason);
        return;
      }
      setCompletedAt(new Date().toISOString());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-serif text-3xl text-navy mb-2">Erasure request</h1>
      <Header request={request} />

      {completedAt ? (
        <section className="border border-border p-6 mt-6 bg-offwhite">
          <p className="text-sm text-navy">
            Erasure completed {new Date(completedAt).toLocaleDateString("en-GB")}.
          </p>
        </section>
      ) : (
        <>
          <section className="border border-border p-6 mt-6">
            <h2 className="label-editorial text-sm text-navy mb-3">Step 1 — Preview</h2>
            {preview ? (
              <PreviewSummary preview={preview} />
            ) : (
              <button
                type="button"
                onClick={loadPreview}
                disabled={busy}
                className="px-4 py-2 border border-border text-xs uppercase tracking-wider hover:bg-offwhite disabled:opacity-50"
              >
                {busy ? "Loading…" : "Run erasure preview"}
              </button>
            )}
          </section>

          {preview && preview.blockers.length === 0 && (
            <section className="border border-border p-6 mt-6">
              <h2 className="label-editorial text-sm text-navy mb-3">Step 2 — Confirm</h2>
              <p className="text-sm text-muted mb-4">
                Type the requester's email exactly to confirm. This action is
                irreversible.
              </p>
              <input
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={request.requester.email}
                className="w-full border border-border bg-white px-3 py-2 mb-4 mono text-sm"
              />
              <button
                type="button"
                onClick={handleRun}
                disabled={busy || confirmEmail !== request.requester.email}
                className="px-4 py-2 bg-navy text-white text-xs uppercase tracking-wider hover:bg-mid-navy disabled:opacity-50"
              >
                {busy ? "Erasing…" : "Run erasure"}
              </button>
            </section>
          )}
        </>
      )}

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
    </div>
  );
}

function Header({ request }: { request: DataRightsRequest }) {
  return (
    <dl className="grid grid-cols-[140px_1fr] gap-y-1 text-sm bg-offwhite p-4 border border-border">
      <dt className="text-muted">Requester</dt>
      <dd className="text-navy">{request.requester.email}</dd>
      <dt className="text-muted">Created</dt>
      <dd className="mono text-xs">{request.createdAt.toLocaleString("en-GB")}</dd>
      <dt className="text-muted">Deadline</dt>
      <dd className="mono text-xs">{request.deadline.toLocaleString("en-GB")}</dd>
    </dl>
  );
}

function PreviewSummary({ preview }: { preview: ErasurePreview }) {
  return (
    <div className="text-sm">
      <ul className="space-y-1 mb-4">
        <li>Auth user: <strong>{preview.authUserExists ? "will be deleted" : "already gone"}</strong></li>
        <li>Customer doc: <strong>{preview.customerDocExists ? "will be deleted" : "no doc"}</strong></li>
        <li>Customer events: <strong>{preview.customerEventsCount}</strong> records will be deleted</li>
        <li>Enquiries: <strong>{preview.enquiriesCount}</strong> records will be deleted</li>
        <li>Orders: <strong>{preview.ordersToAnonymise}</strong> orders will be anonymised (NOT deleted)</li>
        <li>Audit log entries: <strong>{preview.auditLogScrubCount}</strong> entries will have PII scrubbed</li>
      </ul>

      {preview.blockers.length > 0 && (
        <div className="bg-compliance-amber-bg border border-compliance-amber-border p-3 text-compliance-amber-text">
          <p className="font-bold text-xs uppercase mb-2">Cannot proceed</p>
          <ul className="text-xs space-y-1">
            {preview.blockers.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: No commit yet**

Continue to F.5.

---

### Task F.5: Build the rectification + objection panels

**Files:**
- Create: `app/(admin)/admin/data-rights/[id]/RectificationRequestPanel.tsx`
- Create: `app/(admin)/admin/data-rights/[id]/ObjectionRequestPanel.tsx`

- [ ] **Step 1: Write `RectificationRequestPanel.tsx`**

```tsx
// app/(admin)/admin/data-rights/[id]/RectificationRequestPanel.tsx
"use client";

import { useState } from "react";
import type { DataRightsRequest } from "@/types/data-rights";
import { markRectificationComplete } from "./actions";

export function RectificationRequestPanel({ request }: { request: DataRightsRequest }) {
  const [done, setDone] = useState(request.status === "completed");
  const [busy, setBusy] = useState(false);

  return (
    <div>
      <h1 className="font-serif text-3xl text-navy mb-2">Rectification request</h1>
      <dl className="grid grid-cols-[140px_1fr] gap-y-1 text-sm bg-offwhite p-4 border border-border mb-6">
        <dt className="text-muted">Requester</dt>
        <dd className="text-navy">{request.requester.email}</dd>
        {request.message && (
          <>
            <dt className="text-muted">Message</dt>
            <dd className="text-navy whitespace-pre-wrap">{request.message}</dd>
          </>
        )}
      </dl>

      <section className="border border-border p-6">
        <p className="text-sm text-muted mb-4">
          The customer can self-serve at <strong>/account/settings</strong>. If
          they cannot access their account (lost password, account closed),
          confirm identity manually before making any changes on their behalf.
        </p>
        {done ? (
          <p className="text-sm text-navy">Marked complete.</p>
        ) : (
          <button
            type="button"
            onClick={async () => {
              setBusy(true);
              await markRectificationComplete(request.id);
              setDone(true);
              setBusy(false);
            }}
            disabled={busy}
            className="px-4 py-2 bg-navy text-white text-xs uppercase tracking-wider hover:bg-mid-navy disabled:opacity-50"
          >
            {busy ? "Saving…" : "Mark complete"}
          </button>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Write `ObjectionRequestPanel.tsx`**

```tsx
// app/(admin)/admin/data-rights/[id]/ObjectionRequestPanel.tsx
import type { DataRightsRequest } from "@/types/data-rights";

export function ObjectionRequestPanel({ request }: { request: DataRightsRequest }) {
  return (
    <div>
      <h1 className="font-serif text-3xl text-navy mb-2">Marketing objection</h1>
      <dl className="grid grid-cols-[140px_1fr] gap-y-1 text-sm bg-offwhite p-4 border border-border mb-6">
        <dt className="text-muted">Requester</dt>
        <dd className="text-navy">{request.requester.email}</dd>
        <dt className="text-muted">Status</dt>
        <dd className="text-navy">
          {request.status === "completed" ? "Auto-processed (instant)" : request.status}
        </dd>
      </dl>
      <p className="text-sm text-muted">
        Objections are auto-processed at the API layer. Sam doesn't need to
        action this — it's recorded here for audit purposes only.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: No commit yet**

Continue to F.6.

---

### Task F.6: Build the admin server-actions module

**Files:**
- Create: `app/(admin)/admin/data-rights/[id]/actions.ts`

- [ ] **Step 1: Write the file**

```ts
// app/(admin)/admin/data-rights/[id]/actions.ts
"use server";

import { Timestamp } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/admin-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { writeAuditEvent } from "@/lib/audit-log";
import { getRequestById } from "@/lib/data-rights";
import { buildAccessExport } from "@/lib/data-export";
import { previewErasure as previewErasureCore, runErasure as runErasureCore } from "@/lib/erasure";
import { sendAccessExportEmail } from "@/lib/email-templates/access-export";
import { sendErasureConfirmedEmail } from "@/lib/email-templates/erasure-confirmed";

export type ErasurePreview = {
  authUserExists: boolean;
  customerDocExists: boolean;
  customerEventsCount: number;
  enquiriesCount: number;
  ordersToAnonymise: number;
  auditLogScrubCount: number;
  blockers: string[];
};

export async function previewErasure(requestId: string): Promise<ErasurePreview> {
  await assertAdmin();
  const request = await getRequestById(requestId);
  if (!request) throw new Error("Request not found");
  return previewErasureCore({ email: request.requester.email, uid: request.requester.uid });
}

export async function runErasure(
  requestId: string,
  confirmEmail: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  await assertAdmin();
  const request = await getRequestById(requestId);
  if (!request) return { ok: false, reason: "Request not found" };
  if (confirmEmail !== request.requester.email) {
    return { ok: false, reason: "Confirmation email mismatch" };
  }

  const result = await runErasureCore({
    email: request.requester.email,
    uid: request.requester.uid,
    requestId,
  });

  if (!result.ok) return result;

  const db = getAdminDb()!;
  await db.doc(`dataRightsRequests/${requestId}`).update({
    status: "completed",
    respondedAt: Timestamp.now(),
    responseArtefactRef: `erasure-summary:${result.summaryId}`,
  });

  await writeAuditEvent({
    eventType: "customer.erasure_completed",
    target: { kind: "user", id: request.requester.uid ?? request.requester.email },
    metadata: {
      requestId,
      ordersAnonymised: result.ordersAnonymised,
      eventsDeleted: result.eventsDeleted,
      auditLogsScrubbed: result.auditLogsScrubbed,
    },
    snapshotAfter: {
      erasedFields: ["email", "name", "phone", "addressLine1", "addressLine2"],
    },
  });

  await sendErasureConfirmedEmail({ to: request.requester.email });

  revalidatePath("/admin/data-rights");
  revalidatePath(`/admin/data-rights/${requestId}`);
  return { ok: true };
}

export async function generateAndSendAccessExport(
  requestId: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  await assertAdmin();
  const request = await getRequestById(requestId);
  if (!request) return { ok: false, reason: "Request not found" };

  const { downloadUrl } = await buildAccessExport({
    email: request.requester.email,
    uid: request.requester.uid,
    requestId,
  });

  await sendAccessExportEmail({
    to: request.requester.email,
    downloadUrl,
  });

  const db = getAdminDb()!;
  await db.doc(`dataRightsRequests/${requestId}`).update({
    status: "completed",
    respondedAt: Timestamp.now(),
    responseArtefactRef: downloadUrl,
  });

  await writeAuditEvent({
    eventType: "customer.access_completed",
    target: { kind: "user", id: request.requester.uid },
    metadata: { requestId, downloadUrl },
  });

  revalidatePath("/admin/data-rights");
  revalidatePath(`/admin/data-rights/${requestId}`);
  return { ok: true };
}

export async function markRectificationComplete(requestId: string): Promise<void> {
  await assertAdmin();
  const db = getAdminDb()!;
  await db.doc(`dataRightsRequests/${requestId}`).update({
    status: "completed",
    respondedAt: Timestamp.now(),
  });
  await writeAuditEvent({
    eventType: "customer.rectification_completed",
    target: { kind: "user", id: null },
    metadata: { requestId },
  });
  revalidatePath("/admin/data-rights");
  revalidatePath(`/admin/data-rights/${requestId}`);
}
```

- [ ] **Step 2: Add stubs for email helpers + erasure + export**

Stubs (real implementations land in Sections G, H, J):

`lib/email-templates/access-export.ts`:
```ts
import "server-only";
export async function sendAccessExportEmail(input: { to: string; downloadUrl: string }): Promise<void> {
  console.log("[stub] access-export email", input);
}
```

`lib/email-templates/erasure-confirmed.ts`:
```ts
import "server-only";
export async function sendErasureConfirmedEmail(input: { to: string }): Promise<void> {
  console.log("[stub] erasure-confirmed email", input);
}
```

`lib/erasure.ts` skeleton:
```ts
import "server-only";
export async function previewErasure(input: { email: string; uid: string | null }) {
  return {
    authUserExists: false,
    customerDocExists: false,
    customerEventsCount: 0,
    enquiriesCount: 0,
    ordersToAnonymise: 0,
    auditLogScrubCount: 0,
    blockers: ["NOT IMPLEMENTED — see Section G"],
  };
}
export async function runErasure(input: { email: string; uid: string | null; requestId: string }):
  Promise<{ ok: true; summaryId: string; ordersAnonymised: number; eventsDeleted: number; auditLogsScrubbed: number } | { ok: false; reason: string }> {
  return { ok: false, reason: "NOT IMPLEMENTED — see Section G" };
}
```

`lib/data-export.ts` skeleton:
```ts
import "server-only";
export async function buildAccessExport(input: { email: string; uid: string | null; requestId: string }):
  Promise<{ downloadUrl: string }> {
  return { downloadUrl: "" };
}
```

- [ ] **Step 3: Type-check + build**

Run: `npx tsc --noEmit && npx next build`
Expected: green build with stubs.

- [ ] **Step 4: Commit (covers F.1-F.6)**

```bash
git add 'app/(admin)/admin/data-rights' lib/erasure.ts lib/data-export.ts lib/email-templates/access-export.ts lib/email-templates/erasure-confirmed.ts
git commit -m "feat(dsar): admin queue list + 4 detail panels + actions module

Queue list sorts by deadline ASC with red/amber/green deadline chips.
Detail dispatcher routes by request type to one of 4 panels (access,
erasure, rectification, objection). Erasure panel enforces typed-email
confirmation. Actions module wires preview + execute + email send (stubs
for now — real impls in Sections G, H, J)."
```

---

## Section G — Erasure executor

### Task G.1: Implement preview + executor

**Files:**
- Modify: `lib/erasure.ts` (replace stub)

- [ ] **Step 1: Write the real implementation**

```ts
// lib/erasure.ts
import "server-only";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { createHash } from "node:crypto";
import { getAdminDb, getAdminAuthSdk } from "@/lib/firebase/admin";
import type { Order } from "@/types";

const ERASED_FIELDS = ["email", "name", "phone", "addressLine1", "addressLine2"] as const;

const PII_FIELD_NAMES = new Set([
  "email",
  "name",
  "phone",
  "addressLine1",
  "addressLine2",
]);

export type ErasurePreview = {
  authUserExists: boolean;
  customerDocExists: boolean;
  customerEventsCount: number;
  enquiriesCount: number;
  ordersToAnonymise: number;
  auditLogScrubCount: number;
  blockers: string[];
};

export type ErasureInput = {
  email: string;
  uid: string | null;
  requestId: string;
};

export type ErasureResult =
  | {
      ok: true;
      summaryId: string;
      ordersAnonymised: number;
      eventsDeleted: number;
      auditLogsScrubbed: number;
    }
  | { ok: false; reason: string };

function erasedEmailFor(uid: string | null, email: string): string {
  const seed = uid ?? email;
  const hash = createHash("sha256").update(seed).digest("hex").slice(0, 12);
  return `erased+${hash}@cryogene.co.uk`;
}

function piiScrub(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(piiScrub);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (PII_FIELD_NAMES.has(key)) {
        out[key] = "[erased]";
      } else {
        out[key] = piiScrub(v);
      }
    }
    return out;
  }
  return value;
}

export async function previewErasure(input: { email: string; uid: string | null }): Promise<ErasurePreview> {
  const db = getAdminDb();
  const auth = getAdminAuthSdk();
  if (!db || !auth) {
    return {
      authUserExists: false,
      customerDocExists: false,
      customerEventsCount: 0,
      enquiriesCount: 0,
      ordersToAnonymise: 0,
      auditLogScrubCount: 0,
      blockers: ["Firestore or Auth admin SDK not configured"],
    };
  }

  let authUserExists = false;
  if (input.uid) {
    try {
      await auth.getUser(input.uid);
      authUserExists = true;
    } catch {
      authUserExists = false;
    }
  } else {
    try {
      const u = await auth.getUserByEmail(input.email);
      input = { email: input.email, uid: u.uid };
      authUserExists = true;
    } catch {
      authUserExists = false;
    }
  }

  const blockers: string[] = [];

  // Open-order check
  let openOrders: number = 0;
  if (input.uid) {
    const openSnap = await db
      .collection("orders")
      .where("customer.uid", "==", input.uid)
      .where("status", "in", ["pending", "paid"])
      .get();
    openOrders = openSnap.size;
    if (openOrders > 0) {
      blockers.push(
        `Customer has ${openOrders} open order(s) (status pending/paid). Complete or cancel before erasure.`
      );
    }
  }

  // Counts (best-effort by uid OR email)
  const customerEvents = input.uid
    ? await db.collection("customerEvents").where("uid", "==", input.uid).count().get()
    : await db.collection("customerEvents").where("email", "==", input.email).count().get();

  const enquiries = await db.collection("enquiries").where("email", "==", input.email).count().get();

  const orders = input.uid
    ? await db.collection("orders").where("customer.uid", "==", input.uid).count().get()
    : { data: () => ({ count: 0 }) };

  const auditLogs = input.uid
    ? await db.collection("auditLogs").where("actor.uid", "==", input.uid).count().get()
    : { data: () => ({ count: 0 }) };

  const customerDoc = input.uid ? await db.doc(`customers/${input.uid}`).get() : null;

  return {
    authUserExists,
    customerDocExists: !!customerDoc?.exists,
    customerEventsCount: customerEvents.data().count ?? 0,
    enquiriesCount: enquiries.data().count ?? 0,
    ordersToAnonymise: orders.data().count ?? 0,
    auditLogScrubCount: auditLogs.data().count ?? 0,
    blockers,
  };
}

async function deleteCollectionByQuery(
  db: FirebaseFirestore.Firestore,
  query: FirebaseFirestore.Query,
  batchSize: number = 500
): Promise<number> {
  let total = 0;
  while (true) {
    const snap = await query.limit(batchSize).get();
    if (snap.empty) return total;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    total += snap.size;
    if (snap.size < batchSize) return total;
  }
}

export async function runErasure(input: ErasureInput): Promise<ErasureResult> {
  const db = getAdminDb();
  const auth = getAdminAuthSdk();
  if (!db || !auth) return { ok: false, reason: "Firestore or Auth not configured" };

  // Resolve uid if missing
  let uid = input.uid;
  if (!uid) {
    try {
      const u = await auth.getUserByEmail(input.email);
      uid = u.uid;
    } catch {
      uid = null;
    }
  }

  // Pre-flight: re-check open orders (preview was advisory; the actual gate is here)
  if (uid) {
    const openSnap = await db
      .collection("orders")
      .where("customer.uid", "==", uid)
      .where("status", "in", ["pending", "paid"])
      .get();
    if (openSnap.size > 0) {
      return {
        ok: false,
        reason: `Customer has ${openSnap.size} open order(s); complete or cancel before erasure.`,
      };
    }
  }

  // 1. Delete auth user
  if (uid) {
    try { await auth.deleteUser(uid); } catch (err) {
      console.warn("[erasure] auth.deleteUser failed (may already be gone):", err);
    }
  }

  // 2. Delete customer doc + history subcollection
  if (uid) {
    const historyRef = db.collection(`customers/${uid}/marketingConsentHistory`);
    await deleteCollectionByQuery(db, historyRef);
    await db.doc(`customers/${uid}`).delete().catch(() => {});
  }

  // 3. Delete customerEvents
  let eventsDeleted = 0;
  if (uid) {
    eventsDeleted += await deleteCollectionByQuery(
      db,
      db.collection("customerEvents").where("uid", "==", uid)
    );
  }
  eventsDeleted += await deleteCollectionByQuery(
    db,
    db.collection("customerEvents").where("email", "==", input.email)
  );

  // 4. Delete enquiries
  await deleteCollectionByQuery(
    db,
    db.collection("enquiries").where("email", "==", input.email)
  );

  // 5. Anonymise orders (NOT delete)
  let ordersAnonymised = 0;
  if (uid) {
    const orderSnap = await db
      .collection("orders")
      .where("customer.uid", "==", uid)
      .get();
    const replacementEmail = erasedEmailFor(uid, input.email);
    const batchSize = 400;
    for (let i = 0; i < orderSnap.docs.length; i += batchSize) {
      const batch = db.batch();
      const slice = orderSnap.docs.slice(i, i + batchSize);
      for (const d of slice) {
        batch.update(d.ref, {
          "customer.email": replacementEmail,
          "customer.name": "Erased Customer",
          "customer.phone": null,
          "customer.uid": null,
          "customer.address.line1": null,
          "customer.address.line2": null,
          erasedAt: Timestamp.now(),
          erasureRequestId: input.requestId,
        });
      }
      await batch.commit();
      ordersAnonymised += slice.length;
    }
  }

  // 6. Scrub PII from audit logs
  let auditLogsScrubbed = 0;
  if (uid) {
    const audSnap = await db
      .collection("auditLogs")
      .where("actor.uid", "==", uid)
      .get();
    const replacementEmail = erasedEmailFor(uid, input.email);
    const batchSize = 400;
    for (let i = 0; i < audSnap.docs.length; i += batchSize) {
      const batch = db.batch();
      const slice = audSnap.docs.slice(i, i + batchSize);
      for (const d of slice) {
        const data = d.data();
        batch.update(d.ref, {
          "actor.email": replacementEmail,
          "actor.uid": null,
          before: piiScrub(data.before),
          after: piiScrub(data.after),
          snapshotAfter: piiScrub(data.snapshotAfter),
        });
      }
      await batch.commit();
      auditLogsScrubbed += slice.length;
    }
  }

  // 7. Write summary doc for evidence retention
  const summaryRef = await db.collection("erasureSummaries").add({
    createdAt: Timestamp.now(),
    requestId: input.requestId,
    erasedFields: ERASED_FIELDS,
    ordersAnonymised,
    eventsDeleted,
    auditLogsScrubbed,
  });

  return {
    ok: true,
    summaryId: summaryRef.id,
    ordersAnonymised,
    eventsDeleted,
    auditLogsScrubbed,
  };
}
```

- [ ] **Step 2: Add `erasureSummaries` rule**

Append to `firestore.rules`:

```
    match /erasureSummaries/{id} {
      allow read: if request.auth.token.admin == true;
      allow create, update, delete: if false;
    }
```

- [ ] **Step 3: Type-check + build**

Run: `npx tsc --noEmit && npx next build`
Expected: green.

- [ ] **Step 4: Commit**

```bash
git add lib/erasure.ts firestore.rules
git commit -m "feat(dsar): erasure executor — anonymise orders, scrub audit logs, delete PII

Pre-flight blocks open orders. Deletes auth user, customer doc + history,
customerEvents (by uid + email), enquiries (by email). Anonymises orders
in-place (HMRC reconciliation). PII-scrubs auditLogs entries that
referenced this customer. Writes a summary doc to erasureSummaries for
post-hoc evidence."
```

---

## Section H — Access export bundle

### Task H.1: Install jszip

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install**

Run: `npm install jszip`

- [ ] **Step 2: Verify**

Run: `node -e "console.log(require('jszip').version || require('./node_modules/jszip/package.json').version)"`
Expected: a version string (likely 3.10.x)

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add jszip for DSAR access-export bundle generation"
```

---

### Task H.2: Implement `lib/data-export.ts`

**Files:**
- Modify: `lib/data-export.ts` (replace stub)

- [ ] **Step 1: Write the file**

```ts
// lib/data-export.ts
import "server-only";
import JSZip from "jszip";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb, getAdminStorageSdk } from "@/lib/firebase/admin";

type ExportInput = { email: string; uid: string | null; requestId: string };

function tsToIso(v: unknown): string {
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (v instanceof Date) return v.toISOString();
  return "";
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "string" ? value : JSON.stringify(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv<T extends Record<string, unknown>>(rows: T[], columns: (keyof T)[]): string {
  const header = columns.join(",");
  const body = rows.map((r) =>
    columns.map((c) => csvEscape(r[c])).join(",")
  );
  return [header, ...body].join("\n");
}

const README = `Cryogene Laboratories — your data export
=========================================

This bundle contains everything we hold on you, in two formats:

- *.csv — opens in Excel, Google Sheets, or any text editor
- *.json — machine-readable for portability under UK GDPR Art. 20

Files included:
- profile.json: your customer profile
- orders.csv / orders.json: every order you've placed
- customer-events.csv: anonymised analytics signals
- audit-log.csv: our internal audit-trail entries that reference you
- enquiries.csv: messages you've sent us via the contact form
- marketing-consent-history.csv: provenance of marketing consent changes

Questions? Email Cryogene at the address on our /contact page.

This export was generated under your right of access (UK GDPR Art. 15).
You also have the right to rectification, erasure, and to object to direct
marketing — see https://cryogene.co.uk/data-rights.
`;

export async function buildAccessExport(input: ExportInput): Promise<{ downloadUrl: string }> {
  const db = getAdminDb();
  const storage = getAdminStorageSdk();
  if (!db || !storage) throw new Error("Firestore or Storage admin SDK not configured");

  const zip = new JSZip();
  zip.file("README.txt", README);

  // Profile
  if (input.uid) {
    const customerSnap = await db.doc(`customers/${input.uid}`).get();
    if (customerSnap.exists) {
      zip.file(
        "profile.json",
        JSON.stringify({ ...customerSnap.data(), id: customerSnap.id }, null, 2)
      );
    }
  }

  // Orders (uid OR email)
  const orderQuery = input.uid
    ? db.collection("orders").where("customer.uid", "==", input.uid)
    : db.collection("orders").where("customer.email", "==", input.email);
  const orderSnap = await orderQuery.get();
  const orderRows = orderSnap.docs.map((d) => ({
    id: d.id,
    orderNumber: (d.data().orderNumber ?? "") as string,
    status: (d.data().status ?? "") as string,
    createdAt: tsToIso(d.data().createdAt),
    totalInPence: (d.data().totalInPence ?? 0) as number,
  }));
  zip.file("orders.csv", toCsv(orderRows, ["id", "orderNumber", "status", "createdAt", "totalInPence"]));
  zip.file(
    "orders.json",
    JSON.stringify(orderSnap.docs.map((d) => ({ ...d.data(), id: d.id })), null, 2)
  );

  // Customer events
  const eventsQuery = input.uid
    ? db.collection("customerEvents").where("uid", "==", input.uid)
    : db.collection("customerEvents").where("email", "==", input.email);
  const eventsSnap = await eventsQuery.limit(50_000).get();
  const eventRows = eventsSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      eventType: data.eventType ?? "",
      createdAt: tsToIso(data.createdAt),
      sessionId: data.sessionId ?? "",
      payload: data.payload ?? {},
    };
  });
  zip.file("customer-events.csv", toCsv(eventRows, ["id", "eventType", "createdAt", "sessionId", "payload"]));

  // Audit log
  if (input.uid) {
    const audSnap = await db
      .collection("auditLogs")
      .where("actor.uid", "==", input.uid)
      .limit(50_000)
      .get();
    const audRows = audSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        eventType: data.eventType ?? "",
        createdAt: tsToIso(data.createdAt),
        targetKind: data.target?.kind ?? "",
        targetId: data.target?.id ?? "",
      };
    });
    zip.file("audit-log.csv", toCsv(audRows, ["id", "eventType", "createdAt", "targetKind", "targetId"]));
  }

  // Enquiries
  const enqSnap = await db.collection("enquiries").where("email", "==", input.email).get();
  const enqRows = enqSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      subject: data.subject ?? "",
      message: data.message ?? "",
      status: data.status ?? "",
      createdAt: tsToIso(data.createdAt),
    };
  });
  zip.file("enquiries.csv", toCsv(enqRows, ["id", "subject", "message", "status", "createdAt"]));

  // Marketing consent history
  if (input.uid) {
    const histSnap = await db.collection(`customers/${input.uid}/marketingConsentHistory`).get();
    const histRows = histSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        granted: !!data.granted,
        changedAt: tsToIso(data.changedAt),
        source: data.source ?? "",
      };
    });
    zip.file("marketing-consent-history.csv", toCsv(histRows, ["id", "granted", "changedAt", "source"]));
  }

  const buf = await zip.generateAsync({ type: "nodebuffer" });

  const bucket = storage.bucket();
  const objectPath = `dataExports/${input.requestId}.zip`;
  const file = bucket.file(objectPath);
  await file.save(buf, {
    contentType: "application/zip",
    metadata: { metadata: { requestId: input.requestId, email: input.email } },
  });

  // 7-day signed URL
  const [signedUrl] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  return { downloadUrl: signedUrl };
}
```

- [ ] **Step 2: Type-check + build**

Run: `npx tsc --noEmit && npx next build`
Expected: green.

- [ ] **Step 3: Commit**

```bash
git add lib/data-export.ts
git commit -m "feat(dsar): access-export bundle generator (jszip)

Builds in-memory ZIP with profile.json, orders.csv/.json, customer-events,
audit-log, enquiries, marketing-consent-history, README. Uploads to
Firebase Storage at dataExports/{requestId}.zip with 7-day signed URL.
50k row hard cap per CSV file."
```

---

## Section I — SLA-warning Cloud Function

### Task I.1: Scaffold Firebase Functions package

**Files:**
- Create: `functions/package.json`
- Create: `functions/tsconfig.json`
- Modify: `.firebaserc` (add functions if missing — likely add)

- [ ] **Step 1: Write `functions/package.json`**

```json
{
  "name": "cryogene-functions",
  "version": "0.1.0",
  "engines": { "node": "22" },
  "main": "lib/index.js",
  "scripts": {
    "build": "tsc",
    "deploy": "firebase deploy --only functions"
  },
  "dependencies": {
    "firebase-admin": "^13.0.0",
    "firebase-functions": "^6.0.0",
    "resend": "^4.0.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/node": "^22.0.0"
  },
  "private": true
}
```

- [ ] **Step 2: Write `functions/tsconfig.json`**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "es2022",
    "moduleResolution": "node",
    "outDir": "lib",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Update `.firebaserc`**

Run: `cat .firebaserc`

If `functions` is not listed under the project's deploy targets, add it. The structure varies; add only what's missing.

- [ ] **Step 4: Install Functions deps**

Run: `cd functions && npm install && cd ..`

- [ ] **Step 5: Commit**

```bash
git add functions/package.json functions/tsconfig.json functions/package-lock.json .firebaserc
git commit -m "feat(dsar): scaffold Firebase Functions package for SLA warnings"
```

---

### Task I.2: Implement `slaWarnings` scheduled function

**Files:**
- Create: `functions/src/index.ts`
- Create: `functions/src/sla-warnings.ts`
- Create: `functions/src/email.ts`

- [ ] **Step 1: Write `functions/src/email.ts`**

```ts
// functions/src/email.ts
import { Resend } from "resend";
import { defineSecret } from "firebase-functions/params";

export const RESEND_API_KEY = defineSecret("RESEND_API_KEY");

export function getResend(): Resend {
  return new Resend(RESEND_API_KEY.value());
}

export function fromAddress(): string {
  return "Cryogene Laboratories <noreply@cryogene.co.uk>";
}
```

- [ ] **Step 2: Write `functions/src/sla-warnings.ts`**

```ts
// functions/src/sla-warnings.ts
import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { defineString } from "firebase-functions/params";
import { getResend, fromAddress, RESEND_API_KEY } from "./email";

if (!getApps().length) initializeApp();

const SAM_EMAIL = defineString("SAM_EMAIL", {
  description: "Address that receives SLA-warning emails",
});

export const slaWarnings = onSchedule(
  {
    schedule: "0 9 * * 1-5",
    timeZone: "Europe/London",
    region: "europe-west2",
    secrets: [RESEND_API_KEY],
  },
  async () => {
    const db = getFirestore();
    const sevenDaysFromNow = Timestamp.fromMillis(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    );

    const snap = await db
      .collection("dataRightsRequests")
      .where("status", "in", ["queued", "in_progress"])
      .where("deadline", "<", sevenDaysFromNow)
      .get();

    const today = new Date().toISOString().slice(0, 10);
    const resend = getResend();

    for (const doc of snap.docs) {
      const data = doc.data();
      const sentTimestamps = (data.slaWarningsSentAt ?? []) as Timestamp[];
      const sentToday = sentTimestamps.some(
        (ts) => ts.toDate().toISOString().slice(0, 10) === today
      );
      if (sentToday) continue;

      const days = Math.floor(
        (data.deadline.toMillis() - Date.now()) / (24 * 60 * 60 * 1000)
      );

      try {
        await resend.emails.send({
          from: fromAddress(),
          to: SAM_EMAIL.value(),
          subject: `Data rights request expires in ${days} day${days === 1 ? "" : "s"}`,
          html: `
            <p>A data-rights request is approaching its 30-day SLA deadline.</p>
            <ul>
              <li><strong>Type:</strong> ${data.type}</li>
              <li><strong>Requester:</strong> ${data.requester?.email}</li>
              <li><strong>Deadline:</strong> ${data.deadline.toDate().toLocaleDateString("en-GB")} (${days} day${days === 1 ? "" : "s"} remaining)</li>
            </ul>
            <p><a href="https://cryogene.co.uk/admin/data-rights/${doc.id}">Open in admin</a></p>
          `,
        });

        await doc.ref.update({
          slaWarningsSentAt: FieldValue.arrayUnion(Timestamp.now()),
        });
      } catch (err) {
        console.error("[sla-warnings] send failed:", err);
      }
    }
  }
);
```

- [ ] **Step 3: Write `functions/src/index.ts`**

```ts
export { slaWarnings } from "./sla-warnings";
```

- [ ] **Step 4: Type-check the functions package**

Run: `cd functions && npx tsc --noEmit && cd ..`
Expected: `EXIT=0`

- [ ] **Step 5: Commit**

```bash
git add functions/src
git commit -m "feat(dsar): SLA-warning Cloud Function — daily 09:00 weekday Europe/London

Queries dataRightsRequests where status in [queued, in_progress] and
deadline < now+7d. Emails Sam once per day per request via Resend
(idempotent through slaWarningsSentAt array). Region europe-west2 to match
existing project pin."
```

---

## Section J — Resend templates (replace stubs)

### Task J.1: Create `lib/email.ts` shared wrapper

**Files:**
- Create: `lib/email.ts`

- [ ] **Step 1: Write the file**

```ts
// lib/email.ts
import "server-only";
import { Resend } from "resend";

let cached: Resend | null = null;

export function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not configured");
  if (!cached) cached = new Resend(key);
  return cached;
}

export const FROM_ADDRESS = "Cryogene Laboratories <noreply@cryogene.co.uk>";
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: `EXIT=0`

- [ ] **Step 3: Commit**

```bash
git add lib/email.ts
git commit -m "feat(email): shared Resend wrapper for transactional templates"
```

---

### Task J.2: Replace the four email-template stubs with real Resend calls

**Files:**
- Modify: `lib/email-templates/verification.ts`
- Modify: `lib/email-templates/access-export.ts`
- Modify: `lib/email-templates/erasure-confirmed.ts`
- Modify: `lib/email-templates/marketing-objection.ts`

- [ ] **Step 1: Replace `verification.ts`**

```ts
// lib/email-templates/verification.ts
import "server-only";
import { getResend, FROM_ADDRESS } from "@/lib/email";

const TYPE_DESCRIPTIONS: Record<string, string> = {
  access: "send you a copy of your data",
  rectification: "correct your details",
  erasure: "erase your account",
  objection: "stop sending you marketing emails",
};

export async function sendVerificationEmail(input: {
  to: string;
  requestType: string;
  verifyUrl: string;
}): Promise<void> {
  const description = TYPE_DESCRIPTIONS[input.requestType] ?? "process your request";
  await getResend().emails.send({
    from: FROM_ADDRESS,
    to: input.to,
    subject: "Confirm your data-rights request",
    html: `
      <p>You asked us to ${description}. Click below to confirm — the link expires in 24 hours.</p>
      <p><a href="${input.verifyUrl}">Confirm my request</a></p>
      <p style="color:#6B7280;font-size:12px">If this wasn't you, you can ignore this email.</p>
    `,
  });
}
```

- [ ] **Step 2: Replace `access-export.ts`**

```ts
// lib/email-templates/access-export.ts
import "server-only";
import { getResend, FROM_ADDRESS } from "@/lib/email";

export async function sendAccessExportEmail(input: {
  to: string;
  downloadUrl: string;
}): Promise<void> {
  await getResend().emails.send({
    from: FROM_ADDRESS,
    to: input.to,
    subject: "Your data export from Cryogene Laboratories",
    html: `
      <p>Your data export is ready. The download link is valid for 7 days:</p>
      <p><a href="${input.downloadUrl}">Download your data</a></p>
      <p>The bundle is a ZIP containing CSV and JSON files. Open the README for a guide.</p>
      <p style="color:#6B7280;font-size:12px">Questions? Reply to this email.</p>
    `,
  });
}
```

- [ ] **Step 3: Replace `erasure-confirmed.ts`**

```ts
// lib/email-templates/erasure-confirmed.ts
import "server-only";
import { getResend, FROM_ADDRESS } from "@/lib/email";

export async function sendErasureConfirmedEmail(input: { to: string }): Promise<void> {
  await getResend().emails.send({
    from: FROM_ADDRESS,
    to: input.to,
    subject: "Your data has been erased",
    html: `
      <p>Your account and personal data have been erased on ${new Date().toLocaleDateString("en-GB")}.</p>
      <p>Order records have been retained in <strong>anonymised form</strong> for 6 years to satisfy
      HMRC tax-record requirements (UK Companies Act). No personally identifiable information remains.</p>
      <p style="color:#6B7280;font-size:12px">If you didn't request this, contact us immediately.</p>
    `,
  });
}
```

- [ ] **Step 4: Replace `marketing-objection.ts`**

```ts
// lib/email-templates/marketing-objection.ts
import "server-only";
import { getResend, FROM_ADDRESS } from "@/lib/email";

export async function sendObjectionConfirmedEmail(input: { to: string }): Promise<void> {
  await getResend().emails.send({
    from: FROM_ADDRESS,
    to: input.to,
    subject: "You have been unsubscribed",
    html: `
      <p>You will no longer receive marketing emails from Cryogene Laboratories.</p>
      <p>Transactional emails (order confirmations, dispatch notifications) will still be sent
      where required for the service.</p>
    `,
  });
}
```

- [ ] **Step 5: Type-check + build**

Run: `npx tsc --noEmit && npx next build`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add lib/email-templates
git commit -m "feat(email): replace 4 DSAR email stubs with real Resend templates"
```

---

## Section K — Footer + nav links + privacy copy

### Task K.1: Add footer link

**Files:**
- Modify: `components/storefront/layout/Footer.tsx`

- [ ] **Step 1: Find the Legal column**

Run: `grep -n "Legal\|/privacy" components/storefront/layout/Footer.tsx | head -10`

- [ ] **Step 2: Add `Your data rights` to the Legal column items array**

Add an entry pointing to `/data-rights`. Match the existing entry shape.

- [ ] **Step 3: Type-check + build + commit**

```bash
npx tsc --noEmit && npx next build
git add components/storefront/layout/Footer.tsx
git commit -m "feat(dsar): add 'Your data rights' link to footer Legal column"
```

---

### Task K.2: Add `Data & privacy` to account sidebar

**Files:**
- Modify: `components/storefront/account/AccountLayout.tsx`

- [ ] **Step 1: Find the existing nav array**

Run: `grep -n "href=\"/account" components/storefront/account/AccountLayout.tsx | head -10`

- [ ] **Step 2: Add an entry for `/account/data` labelled "Data & privacy"**

Match the existing entry shape.

- [ ] **Step 3: Build + commit**

```bash
npx tsc --noEmit && npx next build
git add components/storefront/account/AccountLayout.tsx
git commit -m "feat(dsar): add 'Data & privacy' to account sidebar"
```

---

### Task K.3: Update privacy policy copy

**Files:**
- Modify: `app/(public)/privacy/page.tsx`

- [ ] **Step 1: Read current state**

Run: `head -100 'app/(public)/privacy/page.tsx'`

- [ ] **Step 2: Add a "Your rights" section**

Find a sensible place (probably between existing sections). Insert:

```tsx
<section className="mt-8">
  <h2 className="font-serif text-2xl text-navy mb-3">Your rights</h2>
  <p className="text-muted mb-3">
    Under UK GDPR you have the right to:
  </p>
  <ul className="list-disc pl-6 space-y-1 text-muted">
    <li><strong>Access</strong> the data we hold on you</li>
    <li><strong>Correct</strong> inaccurate data</li>
    <li><strong>Erase</strong> your account and personal data</li>
    <li><strong>Object</strong> to direct marketing emails</li>
  </ul>
  <p className="mt-3 text-muted">
    Exercise any of these rights at <a href="/data-rights" className="underline">cryogene.co.uk/data-rights</a>,
    or — if you have an account — at <a href="/account/data" className="underline">cryogene.co.uk/account/data</a>.
  </p>
  <p className="mt-3 text-muted text-sm">
    We respond within 30 days. Order records are retained in anonymised form
    for 6 years to satisfy HMRC tax-record requirements (UK Companies Act).
  </p>
</section>
```

- [ ] **Step 3: Build + commit**

```bash
npx tsc --noEmit && npx next build
git add 'app/(public)/privacy/page.tsx'
git commit -m "docs(dsar): add 'Your rights' section to privacy policy

Lists the four UK GDPR rights, links to /data-rights and /account/data,
notes the 30-day SLA + 6-year HMRC retention exception."
```

---

### Task K.4: Customer-trail link from `/admin/customers/[uid]` (carry-over from Plan A)

**Files:**
- Create: `app/(admin)/admin/customers/[uid]/page.tsx` (if doesn't exist)

- [ ] **Step 1: Check whether the page already exists**

Run: `ls 'app/(admin)/admin/customers/' 2>&1`

If a `[uid]` directory already exists, modify its `page.tsx` to add the audit-trail link. If not, create a minimal page now (it pairs with admin orders detail from Plan A and gives the customer-trail link a home).

- [ ] **Step 2: Build the page (if needed)**

```tsx
// app/(admin)/admin/customers/[uid]/page.tsx
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { assertAdmin } from "@/lib/admin-auth";
import { getCustomerById } from "@/lib/customers";
import { getMarketingConsent } from "@/lib/marketing-consent";

async function CustomerDetail({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  await connection();
  await assertAdmin();
  const { uid } = await params;
  const customer = await getCustomerById(uid);
  if (!customer) notFound();
  const consent = await getMarketingConsent(uid);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl text-navy">{customer.email}</h1>
      <Link
        href={`/admin/audit-log?tk=user&tid=${uid}`}
        className="text-sm text-blue underline hover:no-underline"
      >
        View audit trail →
      </Link>
      <dl className="grid grid-cols-[160px_1fr] gap-y-1 text-sm">
        <dt className="text-muted">Name</dt>
        <dd>{customer.name || "—"}</dd>
        <dt className="text-muted">Phone</dt>
        <dd>{customer.phone ?? "—"}</dd>
        <dt className="text-muted">Orders</dt>
        <dd>{customer.orderCount}</dd>
        <dt className="text-muted">Lifetime spend</dt>
        <dd>£{(customer.lifetimeValueInPence / 100).toFixed(2)}</dd>
        <dt className="text-muted">Marketing consent</dt>
        <dd>{consent.granted ? `Granted via ${consent.source}` : "Not granted"}</dd>
      </dl>
    </div>
  );
}

export default function CustomerDetailPage(props: {
  params: Promise<{ uid: string }>;
}) {
  return (
    <div className="p-6">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <CustomerDetail params={props.params} />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 3: Build + commit**

```bash
npx tsc --noEmit && npx next build
git add 'app/(admin)/admin/customers/[uid]'
git commit -m "feat(audit): customer detail page with audit-trail link

Carries over the customer-trail navigation point from the Plan A spec
(was deferred because Plan A had no customer detail page; pairs with
DSAR work now since marketing-consent state lives here)."
```

---

## Section L — Smoke + handover + final merge

### Task L.1: Update deployment checklist

**Files:**
- Modify: `docs/handover/deployment-checklist.md`

- [ ] **Step 1: Append a new Plan B section**

```markdown
## Plan B deploy actions (DSAR / erasure)

These are one-time actions running after Plan B's commits land on `main`.

1. **Add new env vars** (Vercel + functions config):
   - `DATA_RIGHTS_JWT_SECRET` — generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`, add to Vercel production + development
   - `RESEND_API_KEY` — already set; confirm domain `cryogene.co.uk` is verified in Resend dashboard before deploy
   - `SAM_EMAIL` — Firebase Functions config: `firebase functions:config:set sam.email="<email>"` OR set as `SAM_EMAIL` env in Functions deploy

2. **Deploy Firestore rules + indexes** (new collections + tighter
   `customers` rules):
   ```
   npx firebase-tools deploy --only firestore:rules
   npx firebase-tools deploy --only firestore:indexes
   ```

3. **Enable TTL policies** in Firebase Console → Firestore → TTL:
   - `dataRightsRequests.respondedAt` — 90 days for `completed` records (audit context window)
   - `dataRightsRequests.createdAt` — 24 hours for `pending_email_verification` records
   - `publicFormCounters.updatedAt` — 7 days

4. **Deploy SLA-warning Cloud Function**:
   ```
   cd functions && npm run build && firebase deploy --only functions:slaWarnings
   ```

5. **Verify Resend domain `cryogene.co.uk`** is verified — without it
   transactional emails will silently fail.

6. **Update privacy policy on disk** has been done in Plan B; verify the
   live page renders the new "Your rights" section.

7. **Smoke**:
   - Submit `/data-rights` form → check verification email arrives
   - Click verification link → check request flips to `queued`
   - Visit `/account/data` while signed in → toggle marketing → confirm
     unsubscribe email arrives
   - From admin queue, generate access export → confirm ZIP arrives in
     inbox + downloads cleanly
```

- [ ] **Step 2: Commit**

```bash
git add docs/handover/deployment-checklist.md
git commit -m "docs: deployment checklist for Plan B (DSAR)"
```

---

### Task L.2: Local smoke gates (manual)

These are manual verification gates, in order.

- [ ] **Step 1: Run final type-check + build**

Run: `npx tsc --noEmit && npx next build 2>&1 | tail -20`
Expected: green build, all DSAR pages listed (`/data-rights`, `/data-rights/verify/[token]`, `/account/data`, `/admin/data-rights`, `/admin/data-rights/[id]`).

- [ ] **Step 2: Start dev server, set DATA_RIGHTS_JWT_SECRET locally**

Add to `.env.local`:
```
DATA_RIGHTS_JWT_SECRET="<32 hex chars>"
```

Run: `npm run dev`

- [ ] **Step 3: Smoke gate — public form**

In browser:
1. Go to `/data-rights`
2. Fill form: type=access, email=`test@example.com`, no message
3. Submit → see "Check your inbox"
4. Open Firebase Console → `dataRightsRequests` — see one doc with `status: pending_email_verification`
5. (No real email arrives without Resend domain — that's fine for local. The verification token is in the request body or server log.)

- [ ] **Step 4: Smoke gate — verification page**

For local-only testing, copy the JWT token from the dev server logs (the email-template stub `console.log`s it before Section J replaces with real Resend), navigate to `/data-rights/verify/<token>` → see "Request verified".

- [ ] **Step 5: Smoke gate — logged-in flow**

1. Sign in as a test customer
2. Visit `/account/data`
3. Click "Request data export" → confirm "Request received"
4. Toggle marketing-consent → check Firestore `customers/{uid}.marketingConsent`
5. Click "Close my account" → see two-step modal → click "Yes, queue erasure"
6. Open `/admin/data-rights` (signed in as admin) → see two new requests in the queue

- [ ] **Step 6: Smoke gate — erasure preview + run**

(Use a TEST customer — you'll lose them.)
1. From admin queue, open the erasure request
2. "Run erasure preview" → see counts
3. Type the customer's email exactly → "Run erasure"
4. Verify in Firestore: customer doc gone, customerEvents gone, orders anonymised, audit-log PII scrubbed
5. Verify in Auth: user gone

- [ ] **Step 7: Smoke gate — admin access export (if Resend works locally)**

1. From admin queue, open the access request
2. "Generate + send bundle"
3. Email arrives at the test customer's address with download link
4. Download → unzip → verify README + CSVs + JSONs all present

- [ ] **Step 8: Stop dev server**

(No commit — manual verification only)

---

### Task L.3: Final review + push + merge

- [ ] **Step 1: Confirm full branch state**

Run: `git log --oneline main..HEAD | wc -l`
Expected: ~68 commits (~30 Plan A + ~38 Plan B).

- [ ] **Step 2: Run final build**

Run: `npx tsc --noEmit && npx next build 2>&1 | tail -10`
Expected: green.

- [ ] **Step 3: Push branch**

```bash
git push origin tier2-audit-and-events
```

- [ ] **Step 4: Vercel auto-deploys; wait for READY**

Run: `node -e "console.log(JSON.parse(require('fs').readFileSync(String.raw\`C:\Users\david\AppData\Roaming\com.vercel.cli\Data\auth.json\`,'utf8')).token)" | xargs -I {} curl -s "https://api.vercel.com/v6/deployments?projectId=prj_pV2pilp6DtLnUqhFEClNuZuHwC7t&teamId=team_EP4wbeqvzAFMu9YxKeZbbxg3&limit=1" -H "Authorization: Bearer {}" | head -c 1000`

Expected: `state: "READY"` for the latest sha.

- [ ] **Step 5: Production smoke**

Test the production URL:
```
URL="https://cryogene.co.uk"  # or current preview URL
curl -s -o /dev/null -w "%{http_code} %{size_download}b\n" "$URL/data-rights"
curl -s -o /dev/null -w "%{http_code} %{size_download}b\n" "$URL/account/data"
```

Expected: 200 + non-zero bytes for `/data-rights`; 401/redirect for `/account/data` (not signed in).

- [ ] **Step 6: Merge to main**

If Vercel auto-deploys from main and the branch was set up with auto-deploy on push, no extra step. Otherwise:

```bash
git checkout main
git merge --ff-only tier2-audit-and-events
git push origin main
```

- [ ] **Step 7: Update memory**

After successful production smoke, update `~/.claude/projects/C--Users-david/memory/project_peptide_store.md` with a new session block documenting Plan A + Plan B shipped, what's outstanding (TTL policies, key rotation, solicitor review still), and any learnings.

---

## Self-review checklist

1. **Spec coverage:**
   - ✅ Four statutory rights — Sections D, E, F handle all four
   - ✅ Erasure mechanics (anonymisation + audit scrub) — Task G.1
   - ✅ Customer-facing surfaces — Sections D + E
   - ✅ Admin queue with hybrid automation — Section F + objection auto-process in E.3
   - ✅ Marketing consent + history — Section A
   - ✅ Access export ZIP (CSV + JSON + README) — Task H.2
   - ✅ Public form email-confirmation challenge — Section D
   - ✅ SLA-warning Cloud Function — Section I
   - ✅ Footer link + nav + privacy copy — Section K
   - ✅ All 9 new audit event types — Task C.1 + emit points across F.6 actions
   - ✅ DATA_RIGHTS_JWT_SECRET + jszip + firebase-functions deps — Tasks H.1 + I.1
   - ✅ Two-step erasure with typed-email confirmation — F.4
   - ✅ Customer-trail link — K.4 (carry-over from Plan A)

2. **Placeholder scan:** every "stub" file is created in early task and replaced in a named later task. No orphan TODOs.

3. **Type consistency:** `DataRightsRequest`, `MarketingConsent`, `ConsentSource`, `ErasureInput`, `ErasureResult`, `ErasurePreview` all defined in early sections and consistently referenced.

4. **Gotchas worth flagging during execution:**
   - **Resend domain verification** is still pending per memory (`feedback_resend_domain_pending` if it exists, otherwise see project_peptide_store.md). Real email delivery is dependent on this — without verification, all sends silently fail. Stubs are visible in dev logs even after J.2 land.
   - **Erasure runs against TEST data only** during smoke gates. Don't run erasure on a real customer until you have one to spare.
   - **Orphan publicFormCounters records** — TTL policy in Task L.1 has them at 7 days. Double-check the field name (`updatedAt`) when enabling.

---

**Plan B complete. ~50 tasks across 12 sections, ~14-16h estimated. Combined Plans A+B ≈ ~68 tasks, ~23-27h, single branch (`tier2-audit-and-events`), single PR/squash on completion.**
