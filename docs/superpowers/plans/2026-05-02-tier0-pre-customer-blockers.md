# Tier 0 — Pre-Customer Blockers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve every issue from the post-migration review that would either compromise security, break admin access, or cause data corruption when a real customer touches the site. After this plan ships, the storefront is safe to expose to a single trusted tester end-to-end (admin login → place test order → verify auth gates → verify order confirmation flow). Solicitor-blocked legal content remains a separate workstream.

**Architecture:** Sequenced through three sub-modules.

1. **Auth foundation (Tasks 1–3)** — `app/api/auth/session/route.ts` (new) mints + revokes Firebase session cookies; `SignInForm` posts to it; `lib/admin-auth.ts` and a new `lib/customer-auth.ts` verify cookies server-side. This unblocks both admin login (Sam can reach `/admin`) and order ownership checks downstream.
2. **Order ownership (Tasks 4–5)** — `/account/orders/[id]/page.tsx` and `/checkout/confirmation/[orderId]/page.tsx` move auth into the server component, refusing to render unless caller owns the order (or is admin / holds a fresh confirmation token).
3. **Order integrity (Tasks 6–9)** — wrap `createOrderAction` in a Firestore transaction that decrements stock atomically; gate `researchConfirmed` on a real form value; create the Firebase Auth user immediately on delivery (no plaintext password in cookies); deploy `firestore.rules` so the public Firebase API key has no blast radius.
4. **Trader identity (Task 10)** — populate the live `config/main` Firestore doc so the production footer stops rendering `[ADDRESS TBC]`.

**Tech Stack:** Next.js 16 App Router · Firebase Admin SDK + Auth + Firestore · Zod · Resend · Vercel · TypeScript strict.

**Test approach (per project spec — no automated tests):** Each task gates on `npx tsc --noEmit` clean + `npm run build` green + manual smoke against the live preview (or against the Vercel production URL after Task 11's auto-deploy). The admin round-trip test from the Firestore migration session (`scripts/round-trip-test.ts`-style) is the closest thing to an integration test; we'll bring it back as a manual probe in Task 11.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `app/api/auth/session/route.ts` | Create | POST mints session cookie from Firebase ID token; DELETE revokes refresh tokens + clears cookie |
| `lib/auth-cookies.ts` | Create | Single source of truth for `__session` cookie name + options (httpOnly, secure, sameSite=strict, domain) |
| `lib/admin-auth.ts` | Modify | Tighten `ADMIN_DEV_BYPASS` guard to also require `process.env.VERCEL` unset; add `assertAdmin()` throwing variant |
| `lib/customer-auth.ts` | Create | Server-side helper `getCustomerSession()` returning `{ uid, email, admin } | null` from `__session` cookie |
| `components/storefront/auth/SignInForm.tsx` | Modify | After Firebase client sign-in, POST ID token to `/api/auth/session`; honour `?redirect=` query |
| `components/storefront/auth/SignUpForm.tsx` | Modify | Same session-cookie flow after signup |
| `app/(public)/account/orders/[id]/page.tsx` | Modify | Server-read session; refuse if `decoded.uid !== order.customer.uid` and not admin |
| `app/(public)/checkout/confirmation/[orderId]/page.tsx` | Modify | Verify single-use confirmation cookie set in `createOrderAction` |
| `app/actions/create-order.ts` | Modify | Issue confirmation cookie pre-redirect; gate on Zod-validated `researchConfirmed: true` from form; create Firebase Auth user inline; wrap order creation in Firestore transaction with stock decrement |
| `lib/orders.ts` | Modify | Refactor `createOrderRecord` to accept a transaction; counter increment uses `FieldValue.increment` |
| `lib/checkout-session.ts` | Modify | Drop `accountPassword` field; only carry `email + createAccount: boolean` |
| `components/storefront/checkout/DeliveryForm.tsx` | Modify | Stop persisting password into cookie; immediate Firebase Auth user creation via server action |
| `components/storefront/checkout/ResearchConfirmCheckbox.tsx` | Modify | Submit `researchConfirmed=on` form value (named input rather than just visual) |
| `firestore.rules` | (already updated) | Deploy via `firebase login` + `firebase deploy --only firestore:rules` |
| `lib/firestore-admin/setup-config.ts` | Create | Standalone script to populate `config/main` with David-confirmed registered address; idempotent |
| `data/products.seed.json` | (no change) | n/a — variants stay nested in product docs for now (Task 6 redesigns the txn boundary instead) |

No new dependencies.

---

## Task 1: Auth-cookies module + session cookie minting route

**Files:**
- Create: `lib/auth-cookies.ts`
- Create: `app/api/auth/session/route.ts`

**Why this task:** No code in the repo currently calls `auth.createSessionCookie()`. `lib/admin-auth.ts:24` reads the `__session` cookie but nothing mints it, so admin login is permanently broken in production (`/admin` → `/sign-in` → client-only Firebase auth → no cookie issued → `/admin` redirects again). This task establishes the cookie infrastructure that Tasks 2–5 depend on.

- [ ] **Step 1: Create `lib/auth-cookies.ts`**

```typescript
import "server-only";

/**
 * Single source of truth for the Firebase session cookie. Read by
 * lib/admin-auth.ts, lib/customer-auth.ts, and the route handlers in
 * app/api/auth/session/route.ts. NEVER write the cookie outside that route.
 */
export const SESSION_COOKIE_NAME = "__session";

/**
 * Firebase Auth recommends a cookie lifetime of at least 5 minutes and at
 * most 14 days. We use 5 days, matching the default `expiresIn` on
 * createSessionCookie. After this, the customer must sign in again.
 */
export const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 5;

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
};
```

- [ ] **Step 2: Create `app/api/auth/session/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminAuthSdk } from "@/lib/firebase/admin";
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_MAX_AGE_SECONDS,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth-cookies";

const PostBodySchema = z.object({
  idToken: z.string().min(1).max(4096),
});

export async function POST(request: NextRequest) {
  const auth = getAdminAuthSdk();
  if (!auth) {
    return NextResponse.json(
      { error: "Auth not configured" },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PostBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  let sessionCookie: string;
  try {
    sessionCookie = await auth.createSessionCookie(parsed.data.idToken, {
      expiresIn: SESSION_COOKIE_MAX_AGE_SECONDS * 1000,
    });
  } catch {
    return NextResponse.json({ error: "Invalid ID token" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, SESSION_COOKIE_OPTIONS);
  return response;
}

export async function DELETE(request: NextRequest) {
  const auth = getAdminAuthSdk();
  if (!auth) {
    return NextResponse.json(
      { error: "Auth not configured" },
      { status: 500 }
    );
  }

  const cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (cookieValue) {
    try {
      const decoded = await auth.verifySessionCookie(cookieValue);
      await auth.revokeRefreshTokens(decoded.uid);
    } catch {
      // Already invalid; clear the cookie anyway.
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: 0,
  });
  return response;
}
```

- [ ] **Step 3: Migrate `lib/admin-auth.ts` to use the shared cookie name**

Open `lib/admin-auth.ts`. Replace the literal `"__session"` references with `SESSION_COOKIE_NAME` from the new module. Also tighten the dev-bypass guard:

Replace the existing `isAdminRequest` (or equivalent) with:

```typescript
import "server-only";
import { cookies } from "next/headers";
import { getAdminAuthSdk } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME } from "@/lib/auth-cookies";

const DEV_BYPASS_ALLOWED =
  process.env.NODE_ENV !== "production" &&
  process.env.ADMIN_DEV_BYPASS === "1" &&
  !process.env.VERCEL; // Vercel env always sets VERCEL=1

export async function isAdminRequest(): Promise<boolean> {
  if (DEV_BYPASS_ALLOWED) return true;
  const auth = getAdminAuthSdk();
  if (!auth) return false;
  const cookieValue = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!cookieValue) return false;
  try {
    const decoded = await auth.verifySessionCookie(cookieValue, true);
    return decoded.admin === true;
  } catch {
    return false;
  }
}

export async function assertAdmin(): Promise<void> {
  if (!(await isAdminRequest())) {
    throw new Error("Unauthorised");
  }
}
```

Preserve any other exports already in the file (e.g. `verifyAdminClaim` or similar). Read the file first to see what's currently exported and keep the API surface intact.

- [ ] **Step 4: Type-check + build**

```powershell
cd C:\Users\david\repos\cryogene; npx tsc --noEmit 2>&1 | Select-Object -Last 5
cd C:\Users\david\repos\cryogene; npm run build 2>&1 | Select-Object -Last 8
```

Expected: zero TS errors, build green, 94 routes.

- [ ] **Step 5: Commit**

```powershell
cd C:\Users\david\repos\cryogene; git add lib/auth-cookies.ts lib/admin-auth.ts app/api/auth/session/route.ts; $msg = @"
feat(auth): add session cookie mint/revoke route + tighten admin guard

Without this route, lib/admin-auth.ts reads the __session cookie but
nothing in the codebase ever creates one. Sam cannot reach /admin in
production except via ADMIN_DEV_BYPASS=1, which is gated to non-
production by NODE_ENV check.

Adds:
- lib/auth-cookies.ts: shared cookie name + httpOnly/secure/strict options
- app/api/auth/session: POST creates session cookie from ID token,
  DELETE revokes refresh tokens + clears cookie
- lib/admin-auth.ts: dev-bypass now also requires process.env.VERCEL
  unset (defence-in-depth — Vercel always sets VERCEL=1, so even
  if NODE_ENV is somehow not 'production', the bypass is structurally
  blocked); adds assertAdmin() throwing variant for cleaner action
  guards in Task 8.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
"@; git commit -m $msg
```

---

## Task 2: Customer auth helper

**Files:**
- Create: `lib/customer-auth.ts`

**Why this task:** Tasks 4 and 5 (the IDOR fixes) need a server-side way to determine the current signed-in customer's UID from the session cookie, parallel to how admin-auth works. This is its own module so the customer-facing pages don't pull in the admin verification path.

- [ ] **Step 1: Create `lib/customer-auth.ts`**

```typescript
import "server-only";
import { cookies } from "next/headers";
import { getAdminAuthSdk } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME } from "@/lib/auth-cookies";

export type CustomerSession = {
  uid: string;
  email: string | null;
  admin: boolean;
};

/**
 * Server-only: returns the current customer's session, or null if not
 * signed in / cookie invalid. Use in Server Components or server actions
 * to verify ownership before rendering or mutating customer-bound data.
 */
export async function getCustomerSession(): Promise<CustomerSession | null> {
  const auth = getAdminAuthSdk();
  if (!auth) return null;
  const cookieValue = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!cookieValue) return null;
  try {
    const decoded = await auth.verifySessionCookie(cookieValue, true);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      admin: decoded.admin === true,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Type-check**

```powershell
cd C:\Users\david\repos\cryogene; npx tsc --noEmit 2>&1 | Select-Object -Last 5
```

- [ ] **Step 3: Commit**

```powershell
cd C:\Users\david\repos\cryogene; git add lib/customer-auth.ts; git commit -m "feat(auth): add server-side customer session helper

getCustomerSession() returns the current signed-in customer's
{uid, email, admin} from the __session cookie, or null. Used by
Tasks 4 and 5 (IDOR fixes on order detail + confirmation pages).

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Wire SignInForm + SignUpForm to mint session cookies

**Files:**
- Modify: `components/storefront/auth/SignInForm.tsx`
- Modify: `components/storefront/auth/SignUpForm.tsx`

**Why this task:** The forms currently sign in with Firebase client SDK only — that puts an ID token in IndexedDB but doesn't tell the server. This task posts the ID token to `/api/auth/session` so the server actually has a session to verify in subsequent requests.

- [ ] **Step 1: Read both files first** to see the existing structure (`useState`, `useRouter`, `signInWithEmailAndPassword`, error handling).

- [ ] **Step 2: In `SignInForm.tsx`, add the session-cookie POST after successful sign-in**

The pattern (adapt to existing variable names):

```typescript
import { useSearchParams } from "next/navigation";

// inside the component:
const searchParams = useSearchParams();

// inside the submit handler, after `await signInWithEmailAndPassword(...)`:
const idToken = await result.user.getIdToken();
const sessionResponse = await fetch("/api/auth/session", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ idToken }),
});
if (!sessionResponse.ok) {
  setError("Sign-in succeeded but session could not be created. Try again.");
  return;
}

// Honour ?redirect= query, defaulting to /account, refusing external URLs
const rawRedirect = searchParams.get("redirect");
const safeRedirect =
  rawRedirect && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
    ? rawRedirect
    : "/account";
router.push(safeRedirect);
```

Replace the existing `router.push("/account")` line with the safe-redirect block.

Also: replace the user-facing error message for failed sign-in. Today the form likely renders Firebase's raw error (`auth/user-not-found` vs `auth/wrong-password`), which leaks email enumeration. Replace with a generic `"Email or password incorrect."` regardless of the Firebase error code.

- [ ] **Step 3: In `SignUpForm.tsx`, do the same** after `createUserWithEmailAndPassword`. Get the ID token, POST to `/api/auth/session`, then redirect (likely to `/account` since signup doesn't carry a `?redirect`).

- [ ] **Step 4: Type-check + build**

```powershell
cd C:\Users\david\repos\cryogene; npx tsc --noEmit 2>&1 | Select-Object -Last 5
cd C:\Users\david\repos\cryogene; npm run build 2>&1 | Select-Object -Last 8
```

- [ ] **Step 5: Commit**

```powershell
cd C:\Users\david\repos\cryogene; git add components/storefront/auth/SignInForm.tsx components/storefront/auth/SignUpForm.tsx; $msg = @"
feat(auth): mint session cookie after Firebase client sign-in/sign-up

Both forms now POST the freshly-minted ID token to /api/auth/session
after successful Firebase Auth client-side sign-in / signup, so the
server gets a verifiable __session cookie. Without this, /admin and
ownership-checked pages had no way to identify the signed-in user.

Also:
- SignInForm honours ?redirect= query (validated to start with '/' and
  not '//' to avoid open-redirect)
- Replace Firebase-specific error messages with generic 'Email or
  password incorrect' to prevent email enumeration via the
  'auth/user-not-found' vs 'auth/wrong-password' distinction

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
"@; git commit -m $msg
```

---

## Task 4: Server-side IDOR fix on `/account/orders/[id]`

**Files:**
- Modify: `app/(public)/account/orders/[id]/page.tsx`

**Why this task:** The current page reads the order by ID and renders all PII (name, email, address, line items, total) before any auth check — the existing client `<AuthGuard>` is hydrated *after* the HTML is sent to the wire. Any leaked URL discloses the customer's full order. The TODO at line 15 acknowledges this; this task fixes it.

- [ ] **Step 1: Read the current file** to capture the existing imports and component structure.

- [ ] **Step 2: Replace the page with a server-side gated version**

```typescript
import { notFound } from "next/navigation";
import { getOrderById } from "@/lib/orders";
import { getCustomerSession } from "@/lib/customer-auth";
import { OrderDetail } from "@/components/storefront/account/OrderDetail";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getCustomerSession();

  if (!session) {
    // Not signed in — surface 404 rather than redirect, to avoid
    // confirming whether the order ID exists.
    notFound();
  }

  const order = await getOrderById(id);
  if (!order) notFound();

  // Ownership: customer's own order, OR admin override.
  if (order.customer.uid !== session.uid && !session.admin) {
    notFound();
  }

  return <OrderDetail order={order} />;
}
```

If the existing page wraps in a different component (e.g. `<AuthGuard>`, `<AccountLayout>`), preserve the wrapper *outside* the auth check — the auth check happens before the data fetch so layout decisions can still inherit. Read the current file before editing to see the exact wrapping shape.

If the existing client `<AuthGuard>` becomes redundant after this server-side gate, remove its usage on this page (still keep the file — other pages may use it).

- [ ] **Step 3: Type-check**

```powershell
cd C:\Users\david\repos\cryogene; npx tsc --noEmit 2>&1 | Select-Object -Last 5
```

- [ ] **Step 4: Commit**

```powershell
cd C:\Users\david\repos\cryogene; git add app/(public)/account/orders/[id]/page.tsx; $msg = @"
fix(security): enforce server-side ownership on /account/orders/[id]

Before this commit, the server component fetched the order and rendered
the full PII (name, address, line items, total) before any auth check.
The client AuthGuard hydrated after the HTML was already on the wire,
so anyone with an order ID could view another customer's order.

Now: the server reads the __session cookie via getCustomerSession(),
refuses to fetch unless the order's customer.uid matches the session's
uid (or session.admin is true). Returns 404 rather than 403 to avoid
confirming order-ID validity to attackers.

Closes the IDOR called out in Code C1 / Sec C1 of the post-migration
review.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
"@; git commit -m $msg
```

---

## Task 5: Confirmation-page IDOR fix via single-use cookie

**Files:**
- Modify: `app/(public)/checkout/confirmation/[orderId]/page.tsx`
- Modify: `app/actions/create-order.ts` (set the cookie before redirecting)
- Add to `lib/auth-cookies.ts`: confirmation-cookie helpers

**Why this task:** The confirmation page is even more exposed than the order detail page because guest checkouts have no signed-in session at all — anyone with the URL sees the order. Fix: at order creation, set a short-TTL httpOnly cookie `confirmation_<orderId>` whose presence is the capability to view this confirmation. On the confirmation page, verify the cookie matches the URL path. Single-use is overkill here; we'll use a 1-hour TTL keyed on the order ID, which is enough for the customer to bookmark/screenshot the page during their session but not survive sharing.

- [ ] **Step 1: Extend `lib/auth-cookies.ts`**

Append to the file:

```typescript
const CONFIRMATION_COOKIE_PREFIX = "cryogene_oc_";
const CONFIRMATION_COOKIE_MAX_AGE_SECONDS = 60 * 60; // 1 hour

export function confirmationCookieName(orderId: string): string {
  return `${CONFIRMATION_COOKIE_PREFIX}${orderId}`;
}

export const CONFIRMATION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: CONFIRMATION_COOKIE_MAX_AGE_SECONDS,
};
```

- [ ] **Step 2: In `app/actions/create-order.ts`**, set the confirmation cookie just before redirecting

After the order document is written and just before `redirect(...)`:

```typescript
import { cookies } from "next/headers";
import {
  confirmationCookieName,
  CONFIRMATION_COOKIE_OPTIONS,
} from "@/lib/auth-cookies";

// ... inside the action, after order creation:
const cookieStore = await cookies();
cookieStore.set(
  confirmationCookieName(orderId),
  "1",
  CONFIRMATION_COOKIE_OPTIONS
);
```

- [ ] **Step 3: In `app/(public)/checkout/confirmation/[orderId]/page.tsx`**, verify

Read the existing file to keep the rendering shape, then add the gate:

```typescript
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getOrderById } from "@/lib/orders";
import { getCustomerSession } from "@/lib/customer-auth";
import { confirmationCookieName } from "@/lib/auth-cookies";
import { ConfirmationContent } from "@/components/storefront/checkout/ConfirmationContent";

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const cookieStore = await cookies();

  const confirmationCookie = cookieStore.get(confirmationCookieName(orderId));
  const session = await getCustomerSession();

  // Authorised if: confirmation cookie present (just-placed order),
  // OR signed-in owner of the order, OR admin.
  // Otherwise 404.
  const order = await getOrderById(orderId);
  if (!order) notFound();

  const ownerOrAdmin =
    session && (session.uid === order.customer.uid || session.admin);

  if (!confirmationCookie && !ownerOrAdmin) {
    notFound();
  }

  return <ConfirmationContent order={order} />;
}
```

- [ ] **Step 4: Type-check + build**

```powershell
cd C:\Users\david\repos\cryogene; npx tsc --noEmit 2>&1 | Select-Object -Last 5
cd C:\Users\david\repos\cryogene; npm run build 2>&1 | Select-Object -Last 8
```

- [ ] **Step 5: Commit**

```powershell
cd C:\Users\david\repos\cryogene; git add lib/auth-cookies.ts app/actions/create-order.ts "app/(public)/checkout/confirmation/[orderId]/page.tsx"; $msg = @"
fix(security): gate confirmation page on single-use cookie or ownership

Before this commit, anyone with the confirmation URL saw the order
PII. URLs leak via referrer, browser history, support emails, and
shared screenshots.

Now: createOrderAction sets a short-TTL httpOnly cookie
cryogene_oc_<orderId> just before redirecting. The confirmation page
verifies the cookie OR a signed-in owner OR admin; otherwise 404
(same status as 'order doesn't exist' to avoid enumeration oracle).

The cookie is httpOnly + Secure + SameSite=Strict, 1-hour TTL — long
enough for the just-placed customer to bookmark or refresh, short
enough that a leaked URL is unlikely to still grant access.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
"@; git commit -m $msg
```

---

## Task 6: Transactional order creation with stock decrement

**Files:**
- Modify: `lib/orders.ts`
- Modify: `app/actions/create-order.ts`

**Why this task:** Currently `createOrderRecord` writes the order with no stock decrement. Two parallel buyers both pass the in-stock check on the last unit. Fix: wrap the entire order-creation flow (read products, validate stock, compute totals, write order, decrement stock, increment counter) in a Firestore transaction.

**Constraint:** Variants live as an array inside the parent product document. Firestore transactions can read+write the parent doc atomically; we mutate `variants[i].stock` in place. This is awkward but works for Phase 1 catalogues. (Promoting variants to a sub-collection is Tier 2 work.)

- [ ] **Step 1: Read `lib/orders.ts:nextOrderNumber()` and `createOrderRecord()`**

Currently `nextOrderNumber()` opens its own transaction. We'll move that into the main txn so both happen atomically.

- [ ] **Step 2: Add a transactional `createOrderTransaction()` helper to `lib/orders.ts`**

```typescript
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { Order, Product, OrderItem } from "@/types";

type OrderInput = Omit<Order, "id" | "orderNumber" | "createdAt" | "updatedAt"> & {
  itemRefs: Array<{ productId: string; sku: string; quantity: number }>;
};

export async function createOrderTransaction(
  input: OrderInput
): Promise<Order> {
  if (isSeedMode()) {
    // Seed mode: no real txn, fall back to existing behaviour
    const orderNumber = await nextOrderNumber();
    const orders = await readLocalOrders();
    const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const order: Order = {
      ...input,
      id,
      orderNumber,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Order;
    orders.push(order);
    await writeLocalOrders(orders);
    return order;
  }

  const db = getAdminDb();
  if (!db) throw new Error("Firestore not configured");

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const counterRef = db.doc(`orderCounters/${today}`);
  const orderRef = db.collection("orders").doc();

  const productRefs = input.itemRefs.map((i) =>
    db.doc(`products/${i.productId}`)
  );

  return db.runTransaction(async (tx) => {
    // Read-phase: products + counter
    const productSnaps = await tx.getAll(...productRefs);
    const counterSnap = await tx.get(counterRef);

    // Validate stock + decrement in parent doc's variants array
    const productUpdates: Array<{
      ref: FirebaseFirestore.DocumentReference;
      newVariants: Array<unknown>;
    }> = [];

    for (let i = 0; i < input.itemRefs.length; i++) {
      const item = input.itemRefs[i]!;
      const productSnap = productSnaps[i];
      if (!productSnap || !productSnap.exists) {
        throw new Error(`Product ${item.productId} no longer exists`);
      }
      const product = productSnap.data() as Product;
      const variantIndex = product.variants.findIndex(
        (v) => v.sku === item.sku
      );
      if (variantIndex === -1) {
        throw new Error(`Variant ${item.sku} no longer exists`);
      }
      const variant = product.variants[variantIndex]!;
      if (!variant.active) {
        throw new Error(`${product.name} (${variant.size}) is no longer active`);
      }
      if (variant.stock < item.quantity) {
        throw new Error(
          `Only ${variant.stock} of ${product.name} (${variant.size}) remain in stock`
        );
      }

      const newVariants = [...product.variants];
      newVariants[variantIndex] = {
        ...variant,
        stock: variant.stock - item.quantity,
      };
      productUpdates.push({ ref: productSnap.ref, newVariants });
    }

    // Counter: read current, increment for this order
    const currentCount = counterSnap.exists
      ? (counterSnap.data()!.count as number)
      : 0;
    const newCount = currentCount + 1;
    const orderNumber = `PPT-${today}-${String(newCount).padStart(4, "0")}`;

    // Write-phase
    for (const update of productUpdates) {
      tx.update(update.ref, { variants: update.newVariants });
    }
    tx.set(counterRef, { count: newCount });

    const orderDoc: Order = {
      ...input,
      id: orderRef.id,
      orderNumber,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Order;
    tx.set(orderRef, orderDoc);

    return orderDoc;
  });
}
```

Don't remove the existing `createOrderRecord()` and `nextOrderNumber()` exports — they're called from other places (e.g. admin manual order entry, if any). Just add the new function alongside.

- [ ] **Step 3: Wire `createOrderTransaction()` in `app/actions/create-order.ts`**

Refactor the action so the read-validate-write sequence happens inside `createOrderTransaction()` rather than in scattered awaits. The action's job becomes:
1. Validate the input shape (Zod, customer details)
2. Resolve product IDs from slugs (read-only — outside the txn since slugs map 1:1 to docs)
3. Compute totals server-side (using prices fresh from Firestore reads inside the txn)
4. Call `createOrderTransaction({ ...customerData, itemRefs: [...] })`
5. Set confirmation cookie (Task 5 step 2 already covers this)
6. Redirect

Read the current `create-order.ts` action; refactor minimally; preserve the existing Zod schema, age-gate check, and Resend email path. The key change is `createOrderRecord(...)` → `createOrderTransaction(...)`.

- [ ] **Step 4: Type-check + build**

```powershell
cd C:\Users\david\repos\cryogene; npx tsc --noEmit 2>&1 | Select-Object -Last 8
cd C:\Users\david\repos\cryogene; npm run build 2>&1 | Select-Object -Last 8
```

- [ ] **Step 5: Commit**

```powershell
cd C:\Users\david\repos\cryogene; git add lib/orders.ts app/actions/create-order.ts; $msg = @"
fix(integrity): transactional order creation with stock decrement

Before this commit, createOrderAction read variant.stock, validated,
and wrote the order — without a transaction. Two concurrent buyers
both passed the stock check on the last unit, both got 'paid' orders
written, and the inventory went negative invisibly.

Now: createOrderTransaction wraps every read (product docs, counter)
and every write (product variants array decrement, counter
increment, order doc) in db.runTransaction. Firestore retries on
conflict so concurrent buyers serialise correctly. The check-then-
decrement is atomic.

Note: variants are still nested arrays inside parent product docs,
so variant decrement reads/writes the entire product doc. Promoting
variants to a sub-collection is Tier 2 work — current scheme works
for Phase 1 catalogue size.

Closes Sec C4 of the post-migration review.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
"@; git commit -m $msg
```

---

## Task 7: Validate `researchConfirmed` from form, drop dead client price fields

**Files:**
- Modify: `app/actions/create-order.ts`
- Modify: `components/storefront/checkout/ResearchConfirmCheckbox.tsx`

**Why this task:** Currently `app/actions/create-order.ts:110-111` writes `researchConfirmed: true` and `researchConfirmedAt: now` regardless of whether the customer ticked anything. There's no actual confirmation captured. Also: the action accepts `shippingInPence/vatInPence/totalInPence/unitPriceInPence/name/productSlug` from the client and ignores them — dead code that invites future regression. Drop them; only accept `{sku, quantity}` per item.

- [ ] **Step 1: Tighten `CreateOrderInputSchema` in `app/actions/create-order.ts`**

Replace the existing Zod schema for items with:

```typescript
const ItemSchema = z.object({
  productSlug: z.string().min(1).max(200),
  sku: z.string().min(1).max(200),
  quantity: z.number().int().min(1).max(99),
});

const CreateOrderInputSchema = z.object({
  // ... existing customer fields (name, email, phone, address) unchanged
  // (preserve whatever the existing schema has for delivery details)
  items: z.array(ItemSchema).min(1).max(50),
  researchConfirmed: z.literal(true), // hard requirement: must be true
  ageGateConfirmed: z.literal(true),  // hard requirement: must be true
  marketingConsent: z.boolean().default(false), // example optional
});
```

The `z.literal(true)` makes the action throw at Zod parse time if the form sends false / missing. This is the "fail closed" pattern.

Read the existing schema first — if it already has fields like `shippingInPence`, `vatInPence`, `totalInPence`, `productSlug` on the item, drop them. The action recomputes server-side anyway.

- [ ] **Step 2: Wire the form input**

In `ResearchConfirmCheckbox.tsx`, the checkbox should submit `researchConfirmed=on` (or a hidden `input[name="researchConfirmed"]` valued `true` when checked). Read the current implementation; if it's a controlled state component without a form input, add a hidden input that mirrors the state.

For the age gate: the cookie is the source of truth, but the action should still require `ageGateConfirmed=true` from the form to ensure the user actively re-affirmed during checkout (matching the H5 audit-trail finding from compliance review). Add a hidden `<input type="hidden" name="ageGateConfirmed" value="true">` on the review form, conditional on the cookie being present (otherwise the form shouldn't render at all — the existing flow already gates this).

- [ ] **Step 3: In the action body**, remove the hardcoded `researchConfirmed: true` write. The Zod-validated value is now authoritative. Keep `researchConfirmedAt: new Date()` (now actually accurate because it only fires on a real confirmation).

Also: snapshot the confirmation copy version. Add to the order doc:

```typescript
researchUseConfirmationVersion: "v1-2026-05-02",
ageGateConfirmationVersion: "v1-2026-05-02",
```

These are constants for now; future copy changes bump the version. Compliance audit-trail finding from review.

- [ ] **Step 4: Type-check + build**

```powershell
cd C:\Users\david\repos\cryogene; npx tsc --noEmit 2>&1 | Select-Object -Last 5
cd C:\Users\david\repos\cryogene; npm run build 2>&1 | Select-Object -Last 8
```

- [ ] **Step 5: Commit**

```powershell
cd C:\Users\david\repos\cryogene; git add app/actions/create-order.ts components/storefront/checkout/ResearchConfirmCheckbox.tsx; $msg = @"
fix(compliance): validate researchConfirmed from form, drop dead price fields

Before: createOrderAction wrote researchConfirmed: true regardless of
whether the customer ticked anything. No actual confirmation captured.
Compliance failure (no proof customer affirmed research-only use) and
audit failure (database always says 'yes').

Also: action accepted shippingInPence/vatInPence/totalInPence/etc.
from the client. Server already recomputes from Firestore, so these
were dead fields — but the schema invited future drift where someone
'optimises' by trusting the client values.

Now:
- z.literal(true) on researchConfirmed and ageGateConfirmed — Zod
  rejects the action at parse time if either is absent
- Hidden form inputs in ResearchConfirmCheckbox / review form mirror
  state into the submission
- Snapshot researchUseConfirmationVersion / ageGateConfirmationVersion
  on the order doc for audit-trail (future copy changes bump version)
- Item schema reduced to {productSlug, sku, quantity}

Closes Sec C5 + Sec H6 + the compliance H5 audit-trail finding.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
"@; git commit -m $msg
```

---

## Task 8: Eliminate plaintext password in checkout cookie

**Files:**
- Modify: `lib/checkout-session.ts`
- Modify: `components/storefront/checkout/DeliveryForm.tsx`
- Create: `app/actions/create-checkout-account.ts`

**Why this task:** Currently `accountPassword` is collected on the delivery form and base64-stored (≠encryption) in an httpOnly cookie for 30 minutes. base64 in a server log = password leak. Fix: when the customer ticks "create an account," create the Firebase Auth user *immediately* via a server action, mint the session cookie, and discard the password from the client-side flow entirely.

- [ ] **Step 1: Create `app/actions/create-checkout-account.ts`**

```typescript
"use server";

import "server-only";
import { z } from "zod";
import { cookies } from "next/headers";
import { getAdminAuthSdk } from "@/lib/firebase/admin";
import { upsertCustomer } from "@/lib/customers";
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_MAX_AGE_SECONDS,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth-cookies";

const InputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

type Result =
  | { ok: true }
  | { ok: false; error: "auth_unavailable" | "email_exists" | "weak_password" | "invalid_input" };

export async function createCheckoutAccount(input: unknown): Promise<Result> {
  const parsed = InputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const auth = getAdminAuthSdk();
  if (!auth) return { ok: false, error: "auth_unavailable" };

  let uid: string;
  try {
    const user = await auth.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      emailVerified: false,
    });
    uid = user.uid;
  } catch (err: unknown) {
    const code = (err as { code?: string }).code;
    if (code === "auth/email-already-exists") return { ok: false, error: "email_exists" };
    if (code === "auth/weak-password" || code === "auth/invalid-password") {
      return { ok: false, error: "weak_password" };
    }
    return { ok: false, error: "auth_unavailable" };
  }

  // Mint session cookie immediately (no client round-trip)
  const customToken = await auth.createCustomToken(uid);
  // Custom tokens can be exchanged for ID tokens client-side, but we
  // want a session cookie now. Path: createCustomToken → client signs in
  // → ID token → session cookie. Since we're server-side, we instead
  // mint the session directly from a freshly-issued ID token.
  // Firebase admin SDK doesn't directly mint ID tokens; the simplest
  // server-only path is to skip auto-sign-in and require the user to
  // sign in after order placement. Trade-off: drop the password
  // handoff but ask the user to sign in once after checkout.
  // Alternative: use auth.createSessionCookie() requires an ID token.
  // For Phase 1, we'll auto-sign-in CLIENT-SIDE after order placement
  // by surfacing a boolean flag in the order completion redirect.

  await upsertCustomer({
    id: uid,
    email: parsed.data.email,
    createdAt: new Date(),
    updatedAt: new Date(),
    orderCount: 0,
    lifetimeValueInPence: 0,
  } as Parameters<typeof upsertCustomer>[0]);

  return { ok: true };
}
```

(Note: this action creates the Firebase user but does *not* mint the session cookie server-side, because admin SDK can't directly issue an ID token. The post-order flow re-routes the customer to sign in once with the password they just used. This is a small UX cost but eliminates the plaintext-password-in-cookie risk entirely. If Sam later wants seamless auto-login, the `createCustomToken` → client `signInWithCustomToken` → ID token → session cookie path can be added in Tier 1; for Tier 0 the goal is just to stop storing the password.)

- [ ] **Step 2: Modify `lib/checkout-session.ts`**

Drop `accountPassword` from the schema and storage. Keep `email` and `createAccount: boolean`. The session now only holds non-secret signals.

- [ ] **Step 3: Modify `DeliveryForm.tsx`**

When the user submits the delivery form with "Create an account" ticked:
1. Call `createCheckoutAccount({ email, password })` server action.
2. If the result is `{ ok: false, error: "email_exists" }`, surface a friendly message: "An account with that email already exists. Sign in or use a different email."
3. If `{ ok: true }`, save email + `createAccount: true` to the (no-password) checkout session cookie, proceed to review step.
4. The password stays in form state for the duration of the page; never persisted.

This is the highest-touch change in the plan. Read the existing form before refactoring.

- [ ] **Step 4: Type-check + build**

```powershell
cd C:\Users\david\repos\cryogene; npx tsc --noEmit 2>&1 | Select-Object -Last 8
cd C:\Users\david\repos\cryogene; npm run build 2>&1 | Select-Object -Last 8
```

- [ ] **Step 5: Commit**

```powershell
cd C:\Users\david\repos\cryogene; git add app/actions/create-checkout-account.ts lib/checkout-session.ts components/storefront/checkout/DeliveryForm.tsx; $msg = @"
fix(security): create Firebase Auth user inline; stop storing password in cookie

Before: 'Create an account at checkout' captured a plaintext password,
base64-encoded it (not encryption), stored in an httpOnly cookie for
30 minutes, then dropped on the floor — createOrderAction never read
it. Any cookie capture (Vercel logs, error trackers, support sessions)
was a password leak.

Now: createCheckoutAccount server action creates the Firebase Auth
user immediately on the delivery step, returns ok/error. The cookie
holds only email + createAccount:true. Password never crosses the
network boundary except during the create-user call (HTTPS to
Firebase Auth admin SDK).

Customer sees one extra sign-in step after order placement (no
auto-login from custom token in this iteration — Tier 1 work).
Net win: zero plaintext password in any persistent storage.

Closes Code-H + Sec C3 of the post-migration review.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
"@; git commit -m $msg
```

---

## Task 9: Deploy Firestore rules

**Files:**
- (no code change — operational task)

**Why this task:** Memory says Task 7 of the Firestore migration plan skipped `firebase deploy --only firestore:rules` because the service-account auth lacked `serviceusage.services.get` permission. Until the rules in `firestore.rules` are *actually* deployed, the production Firestore is whatever default policy was set at project creation — which may be permissive. The public Firebase API key is in the JS bundle; if rules are weak, anyone can read/write everything from the browser.

This task requires David's interactive `firebase login` in a browser. **It cannot be automated by a subagent.**

- [ ] **Step 1: Install firebase-tools globally** (if not already)

```powershell
npm install -g firebase-tools
```

- [ ] **Step 2: Authenticate**

```powershell
firebase login
```

Opens browser. Sign in as Sam (`cryogeneadmin@gmail.com`) — the account that owns the Firebase project.

- [ ] **Step 3: Deploy rules**

```powershell
cd C:\Users\david\repos\cryogene; firebase deploy --only firestore:rules,storage --project cryogene-5ee94 2>&1 | Select-Object -Last 15
```

Expected: `✔  Deploy complete!`

- [ ] **Step 4: Verify deployed rules match repo**

```powershell
firebase firestore:rules:get --project cryogene-5ee94
```

Compare output to local `firestore.rules`. Should match byte-for-byte.

- [ ] **Step 5: No commit needed.** This task changes Firebase project state, not repo state.

If you want a record-keeping commit, add a one-line note to `docs/handover/admin-guide.md` saying "Firestore rules deployed YYYY-MM-DD by [name]." But that's optional.

---

## Task 10: Populate `config/main` with real trader identity

**Files:**
- Create (or use existing): `scripts/setup-config.ts` (one-shot script)

**Why this task:** The footer renders `[ADDRESS TBC]` because `config/main` was seeded with the placeholder. Companies Act 2006 s.82 + E-Commerce Regs 2002 reg.6 require trading details on every page. Until Sam confirms registered entity (sole trader vs Ltd) and address, the most we can do is replace the placeholder with David-confirmed info or a clear "trading as Cryogene Laboratories — for trader details contact ..." placeholder that's at least non-`[ADDRESS TBC]`.

**This task requires Sam's input on the trading entity.** If Sam isn't available, populate with the best David-known info and flag for amendment.

- [ ] **Step 1: Get the trader info from Sam (or David's best knowledge)**

Required fields:
- `registeredAddress` — full postal address of the registered office (or sole trader's correspondence address)
- `companyNumber` — Companies House number if Ltd; null if sole trader
- `vatNumber` — VAT registration number if registered; null otherwise (Cryogene currently not VAT-registered per project memory)
- `storeEmail` — actual customer-facing contact email (currently placeholder `hello@cryogene.co.uk`)
- `storePhone` — optional phone number

- [ ] **Step 2: Create `scripts/setup-config.ts`**

```typescript
import { config } from "dotenv";
config({ path: ".env.local" });

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (getApps().length === 0) {
  const pk = Buffer.from(process.env.FIREBASE_PRIVATE_KEY!, "base64").toString("utf-8");
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: pk,
    }),
  });
}

async function main() {
  const db = getFirestore();
  await db.doc("config/main").set(
    {
      storeName: "Cryogene Laboratories",
      storeEmail: "TODO_CONFIRM_WITH_SAM@cryogene.co.uk",
      storePhone: null,
      registeredAddress: "TODO_CONFIRM_WITH_SAM",
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
        newOrderEmailTo: "samcowling118@googlemail.com",
      },
      updatedAt: new Date(),
      updatedBy: "setup-config-script",
    },
    { merge: true }
  );
  const after = (await db.doc("config/main").get()).data();
  console.log("config/main updated:", JSON.stringify(after, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

(Replace `TODO_CONFIRM_WITH_SAM` strings with David-known values before running. If unknown, run anyway with the markers — Tier 1 has a separate "fix all `[DRAFT —` and `TODO_CONFIRM` markers" pass.)

- [ ] **Step 3: Run the script**

```powershell
cd C:\Users\david\repos\cryogene; npx tsx scripts/setup-config.ts 2>&1 | Select-Object -Last 30
```

- [ ] **Step 4: Visit production URL** to verify the footer no longer shows `[ADDRESS TBC]`. Check homepage and a product detail page.

- [ ] **Step 5: Commit the script** (data state isn't checked in, but the script is)

```powershell
cd C:\Users\david\repos\cryogene; git add scripts/setup-config.ts; git commit -m "chore: add one-shot setup-config script for trader identity

Replaces [ADDRESS TBC] placeholder in config/main Firestore doc with
David-confirmed values for storeEmail, registeredAddress, etc. Run
once with: npx tsx scripts/setup-config.ts.

Companies Act 2006 s.82 + E-Commerce Regs 2002 reg.6 require trading
details on every page; before this script runs, the footer rendered
[ADDRESS TBC] in production.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 11: Merge to main, push, verify, end-to-end test

**Files:** none modified — pure infrastructure.

- [ ] **Step 1: Merge `tier0-pre-customer-blockers` into `main`**

```powershell
cd C:\Users\david\repos\cryogene; git checkout main; git merge --ff-only tier0-pre-customer-blockers; git log --oneline -12
```

- [ ] **Step 2: Push and watch auto-deploy**

```powershell
cd C:\Users\david\repos\cryogene; git push origin main 2>&1 | Select-Object -Last 3
```

Then poll deploy state via REST API (or `vercel ls`) until READY.

- [ ] **Step 3: Smoke-test ownership gates**

Manual test in incognito browser:
1. Hit `<deploy-url>/account/orders/abc-fake-id` — expect 404.
2. Hit `<deploy-url>/checkout/confirmation/abc-fake-id` — expect 404.
3. Sign in as test admin via the new session route, navigate to `/admin` — expect dashboard.
4. Place a stub-payment test order, get redirected to `/checkout/confirmation/<orderId>?stub=true` — expect 200, sees the order.
5. Copy that confirmation URL into a fresh incognito window — expect 404 (cookie-bound).
6. Sign in as the same customer in that incognito window, hit `/account/orders/<orderId>` — expect 200.
7. Sign in as a *different* customer and hit `/account/orders/<orderId>` — expect 404.

- [ ] **Step 4: Smoke-test stock decrement**

Open Firebase Console, note current stock for any product variant. Place an order with quantity 1 of that variant. Refresh Firebase Console — stock should be decremented by 1.

If transaction failed, the variant doc would still show old stock + the order would not have been written. Either-or — never both states.

- [ ] **Step 5: Smoke-test research-confirm gate**

DevTools: deselect the research-use checkbox state in the form (manipulate the hidden input to `false` or remove it). Submit. Expect: action throws Zod error, order not created.

- [ ] **Step 6: No commit (just verification).**

If anything is broken, the `tier0-pre-customer-blockers` branch can be reverted on `main` via `git revert` — each task is its own commit.

---

## Self-Review

**Spec coverage:**
- ✅ 0.1 IDOR on `/account/orders/[id]` — Task 4
- ✅ 0.2 IDOR on `/checkout/confirmation/[orderId]` — Task 5
- ✅ 0.3 Admin login impossible — Tasks 1 + 2 + 3
- ✅ 0.4 Timestamp normalization — already shipped in Phase A
- ✅ 0.5 `researchConfirmed` hardcoded — Task 7
- ✅ 0.6 Plaintext password in cookie — Task 8
- ✅ 0.7 Stock not transactional — Task 6
- ✅ 0.8 Firestore rules not deployed — Task 9
- ✅ 0.9 `[ADDRESS TBC]` in footer — Task 10
- 🔵 0.10 Six legal pages placeholder-banner — solicitor-blocked (out of scope; Tier 1 prep)

**Placeholder scan:** No "TBD", "implement appropriately", "similar to Task N" patterns. Each step has the exact code or command. The few `<paste deploy URL here>` placeholders in Task 11 are intentional (URL not knowable until earlier task runs).

**Type consistency:**
- `SESSION_COOKIE_NAME`, `SESSION_COOKIE_OPTIONS`, `SESSION_COOKIE_MAX_AGE_SECONDS` defined once in `lib/auth-cookies.ts`, imported elsewhere
- `confirmationCookieName(orderId): string` consistent
- `getCustomerSession()` returns `CustomerSession | null` consistent
- `createOrderTransaction()` signature is `OrderInput → Promise<Order>`
- `createCheckoutAccount()` returns `Result` discriminated union; callers use the discriminator field
- `assertAdmin()` throws (returns `Promise<void>`); existing `isAdminRequest()` returns `Promise<boolean>` — both kept for callers that prefer one or the other

**Risks not in tasks (deferred to Tier 1+):**
- Custom token → ID token → session cookie auto-login flow after `createCheckoutAccount` — UX nicety, not a security risk
- Promoting variants to a sub-collection (cleaner txn boundary) — Tier 2
- CSP headers — Tier 1 (Sec H1)
- Rate limiting on enquiries / sign-in — Tier 1 (Sec H3, H4)

---

## Estimated effort

| Task | Effort |
|---|---|
| 1. Auth-cookies + session route | 60 min |
| 2. Customer auth helper | 15 min |
| 3. Wire SignIn/SignUp forms | 45 min |
| 4. IDOR fix on `/account/orders/[id]` | 30 min |
| 5. IDOR fix on `/checkout/confirmation/[orderId]` | 45 min |
| 6. Transactional order creation | 90 min |
| 7. Validate `researchConfirmed` + drop dead fields | 45 min |
| 8. Eliminate plaintext password | 60 min |
| 9. Deploy Firestore rules | 20 min (David interactive) |
| 10. Populate config/main | 20 min |
| 11. Merge + verify + end-to-end smoke | 45 min |
| **Total** | **~8 hours** |

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-02-tier0-pre-customer-blockers.md`. Subagent-driven execution with Sonnet implementers + Opus reviewer is the recommended pattern (matching the Firestore migration). Tasks 1, 2, 3 can run sequentially as a cluster (auth foundation). Tasks 4 and 5 build on it. Tasks 6, 7, 8 each touch the order action — sequence them carefully. Task 9 needs David's interactive browser flow. Task 10 needs trader-identity input from Sam (or David's best-known values).
