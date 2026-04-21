/**
 * Research-application tags for the Cryogene product catalogue.
 *
 * Tags describe what research area each compound is studied in, not claims
 * about what the compound does. Curated by reviewing published literature for
 * each peptide. Any tag in this taxonomy is safe to use as a navigation aid.
 *
 * Tags are applied per-slug via APPLIED_TAGS. Items with `confidence: "low"`
 * are flagged for Sam's scientific review before launch.
 */

export type ResearchTag = {
  slug: string;
  label: string;
  description: string;
};

// Canonical research-application taxonomy — 12 tags chosen to cover the catalogue
// without being so fine-grained that products only ever carry one.
export const RESEARCH_TAGS: ResearchTag[] = [
  { slug: "longevity-research", label: "Longevity Research", description: "Studied in cellular senescence, telomere biology, or ageing models." },
  { slug: "metabolic-research", label: "Metabolic Research", description: "Studied in lipid, glucose, or mitochondrial energy-metabolism models." },
  { slug: "tissue-repair-research", label: "Tissue Repair Research", description: "Studied in wound-healing, connective-tissue, or extracellular-matrix models." },
  { slug: "growth-hormone-research", label: "Growth Hormone Research", description: "Studied at the GHRH or GHS-R1a receptor, or the somatotropic axis." },
  { slug: "cognitive-research", label: "Cognitive Research", description: "Studied in BDNF, neurotrophic factor, or behavioural neuroscience models." },
  { slug: "neuropeptide-research", label: "Neuropeptide Research", description: "Studied as a reference neuropeptide or neuropeptide-receptor ligand." },
  { slug: "immunology-research", label: "Immunology Research", description: "Studied in thymic, innate-immune, or inflammatory-signalling models." },
  { slug: "melanocortin-research", label: "Melanocortin Research", description: "Studied at melanocortin receptors (MC1R-MC5R)." },
  { slug: "reproductive-research", label: "Reproductive Research", description: "Studied in kisspeptin/GPR54 or hypothalamic-pituitary-gonadal axis models." },
  { slug: "ecm-skin-research", label: "ECM & Skin Research", description: "Studied in extracellular-matrix, collagen, or in vitro skin-biology models." },
  { slug: "incretin-research", label: "Incretin Research", description: "Studied at GLP-1, GIP, glucagon, or amylin receptors." },
  { slug: "biochemistry-reference", label: "Biochemistry Reference", description: "Established reference reagent for enzyme kinetics or biochemistry assays." },
];

export const TAG_SLUGS = new Set(RESEARCH_TAGS.map((t) => t.slug));

// Per-product tag assignments. 1-3 tags per peptide, curated from published
// literature. Non-peptide supplies/mixers are not tagged here — they use the
// existing category-based filter instead.
type TagAssignment = {
  tags: string[];
  confidence: "high" | "medium" | "low";
  note?: string;
};

export const APPLIED_TAGS: Record<string, TagAssignment> = {
  // --- high-confidence assignments ---
  "bpc-157": { tags: ["tissue-repair-research"], confidence: "high" },
  "bpc-157-tb-500-blend": { tags: ["tissue-repair-research"], confidence: "high" },
  "tb500": { tags: ["tissue-repair-research"], confidence: "high" },
  "ghk-cu": { tags: ["ecm-skin-research", "tissue-repair-research"], confidence: "high" },
  "snap-8": { tags: ["ecm-skin-research"], confidence: "high" },
  "kpv": { tags: ["immunology-research", "melanocortin-research"], confidence: "high" },

  "ipamorelin": { tags: ["growth-hormone-research"], confidence: "high" },
  "ghrp-2-acetate": { tags: ["growth-hormone-research"], confidence: "high" },
  "ghrp-6-acetate": { tags: ["growth-hormone-research"], confidence: "high" },
  "sermorelin": { tags: ["growth-hormone-research"], confidence: "high" },
  "tesamorelin": { tags: ["growth-hormone-research", "metabolic-research"], confidence: "high" },
  "cjc-1295-with-dac": { tags: ["growth-hormone-research"], confidence: "high" },
  "cjc-1295-without-dac": { tags: ["growth-hormone-research"], confidence: "high" },
  "cjc-1295-ipamorelin-blend": { tags: ["growth-hormone-research"], confidence: "high" },
  "igf-1lr3": { tags: ["growth-hormone-research"], confidence: "high" },

  "semaglutide": { tags: ["incretin-research", "metabolic-research"], confidence: "high" },
  "tirzepatide": { tags: ["incretin-research", "metabolic-research"], confidence: "high" },
  "retatrutide": { tags: ["incretin-research", "metabolic-research"], confidence: "high" },
  "cagrilintide": { tags: ["incretin-research", "metabolic-research"], confidence: "high" },

  "melanotani": { tags: ["melanocortin-research"], confidence: "high" },
  "melanotan-ii": { tags: ["melanocortin-research"], confidence: "high" },
  "pt-141": { tags: ["melanocortin-research"], confidence: "high" },

  "kisspeptin-10": { tags: ["reproductive-research", "neuropeptide-research"], confidence: "high" },
  "vip": { tags: ["neuropeptide-research"], confidence: "high" },
  "semax": { tags: ["cognitive-research", "neuropeptide-research"], confidence: "high" },
  "selank": { tags: ["cognitive-research", "neuropeptide-research"], confidence: "high" },
  "dsip": { tags: ["neuropeptide-research"], confidence: "high" },

  "epitalon": { tags: ["longevity-research"], confidence: "high" },
  "foxo4": { tags: ["longevity-research"], confidence: "high" },
  "ss-31": { tags: ["longevity-research", "metabolic-research"], confidence: "high" },
  "nad-plus": { tags: ["longevity-research", "metabolic-research", "biochemistry-reference"], confidence: "high" },

  "thymosin-alpha-1": { tags: ["immunology-research"], confidence: "high" },
  "aod9604": { tags: ["metabolic-research"], confidence: "high" },
  "mots-c": { tags: ["metabolic-research", "longevity-research"], confidence: "high" },
  "5-amino-1mq": { tags: ["metabolic-research"], confidence: "high" },
  "glutathione": { tags: ["biochemistry-reference"], confidence: "high" },
  "l-carnitine-600mg": { tags: ["metabolic-research", "biochemistry-reference"], confidence: "high" },
  "b12": { tags: ["biochemistry-reference"], confidence: "high" },
  "melatonin": { tags: ["biochemistry-reference", "neuropeptide-research"], confidence: "high" },
  "ara-290": { tags: ["tissue-repair-research", "immunology-research"], confidence: "high" },
  "adipotide": { tags: ["metabolic-research"], confidence: "high" },

  // --- medium-confidence assignments (reasonable from literature but narrower body of work) ---
  "slu-pp332": { tags: ["metabolic-research"], confidence: "medium",
    note: "Recent ERR pan-agonist (Billon et al. 2024). Literature body still small; tag is defensible but may widen over time." },
  "pinealon": { tags: ["cognitive-research", "longevity-research"], confidence: "medium",
    note: "Khavinson bioregulator series — academic literature is predominantly Russian-language. Confidence is on the balance of cited work; Sam may prefer to narrow to one tag." },

  // --- low-confidence assignments (flagged for Sam's scientific review) ---
  "thymalin": { tags: ["immunology-research"], confidence: "low",
    note: "Thymalin is historically a thymic peptide fraction rather than a single defined compound. Immunology framing is appropriate but tag may need supplementing or replacing depending on how Sam wants to position fractional preparations." },
  "cerebrolysin": { tags: ["cognitive-research", "neuropeptide-research"], confidence: "low",
    note: "Porcine-brain peptide mixture, not a single compound. Neuropeptide tag is defensible but the product sits uneasily in a taxonomy built around single chemical entities." },

  "lipo-c": { tags: ["metabolic-research", "biochemistry-reference"], confidence: "low",
    note: "Multi-component lipotropic blend (methionine, inositol, choline, carnitine). Metabolic framing is accurate for the components individually; blend positioning is marketing-led, Sam to review." },
  "glow-blend": { tags: ["ecm-skin-research"], confidence: "low",
    note: "Multi-component blend (GHK-Cu + glutathione + vitamin C). ECM/skin framing follows the GHK-Cu component; Sam may want to add 'biochemistry-reference' or remove the tag entirely if positioning changes." },
  "klow-blend": { tags: ["ecm-skin-research", "immunology-research"], confidence: "low",
    note: "Multi-component blend (KPV + GHK-Cu + glutathione + vitamin C). Tags follow KPV (immunology) and GHK-Cu (ECM) components." },
};

// Helper: slugs flagged for Sam's review.
export function flaggedForReview(): { slug: string; reason: string }[] {
  return Object.entries(APPLIED_TAGS)
    .filter(([, a]) => a.confidence === "low")
    .map(([slug, a]) => ({ slug, reason: a.note ?? "low confidence — see literature" }));
}
