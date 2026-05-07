# Store setup — information needed from Sam

Living document. Items are organised by when they're needed. If you can answer
anything on this list, great. If you can't answer yet, just reply "later" or
"unknown" and we'll come back to it. David will tick items off as Sam provides
them and add new questions as they come up during the build.

Last updated: 2026-04-13

---

## Before Phase 1 launch — everything on this list must be resolved

### Business identity

- [ ] **Confirmed store name** — replaces `[PEPTIDE STORE]` placeholder throughout the site
- [ ] **Domain name** (e.g. peptidestore.co.uk) — do you already own it, or do you need to buy one?
- [ ] **Registered business address** — goes in footer, legal pages, order confirmations
- [ ] **Business email address** — for the contact form and order notifications
- [ ] **Business phone** (optional) — goes on contact page and footer if provided
- [ ] **Company registration number** — if trading as a limited company, goes in the footer
- [ ] **VAT registration status** — are you VAT-registered? If yes: (a) VAT number, and (b) should prices display inclusive or exclusive of VAT? (UK B2C convention is inclusive; research/B2B convention is exclusive.)

### Commercial decisions

- [ ] **Shipping rule** — what's the flat-rate shipping cost, and is there a "free shipping over £X" threshold?
- [ ] **Estimated dispatch time** — e.g. "Dispatched within 1 working day" — shown in confirmation emails

### Products

- [ ] **Full product catalogue** — compound name, CAS number, molecular formula, weight, variants (sizes), prices, initial stock. Can be supplied as a spreadsheet.
- [ ] **Base vial photograph** — the single high-resolution image we'll use as the template for generating all 120 product images in Phase 3
- [ ] **Certificates of Analysis (COAs)** — one PDF per variant, named by SKU (e.g. `BPC157-5MG.pdf`)

### Legal (hard launch gate)

- [ ] **Solicitor identified** — who is reviewing the legal pages and compliance copy?
- [ ] **Solicitor review**: Terms, Privacy, Cookies, Refunds, Shipping, Research Use Only
- [ ] **Solicitor review**: compliance banner copy, age gate copy, product disclaimers, About page, Product Information page, product description drafts
- [ ] **Countersigned SoW** returned to David

### Admin and access

- [ ] **Admin email address** — this becomes the Firebase Auth account that manages the site
- [ ] **Additional admin users** — does anyone else need admin access (partner, employee)? If so, their emails

---

## Before Phase 2 — TrueLayer Pay by Bank

**Update 2026-04-13:** Wallid was ruled out after direct contact — they confirmed they do not offer a REST API for custom Next.js integrations (Shopify-only). **TrueLayer has been selected as the replacement.** It provides the same customer experience (Pay by Bank via open banking) plus a native MCP server for Claude AI and **bank-level name and date-of-birth verification** at payment time (a real compliance upgrade over a front-end age checkbox).

- [x] ~~Wallid discovery call~~ — resolved 2026-04-13, Wallid ruled out
- [ ] **Sam creates TrueLayer Console account** at `console.truelayer.com` in his own name (not Actually AI's — the merchant account must be under the trading business). Create a new application named "Sam Cowling Peptide Store" and start in **Sandbox** mode.
- [ ] **Sam retrieves from TrueLayer Console**: Client ID, Client Secret, Merchant Account ID
- [ ] **Sam generates a signing key pair** in the Console (required by TrueLayer for request signing)
- [ ] **Sam shares the credentials with David** via 1Password or another secure channel (never plain email, never Slack)
- [ ] **Sam reviews TrueLayer's production approval requirements** ahead of time — 3-5 business day review, needs business details, website URL, product descriptions, compliance documentation. Initiating the review early avoids blocking launch.
- [ ] **David connects the TrueLayer MCP server** to Claude Code before starting Phase 2 development — `https://docs.truelayer.com/docs/truelayer-mcp-integration-for-claude-ai`. This lets Claude query the TrueLayer API directly during development and significantly accelerates debugging.

---

## Before Phase 3 goes live — Sam's blocking inputs

**Update 2026-05-07:** Phase 3 architecture decisions made. Royal Mail
Click & Drop chosen as sole live carrier (cheapest UK domestic, native API,
fastest onboarding). Zebra ZD421d-NW (network/cloud-capable variant) chosen
as printer with Zebra Print Cloud Connect subscription for fully automated
batch printing. Daily Mon-Fri 13:00 Europe/London batch print configured.

The full Phase 3 codebase is built and runs against stub adapters. Once Sam
delivers the items below, David populates `/admin/settings` → Dispatch tab
and toggles `enabled = true`.

### Royal Mail (carrier)

- [ ] **Royal Mail Online Business Account (OBA)** opened — record account number
- [ ] **Click & Drop API key** generated from RM Business Account portal
- [ ] **Royal Mail service code preference** — default Tracked 48 (TPN48,
      cheapest tracked, 2-3 working days). Override option: Tracked 24 (TPN24,
      premium next-day). Configurable per-order in dispatch console.
- [ ] **Return address** (Sam's dispatch location): line 1, line 2, city, postcode
- [ ] **Return name on label** — default "Cryogene Laboratories", confirm

### Zebra (printer)

- [ ] **Zebra ZD421d-NW** purchased (the **network/cloud-capable** variant — NOT the bare ZD421)
- [ ] **Zebra Print Cloud Connect subscription** active (~£5-10/mo, billed by Zebra)
- [ ] **Zebra device fingerprint** obtained from Zebra portal after registration
- [ ] **Zebra developer API key** obtained
- [ ] **4×6 thermal direct labels** in stock (Royal Mail-compatible, 102×152mm)

### Network / deploy

- [ ] **Tracking webhook URL** registered with Royal Mail after deploy:
      `https://cryogenelaboratories.co.uk/api/webhooks/royalmail/tracking`
- [ ] **Batch schedule confirmed** — default 13:00 Mon-Fri Europe/London
      (configurable in `/admin/settings`)

### Operating model

Once enabled, the daily flow is:

1. Mon-Fri 13:00 — Cloud Function automatically prints all paid orders' labels on Sam's Zebra
2. Sam picks the stack from the printer, packs each parcel against its label
3. Sam returns to laptop → `/admin/dispatch` → "Mark all printed as dispatched (n)"
4. Customer dispatch emails fan out automatically with tracking numbers
5. Royal Mail webhook events flow back into the system as parcels move (collected → in transit → out for delivery → delivered)

Until enabled, the dispatch console is fully clickable in dev with stub
adapters — no real Royal Mail orders, no real Zebra prints.

---

## Clarifications I'd love to have

- [ ] **Paid ads reality check** — you mentioned paid ads are blocked for peptide products. Nupex (which is on Shopify) appears to be running Google / Facebook / LinkedIn pixels. Is your "paid ads blocked" assumption based on a specific experience, advice from someone, or an industry rumour? Worth understanding before we close the door on a future acquisition channel.
- [ ] **Customer support plan** — who responds to contact form enquiries, during what hours? Do you want a "typical response time" statement on the contact page?
- [ ] **Email hosting** — what platform will your business email run on (Google Workspace, Fastmail, something else)? Affects Resend domain verification setup.
- [ ] **Customer data retention policy** — what happens to customer records after a period of inactivity? GDPR requires a defined retention policy in the privacy statement.

---

## Things David is already handling — no action needed from Sam

These are listed here so you know they're being dealt with, not because we need anything:

- Next.js 16 build with Tailwind v4 and shadcn/ui primitives
- Firebase Firestore data model (products, orders, customers, enquiries, config)
- Firestore security rules (production mode from day one)
- Compliance infrastructure (age gate, compliance banner, cookie consent, research-use callouts)
- Customer account area with order history, re-order, and COA download
- SEO + LLMO optimization (metadata, JSON-LD, sitemap, robots.txt with AI bot allowlist, `llms.txt` file)
- Drafted content: 10 product descriptions, About, Product Information, Research Use Only, homepage copy, FAQ snippets
- Admin UI (dashboard, products, orders, enquiries, customers, settings)
- Stub payment integration for Phase 1 end-to-end testing
- Transactional email templates via Resend
