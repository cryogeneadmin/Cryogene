# Bottle image audit — 2026-04-21

Result of the FLUX Kontext Max batch run from 2026-04-20 evening.

## Summary

- **111 variants targeted** (48 peptide products × 1–5 variants each)
- **91 successfully rendered** into `public/products/`
- **20 failed** — Replicate account ran out of credit before completion (the $10 balance was consumed by ~91 successful images at $0.08/image + retry overhead)
- **0 dimensional outliers** — every output is exactly 832×1248 PNG
- **File sizes tightly clustered** (535–765 KB, SD 53 KB) — no blanks or garbage files

## Contact sheets (for full visual review)

See `audit/contact-sheet-1.png`, `contact-sheet-2.png`, `contact-sheet-3.png` — each shows ~30 bottles at 400×600 per cell so you can scan them quickly.

## Known issues from spot-check sample (~10 bottles)

These were caught during post-batch audit. There are very likely more at the same error rate (~30–40% showed some minor-to-major issue in the sample):

| File | Issue | Severity |
|---|---|---|
| `ghk-cu--50mg.png` | No Cryogene hexagon logo on label | Major |
| `nad-plus--1000mg.png` | Top band reads "FOR CRYOGENE LABORATORIES" (wrong text hallucinated) | Major |
| `bpc-157-tb-500-blend--10mg.png` | "BPC-157" prefix dropped; label shows only "+ TB-500 Blend" | Major |
| `cjc-1295-ipamorelin-blend--10mg.png` | "Ipamorelin" rendered as "Ipamoreli" (missing 'n') | Minor |
| `sermorelin--5mg.png` | Trademark symbol "™" hallucinated next to name; no FOR RESEARCH USE ONLY band | Minor |

**You should do a morning visual pass over all 3 contact sheets and add any further issues to the regeneration list below.**

## Regeneration list (for after Replicate top-up)

### Failed entirely — must be regenerated
```
igf-1lr3 0.1mg
igf-1lr3 1mg
5-amino-1mq 10mg
5-amino-1mq 50mg
l-carnitine-600mg 600mg
epitalon 10mg
epitalon 50mg
ipamorelin 5mg
ipamorelin 10mg
semaglutide 10mg
semaglutide 30mg
retatrutide 5mg
retatrutide 10mg
retatrutide 30mg
retatrutide 40mg
retatrutide 50mg
cagrilintide 10mg
glow-blend 70mg
tb500 2mg
tb500 10mg
```

### Regenerate due to quality issue
```
ghk-cu 50mg
nad-plus 1000mg
bpc-157-tb-500-blend 10mg
cjc-1295-ipamorelin-blend 10mg
sermorelin 5mg
```

## How to regenerate after Replicate top-up

1. Top up Replicate credit at https://replicate.com/account/billing (aim for at least $3 headroom)
2. Optionally rotate the API token at https://replicate.com/account/api-tokens (the old one was pasted in chat)
3. If you rotated, update `REPLICATE_API_TOKEN` in `.env.local`
4. Regenerate specific products by slug:
   ```bash
   npx tsx scripts/generate-bottle-images-flux.ts --only=ghk-cu
   npx tsx scripts/generate-bottle-images-flux.ts --only=nad-plus
   npx tsx scripts/generate-bottle-images-flux.ts --only=bpc-157-tb-500-blend
   # ...etc
   ```
5. Re-run the audit to confirm: `npx tsx scripts/audit-bottles.ts`
6. Re-wire seed: `npx tsx scripts/update-product-images.ts`
7. For the 20 missing variants above, just run the full script again — existing good images are never overwritten because the script writes to deterministic filenames; any already-present file is effectively "up-to-date" from the script's perspective. (If you want a forced re-roll of specific variants, just delete that PNG first before re-running.)

## Current state of the project

- `products.seed.json` updated: 43 of the 48 peptide products now have at least one rendered bottle image (those with every variant failed remain on the placeholder SVG)
- The 20 missing-variant products still have some variants without images — those variants will fall back to the product's first successful image because ProductCard uses `product.images[product.primaryImageIndex]`, and variant images aren't per-variant in the UI yet (that's a deferred UX decision)
- `components/storefront/layout/Navbar.tsx` — Cryogene logo wired at `/brand/cryogene-logo-nav.png`
- Bottle template + logo source files preserved at `assets/bottle-template.jpeg` and `public/brand/cryogene-logo.jpeg`

## What was NOT done

- Dark-variant logo for footer — footer still shows store name as text (intentional; would need inverted logo)
- Homepage hero still uses `/placeholder-vial.svg` — could be swapped for a rendered hero bottle later
- Per-variant image display on ProductDetail — each product shows only its primary (lowest-size) variant's bottle; selecting a different size in VariantSelector doesn't change the image yet. Requires schema + client-component refactor.
- `CRYOGENE LABORATORIES` wordmark and `KEEP REFRIGERATED` text were intentionally accepted as "may-or-may-not-be-present" trade-offs on the FLUX output (see previous batch discussion)
