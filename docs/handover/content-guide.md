# Content Guide

This guide explains how to write compliant product descriptions and other content for the site.

---

## Voice and tone

All content on this site must be:

- **Scientific and factual.** State facts about the compound — what it is, its chemical properties, what it has been studied for in research contexts.
- **Third person.** Never "you can use this to..." or "this product will...". Always "has been investigated for...", "appears in research on...", "researchers studying this compound...".
- **Compliance-aware.** We sell exclusively for research use. Never write anything that implies human use, suggests health benefits, or could be construed as a medical claim.

---

## What you CAN write

- CAS numbers, molecular formulas, molecular weights, purity data
- Physical properties (appearance, solubility, stability, storage temperature)
- Research context ("has been investigated in preclinical models for its effects on...")
- References to published literature ("appears in peer-reviewed research on...")
- COA availability statements
- Research-use disclaimers

---

## What you CANNOT write

Never include any of the following, even phrased carefully:

- Dosage guidance of any kind (mg, mcg, IU, etc.)
- Frequency of use ("once a day", "weekly", etc.)
- Administration method ("inject", "subcutaneous", "oral")
- Therapeutic claims ("helps with", "treats", "cures", "improves", "boosts")
- Any implication of human or veterinary use
- Before/after comparisons or testimonials
- Claims about safety in humans ("safe", "well-tolerated")

If you are unsure whether something crosses the line, leave it out. Your solicitor should review all product descriptions before the site goes live.

---

## Product description structure

Each product description follows this structure:

1. **Opening paragraph** — compound name, synonyms, chemical class, CAS number, molecular formula, molecular weight. No claims — just facts.
2. **Research context** — what the compound has been studied for, in third person. Mark with `[DRAFT — REVIEW AND ADAPT]`. Reference "preclinical research models" or "published research".
3. **Physical properties** — bullet list: appearance, solubility, stability, reconstitution note.
4. **Certificate of Analysis** — standard statement about HPLC testing and downloadable COA.
5. **Research use only** — standard disclaimer.

---

## Using the templates

Ten drafted templates are in `content/drafts/product-descriptions/`. Each template:

- Has been written in the correct voice
- Has chemistry data cross-checked against PubChem
- Is marked `[DRAFT — REVIEW AND ADAPT]` in every section that needs your review
- Is **not yet live** on the site — it must be reviewed, adapted, and entered into the product form via the admin UI before it appears on product pages

### Adapting a template for a new compound

1. Look up the compound on [pubchem.ncbi.nlm.nih.gov](https://pubchem.ncbi.nlm.nih.gov) to verify the CAS number, molecular formula, and molecular weight
2. Copy the closest existing template as a starting point
3. Replace the chemistry data with the correct values for the new compound
4. Write the research context by searching for the compound name on [PubMed](https://pubmed.ncbi.nlm.nih.gov) and summarising what the peer-reviewed literature says (in third person, without claims)
5. Mark every paragraph you write with `[DRAFT — REVIEW AND ADAPT]`
6. Send the draft to your solicitor for review before publishing

### Entering a description into the admin UI

Once a description is reviewed and cleared:

1. Go to `/admin/products` and open the product
2. Paste the content into the **Short description** field (1-2 sentences) and the **Full description** field (the complete text)
3. Click Save
4. Visit the product's public page to confirm it renders correctly
