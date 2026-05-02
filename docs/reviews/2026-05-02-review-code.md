# Code Review — Cryogene Storefront, 2026-05-02

Reviewer: Code Reviewer subagent (Sonnet) · Stack: Next.js 16 App Router + React 19 + TypeScript strict + Tailwind v4 + shadcn v4-canary + Firebase + Resend + Zod + Zustand · Latest commit at review time: `86d53e9 fix: normalize Firestore Timestamp to Date in product/config read paths`

## CRITICAL (production correctness or security risk — fix before next deploy)

- **Customer order detail leaks PII via IDOR — server renders before client AuthGuard runs** — `app/(public)/account/orders/[id]/page.tsx:13-16` and `components/storefront/account/AuthGuard.tsx:8-49`. The server fetches the order by raw ID and renders the full HTML (name, address, items, total) before the client-only `AuthGuard` ever mounts. Anyone with an order ID can view another customer's PII by hitting `/account/orders/<id>`. The TODO at line 15-17 acknowledges this — but that file is in production today. Fix: move auth into the server component using a verified Firebase session cookie, refuse to fetch unless `order.customer.uid === decoded.uid` (or admin).

- **Order confirmation page exposes any order to anyone with the URL** — `app/(public)/checkout/confirmation/[orderId]/page.tsx:6-26`. Same shape, no guard at all. Order IDs are 20-char Firestore auto-IDs (unguessable) but any URL leak (referrer header, screenshot, browser history sync, support email) discloses delivery address + order total + items. Fix: sign the orderId into the redirect URL (HMAC), or set a one-time `confirmation_token_<orderId>` httpOnly cookie in `createOrderAction` immediately before redirect and verify it here before rendering.

- **Latent Timestamp serialization bug in Firestore mode for orders, customers, enquiries** — `lib/orders.ts:101,111`, `lib/customers.ts:28,41,64`, `lib/enquiries.ts:53`. The recent `normalizeProduct`/`normalizeConfig` fix only covered products + config. Orders/customers/enquiries cast `snap.data() as Order` (etc.) without converting `firebase-admin/firestore` Timestamp class instances to Date. These objects are then handed to `"use client"` components (`OrderTable.tsx:35`, `EnquiriesList.tsx:8`, `OrderStatusControls.tsx:10`, `ConfirmationContent.tsx:5`), which Next.js RSC will reject with "Only plain objects can be passed to Client Components from Server Components." Reproducible the moment the first real order is read back from Firestore — the admin orders page will throw 500. Fix: extend the `normalizeProduct` pattern to all three modules; convert nested `payment.paidAt`, `payment.initiatedAt`, `fulfilment.dispatchedAt`, `researchConfirmedAt`, `ageGatePassedAt`, `createdAt`, `updatedAt`.

- **Admin login is impossible in production — no session cookie minting route exists** — `lib/admin-auth.ts:24` reads `__session` and calls `verifySessionCookie`, but nowhere in the codebase does any route call `auth.createSessionCookie(idToken)` to set it (`grep createSessionCookie` returns zero hits). `ADMIN_DEV_BYPASS=1` is gated to `NODE_ENV !== production`. Net effect: in Vercel production, `/admin` redirects to `/sign-in`, sign-in only does client-side Firebase Auth, no cookie is ever issued, `/admin` redirects again — infinite loop, Sam can never reach the dashboard to fulfil orders. Fix: add `/api/auth/session` route that takes a Firebase ID token, calls `auth.createSessionCookie`, sets the `__session` httpOnly cookie; have `SignInForm` POST to it after successful client-side sign-in. `[SEC]`

- **Sign-in redirect target ignored** — `components/storefront/auth/SignInForm.tsx:25`. `/admin/layout.tsx:14` sends users to `/sign-in?redirect=/admin`, but `SignInForm` always pushes `/account` regardless of `?redirect=`. Even if the session cookie route is added, admin login still lands on `/account`. Fix: read `useSearchParams().get("redirect")` and route there if present (validate it starts with `/` to avoid open-redirect).

- **`FIREBASE_PRIVATE_KEY` decoded as base64 with no validation** — `lib/firebase/admin.ts:31-34`. `Buffer.from(key, "base64").toString("utf-8")` silently produces garbage if the env var was pasted raw (with `\n` newlines, the most common form). Admin SDK then fails opaquely at first request. Fix: detect `-----BEGIN PRIVATE KEY-----` in the decoded value and throw a clear configuration error if not found; document the base64 requirement in `AGENTS.md`.

## HIGH (architectural or data-integrity risk — fix before launch)

- **Seed-mode admin writes silently no-op on Vercel** — `app/actions/products.ts:118-126`. `writeLocalWrites` uses `fs.writeFile` against `process.cwd()/data/products.local.json` — a read-only filesystem on Vercel. If Firebase env vars are missing on a deploy (typo in `FIREBASE_PROJECT_ID`), the site silently falls back to seed mode, the admin save action throws an EROFS that bubbles up as a generic 500, and product changes are lost. Fix: in production builds, refuse to fall back to seed mode — throw at boot in `lib/firebase/admin.ts` when `NODE_ENV === "production"` and admin isn't configured.

- **`getAdminDb()!` non-null assertion is misleading** — `lib/orders.ts:37,57,89,109,123`, `lib/customers.ts:27,36,53,61`, `lib/enquiries.ts:38,50,68`, `app/actions/products.ts:128,162`. The `!` swallows the very real possibility that admin SDK init failed (bad key, missing project ID). The error becomes `Cannot read properties of null` instead of "Firestore not configured." `lib/products.ts:71` and `lib/config.ts:50` show the right pattern (`if (!db) throw...`). Fix: replace every `getAdminDb()!` with the explicit-check pattern, or add an `assertAdminDb()` helper.

- **Account-creation password is collected in delivery form but never used** — `components/storefront/checkout/DeliveryForm.tsx:88-94` + `lib/checkout-session.ts:18,32-42` + `app/actions/create-order.ts`. The plaintext password rides in a base64-encoded httpOnly cookie for 30 minutes, then is dropped on the floor — `createOrderAction` doesn't call Firebase Auth, doesn't issue a session, doesn't set `customer.uid`. Either wire the account creation (call `auth.createUser`, link to order via uid) or remove the field entirely so customers don't believe an account was created. `[SEC]` — base64 ≠ encryption; storing plaintext passwords even briefly is bad practice.

- **`ResearchConfirmCheckbox` accepts `shippingInPence/vatInPence/totalInPence` from client but server already recomputes** — `components/storefront/checkout/ResearchConfirmCheckbox.tsx:25-30` and `app/actions/create-order.ts:14-19,78-83`. Good news: the server recomputes shipping/VAT/total from Firestore-read variant prices. The client-supplied totals are never trusted. Bad news: the type signature implies they matter, future maintainers may "fix" the action to use them. Fix: drop the three fields from `CreateOrderInput`; only pass `items: { sku, quantity }[]` (also drop `productSlug`, `name`, `unitPriceInPence` since those are re-fetched too).

- **Stub provider marks order "paid" without payment** — `lib/payments/stub.ts:7-15`. Documented as Phase 1 contract, but on the live URL today an HMRC-immutable order is being written with `status: paid` and a stub `providerRef`. If Sam runs any live transactions before TrueLayer ships, the immutable record claims payment was received when it wasn't. Fix: until TrueLayer is live, force `PAYMENT_PROVIDER=stub` to be rejected in production OR set order status to `pending` and surface "test mode" prominently to the customer (the yellow box on the confirmation page is one screen too late).

- **Counter race condition is correct, but `tx.set` overwrites — use `FieldValue.increment`** — `lib/orders.ts:39-44`. The transaction is technically safe (Firestore retries on conflict), but reading-then-setting the whole document is wasteful and overwrites concurrent writes to other fields if the schema grows. Fix: `counterRef.set({ count: FieldValue.increment(1) }, { merge: true })` and read the post-increment value via `await counterRef.get()` outside the transaction, OR keep the transaction and use `tx.update(counterRef, { count: FieldValue.increment(1) })`.

- **Decline-cookies still triggers `revalidatePath("/")`** — `app/actions/cookie-consent.ts:31`. Declining cookies invalidates the entire homepage cache for every visitor. Fine in low traffic but pathological under load. Fix: only revalidate the cookie-banner subtree, or skip revalidation since the banner reads consent on next render anyway.

## MEDIUM (code quality or maintainability)

- `Order.payment.paidAt` typed `Date` but cast through `as unknown as Date` — `lib/payments/stub.ts:14`. Drop the cast.
- `updateOrder` writes `updatedAt: new Date()` — but `Order.updatedAt` is `Timestamp | Date` — `lib/orders.ts:124`. Use `FieldValue.serverTimestamp()` for accuracy.
- `EditProductPage` fetches all products to find one — `app/(admin)/admin/products/[id]/page.tsx:11-12`. Add `getProductById(id)`.
- `getOrders` orderBy in Firestore mode requires composite index when filters added — pre-create in `firestore.indexes.json`.
- `incrementCustomerStats` non-atomic read-modify-write — `lib/customers.ts:67-78`. Use `FieldValue.increment`.
- `isAdminRequest` returns boolean — replace with `assertAdmin()` helper that throws.
- `ProductCard` molecule badge violates the design rules — `components/storefront/products/ProductCard.tsx:94`. Same in `ProductDetail.tsx:115` (gradient + drop-shadow + rounded). `[UX]`
- `CookieConsent` uses a drop shadow — `CookieConsent.tsx:24` (`shadow-[0_-4px_12px_rgba(13,27,62,0.06)]`). `[UX]`
- shadcn `ui/*` primitives carry rounded corners + ring + shadow defaults — restyle or remove unused.
- `age_verified` cookie set with `httpOnly: false` — `app/actions/age-gate.ts:13`. Document or move check server-side.
- Two unused imports in `lib/orders.ts:2-3` (`fs`, `path`).
- Centralise `FirestoreIdSchema` to avoid divergence across admin actions.

## LOW (polish)

- `leaveSite` redirects to `https://www.google.com` — `app/actions/age-gate.ts:23`. Pick more appropriate destination.
- `coerceToDate` in `lib/utils.ts:8-20` — tighten after Timestamp normalization fix.
- Unused `getCheckoutSession` re-export in `app/actions/checkout.ts:42`.
- `AuthGuard.tsx` `isFirebaseClientReady()` checked twice — refactor.
- `ProductCard.tsx:8` and `ProductDetail.tsx:16` duplicate `RESEARCH_TAGS` lookup — extract to `lib/research-tags.ts`.
- `createOrderAction` writes `ageGatePassedAt: now` — `app/actions/create-order.ts:112`. Misleading; rename or record actual cookie time.
- `coerceToDate(val) ?? new Date()` fallback to "now" hides bad data — show "—" instead.

## Strengths worth preserving

- **Server re-pricing in `createOrderAction`** — `app/actions/create-order.ts:46-76` correctly distrusts the client basket: it re-reads each product/variant, checks `active`, checks stock, and recomputes line totals, shipping, and VAT from server-side rules. This is the single most important safety in the codebase.
- **`isSeedMode` / `isAdminConfigured` boundary** — clean abstraction lets local dev work without Firebase while production hits Firestore.
- **`server-only` imports on every sensitive module** — prevents accidental client-bundle leakage of admin SDK and credentials.
- **Zod validation on every server action input** — consistent and complete.
- **Provider abstraction for payments** — `lib/payments/{provider,index,stub,truelayer}.ts`. Phase 2 swap-in is one-line env change.
- **Money in pence everywhere** — no floating-point money bugs.
- **Order numbering scheme `PPT-YYYYMMDD-NNNN`** — human-readable, sortable, daily-counter resets.
- **Cookie-consent buttons visually equal weight** — ICO compliance.
- **Editorial design discipline** — flat panels, hairline borders, no rounded buttons in bespoke components.
