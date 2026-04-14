# Smoke Test Checklist

Run before every production deploy. Estimated time: 10 minutes.

---

## Storefront

- [ ] Homepage loads with all sections rendered (hero, featured products, category cards, compliance callout, trust section)
- [ ] Compliance banner visible at the top of every page
- [ ] Age gate appears in a fresh incognito window
- [ ] Clicking "Enter site" on the age gate dismisses it and loads the homepage
- [ ] Cookie consent banner appears on first visit and can be accepted or declined

## Products

- [ ] `/peptides` listing renders all active peptide products
- [ ] `/mixers` listing renders all active mixer products
- [ ] `/supplies` listing renders all active supply products
- [ ] Filters update the URL query parameter and narrow results correctly
- [ ] Product detail page renders: gallery/molecule image, chemistry row, variant selector, Add to basket button, FAQ accordion, related products
- [ ] Variant selector updates the displayed price (or shows "Pricing TBC" if price is zero)
- [ ] Add to basket opens the basket drawer with the correct item and quantity

## Checkout

- [ ] Basket drawer shows the same items and total as the `/basket` page
- [ ] `/checkout/delivery` accepts form input with client-side validation (required fields highlighted on submit if empty)
- [ ] `/checkout/review` shows correct order summary including items, subtotal, shipping, and total
- [ ] Research use checkbox is visible on the review page
- [ ] Pay button is disabled until the research use checkbox is ticked
- [ ] Stub payment flow completes and redirects to `/checkout/confirmation`
- [ ] Confirmation page shows an order number and order summary

## Admin (requires ADMIN_DEV_BYPASS=1 in .env.local for dev, or admin account login on live site)

- [ ] `/admin` dashboard loads with all four stat cards populated
- [ ] `/admin/products` lists all products; filter controls work
- [ ] Product edit: open a product, change the short description, Save — confirm the change appears on the public product page
- [ ] `/admin/orders` lists orders; the smoke test order is visible
- [ ] Order status transition: change status on the test order and confirm it persists on reload
- [ ] `/admin/settings`: change Store Name, Save, reload the homepage — confirm the navbar shows the new name. Change it back.
- [ ] Contact form submission at `/contact`: submit a test enquiry, confirm it appears in `/admin/enquiries`

## SEO and Meta

- [ ] `/sitemap.xml` returns valid XML listing at least the homepage, category pages, all active products, and all 6 legal pages
- [ ] `/robots.txt` includes `User-agent: GPTBot`, `User-agent: ClaudeBot`, `User-agent: PerplexityBot`, `User-agent: Google-Extended` each with `Allow: /`
- [ ] `/llms.txt` returns plain text listing all active products grouped by category
- [ ] View source on a product detail page: confirm three `<script type="application/ld+json">` blocks (Product, FAQPage if FAQ exists, BreadcrumbList)
- [ ] View source on homepage: confirm one `<script type="application/ld+json">` block with `"@type": "Organization"`

## Legal pages

- [ ] `/legal/terms` renders with the amber `[DRAFT — PENDING SOLICITOR REVIEW]` banner
- [ ] `/legal/privacy` renders correctly
- [ ] `/legal/cookies` renders correctly
- [ ] `/legal/refunds` renders correctly
- [ ] `/legal/shipping` renders correctly
- [ ] `/legal/research-use` renders correctly

## Build

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run build` completes successfully with no errors
- [ ] No console errors in the browser on any page visited above
