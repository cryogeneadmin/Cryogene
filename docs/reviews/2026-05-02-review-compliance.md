# Regulatory & Compliance Review — Cryogene Storefront, 2026-05-02

**This is a developer's review. NOT legal advice. Solicitor sign-off remains the legitimate launch gate.** The `reviewed: true` frontmatter flag is the technical blocker.

Reviewer: Legal Compliance Checker subagent. Regulatory surface: UK Human Medicines Regulations 2012, MHRA, ASA/CAP Code, UK GDPR + DPA 2018, PECR, Consumer Rights Act 2015, HMRC.

## CRITICAL (cannot launch until resolved)

### C1. All six legal pages render placeholder banner
`content/legal/{terms,privacy,cookies,refunds,shipping,research-use}.md` all have `reviewed: false`. Each renders the amber banner. Bodies open with `**[DRAFT — PENDING SOLICITOR REVIEW]**` and prefix every paragraph with the marker. 57 `[DRAFT —` markers + 19 `[TO BE CONFIRMED BY SAM]` placeholders inside legal pages.

Solicitor walk-through, replace placeholders, satisfy on UK GDPR/PECR/CRA, authorise `reviewed: true`.

### C2. Trader identity placeholders rendered in production footer
`lib/config.ts:21` defaults `registeredAddress: "[ADDRESS TBC]"`; `Footer.tsx:130` renders verbatim. Companies Act 2006 s.82 + E-Commerce Regs 2002 reg.6 require trading details on every page. Solicitor: confirm entity (sole trader vs Ltd), populate `config/main`.

### C3. Product Information page renders nine `[DRAFT — REVIEW AND ADAPT]` markers publicly
`app/(public)/product-information/page.tsx:10, 18, 30, 40, 50, 65, 74, 83, 92, 104` — no placeholder banner gates this route. Either mount `PlaceholderBanner` or strip markers + Sam approves prose.

### C4. Privacy Policy materially misstates international transfers
`content/legal/privacy.md:65-67`: *"All personal data is stored within the UK/EEA. No international transfers outside the UK/EEA occur."*

Three issues:
1. Vercel functions default to `iad1` (US) — server actions including `create-order.ts`, `contact.ts`, age-gate writes execute in iad1 with personal data flowing through them. UK government adequacy decision under UK Extension to EU-US DPF requires Vercel Inc. self-certification (they do), so a transfer mechanism exists, but the policy still misrepresents that no transfers occur.
2. Vercel itself is US-headquartered controller/processor.
3. Resend is US-based (when wired).

Solicitor: transfers section naming each processor + region + lawful mechanism (UK IDTA / DPF / SCCs).

### C5. Research-use framing — solicitor decision needed on GLP-1 SKUs
`data/product-content.ts` uses *"for UK laboratory immunology / GPR54/KISS1R / tissue-repair / metabolomics studies"* — close to therapeutic domains. `content/drafts/product-descriptions/{semaglutide,tirzepatide}.md:12` use *"investigated in preclinical and clinical research"* — "clinical" suggests human use.

GLP-1 agonists (semaglutide, tirzepatide) named in active MHRA enforcement and ASA rulings. Solicitor must decide GLP-1 SKU policy: remove from launch catalogue or copy reviewed line-by-line.

## HIGH

### H1. Sign-up and checkout collect PII without explicit T&C / Privacy acceptance
`SignUpForm.tsx:46-58` captures email + password without privacy/terms tickbox. UK GDPR Art. 12-14 require just-in-time notice. `DeliveryForm.tsx` collects name + email + phone + address + research institution without notice. CRA / Consumer Contracts Regs 2013 reg.13 require pre-contract information.

Add unbundled tickbox at delivery review: *"I have read and accept the [Terms](/legal/terms) and [Privacy Policy](/legal/privacy)"*.

### H2. Contact form has no privacy notice
`app/(public)/contact/page.tsx:29-49`. Add one-liner: *"By sending us a message you agree we may process your name, email and message to respond. See our [Privacy Policy]."*

### H3. Privacy lists Vercel Analytics; no analytics installed
`privacy.md:30,41` and `cookies.md:39-41` describe a Vercel Analytics cookie. No `@vercel/analytics` dependency. Better than the inverse but Cookie Policy is technically inaccurate. Either install + consent-gate, or remove rows. PECR reg.6 is the relevant rule.

### H4. Cookie banner is post-hoc — no withdrawal UI
`CookieConsent.tsx:9-12` only shows when consent unknown. No way to withdraw later. ICO: withdrawal must be as easy as giving consent. Add footer "Cookie preferences" link.

### H5. Age gate — no per-order audit trail of which copy was affirmed
`app/actions/age-gate.ts:8` — 30-day cookie. `Order.researchConfirmed/researchConfirmedAt/ageGatePassedAt` timestamps the order but doesn't snapshot the gate copy. Snapshot `confirmationCopyVersion: "v1-2026-05-01"` on each order.

### H6. `leaveSite` redirects to google.com
`app/actions/age-gate.ts:23`. Solicitor may prefer official information page (talktofrank.com / NHS / gov.uk). Discuss.

### H7. Privacy Policy ICO registration `[TO BE CONFIRMED]`
`privacy.md:18`. UK DPA 2018 fee regs require controller registration unless exempt. £40-£60/year. Cannot launch without. Confirm Sam has registered.

### H8. ProductDetail bottle alt text
Verified neutral — *"${product.name} research peptide vial"*. Strength, not finding.

### H9. CoA promised everywhere, populated nowhere
124 `coaUrl: null`. Yet site claims downloadable CoA in footer credibility row, homepage hero, About page, research-use page, llms.txt. CMA Digital Markets Act 2024 / CPR 2008 reg.5 misleading actions about main characteristics.

Either populate `coaUrl` per variant or rewrite as "available on request".

## MEDIUM

- M1. No DSAR mechanism beyond contact form. Document SLA tracking.
- M2. Account deletion 2-year vs order retention 6-year — anonymise rather than delete to dissociate.
- M3. Research-institution field lawful basis = legitimate interest needs LIA, or move to consent.
- M4. No marketing opt-in surface yet — when Sam adds, must be unbundled, double opt-in, marketing row in privacy table.
- M5. VAT line "calculated at the review step if applicable" — basket text confusing for non-registered seller. When `vat.registered === false`, basket should say "Shipping calculated at checkout" only. Terms `[TO BE CONFIRMED BY SAM]` VAT clause should resolve.
- M6. Order confirmation lacks Consumer Contracts Regs 2013 reg.13/16 statutory information (model cancellation form, period, return costs). Order email is conventional place — TODO at `contact.ts:43`.
- M7. Storage panel "24 months at −20 °C" — per-batch stability claim not backed by per-batch CoA testing. Soften to "stored at −20 °C as supplied".
- M8. PubChem outbound link — `rel="noopener noreferrer"` present. Solicitor may want disclaimer that external resources discuss therapeutic uses.
- M9. Research tags taxonomy in `data/research-tags.ts` — solicitor should review tag labels for therapeutic implication.

## LOW

- L1. Compliance banner copy concise + lay-readable. Strength.
- L2. Cookie banner button equality. Strength.
- L3. Server-side price re-verification at order time. Strength.
- L4. `metadata.metadataBase` uses production domain — correct for OG.

## Already-good

- Research-use confirmation tickbox at checkout unbundled, not pre-ticked, required for "Pay now".
- Cookie banner equality (ICO).
- No analytics tags fire pre-consent (none wired).
- Server-side price/stock re-verification.
- Age verification re-checked at order creation.
- `reviewed: true` frontmatter gate genuinely enforces.
- No therapeutic claims in customer-facing visible copy.
- Purity claim consistency ≥99%; zero ≥98% stragglers.
- CoA structure documented in product information.
- Distinct cookie scopes listed correctly in cookie policy.
- `secure: process.env.NODE_ENV === "production"` on consent cookies.
- Brand naming distinction (Cryogene Laboratories customer-facing, Cryogene wordmark on bottles).

## Summary actions for solicitor instruction

The single most important deliverable: solicitor walks through the six legal pages and Product Information, replaces placeholders, authorises `reviewed: true`. Plus four targeted asks:

1. **GLP-1 SKU position** — keep with copy review, or remove from launch.
2. **Trader entity** — sole trader vs Ltd — populate config.
3. **Confirm ICO registration** is in place.
4. **Approve transfers section** of privacy policy reflecting actual Vercel/Resend US transfers under DPF.

Implementation gaps for David before flipping `reviewed: true`:

- Mount `PlaceholderBanner` on `/product-information` or strip `[DRAFT —` markers.
- Add T&C/Privacy acceptance tickbox to delivery form and contact form.
- Populate every variant's `coaUrl` or rewrite "downloadable" claims.
- Add "Cookie preferences" reopen-banner mechanism.
- Wire Vercel Analytics or remove from cookie/privacy policy.
- Snapshot research-use confirmation copy version on each order.
- Pin Vercel functions to `lhr1` (or amend privacy policy).

**This is a developer's review, not legal advice.**
