# Accessibility Audit — Cryogene Storefront, WCAG 2.1 AA

Reviewer: Accessibility Auditor subagent · Method: static source review of `app/`, `components/storefront/`, `components/admin/`, `components/ui/`. Live AT testing not yet performed.

## CRITICAL (blocks AT users from completing core flows)

- **Compliance banner text fails contrast** — WCAG 1.4.3 — `components/storefront/layout/ComplianceBanner.tsx:6`. `#AABBCC` on `#0D1B3E` at `text-[11px]` ≈ 4.49:1 — just below 4.5:1 floor. Sticky persistent legal disclaimer. Fix: foreground to `#C8D4E4` (5.4:1) or `#D9E0EC` (6.4:1), or raise to 12px+/weight 500.

- **Age verification gate has no focus management or focus trap** — WCAG 2.4.3, 2.1.2 — `components/storefront/layout/AgeVerificationGate.tsx:6-46`. Server component with `role="dialog" aria-modal="true"` but not a real Base UI Dialog: no `inert` on rest of page, no initial focus, no focus trap, no Escape handler. Keyboard users Tab into the obscured Navbar. Screen readers not announced into the dialog. Fix: convert to Base UI Dialog (matching `BasketDrawer` pattern), or add `inert` to underlying `<div>` while `!verified` plus `autoFocus` on primary button.

- **Compliance banner uses `role="status"` for static text** — WCAG 4.1.2, 4.1.3 — `ComplianceBanner.tsx:5`. `role="status"` creates polite live region; on every App Router navigation the banner may be re-announced even though text doesn't change. Fix: remove `role="status"` and `aria-label`; render as `<aside>` or plain `<div>`.

- **Form errors not associated with inputs** — WCAG 1.3.1, 3.3.1, 3.3.3 — `DeliveryForm.tsx:30-62`, `SignInForm.tsx:43-55`, `SignUpForm.tsx:46-58`, `ProductForm.tsx:436`. Per-field error `<p>` has no `id`, no `aria-describedby` on input, no `aria-invalid`, form-level error not announced. Screen reader users submit and hear nothing. Fix: error gets `id={`${name}-error`}`; input gets `aria-describedby={hasError ? id : undefined}` and `aria-invalid={hasError}`; form-level error wraps in `role="alert"`.

## HIGH (significant barrier)

- No skip-to-main link — WCAG 2.4.1 — `app/layout.tsx:67-77`. Add visually hidden `<a href="#main">Skip to main content</a>` first focusable in `<body>`, with `focus:not-sr-only`.

- No focus-visible ring on most interactive elements — WCAG 2.4.7 — only `VariantSelector`, `ProductCard`, and Base UI primitives have `focus-visible:`. Fix: global `:focus-visible { outline: 2px solid #0D1B3E; outline-offset: 2px; }` in `globals.css`.

- Product FAQ rendered as always-expanded — WCAG 1.3.1 — `ProductFAQ.tsx:9-15`. Acceptable for a11y but inflates page; verify intent. If keeping always-expanded: fine. If collapsing: Base UI Collapsible with proper `aria-expanded`/`aria-controls`.

- `role="radiogroup"` with `<button disabled>` mixes semantics — WCAG 4.1.2 — `VariantSelector.tsx:79-101`. `disabled` removes from focus order; if first variant unavailable, `radioRefs.current[targetIdx]?.focus()` may silently fail. Plus "size unavailable" relies on color/strikethrough only (1.4.1). Fix: replace `disabled` with `aria-disabled="true"`; add visually-hidden "(unavailable)" text.

- `<h1>` duplication on age-gated pages — WCAG 1.3.1, 2.4.6 — `app/layout.tsx:60-77` + `AgeVerificationGate.tsx:14-19`. Page underneath has its own `<h1>`. Combined with no-`inert` issue, screen readers may navigate to underlying heading. Fix: `inert` on underlying content while gate open.

- Cookie consent buttons rely on hover for differentiation — WCAG 1.4.1 / 1.4.11 — `CookieConsent.tsx:46-60`. Identical at rest (per ICO equal-weight rule); no focus-visible. Pair with global focus-visible fix.

- Hairline border `#DDE1E7` on `#F7F8FA` fails non-text contrast — WCAG 1.4.11 (3:1 min) — used across `ProductCard`, all `<input>`, `CompoundStatsBar`. Ratio ≈ 1.13:1 vs offwhite, 1.20:1 vs white. Form input boundaries must hit 3:1. Fix: keep `#DDE1E7` decorative on cards; darken form input borders to `#9CA3AF` (2.5:1 — fails) or `#6B7280` (4.6:1 — passes).

- `<select>` and most `<input>` lack visible focus — WCAG 2.4.7 — `ListingToolbar.tsx:62-71`, all checkout/auth/admin form inputs. Add `focus:border-[#0D1B3E] focus:outline focus:outline-2 focus:outline-[#0D1B3E] focus:outline-offset-1`.

## MEDIUM

- Mobile filter drawer is hand-rolled `<div role="dialog">` — no focus trap, no Escape, no focus restore — `ListingToolbar.tsx:76-103`. Replace with Base UI Sheet.

- AdminSidebar broken active-state ternary — `AdminSidebar.tsx:27-33`. Returns boolean instead of className for dashboard link. Functional bug; missing `aria-current="page"`.

- Touch target on basket quantity buttons — `BasketItem.tsx:29-45`. `w-7 h-7` = 28×28 (passes 2.5.8 24×24, fails 2.5.5 44×44). Bump to `w-11 h-11` or add hit-area padding.

- `PlaceholderBanner.tsx:12` uses `⚠️` emoji as visible content — WCAG 1.1.1 — wrap in `<span aria-hidden="true">⚠️</span>` + visually-hidden "Warning: ".

- `<select>` filters fire `onChange` and replace URL silently — WCAG 4.1.3 — add `aria-live="polite"` to product count or announce result.

- BasketIconButton count update — has `aria-label` "Open basket (N items)" — acceptable.

- CompoundStatsBar truncates with `title` — WCAG 1.4.10 / 1.4.4 — `title` is mouse-only. Remove `truncate` or add focusable disclosure.

- `text-[#9CA3AF]` mono CAS numbers on cards — WCAG 1.4.3 — `ProductCard.tsx:62`. 2.85:1, fails 4.5:1. Darken to `#6B7280`.

- `text-[#5B7BA3]` Company No / VAT No in Footer at 11px — fails 4.5:1. Lighten to `#7B95B8`.

## LOW

- `aria-label="Open menu"` doesn't update to "Close menu" — `MobileNav.tsx:23-25`. Has `aria-expanded` (good).
- `<a target="_blank">` for PubChem + CoA — add visually-hidden "(opens in new tab)".
- Reduced motion — `NavbarShell`, `ProductCard`, `ListingToolbar`, `MobileNav` use `transition` without `motion-safe:`. Add global `@media (prefers-reduced-motion: reduce)` override.
- Decorative `aria-hidden="true"` redundant alongside `alt=""` on no-results image.
- BasketItem image alt — use `alt=""` since name shown adjacent.

## Strengths

- Semantic landmarks correct (`<header>` → `<main>` → `<footer>`).
- `<h1>` per page with `<h2>`/`<h3>` hierarchy.
- `<label htmlFor>` + `<input id>` association consistent.
- `<fieldset>` + `<legend>` in `ProductFilters.tsx:66-87`.
- Breadcrumbs use `<nav aria-label="Breadcrumb">` + `aria-current="page"` correctly.
- VariantSelector implements full WAI-ARIA Radio pattern (Arrow keys, Home/End, roving tabindex, focus management). Most accessible component in the codebase.
- Base UI Sheet (BasketDrawer, MobileNav) handles focus trap + Escape + focus restore + `aria-modal`.
- ProductCard uses `<article aria-labelledby aria-describedby>`.
- `<ul>`/`<li>` consistent in nav, footer, breadcrumb, filters, basket summary.
- JSON-LD blocks correctly typed `application/ld+json`.
- `lang="en-GB"` on `<html>`.
- ICO-compliant equal-weight cookie buttons.

## Remediation order

**Immediate:** Convert age gate to Base UI Dialog with `inert`. Fix compliance banner contrast + role. Wire form errors with `aria-describedby` + `aria-invalid` + `role="alert"`. Add global `:focus-visible`. Add Skip-to-main link. Fix AdminSidebar ternary.

**Short-term:** Replace mobile filter drawer with Sheet. Darken form input borders. Add `aria-live` to filtered count. Improve VariantSelector unavailable communication. Add `prefers-reduced-motion` override.

**Ongoing:** Touch-target compliance. CompoundStatsBar truncation. CAS-number contrast.

Re-audit with NVDA + VoiceOver + keyboard-only across three core flows before public launch. Run axe-core in CI.
