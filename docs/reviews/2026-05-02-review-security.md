# Security Review — Cryogene Storefront, 2026-05-02

Authorized internal review for paid client Sam Cowling, conducted by David (Actually AI). Reviewer: Security Engineer subagent (Sonnet). Stack: Next.js 16 App Router + Firebase Admin + Firestore + Resend (planned) + Vercel.

## CRITICAL — exploitable, must fix before any real customer

### C1. IDOR on order detail pages — full PII exposure of any order
- Evidence: `app/(public)/account/orders/[id]/page.tsx:13-17` and `app/(public)/checkout/confirmation/[orderId]/page.tsx:6-26`
- Both server components call `getOrderById(id)` and render the order's full PII before any auth check. The account-orders TODO acknowledges this. The confirmation page has no auth at all.
- **Fix**:
  1. On `/account/orders/[id]`: server-read `__session`, verify, compare uid.
  2. On `/checkout/confirmation/[orderId]`: gate by short-TTL signed token cookie set in `createOrderAction`.
  3. Treat order doc id as a capability token — never log to analytics.

### C2. Server-side auth is non-functional — `__session` cookie is never minted
- Evidence: `lib/admin-auth.ts:19-25` reads `__session`; `lib/auth.ts:13-23` calls Firebase **client** SDK only; no `createSessionCookie` anywhere.
- Real admins cannot log in to `/admin` in production. Only `ADMIN_DEV_BYPASS=1` works, and it's gated by `NODE_ENV !== "production"`.
- **Fix**:
  1. Add `app/api/auth/session/route.ts` (POST): receive ID token, call `getAdminAuthSdk().createSessionCookie(idToken)`, set httpOnly Secure SameSite=Strict cookie. DELETE for sign-out + `revokeRefreshTokens(uid)`.
  2. After client `signInWithEmailAndPassword`, call this endpoint with the result's ID token.
  3. Strengthen the bypass guard: also require `process.env.VERCEL` to be unset.

### C3. Plaintext password persisted in checkout cookie
- Evidence: `lib/checkout-session.ts:18,32-42`. base64 ≠ encryption.
- Any cookie capture (Vercel logs, error trackers, support session) leaks the password.
- **Fix**: Create the Firebase Auth user immediately on the delivery step (POST to server action that calls `getAuth().createUser({email, password})`), throw away the password.

### C4. No stock decrement → oversell + no transactional integrity
- Evidence: `app/actions/create-order.ts:58-64` reads stock and rejects if insufficient, but `createOrderRecord` (`lib/orders.ts:48-61`) never decrements. No transaction wrapping read-check-write.
- Two parallel buyers both pass on the last unit. Worse, attacker race-creates dozens.
- **Fix**: Wrap order creation in a Firestore transaction that reads each variant, validates stock, decrements, writes order — atomic batch. Variants in array form makes this awkward; consider promoting variants to subcollection.

### C5. `researchConfirmed` is hardcoded server-side, not validated
- Evidence: `app/actions/create-order.ts:110-111` sets `researchConfirmed: true` and `researchConfirmedAt: now` unconditionally.
- No actual research-use confirmation captured. Compliance + legal-defence failure.
- **Fix**: Review-step form posts `researchConfirmed=on` checkbox; Zod validates; reject if absent. Audit log IP + UA + checkbox state. Same for `ageGatePassedAt`.

## HIGH — significant risk, fix before launch

### H1. No CSP, no security headers
- `next.config.ts:1-23` has no `headers()`. No CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy.
- **Fix**: Add `headers()` with strong CSP (`default-src 'self'; img-src 'self' https://firebasestorage.googleapis.com https://storage.googleapis.com data:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com; ...`), HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy disabling camera/mic/geo/FLoC.

### H2. Firestore rules likely not deployed
- Memory note: Task 7 of migration plan skipped firestore deploy due to firebase-tools auth issue.
- If production rules are default-permissive, the public Firebase API key in the bundle could read/write everything from the browser.
- **Fix**: `firebase deploy --only firestore:rules,storage` from authenticated machine. Verify with `firebase firestore:rules:get`. Add CI step to prevent drift.

### H3. Enquiries `hasOnly()` rule incomplete — DoS by spam
- `firestore.rules:23-29`. No rate limit, no captcha, no length cap. `app/actions/contact.ts` has no rate limit either.
- Spambot floods → admin inbox useless, Firestore bills inflated, Resend reputation tanked.
- **Fix**:
  1. Honeypot field rejected server-side.
  2. IP-based rate limit (Vercel KV / Upstash): 1/min, 10/day.
  3. `request.resource.data.message.size() < 5000` and `name.size() < 200` in rule.

### H4. Sign-in / sign-up has no abuse controls
- `SignInForm.tsx:19-30` calls Firebase client SDK directly. No captcha, no enumeration mitigation, raw error messages leak whether email exists.
- **Fix**:
  1. Generic error: "Email or password incorrect."
  2. Firebase App Check (reCAPTCHA v3 / Enterprise).
  3. Enable Firebase "email enumeration protection" toggle.
  4. Server-side audit log of every sign-in attempt.

### H5. CSRF protection not explicit on state-changing routes
- `age_verified` and `cookie_consent` cookies use `SameSite=lax`. Top-level navigation from attacker site can trigger.
- **Fix**: `SameSite=strict` on `__session` and auth-bearing cookies. Origin/Referer check in `createOrderAction`.

### H6. Client-supplied price fields exist in `CreateOrderInput` (dead code, regression risk)
- `app/actions/create-order.ts:14-19` accepts `shippingInPence`, `vatInPence`, `totalInPence` from client and ignores them. Server recomputes correctly. But the schema invites future drift.
- **Fix**: Drop those three fields; accept only `{productSlug, sku, quantity}`.

### H7. `customers` collection rule allows arbitrary self-write fields
- `firestore.rules:17-21`: `allow create, update: if request.auth.uid == uid` with no field whitelist.
- Customer self-writes any field. Footgun if future server code trusts customer-set values.
- **Fix**: `hasOnly()` whitelist of customer-writable fields. Sensitive fields admin-only.

## MEDIUM — defense-in-depth

- M1. `notFound()` after C1 fix — return same 404 for "doesn't exist" and "no permission" (avoid timing oracle).
- M2. Confirmation page `?stub=true` query — block in production, throw at module load if `PAYMENT_PROVIDER==="stub" && NODE_ENV==="production"`.
- M3. Storage rules `coas/` is world-readable. Add content-type/size constraints, consider signed-URL TTL.
- M4. Consent cookies `httpOnly: false` (intentional for UX) — XSS-flippable; document threat model, never trust without server-side re-confirmation.
- M5. No audit log of privileged admin actions (`setOrderStatus`, `addAdminNote`, `saveProduct`, etc.). Add `auditLog` collection: `{action, actorUid, target, before, after, ts, ip, ua}`. Rule: read admin-only, write false (server-only).
- M6. Customer "right to be forgotten" path absent. Document SAR/erasure in `/legal/privacy`. Build admin actions: `exportCustomerData(uid)` and `eraseCustomer(uid)` (PII redaction respecting tax retention).
- M7. shadcn `4.2.0` and `@base-ui/react ^1.4.0` — pre-release surface. Pin exact versions, Dependabot, weekly `npm audit`.
- M8. Sign-up likely missing email verification. Configure Firebase Auth → Templates → require verification before order linkage.

## LOW — hardening

- L1. Order numbers `PPT-YYYYMMDD-NNNN` predictable. URLs use Firestore auto-IDs (correct). Keep current scheme for display.
- L2. `process.cwd()` writes in admin product save. If seed-mode triggered in prod (env-var typo), silent failure. Throw at module load if `NODE_ENV==="production" && isSeedMode()`.
- L3. `replicate ^1.4.0` runtime dep — move to devDependencies if only used in scripts.
- L4. Add Permissions-Policy to opt out of FLoC/Topics.
- L5. `iron-session ^8.0.4` declared but unused.
- L6. `app/llms.txt/route.ts` — confirm doesn't leak admin paths.

## Already-good

- Server-side price re-computation in `createOrderAction`.
- Admin layout gates all `/admin/*` routes (`app/(admin)/admin/layout.tsx:11-13`) AND every server action rechecks (defense-in-depth).
- Zod on every admin server action.
- `server-only` imports.
- `orderCounters` rule: `allow read,write: if false` (clients cannot touch).
- `orders` rule: `allow write: if false` (customers cannot self-write orders).
- `.gitignore` covers env files + service-account JSON variants.
- `FIREBASE_PRIVATE_KEY` base64-encoded for Vercel paste safety.
- `isAdminConfigured()` requires all three credentials non-placeholder.
- Storefront uses Admin SDK only (server-rendered) — public web API key has minimal blast radius.
