# Cryogene Review Synthesis — 2026-05-02

Six parallel specialist reviews after the Firestore migration shipped. 48 distinct findings across code, security, accessibility, performance, regulatory compliance, and UX/design. This synthesis is the master priority list; tier-specific implementation plans are separate files.

**Reviewers (parallel):**
- Code Reviewer — `2026-05-02-review-code.md`
- Security Engineer — `2026-05-02-review-security.md`
- Accessibility Auditor (WCAG 2.1 AA) — `2026-05-02-review-accessibility.md`
- Performance Benchmarker — `2026-05-02-review-performance.md`
- Legal Compliance Checker (UK regulatory) — `2026-05-02-review-compliance.md`
- UX Architect — `2026-05-02-review-ux.md`

**Cross-review recurring themes:**
1. Auth never got finished — no session cookie minting, no server-side ownership checks on order pages.
2. Timestamp serialization fix only covered products + config; orders/customers/enquiries still raw.
3. Wrong fonts shipped (Playfair vs spec'd Cormorant Garamond).
4. 71MB of unoptimized PNGs is the dominant performance cost.
5. 307 hard-coded hex literals across 42 files — design tokens in `@theme` are ignored.
6. `researchConfirmed` hardcoded `true` server-side — both compliance + audit failure.
7. Privacy policy claims no international transfers, but Vercel functions default to `iad1` (US).
8. All six legal pages still have `reviewed: false` — solicitor walkthrough is the technical launch blocker.

## Tier 0 — Pre-customer blockers (must land before any real customer)
| # | Finding | Effort | Files |
|---|---|---|---|
| 0.1 | No server-side auth on `/account/orders/[id]` (IDOR, full PII leak) | 1h | `app/(public)/account/orders/[id]/page.tsx` |
| 0.2 | No server-side auth on `/checkout/confirmation/[orderId]` | 1h | `app/(public)/checkout/confirmation/[orderId]/page.tsx`, `app/actions/create-order.ts` |
| 0.3 | Admin login impossible in production — no `__session` cookie minting route | 2-3h | new `app/api/auth/session/route.ts`, `components/storefront/auth/SignInForm.tsx`, `lib/admin-auth.ts` |
| 0.4 | Timestamp normalization missing in orders / customers / enquiries | 30m | `lib/orders.ts`, `lib/customers.ts`, `lib/enquiries.ts` |
| 0.5 | `researchConfirmed` hardcoded `true` server-side — compliance + audit failure | 30m | `app/actions/create-order.ts`, `components/storefront/checkout/ResearchConfirmCheckbox.tsx` |
| 0.6 | Plaintext password persisted in checkout cookie | 1h | `lib/checkout-session.ts`, `components/storefront/checkout/DeliveryForm.tsx`, `app/actions/create-order.ts` |
| 0.7 | Stock decrement not transactional — oversell + double-spend | 1h | `app/actions/create-order.ts`, `lib/orders.ts` |
| 0.8 | Firestore rules likely not deployed | 30m | `firebase login` + deploy |
| 0.9 | Trader identity placeholders in production footer (`[ADDRESS TBC]`) | 5m | populate Firestore `config/main` doc |
| 0.10 | Six legal pages still placeholder-banner | external | solicitor walkthrough |

## Tier 1 — Pre-launch (before public announcement)
**Compliance:** GLP-1 SKU policy, CoA promise vs reality, privacy international transfers, T&C/Privacy acceptance tickbox, strip placeholder markers from Product Information page + legal page bodies.

**Security hardening:** CSP/security headers, rate-limit `/contact`, sign-in abuse controls, tighten `customers` rule, CSRF/SameSite=strict on `__session`.

**Performance:** Re-encode 71MB PNGs to AVIF/WebP, hero images, pin Vercel to `lhr1`, dedupe homepage queries, `'use cache'` on `getProducts`/`getConfig`, composite index for active+category.

**Accessibility:** Age gate focus trap + `inert`, compliance banner contrast (`#AABBCC` → `#C8D4E4`) + role fix, form error association, skip-to-main, global focus-visible, darken form-input borders.

**Design correctness:** Swap fonts to Cormorant Garamond + DM Sans, strip drop shadows + gradients + rounded from molecule panels, fix `StorageHandlingPanel` dynamic Tailwind, fix `AdminSidebar` ternary.

## Tier 2 — Next-sprint cleanup
- 307 hex literals → `@theme` tokens
- Replace `getAdminDb()!` non-null assertions with explicit checks (11 sites)
- Drop dead client-supplied price fields from `CreateOrderInput`
- `incrementCustomerStats` use `FieldValue.increment`
- `assertAdmin()` helper replacing boolean `isAdminRequest()`
- Mobile filter drawer → Base UI Sheet
- N+1 in checkout: parallel/`where in` lookup
- `getFeaturedProducts` push sort to Firestore
- Mono font misuse in 4 components
- Checkout step indicator
- Audit log collection
- DSAR / erasure plumbing

## Tier 3 — Polish
Skeleton/loading states, order-status timeline, image gallery, 44px touch targets, `prefers-reduced-motion`, CAS contrast on cards, mobile compliance copy, cookie preferences reopen.

## Strengths to preserve (do not regress)
- Server-side price re-computation in `createOrderAction`
- `server-only` imports on every sensitive module
- `isSeedMode` boundary pattern
- Zod on every server action
- ICO-compliant cookie banner equal-weight buttons
- `label-editorial` typography utility + hairline borders + flat panels
- `CompoundStatsBar` editorial design
- VariantSelector full WAI-ARIA Radio pattern
- Money in pence everywhere

---

Implementation plans:
- `docs/superpowers/plans/2026-05-02-tier0-pre-customer-blockers.md`
- `docs/superpowers/plans/2026-05-02-tier1-pre-launch.md`
- `docs/superpowers/plans/2026-05-02-tier2-cleanup.md`
- `docs/superpowers/plans/2026-05-02-tier3-polish.md`
