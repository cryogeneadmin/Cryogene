---
title: DSAR / Erasure Plumbing
date: 2026-05-03
status: draft
phase: Tier 2 (post-launch hardening)
companion-spec: 2026-05-03-audit-log-and-commercial-events-design.md
---

# DSAR / Erasure Plumbing

## Goal

Implement UK GDPR data-rights handling for Cryogene Laboratories. Ship the four statutorily-required rights (access, rectification, erasure, objection-to-marketing) with both a customer-facing surface (`/account/data` for logged-in customers, `/data-rights` for everyone else) and an admin queue (`/admin/data-rights`) with built-in SLA enforcement.

This spec is a companion to `2026-05-03-audit-log-and-commercial-events-design.md` — DSAR erasure must scrub PII from audit-log entries that reference the erased customer, and every state transition emits an audit event. Both specs ship in the same Tier 2 implementation plan.

## Non-goals

- Full eight UK GDPR rights — only Arts. 15, 16, 17, 21 ship. Arts. 18 (restriction), 20 (portability — covered de facto by access JSON), 22 (automated decisions) deferred.
- Granular per-channel consent UI (becomes useful only after Tier 1 email upsells ship; documented in upsell catalogue at ~£1,200)
- PDF export bundle (CSV + JSON is ICO-sufficient)
- Self-serve erasure without admin confirmation (irreversible action; ICO prefers human review)
- Bulk erasure / GDPR sweeps (not needed at Sam's scale)
- Ex-customer access for users who already deleted their auth record but want their old data back (covered by public form B with email-confirmation challenge — same flow)

---

## Section 1 — Scope of rights

### Rights supported

| Right | Article | Customer surface | Admin handling | SLA |
|---|---|---|---|---|
| **Access** | 15 | "Request data export" button on `/account/data`; `/data-rights` form | Auto-bundles ZIP, Sam reviews + clicks send | 30 days |
| **Rectification** | 16 | `/account/settings` (existing self-serve flow) | Self-serve; no queue entry | n/a |
| **Erasure** | 17 | "Close my account" button on `/account/data`; `/data-rights` form | Preview diff → confirm with typed phrase → execute | 30 days |
| **Object to marketing** | 21 | Tickbox on `/account/data`; unsubscribe link in every marketing email; `/data-rights` form | Instant flip + confirmation email; no queue entry | Instant |

### Rights NOT supported (with reason)

- **Art. 18 (restriction of processing)** — Cryogene doesn't profile, score, or do automated decisions; processing is contractual (orders) or consent-based (marketing). Restriction adds no practical protection beyond what erasure offers.
- **Art. 20 (portability)** — Access export under Art. 15 includes `orders.json` and `profile.json` in machine-readable form; that satisfies portability for a single-controller use case.
- **Art. 22 (automated decisions)** — Cryogene makes no automated decisions about customers.

If a requester explicitly asks for one of the unsupported rights, the admin replies via email referencing the relevant exemption, and logs a `customer.rights_request_rejected` audit event.

---

## Section 2 — `dataRightsRequests` collection

### Schema

```ts
type DataRightsRequest = {
  id: string;
  createdAt: Timestamp;
  type: "access" | "rectification" | "erasure" | "objection";
  source: "account" | "public" | "unsubscribe-link";
  requester: {
    email: string;
    uid: string | null;                       // null for unauthenticated public form
    emailVerifiedAt: Timestamp | null;        // null until confirmation link clicked
  };
  status:
    | "pending_email_verification"            // public form, awaiting click
    | "queued"                                // verified, in admin queue
    | "in_progress"                           // admin actively working it
    | "completed"
    | "rejected";
  deadline: Timestamp;                        // createdAt + 30 days
  respondedAt: Timestamp | null;
  responseArtefactRef: string | null;         // Storage path for export ZIP, or erasure-summary doc id
  rejectionReason: string | null;             // for invalid requests (e.g. requester not customer)
  notes: string | null;                       // Sam's working notes (admin-only)
  slaWarningsSentAt: Timestamp[];             // dedupe daily warning emails
  message: string | null;                     // optional free-text from requester
};
```

### Indexes

- `(status ASC, deadline ASC)` — admin queue sort
- `(requester.email ASC, createdAt DESC)` — duplicate-request detection
- TTL field: `respondedAt + 90 days` for `completed` records (audit context window, then clear)
- TTL field: `createdAt + 24 hours` for `pending_email_verification` records (kill stale verification windows)

### Security rules

```
match /dataRightsRequests/{id} {
  allow read: if request.auth != null && request.auth.token.admin == true;
  allow create, update, delete: if false;     // server-only
}
```

Requesters never read these docs directly. They get email artefacts (verification link, export ZIP, erasure-confirmation receipt). The customer-facing pages query *summaries* of the requester's own requests via a server action with explicit ownership check.

---

## Section 3 — Marketing consent

### Schema (added to `customers/{uid}`)

```ts
type MarketingConsent = {
  granted: boolean;
  grantedAt: Timestamp | null;
  withdrawnAt: Timestamp | null;
  source: "checkout" | "signup" | "post-purchase" | "withdrawal" | "admin-override";
};

// stored as: customers/{uid}.marketingConsent
```

### History subcollection

Every state change appends to `customers/{uid}/marketingConsentHistory/{autoId}`:

```ts
type MarketingConsentEntry = {
  granted: boolean;
  changedAt: Timestamp;
  source: "checkout" | "signup" | "post-purchase" | "withdrawal" | "admin-override" | "unsubscribe-link";
  ipHash: string | null;          // SHA-256 of x-forwarded-for at time of change (where applicable)
  userAgent: string | null;       // truncated 200 chars
};
```

This subcollection is the provenance record regulators ask for ("when did the customer opt in, by what mechanism"). It rides along in the access export bundle.

### Capture points

| Where | Mechanism | Default state |
|---|---|---|
| Checkout delivery form | Separate unticked tickbox **below** the existing T&C tickbox | `false` |
| Sign-up form | Separate unticked tickbox below the T&C/age-gate confirmations | `false` |
| `/account/data` | Toggle that mirrors current state | reflects current |
| Unsubscribe link in marketing email | One-click withdrawal, no auth required (RFC 8058) | n/a (sets to `false`) |

The checkout marketing tickbox copy must be *separate* from the T&C/research-use tickboxes. Bundling consent purposes is the most-frequently cited ICO finding for SME e-commerce. Suggested copy:

> *Email me about new products and special offers. You can unsubscribe at any time.*

### Audit log emissions

`customer.objection_received` (sent to admin queue, but auto-processed) and `customer.objection_processed` audit events fire on every withdrawal. Granting consent is captured in `marketingConsentHistory` but does not emit an audit event (volume).

---

## Section 4 — Erasure mechanics (Art. 17 + HMRC reconciliation)

UK Companies Act / HMRC requires 6-year retention of business and tax records. UK GDPR Art. 17(3)(b) carves out compliance with legal obligations — meaning we keep the order skeleton but anonymise the personal data. Standard ICO-accepted "anonymisation" pattern.

### Erasure executor

Implemented as a single Firestore transaction with surrounding non-transactional steps. Idempotent — re-running on an already-erased customer is a no-op.

**Pre-flight checks (return error, do not start transaction):**
- Customer has open orders with status `pending` or `paid` (not yet `dispatched`) — ABORT, surface to admin: "Customer has 2 open orders; complete or cancel before erasure."
- Customer has unpaid invoices in dispute — ABORT.

**Steps (in order):**

1. **Auth user** — `auth.deleteUser(uid)` (idempotent — no-op if already deleted)
2. **`customers/{uid}` doc** — full delete, including `marketingConsentHistory` subcollection
3. **`customerEvents` collection** — query by `uid === <target>` OR `sessionId IN (last 10 sessionIds for this uid)` — full delete in batches of 500
4. **`signInAttempts` for last-known IP hash from this customer's events** — full delete (best-effort; counter docs are short-lived anyway)
5. **`enquiries` from this email** — query by `email === <target>` — full delete
6. **`orders/*` where `customer.uid === uid`** — anonymise (NOT delete). Per-order patch:
   ```
   customer.email      → "erased+" + sha256(uid).slice(0, 12) + "@cryogene.co.uk"
   customer.name       → "Erased Customer"
   customer.phone      → null
   customer.uid        → null
   customer.address.line1 → null
   customer.address.line2 → null
   customer.address.city  → keep (VAT aggregate, not PII)
   customer.address.postcode → keep
   customer.address.country  → keep
   erasedAt            → Timestamp.now()
   erasureRequestId    → <request doc id>
   ```
7. **`auditLogs` PII scrub** — query by `actor.uid === uid` OR (`target.kind === "user"` AND `target.id === uid`). For each match:
   - `actor.email` → `"erased+" + hash + "@cryogene.co.uk"`
   - `actor.uid` → `null`
   - Run a recursive PII-strip on `before`, `after`, `snapshotAfter`: replace any `email`, `name`, `phone`, `addressLine1`, `addressLine2` keys (case-sensitive match on the canonical Cryogene field names) with the string `"[erased]"`
   - `eventType`, `eventId`, `target`, `createdAt`, `ip`, `userAgent` retained — these establish the audit chain
8. **Final audit log emission** — `customer.erasure_completed` event:
   - `actor.type: "admin"`, `actor.uid: <admin uid>`, `actor.email: <admin email>`
   - `target.kind: "user"`, `target.id: <original uid>`
   - `metadata: { requestId: <doc id>, ordersAnonymised: <count>, eventsDeleted: <count>, auditLogsScrubbed: <count> }`
   - `snapshotAfter: { erasedFields: ["email", "name", "phone", "addressLine1", "addressLine2"] }`
9. **Update request doc** — `status: "completed"`, `respondedAt: now`, `responseArtefactRef: "erasure-summary:" + erasureSummaryId`
10. **Send confirmation email** to requester via Resend: "Your data has been erased on YYYY-MM-DD. Order records have been retained in anonymised form for HMRC tax-record requirements (UK Companies Act, 6-year retention). No personally identifiable information remains."

### Erasure preview (admin-side)

Before step 1, the admin clicks "Run erasure preview". This computes (read-only) and renders:
- Auth user: will be deleted (Y/N — already deleted? skip)
- `customers/{uid}`: will be deleted
- `customerEvents`: N events will be deleted
- `enquiries`: N enquiries will be deleted
- `orders`: N orders will be anonymised (not deleted)
- `auditLogs`: N entries will have PII scrubbed
- Open orders blocking erasure (if any) — listed with status, must be resolved first

Admin types the customer email exactly to confirm, then "Run erasure". No undo.

### Display of erased orders

In `/admin/orders` and `/admin/orders/[id]`:
- Customer field shows `Erased Customer` with an inert badge `Erased YYYY-MM-DD`
- Phone, email, address fields render as "—" or "Erased"
- All other order data unchanged (line items, prices, VAT, totals, dispatch info)

---

## Section 5 — Customer-facing flows

### Logged-in flow: `/account/data`

Server-rendered page accessible only to authenticated customers. Sections:

1. **Your data summary** — read-only display of customer profile + marketing-consent state + count summaries (N orders, account opened YYYY-MM-DD).
2. **Your rights buttons** (one per right):
   - "Download my data" — confirms with modal, posts to `/api/data-rights/access`. Server creates request (status `queued`, `requester.uid` populated, `emailVerifiedAt = createdAt` because session already proves identity), emits `customer.access_requested` audit event, returns "We're preparing your data export. You'll receive an email within 30 days."
   - "Update my details" — link to `/account/settings` (existing).
   - "Close my account" — confirmation modal with explicit warning ("This will erase your personal data. Order records are retained anonymously for tax purposes."), posts to `/api/data-rights/erasure`. Server creates request (status `queued`, identity proven by session), emits `customer.erasure_requested` audit event, returns "Your erasure request is queued. We'll email you when complete."
   - **Marketing emails toggle** (separate from request buttons because instant) — flips `marketingConsent.granted` immediately, writes history entry, emits `customer.objection_received` + `customer.objection_processed` audit events, sends confirmation email.

### Public flow: `/data-rights`

Server-rendered page accessible to anyone. Form fields:
- Email (required)
- Request type (radio: access / rectification / erasure / object-to-marketing)
- Optional message (textarea, 1000 char cap)
- Honeypot field (hidden, bot trap)

Submission flow:
1. Validate inputs (zod)
2. Rate-limit: max 3 submissions per IP per 24h (reuse the `/contact` rate-limit pattern from Tier 1 commit `510f8a8`)
3. Create `dataRightsRequests` doc with `status: "pending_email_verification"`, `requester.uid: null`, `emailVerifiedAt: null`
4. Generate signed JWT containing `{ requestId, email, exp: now + 24h }` (HS256, secret in env var `DATA_RIGHTS_JWT_SECRET` — new env var)
5. Send Resend email to the address with link `https://cryogene.co.uk/data-rights/verify/{token}`
6. Render success page: "Check your inbox to confirm your request"

### Verification page: `/data-rights/verify/[token]`

1. Validate JWT signature + expiry
2. Look up request by ID; verify still in `pending_email_verification`
3. Flip `status: "queued"`, set `emailVerifiedAt: now`, `deadline: emailVerifiedAt + 30 days`
4. If matching uid exists for this email in `auth`, populate `requester.uid`
5. Emit relevant audit event (`customer.access_requested` etc.)
6. Render "Your request is being processed. We'll email you within 30 days."

### Footer link

Add `Your data rights` to the footer's Legal column → `/data-rights`. Already-existing pattern; just one link.

---

## Section 6 — Admin queue (`/admin/data-rights`)

### List view

- Sorted by `deadline` ascending (closest deadline first)
- Filter chips: status (queued / in_progress / completed / rejected) and type (access / rectification / erasure / objection)
- Row columns: type · requester email · status · days remaining (red < 7, amber < 14, green ≥ 14) · created · deadline
- Click row → detail view

### Detail view per type

**Access**:
- Requester profile summary (uid + email matched, or unmatched if email never registered)
- "Generate export bundle" button → invokes server action that builds the ZIP in Firebase Storage, returns signed URL + file size
- Preview file list shown (filename + row count per CSV)
- "Send to requester" button → sends Resend email with attachment (or signed link if > 25MB), emits `customer.access_completed`, sets `respondedAt + status: completed`

**Erasure**:
- Same requester profile
- "Run erasure preview" → shows the table from §4 (counts of orders / events / audit logs that will change)
- Open-order block list (if any) — Sam can't proceed until resolved
- Typed confirmation field (must type customer email exactly)
- "Run erasure" → executes §4 transaction, emits `customer.erasure_completed`, sends confirmation email

**Rectification**: read-only display showing the customer's existing `/account/settings` URL — "Customer can self-serve at this URL. If they cannot access their account, you may need to confirm identity manually." Sam marks as completed manually.

**Objection** (rare in queue — usually auto-processed): same handling — instant flip + confirmation email + close.

### Notes field

Free-text textarea visible only in admin. Sam's working notes ("called requester to clarify scope", "ID-verified by passport scan attached", etc.). Captured in audit-log `metadata` on completion.

---

## Section 7 — SLA-warning Cloud Function

```ts
// functions/src/sla-warnings.ts
// Schedule: every weekday at 09:00 Europe/London
// Region: europe-west2

export const slaWarnings = onSchedule(
  { schedule: "0 9 * * 1-5", timeZone: "Europe/London", region: "europe-west2" },
  async () => {
    const sevenDaysFromNow = Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const snap = await db
      .collection("dataRightsRequests")
      .where("status", "in", ["queued", "in_progress"])
      .where("deadline", "<", sevenDaysFromNow)
      .get();

    for (const doc of snap.docs) {
      const data = doc.data();
      // Idempotency: skip if a warning was sent today
      const today = new Date().toISOString().slice(0, 10);
      const alreadySentToday = (data.slaWarningsSentAt ?? []).some((ts: Timestamp) =>
        ts.toDate().toISOString().slice(0, 10) === today
      );
      if (alreadySentToday) continue;

      const daysRemaining = Math.floor(
        (data.deadline.toMillis() - Date.now()) / (24 * 60 * 60 * 1000)
      );

      await sendSlaWarningEmail({
        to: SAM_EMAIL,                // from config/main
        requestId: doc.id,
        type: data.type,
        requesterEmail: data.requester.email,
        daysRemaining,
      });

      await doc.ref.update({
        slaWarningsSentAt: FieldValue.arrayUnion(Timestamp.now()),
      });
    }
  }
);
```

Email template body: subject "Data rights request expires in N days", body lists request type, requester email, link to `/admin/data-rights/{id}`. Uses Resend; uses Sam's email from `config/main`.

---

## Section 8 — File plan

### New files

- `lib/data-rights.ts` — request creation, verification token generation/validation, queue queries
- `lib/erasure.ts` — erasure executor + preview builder
- `lib/data-export.ts` — bundle ZIP generator (CSV + JSON files, archive-zip via JSZip, signed Storage URL)
- `lib/marketing-consent.ts` — consent state read/write + history append
- `app/(public)/data-rights/page.tsx` — public form
- `app/(public)/data-rights/verify/[token]/page.tsx` — confirmation handler
- `app/(public)/account/data/page.tsx` — logged-in self-serve hub
- `app/(admin)/admin/data-rights/page.tsx` — queue list
- `app/(admin)/admin/data-rights/[id]/page.tsx` — detail view (renders type-specific UI)
- `app/(admin)/admin/data-rights/[id]/actions.ts` — server actions (generate export, send export, run erasure preview, run erasure, mark completed)
- `app/api/data-rights/access/route.ts` — POST handler for "Download my data" (logged-in)
- `app/api/data-rights/erasure/route.ts` — POST handler for "Close my account" (logged-in)
- `app/api/data-rights/public/route.ts` — POST handler for public form
- `app/api/data-rights/objection/route.ts` — POST handler for unsubscribe links + toggle
- `functions/src/sla-warnings.ts` — Cloud Function
- `types/data-rights.ts` — `DataRightsRequest`, `MarketingConsent`, related types

### Modified files

- `app/actions/checkout.ts` — capture marketing-consent tickbox value, write to customer doc, append history entry
- `components/storefront/checkout/DeliveryForm.tsx` — add separate marketing tickbox below T&C
- `components/storefront/auth/SignUpForm.tsx` — add marketing tickbox below research-use confirmation
- `components/storefront/layout/Footer.tsx` — add `Your data rights` legal-column link
- `components/storefront/account/AccountLayout.tsx` — add `Data & privacy` nav item linking to `/account/data`
- `firestore.rules` — add `dataRightsRequests` block + tighten `customers` subcollection rules for `marketingConsentHistory`
- `firestore.indexes.json` — composite indexes for queue + history
- `lib/audit-log.ts` (from companion spec) — add new event types: `customer.access_requested`, `customer.access_completed`, `customer.rectification_requested`, `customer.rectification_completed`, `customer.erasure_completed`, `customer.objection_received`, `customer.objection_processed`, `customer.rights_request_rejected`
- `app/(public)/privacy/page.tsx` — copy update describing four rights and how to exercise (David-and-Sam content edit, post-deploy)
- Resend templates: 4 new emails (verification, export-ready, erasure-confirmed, marketing-objection-confirmed)
- `docs/handover/deployment-checklist.md` — TTL policies + Cloud Function deploy + new env var

### New environment variables

- `DATA_RIGHTS_JWT_SECRET` — signing secret for verification tokens (random 32-byte hex; rotate annually)

### New runtime dependencies

- `jszip` (~200KB) — used by `lib/data-export.ts` to build the export ZIP in-memory before uploading to Firebase Storage. Pure-JS, no native bindings, plays nicely with Vercel functions. `jose` is already a transitive dependency (firebase-admin) and can be reused for verification-token signing — no install needed for that.

---

## Section 9 — Test gates (manual smoke)

1. Logged-in user visits `/account/data` → sees data summary + four buttons
2. Logged-in user clicks "Download my data" → request created, email sent, admin queue shows new entry
3. Admin clicks "Generate export bundle" on access request → ZIP appears in Storage, file list previews correctly
4. Admin clicks "Send to requester" → requester receives email with attachment, request marked complete, audit event fires
5. Public user submits `/data-rights` form → request created `pending_email_verification`, verification email sent
6. Click verification link → request flips to `queued`, deadline set
7. Click expired verification link (24hr+) → graceful "link expired" page
8. Submit public form 4 times in 1 hour from same IP → 4th submission rate-limited
9. Admin runs erasure preview on customer with no open orders → preview displays correct counts
10. Admin runs erasure preview on customer with open orders → block list displayed, run button disabled
11. Admin types wrong email in confirm field → run button stays disabled
12. Admin types correct email + clicks Run → erasure executes; verify post-state:
    - Auth user gone
    - `customers/{uid}` gone
    - `customerEvents` for that uid gone
    - `enquiries` for that email gone
    - Order in `/admin/orders` shows `Erased Customer`, address line 1/2 null
    - `auditLogs` referencing that customer have `[erased]` placeholders
    - `customer.erasure_completed` audit event present
13. Re-run erasure on same customer → completes idempotently with zero changes
14. Toggle marketing-consent on `/account/data` → state persists, history entry written, confirmation email sent
15. Click unsubscribe link in a marketing email → consent revoked, redirect to `/data-rights/marketing-revoked`
16. Tick marketing tickbox at checkout → consent flag + history captured on order completion
17. Decline marketing at checkout → consent flag remains false (default)
18. Set request `deadline` to 6 days from now manually → run SLA-warning function locally → Sam receives email
19. Re-run SLA-warning function within 24h → no duplicate email (idempotency)
20. Submit objection request via public form → auto-processed, instant confirmation email

---

## Section 10 — One-time deploy actions

1. `npm install jszip` and confirm bundle still under Vercel function size limits (will be — jszip is ~200KB)
2. Generate `DATA_RIGHTS_JWT_SECRET` (random 32-byte hex), add to Vercel production + development env vars
3. Deploy Cloud Function via `firebase deploy --only functions:slaWarnings`
4. Enable Firestore TTL on `dataRightsRequests` field `respondedAt` for `completed` records (90-day retention) — Firebase Console
5. Enable Firestore TTL on `dataRightsRequests` field `createdAt` for `pending_email_verification` records (24-hour retention) — Firebase Console
6. Deploy new composite indexes
7. Deploy updated Firestore rules
8. Update `/privacy` page copy describing four rights + how to exercise (Sam-and-David content task; not deploy-blocking but launch-blocking)
9. Sam confirms admin email in `config/main` — used by SLA-warning function
10. Verify all four Resend templates render correctly with test data

---

## Section 11 — Future paid upsell (logged in upsell catalogue)

**Granular consent management** (~£1,200) — per-channel/per-purpose consent UI:
- Separate flags for transactional / marketing / restock / cart-recovery
- `/account/data` preferences page surfaces each channel
- Each Tier 1 email upsell reads its own flag instead of the universal `marketingConsent`
- Audit history per channel
- Becomes useful once Sam has multiple email products live

Not in Tier 2 scope. Documented in `Upsell-Catalogue.docx` for the next consultation cycle.

---

## Estimated scope

- Customer-facing pages (`/account/data`, `/data-rights`, verify): ~3-4h
- Admin queue + handlers: ~3h
- Erasure executor (anonymisation + audit-log scrub): ~2-3h
- Access export bundle generator: ~1.5-2h
- Marketing consent capture + tickboxes + history: ~1h
- SLA-warning Cloud Function: ~1h
- Email templates (Resend × 4): ~1.5h
- Test gates + deploy actions: ~1h
- **Combined: ~14-16h**

Combined with audit-log + customer-events spec (~9-11h), total Tier 2 #11+#12 implementation: **~23-27h**.
