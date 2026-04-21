# Bottle image audit — second pass, 2026-04-21

After David's first $10 Replicate top-up + regen passes for flagged bottles.

## Current state

- **102 of 111 peptide variants rendered** (up from 91 yesterday)
- **9 missing entirely** — credit exhausted during second regen batch, need a third top-up to complete
- **3 rendered but still have text errors** — FLUX Kontext Max produced new hallucinations on retry; further regens likely needed but may or may not converge (diffusion-model character dropout is inherent to the architecture)

## Summary of passes

| Pass | Attempted | Clean output | Still bad | Failed (credit/rate limit) |
|---|---|---|---|---|
| 1 (first batch) | 111 | ~80 | ~6 flagged | 20 (credit) |
| 2 (targeted regen for 5 flagged) | 5 | 4 | 1 (sermorelin new hallucination) | 0 |
| 2 (new renders for 20 credit-failed) | 20 | ~14 | ~6 | 0 |
| 3 (targeted regen for 12 known bad) | 12 | 5 confirmed clean | 3 confirmed new hallucinations | 7 (rate limit or credit) |

## What's missing (needs third top-up + regen)

These 9 variants have no image on disk — the storefront will fall back to the placeholder SVG for any product whose only variants are in this list:

```
dsip 2mg
slu-pp332 5mg
ghrp-6-acetate 5mg
ss-31 10mg
sermorelin 5mg
retatrutide 10mg
retatrutide 30mg
retatrutide 40mg
cagrilintide 10mg
```

Note: retatrutide and cagrilintide products still have other variants that succeeded (e.g. retatrutide 5mg + 50mg are clean), so those products will display a rendered image on the storefront from one of their working sizes.

## Rendered but text is wrong

These 3 exist on disk but the product name has a character error:

| File | Actual rendered text | Should be |
|---|---|---|
| `ipamorelin--10mg.png` | `Iamorelin` | `Ipamorelin` |
| `ghrp-2-acetate--5mg.png` | `GHRP-2 ACCTATE` | `GHRP-2 Acetate` |
| `kisspeptin-10--5mg.png` | `Kissspeptin 10` | `Kisspeptin-10` |

These will display on the storefront as-is. You may want to delete them so the placeholder shows instead, or leave them and regen after top-up.

## Other minor issues (accepted or deferred)

- Cryogene wordmark and "KEEP REFRIGERATED" text land inconsistently across all bottles — per earlier approval, accepted as a FLUX trade-off
- A few bottles show duplicate size (e.g. size printed twice on the label) — minor cosmetic
- Some bottles have "FOR RESEARCH USE ONLY" band in different vertical positions — minor layout variance

## What was fixed in this pass

| File | Previous issue | Now |
|---|---|---|
| `ghk-cu--50mg.png` | No Cryogene logo | ✓ Logo, "GHK-CU 50mg", all bands |
| `nad-plus--1000mg.png` | Top band read "FOR CRYOGENE LABORATORIES" | ✓ Full wordmark, "NAD+ 1000mg", bands |
| `bpc-157-tb-500-blend--10mg.png` | "BPC-157" prefix dropped | ✓ "BPC-157 + TB-500 Blend 10mg" |
| `cjc-1295-ipamorelin-blend--10mg.png` | "Ipamoreli" missing 'n' | ✓ "CJC-1295 + Ipamorelin Blend 10mg" |
| `igf-1lr3--0-1mg.png` | Was missing entirely | ✓ "IGF-1LR3 0.1mg" |
| `igf-1lr3--1mg.png` | Was missing entirely | ✓ "IGF-1LR3 1mg" with full Cryogene wordmark |
| `cjc-1295-with-dac--2mg.png` | Had duplicate size | ✓ "CJC 1295 with DAC 2mg" |
| `l-carnitine-600mg--600mg.png` | Was missing | ✓ "L-Carnitine 600mg" with wordmark |
| `epitalon--10mg.png`, `epitalon--50mg.png` | Was missing | ✓ Clean |
| `ipamorelin--5mg.png` | Was missing | ✓ "Ipamorelin 5mg" (10mg variant is still bad) |
| `semaglutide--10mg.png`, `semaglutide--30mg.png` | Was missing | ✓ Clean |
| `retatrutide--5mg.png`, `retatrutide--50mg.png` | Was missing | ✓ Clean |
| `glow-blend--70mg.png` | Was missing | ✓ Clean |
| `tb500--2mg.png`, `tb500--10mg.png` | Was missing | ✓ Clean (Cryogene logo + wordmark + "TB500" + size) |
| `5-amino-1mq--10mg.png`, `5-amino-1mq--50mg.png` | Was missing | ✓ Clean |

## Reality check on regen convergence

FLUX Kontext Max is non-deterministic. Regenerating a bad bottle gives roughly a 50–60% chance of a clean result and a 40–50% chance of a different hallucination. Rolling 5–10 times per problem bottle would eventually yield a clean one in most cases — but at $0.08/roll, persistent issues could cost a few dollars each. For the 3 "still bad" bottles above, expect 1–3 additional regen attempts each.

## Recommended next steps for David

1. Top up Replicate with another **~$3** (~35 more images' worth of regens, enough headroom for 2 rounds)
2. **Rotate the Replicate API token** again — the current one is still in chat history from yesterday
3. Delete the 3 "rendered but still wrong" images so they get picked up by the next regen:
   ```bash
   rm public/products/ipamorelin--10mg.png public/products/ghrp-2-acetate--5mg.png public/products/kisspeptin-10--5mg.png
   ```
4. Run the batch script — it'll pick up exactly the 12 needed (9 missing + 3 just-deleted):
   ```bash
   npx tsx scripts/generate-bottle-images-flux.ts
   ```
5. Re-run audit: `npx tsx scripts/audit-bottles.ts`, review `audit/contact-sheet-*.png`, delete any still-wrong and repeat until happy
6. Final wire: `npx tsx scripts/update-product-images.ts`

## Decision point

If you want to move on from the image pipeline and accept the current 102 bottles (with 3 known-wrong + 9 on placeholder SVG), you can commit what we have and pick this up later. The storefront will function cleanly either way — ProductCard uses `primaryImageIndex` which safely defaults to the placeholder if no images are available.
