/**
 * Product content — chemical identity, research-framed descriptions, and FAQ.
 *
 * Drafted for Sam to review and edit. All copy is written for UK research-peptide
 * e-commerce under the Human Medicines Regulations 2012 framework:
 *   - No therapeutic or medical claims
 *   - No human or veterinary use implications
 *   - Dosage, reconstitution, and administration are NOT specified
 *   - All prose frames the peptide as a laboratory research reagent
 *   - Each product carries an explicit "research use only" notice
 *
 * Apply to products.seed.json with:  npx tsx scripts/apply-product-content.ts
 */

export type ProductContent = {
  shortDescription: string;
  fullDescription: string;
  casNumber?: string | null;
  molecularFormula?: string | null;
  molecularWeight?: string | null;
  synonyms?: string[];
  faq?: { question: string; answer: string }[];
  seoTitle?: string;
  seoDescription?: string;
  tags?: string[];
};

const RUO_DISCLAIMER =
  "Supplied solely for laboratory research use. Not for human or veterinary consumption, diagnostic use, or therapeutic application.";

const RUO_FAQ = {
  question: "Is this product approved for human use?",
  answer:
    "No. This product is supplied solely for in vitro laboratory research and chemical analysis. It is not a licensed medicine, is not approved by the MHRA or any other regulatory body for human or veterinary use, and must not be administered to humans or animals. Purchase implies acceptance of our Research Use Only terms.",
};

const STORAGE_FAQ = {
  question: "How should this product be stored in the laboratory?",
  answer:
    "Store lyophilised peptide sealed at -20°C for long-term storage or at 2-8°C for short periods. Reconstituted solutions should be used within the window indicated in the primary literature for the peptide class. Protect from light, heat, and freeze-thaw cycles. Researchers are responsible for establishing storage protocols appropriate to their experimental design.",
};

// -----------------------------------------------------------------------------
// PEPTIDES
// -----------------------------------------------------------------------------

export const PRODUCT_CONTENT: Record<string, ProductContent> = {
  "igf-1lr3": {
    casNumber: "946870-92-4",
    molecularFormula: "C₄₀₀H₆₂₅N₁₁₁O₁₁₅S₉",
    molecularWeight: "9111.5 g/mol",
    synonyms: ["Long R3 IGF-1", "Long Arg3 IGF-1", "LR3 IGF-1"],
    shortDescription:
      "Long-chain analogue of insulin-like growth factor 1 with an Arg³ substitution and an N-terminal 13-amino-acid extension. Supplied as a lyophilised research reagent.",
    fullDescription:
      "IGF-1LR3 is a synthetic 83-amino-acid analogue of human insulin-like growth factor 1 (IGF-1) featuring an arginine substitution at position 3 and a 13-residue N-terminal extension. These modifications reduce binding affinity for IGF-binding proteins (IGFBPs) in comparison to native IGF-1, which is a feature of interest in in vitro studies of IGF-1 receptor activity.\n\nIn research contexts, IGF-1LR3 has been used to investigate IGF-1 receptor signalling pathways, cellular proliferation assays, and models of growth factor biology. The literature addresses its molecular interactions with the IGF-1R, its half-life relative to native IGF-1, and its use as a reference compound in receptor-binding assays.\n\nThis material is characterised by HPLC at ≥99% purity. A Certificate of Analysis is issued for each batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What distinguishes IGF-1LR3 from native IGF-1 in laboratory studies?",
        answer:
          "IGF-1LR3 carries an Arg³ substitution and an N-terminal extension that reduce binding to IGF-binding proteins in in vitro systems. This is of interest in research that aims to isolate IGF-1 receptor interactions from IGFBP-mediated effects.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "IGF-1LR3 (Long R3 IGF-1) — Research Peptide | Cryogene Laboratories",
    seoDescription:
      "IGF-1LR3 supplied as a lyophilised research reagent for UK laboratory use. HPLC-tested ≥99%, Certificate of Analysis included. For research use only.",
    tags: ["growth-factor", "igf", "receptor-binding"],
  },

  "5-amino-1mq": {
    casNumber: "21711-65-1",
    molecularFormula: "C₁₀H₁₂N₂",
    molecularWeight: "160.22 g/mol",
    synonyms: ["5-Amino-1-methylquinolinium", "5A1MQ"],
    shortDescription:
      "Small-molecule selective inhibitor of the enzyme nicotinamide N-methyltransferase (NNMT), used in metabolic research.",
    fullDescription:
      "5-Amino-1MQ is a small-molecule research compound studied as a selective inhibitor of nicotinamide N-methyltransferase (NNMT). NNMT is an enzyme that catalyses the methylation of nicotinamide using S-adenosylmethionine as a cofactor and is a target of interest in research into cellular metabolism and NAD⁺ homeostasis.\n\nIn the primary literature, 5-Amino-1MQ has been used in cell-based and preclinical models to probe NNMT activity, adipocyte biology, and metabolic regulation. It is referenced in studies examining the intersection of methyl-donor availability and NAD⁺ salvage pathways.\n\nMaterial is supplied as a crystalline powder and characterised by HPLC. A Certificate of Analysis accompanies each batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What enzyme does 5-Amino-1MQ target in laboratory studies?",
        answer:
          "5-Amino-1MQ is described in the research literature as a selective inhibitor of nicotinamide N-methyltransferase (NNMT). NNMT catalyses methylation of nicotinamide and is a target in metabolic research.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "5-Amino-1MQ (NNMT Inhibitor) — Research Reagent | Cryogene Laboratories",
    seoDescription:
      "5-Amino-1MQ supplied as a research-grade NNMT-inhibitor reagent for UK laboratory study. HPLC-tested, CoA included. For research use only.",
    tags: ["nnmt-inhibitor", "metabolism", "small-molecule"],
  },

  "l-carnitine-600mg": {
    casNumber: "541-15-1",
    molecularFormula: "C₇H₁₅NO₃",
    molecularWeight: "161.20 g/mol",
    synonyms: ["Levocarnitine", "L-3-Hydroxy-4-trimethylaminobutyrate"],
    shortDescription:
      "Quaternary ammonium compound studied in fatty acid transport and mitochondrial β-oxidation research.",
    fullDescription:
      "L-Carnitine is a naturally occurring quaternary ammonium compound with a well-documented role in the transport of long-chain fatty acids across the inner mitochondrial membrane via the carnitine palmitoyltransferase shuttle. In laboratory contexts it is used as a reference compound in studies of β-oxidation, cellular bioenergetics, and mitochondrial function.\n\nThe research literature addresses L-carnitine in connection with acylcarnitine biochemistry, carnitine deficiency models, and in vitro work on fatty acid metabolism. It is frequently used as a cell-culture supplement and as a reference analyte in mass-spectrometry-based metabolomics.\n\nSupplied as a research-grade powder with HPLC characterisation and a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What is the laboratory role of L-carnitine in β-oxidation studies?",
        answer:
          "L-carnitine is the substrate of the carnitine palmitoyltransferase shuttle, which imports long-chain fatty acids into the mitochondrial matrix for β-oxidation. In vitro studies use it as a reference compound for acylcarnitine metabolism.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "L-Carnitine (Levocarnitine) — Research Reagent | Cryogene Laboratories",
    seoDescription:
      "L-Carnitine supplied as a research-grade reagent for UK laboratory mitochondrial and fatty acid metabolism studies. HPLC-tested. Research use only.",
    tags: ["mitochondrial", "fatty-acid-metabolism", "metabolomics-reference"],
  },

  "epitalon": {
    casNumber: "307297-39-8",
    molecularFormula: "C₁₄H₂₂N₄O₉",
    molecularWeight: "390.35 g/mol",
    synonyms: ["Epithalon", "Epithalamin", "Ala-Glu-Asp-Gly"],
    shortDescription:
      "Synthetic tetrapeptide (Ala-Glu-Asp-Gly) investigated in research on telomerase expression and cellular senescence.",
    fullDescription:
      "Epitalon is a synthetic tetrapeptide with the sequence Ala-Glu-Asp-Gly, originally described by researchers investigating peptide bioregulators of the pineal gland. It has drawn attention in longevity and senescence research contexts.\n\nThe peer-reviewed literature discusses Epitalon in the context of telomerase expression in in vitro systems, cellular replicative capacity, and studies of pineal-peptide biology. It appears in papers examining peptide bioregulators and their proposed interactions with chromatin and transcription.\n\nSupplied as a lyophilised white powder, HPLC-characterised at ≥99% purity, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What is the amino acid sequence of Epitalon?",
        answer:
          "Epitalon is a tetrapeptide with the sequence Ala-Glu-Asp-Gly. It is frequently referenced in the longevity and cellular senescence research literature.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "Epitalon (Ala-Glu-Asp-Gly) — Research Peptide | Cryogene Laboratories",
    seoDescription:
      "Epitalon supplied as a lyophilised research peptide for UK laboratory use. HPLC-tested ≥99% with Certificate of Analysis. Research use only.",
    tags: ["tetrapeptide", "senescence-research", "bioregulator"],
  },

  "ipamorelin": {
    casNumber: "170851-70-4",
    molecularFormula: "C₃₈H₄₉N₉O₅",
    molecularWeight: "711.85 g/mol",
    synonyms: ["Aib-His-D-2-Nal-D-Phe-Lys-NH2"],
    shortDescription:
      "Selective pentapeptide ghrelin receptor agonist studied in in vitro models of growth hormone secretagogue signalling.",
    fullDescription:
      "Ipamorelin is a synthetic pentapeptide described in the research literature as a selective agonist of the growth hormone secretagogue receptor (GHS-R1a, also known as the ghrelin receptor). It does not exhibit significant binding at receptors associated with cortisol or prolactin release in the published in vitro data, which is a point of interest in receptor-selectivity studies.\n\nIn laboratory contexts Ipamorelin has been used to probe GHS-R1a signalling, pituitary cell-culture systems, and comparative pharmacology against other growth hormone secretagogues such as GHRP-2 and GHRP-6.\n\nSupplied as a lyophilised powder, HPLC-characterised, with a per-batch Certificate of Analysis. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What receptor is Ipamorelin described as targeting in published research?",
        answer:
          "Ipamorelin is described in the peer-reviewed literature as a selective agonist of the growth hormone secretagogue receptor (GHS-R1a, the ghrelin receptor). Its receptor-selectivity profile is a frequent point of reference in GHS comparative studies.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "Ipamorelin — Selective GHS-R1a Research Peptide | Cryogene Laboratories",
    seoDescription:
      "Ipamorelin supplied as a research-grade pentapeptide for UK laboratory GHS receptor studies. HPLC-tested, CoA included. Research use only.",
    tags: ["growth-hormone-secretagogue", "ghs-r1a", "ghrelin-receptor"],
  },

  "semax": {
    casNumber: "80714-61-0",
    molecularFormula: "C₃₇H₅₁N₉O₁₀S",
    molecularWeight: "813.92 g/mol",
    synonyms: ["Met-Glu-His-Phe-Pro-Gly-Pro", "ACTH(4-10) analogue"],
    shortDescription:
      "Synthetic heptapeptide analogue of ACTH(4-10) studied in neurotrophic factor and cognitive research models.",
    fullDescription:
      "Semax is a synthetic heptapeptide derived from the 4-10 fragment of adrenocorticotropic hormone (ACTH), modified with a C-terminal Pro-Gly-Pro extension that alters its metabolic stability relative to the native fragment. It is catalogued in neuroscience research as an analogue of a melanocortin-family sequence.\n\nThe research literature discusses Semax in the context of brain-derived neurotrophic factor (BDNF) expression in in vitro and preclinical models, melanocortin-family peptide pharmacology, and neurochemistry studies examining the ACTH(4-10) motif.\n\nSupplied as a lyophilised research reagent, HPLC-characterised, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What is the sequence of Semax?",
        answer:
          "Semax is the heptapeptide Met-Glu-His-Phe-Pro-Gly-Pro, a C-terminally extended analogue of the ACTH(4-10) fragment. The Pro-Gly-Pro extension is described in the literature as improving metabolic stability over the native fragment.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "Semax (ACTH 4-10 Analogue) — Research Peptide | Cryogene Laboratories",
    seoDescription:
      "Semax supplied as a lyophilised research heptapeptide for UK laboratory neurochemistry studies. HPLC-tested, CoA included. Research use only.",
    tags: ["acth-analogue", "neurotrophic-research", "heptapeptide"],
  },

  "ara-290": {
    casNumber: "1208243-50-8",
    molecularFormula: "C₃₃H₅₇N₁₁O₁₂",
    molecularWeight: "815.88 g/mol",
    synonyms: ["Cibinetide", "Helix B surface peptide", "pHBSP"],
    shortDescription:
      "Synthetic 11-amino-acid peptide derived from the helix B surface of erythropoietin, studied for non-erythropoietic tissue-protective receptor signalling.",
    fullDescription:
      "ARA 290 (cibinetide) is an 11-residue linear peptide corresponding to the helix B surface region of erythropoietin. It has been studied in the research literature as a reagent that binds the innate-repair receptor (IRR), a heterodimer of the erythropoietin receptor and the beta common receptor, which is distinct from the homodimeric erythropoietin receptor associated with erythropoiesis.\n\nResearch papers discuss ARA 290 in the context of innate-repair receptor biology, preclinical models of tissue protection, and studies of the erythropoietin receptor family's non-erythropoietic signalling.\n\nSupplied as a lyophilised research peptide, HPLC-characterised, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What receptor is ARA 290 described as engaging in research?",
        answer:
          "ARA 290 is described as binding the innate-repair receptor (IRR), a heterodimer of the erythropoietin receptor and the beta common receptor, distinct from the homodimeric EPO receptor involved in erythropoiesis.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "ARA 290 (Cibinetide) — Research Peptide | Cryogene Laboratories",
    seoDescription:
      "ARA 290 (cibinetide) supplied as a research-grade peptide for UK laboratory innate-repair receptor studies. HPLC-tested, CoA included. Research use only.",
    tags: ["erythropoietin-derived", "innate-repair-receptor", "cibinetide"],
  },

  "kisspeptin-10": {
    casNumber: "374675-21-5",
    molecularFormula: "C₆₃H₈₃N₁₇O₁₄",
    molecularWeight: "1302.47 g/mol",
    synonyms: ["Metastin 45-54", "KP-10"],
    shortDescription:
      "Decapeptide fragment of kisspeptin (KiSS-1) studied as an agonist at the GPR54 (KISS1R) receptor.",
    fullDescription:
      "Kisspeptin-10 is the C-terminal decapeptide of the KiSS-1-derived kisspeptin protein. It is catalogued in the research literature as a high-potency agonist at the GPR54 receptor (also known as KISS1R), a G-protein-coupled receptor of significant interest in reproductive-axis neuroendocrinology research.\n\nLaboratory studies reference Kisspeptin-10 in investigations of GnRH neuron signalling, neuroendocrine cell culture work, and preclinical models of the hypothalamic-pituitary-gonadal axis. The KISS1/GPR54 signalling system is well-documented in academic reviews.\n\nSupplied as a lyophilised research reagent, HPLC-characterised at ≥99% purity, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What receptor does Kisspeptin-10 target in research?",
        answer:
          "Kisspeptin-10 is described in the research literature as an agonist at the GPR54 receptor (KISS1R), a G-protein-coupled receptor central to kisspeptin signalling in reproductive neuroendocrinology.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "Kisspeptin-10 (KP-10, Metastin 45-54) — Research Peptide | Cryogene Laboratories",
    seoDescription:
      "Kisspeptin-10 supplied as a research-grade decapeptide for UK laboratory GPR54/KISS1R studies. HPLC-tested ≥99%, CoA included. Research use only.",
    tags: ["kisspeptin", "gpr54", "neuroendocrine-research"],
  },

  "selank": {
    casNumber: "129954-34-3",
    molecularFormula: "C₃₃H₅₇N₁₁O₉",
    molecularWeight: "751.87 g/mol",
    synonyms: ["Thr-Lys-Pro-Arg-Pro-Gly-Pro"],
    shortDescription:
      "Synthetic heptapeptide derived from the immunomodulatory peptide tuftsin, studied in neurochemistry and behavioural research models.",
    fullDescription:
      "Selank is a synthetic heptapeptide based on the endogenous tetrapeptide tuftsin, with a C-terminal Pro-Gly-Pro extension that improves its metabolic stability in research settings. The published literature discusses it in the context of tuftsin-family peptide biology and its proposed interactions with neurochemical systems.\n\nResearch papers address Selank in studies of BDNF and neurotransmitter-system expression in preclinical models, behavioural neuroscience research, and peptide-pharmacology reviews of tuftsin analogues.\n\nSupplied as a lyophilised research-grade peptide, HPLC-characterised, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What peptide family does Selank belong to?",
        answer:
          "Selank is a synthetic analogue of the endogenous tetrapeptide tuftsin, extended at the C-terminus by Pro-Gly-Pro for improved metabolic stability in experimental settings.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "Selank (Tuftsin Analogue) — Research Peptide | Cryogene Laboratories",
    seoDescription:
      "Selank supplied as a research-grade heptapeptide for UK laboratory neurochemistry studies. HPLC-tested, CoA included. Research use only.",
    tags: ["tuftsin-analogue", "neurochemistry-research", "heptapeptide"],
  },

  "glutathione": {
    casNumber: "70-18-8",
    molecularFormula: "C₁₀H₁₇N₃O₆S",
    molecularWeight: "307.32 g/mol",
    synonyms: ["GSH", "γ-Glu-Cys-Gly", "L-Glutathione reduced"],
    shortDescription:
      "Endogenous tripeptide and the primary intracellular thiol antioxidant, used as a reference compound in oxidative-stress research.",
    fullDescription:
      "Glutathione (GSH) is a naturally occurring tripeptide (γ-Glu-Cys-Gly) and the dominant non-protein thiol in mammalian cells. It functions as a central redox buffer and as a substrate for the glutathione peroxidase and glutathione-S-transferase enzyme families. GSH is a foundational reference compound in biochemistry and oxidative-stress research.\n\nLaboratory applications include redox-state measurements, glutathione-enzyme kinetics, conjugation-substrate studies, and methodology work on the GSH/GSSG ratio as a marker of oxidative stress.\n\nSupplied as a research-grade reduced glutathione powder, HPLC-characterised, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What is the structure of glutathione?",
        answer:
          "Glutathione is a tripeptide formed from γ-glutamic acid, cysteine, and glycine (γ-Glu-Cys-Gly). Its active thiol group on the cysteine residue underpins its role as the principal intracellular redox buffer.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "Glutathione (GSH, Reduced) — Research Reagent | Cryogene Laboratories",
    seoDescription:
      "Reduced L-Glutathione supplied as a research-grade reagent for UK laboratory oxidative-stress and redox studies. HPLC-tested. Research use only.",
    tags: ["antioxidant-reference", "redox-research", "tripeptide"],
  },

  "snap-8": {
    casNumber: "868844-74-0",
    molecularFormula: "C₃₅H₆₀N₁₂O₁₂",
    molecularWeight: "864.94 g/mol",
    synonyms: ["Acetyl octapeptide-3", "Ac-Glu-Glu-Met-Gln-Arg-Arg-Ala-Asp"],
    shortDescription:
      "Acetylated octapeptide studied in cosmetic-science research on SNARE-complex interaction and neurotransmitter-release model systems.",
    fullDescription:
      "Snap-8 (acetyl octapeptide-3) is an acetylated eight-residue peptide designed as an extended analogue of Argireline. It is catalogued in cosmetic-chemistry and neuroscience research as a reagent used to probe SNARE-complex assembly, particularly interactions involving the SNAP-25 protein.\n\nPublished studies discuss Snap-8 in in vitro assays of neurotransmitter-release dynamics, comparative work against its hexapeptide parent, and SNARE-family biochemistry. It is a common reference compound in the cosmetic-research peptide family.\n\nSupplied as a lyophilised research peptide, HPLC-characterised, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What does Snap-8 target in research assays?",
        answer:
          "Snap-8 is described in the research literature as an octapeptide that interacts with the SNARE complex, particularly through its sequence similarity to a region of the SNAP-25 protein. This is the basis of its use in in vitro SNARE-function assays.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "Snap-8 (Acetyl Octapeptide-3) — Research Peptide | Cryogene Laboratories",
    seoDescription:
      "Snap-8 supplied as a research-grade acetyl octapeptide for UK laboratory SNARE-complex studies. HPLC-tested, CoA included. Research use only.",
    tags: ["snare-research", "cosmetic-chemistry-reference", "acetyl-octapeptide"],
  },

  "vip": {
    casNumber: "37221-79-7",
    molecularFormula: "C₁₄₇H₂₃₇N₄₃O₄₃S",
    molecularWeight: "3326.80 g/mol",
    synonyms: ["Vasoactive intestinal peptide", "Vasoactive intestinal polypeptide"],
    shortDescription:
      "Endogenous 28-amino-acid neuropeptide studied at the VPAC1 and VPAC2 G-protein-coupled receptors.",
    fullDescription:
      "Vasoactive Intestinal Peptide (VIP) is a 28-residue neuropeptide of the glucagon/secretin superfamily. It is a well-characterised agonist at the VPAC1 and VPAC2 receptors — G-protein-coupled receptors that activate adenylyl cyclase and raise intracellular cAMP in responsive cell lines.\n\nIn laboratory use VIP is referenced in studies of smooth-muscle relaxation assays, neuropeptide-receptor pharmacology, immune-cell modulation in vitro, and cell-signalling work on the cAMP pathway.\n\nSupplied as a lyophilised research peptide, HPLC-characterised, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What receptors does VIP engage in research use?",
        answer:
          "VIP is a reference agonist at the VPAC1 and VPAC2 receptors, both members of the class B family of G-protein-coupled receptors. These receptors couple predominantly to Gαs and raise intracellular cAMP in cell-based assays.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "VIP (Vasoactive Intestinal Peptide) — Research Peptide | Cryogene Laboratories",
    seoDescription:
      "Vasoactive Intestinal Peptide supplied as a research-grade 28-mer peptide for UK laboratory VPAC receptor studies. HPLC-tested. Research use only.",
    tags: ["neuropeptide", "vpac-receptor", "glucagon-family"],
  },

  "pt-141": {
    casNumber: "189691-06-3",
    molecularFormula: "C₅₀H₆₈N₁₄O₁₀",
    molecularWeight: "1025.18 g/mol",
    synonyms: ["Bremelanotide", "Ac-Nle-cyclo(Asp-His-D-Phe-Arg-Trp-Lys)-OH"],
    shortDescription:
      "Cyclic heptapeptide analogue of α-MSH, studied as a non-selective agonist at the melanocortin receptor family.",
    fullDescription:
      "PT-141 (bremelanotide) is a synthetic cyclic heptapeptide derived from the α-melanocyte-stimulating hormone (α-MSH) sequence. In the research literature it is characterised as a non-selective agonist across the melanocortin receptor family, with particular focus on MC3R and MC4R binding in in vitro studies.\n\nPapers reference PT-141 in receptor-binding assays, comparative work against its parent compound Melanotan II, and preclinical models of melanocortin signalling.\n\nSupplied as a lyophilised research peptide, HPLC-characterised, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What receptor family does PT-141 engage in research?",
        answer:
          "PT-141 is a non-selective agonist at the melanocortin receptor family in published research, with particular focus in MC3R/MC4R binding assays. It is a cyclic analogue of α-MSH.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "PT-141 (Bremelanotide) — Research Peptide | Cryogene Laboratories",
    seoDescription:
      "PT-141 supplied as a research-grade melanocortin-receptor cyclic peptide for UK laboratory use. HPLC-tested, CoA included. Research use only.",
    tags: ["melanocortin", "bremelanotide", "cyclic-peptide"],
  },

  "dsip": {
    casNumber: "62568-57-4",
    molecularFormula: "C₃₅H₄₈N₁₀O₁₅",
    molecularWeight: "848.81 g/mol",
    synonyms: ["Delta sleep-inducing peptide", "Trp-Ala-Gly-Gly-Asp-Ala-Ser-Gly-Glu"],
    shortDescription:
      "Endogenous nonapeptide originally isolated from cerebrospinal fluid, studied in sleep neurochemistry and peptide-pharmacology research.",
    fullDescription:
      "DSIP (Delta Sleep-Inducing Peptide) is a nonapeptide originally isolated from the cerebrospinal fluid of sleep-induced rabbits and characterised in the 1970s neurochemistry literature. It is catalogued as a research reagent in studies of sleep-related peptides, although its mechanism of action remains a subject of ongoing investigation.\n\nLaboratory applications reference DSIP in radioligand-binding studies, in vitro peptide-stability assays, and comparative peptide-pharmacology. It appears in academic reviews of endogenous sleep-regulatory peptides.\n\nSupplied as a lyophilised research peptide, HPLC-characterised, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "How was DSIP originally identified?",
        answer:
          "DSIP was first isolated in the 1970s from the cerebrospinal fluid of rabbits in which slow-wave sleep had been induced by electrical stimulation. It remains a reference compound in sleep neurochemistry research.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "DSIP (Delta Sleep-Inducing Peptide) — Research Peptide | Cryogene Laboratories",
    seoDescription:
      "DSIP supplied as a research-grade nonapeptide for UK laboratory sleep-neurochemistry studies. HPLC-tested, CoA included. Research use only.",
    tags: ["sleep-research", "nonapeptide", "neurochemistry"],
  },

  "foxo4": {
    casNumber: null,
    molecularFormula: null,
    molecularWeight: null,
    synonyms: ["FOXO4-DRI", "FOXO4-D-Retro-Inverso peptide"],
    shortDescription:
      "Research peptide investigated for its interaction with the FOXO4-p53 pathway in senescent-cell biology.",
    fullDescription:
      "FOXO4 (typically supplied as the FOXO4-DRI D-retro-inverso research peptide) is a research reagent described in the published literature for its interaction with the FOXO4-p53 axis. Academic work in senescent-cell biology references this peptide as a tool compound for probing the dynamics of senescence-associated transcription factors.\n\nResearch discussion covers its design as a D-retro-inverso peptide, its interaction with FOXO4 and the tumour-suppressor p53, and its use in in vitro senescence-model systems.\n\nSupplied as a lyophilised research peptide, HPLC-characterised, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What pathway does FOXO4-DRI target in research?",
        answer:
          "FOXO4-DRI is described in the senescent-cell literature as a tool compound that interacts with the FOXO4/p53 axis. The peptide is of interest in in vitro studies of cellular senescence biology.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "FOXO4 (FOXO4-DRI) — Research Peptide | Cryogene Laboratories",
    seoDescription:
      "FOXO4 research peptide supplied for UK laboratory senescent-cell biology studies. HPLC-tested, CoA included. Research use only.",
    tags: ["senescence-research", "foxo4-p53", "dri-peptide"],
  },

  "slu-pp332": {
    casNumber: null,
    molecularFormula: "C₂₂H₂₂N₂O₄",
    molecularWeight: "378.43 g/mol",
    synonyms: ["SLU-PP-332"],
    shortDescription:
      "Small-molecule ERRα/β/γ pan-agonist reagent studied in metabolic and mitochondrial-biogenesis research.",
    fullDescription:
      "SLU-PP-332 is a small-molecule research compound described in the recent metabolic-biology literature as a pan-agonist at the estrogen-related receptors ERRα, ERRβ and ERRγ. These orphan nuclear receptors are of significant interest in research on mitochondrial biogenesis and energy metabolism.\n\nPublished preclinical work has used SLU-PP-332 to probe ERR-mediated transcriptional programmes, mitochondrial function in cell lines, and models of metabolic regulation.\n\nSupplied as a research-grade crystalline compound, HPLC-characterised, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What receptor family does SLU-PP-332 target in research?",
        answer:
          "SLU-PP-332 is described as a pan-agonist at the estrogen-related receptors ERRα, ERRβ and ERRγ — orphan nuclear receptors studied for their role in mitochondrial biogenesis and metabolic regulation.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "SLU-PP-332 (ERR Pan-Agonist) — Research Reagent | Cryogene Laboratories",
    seoDescription:
      "SLU-PP-332 supplied as a research-grade ERRα/β/γ pan-agonist for UK laboratory metabolic studies. HPLC-tested. Research use only.",
    tags: ["err-agonist", "nuclear-receptor", "mitochondrial-research"],
  },

  "pinealon": {
    casNumber: "857290-04-1",
    molecularFormula: "C₁₄H₂₄N₄O₆",
    molecularWeight: "344.36 g/mol",
    synonyms: ["Glu-Asp-Arg", "EDR peptide"],
    shortDescription:
      "Short tripeptide (Glu-Asp-Arg) from the Khavinson peptide-bioregulator series, studied in neurochemistry research.",
    fullDescription:
      "Pinealon is a synthetic tripeptide (Glu-Asp-Arg) from the Khavinson peptide-bioregulator programme. The research literature describes this class of short peptides in the context of proposed interactions with chromatin and transcriptional activity in preclinical models.\n\nAcademic papers reference Pinealon in neurochemistry research, peptide-bioregulator reviews, and in vitro studies of short synthetic peptides.\n\nSupplied as a lyophilised research peptide, HPLC-characterised, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What is the sequence of Pinealon?",
        answer:
          "Pinealon is the tripeptide Glu-Asp-Arg (EDR), one of several short bioregulator peptides developed within the Khavinson research programme.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "Pinealon (Glu-Asp-Arg) — Research Peptide | Cryogene Laboratories",
    seoDescription:
      "Pinealon supplied as a research-grade tripeptide for UK laboratory neurochemistry studies. HPLC-tested, CoA included. Research use only.",
    tags: ["khavinson-peptide", "tripeptide", "bioregulator"],
  },

  "thymalin": {
    casNumber: null,
    molecularFormula: null,
    molecularWeight: null,
    synonyms: ["Thymalin", "Thymus peptide extract"],
    shortDescription:
      "Research-grade thymus-derived peptide fraction studied in immunology research on thymic regulation.",
    fullDescription:
      "Thymalin is a peptide fraction historically derived from thymic tissue and studied in the immunology research literature as a tool in investigations of thymic-peptide biology and lymphocyte maturation models.\n\nResearch papers reference Thymalin in preclinical work on immune-system regulation, thymus-peptide chemistry, and comparative studies with synthetic thymic peptides such as thymosin α-1.\n\nSupplied as a lyophilised research-grade material, HPLC-characterised, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "How does Thymalin differ from Thymosin Alpha-1?",
        answer:
          "Thymosin Alpha-1 is a single, chemically defined 28-residue peptide. Thymalin is historically a thymic peptide fraction described in the immunology literature. The two are distinct in the research catalogue and frequently contrasted in comparative studies.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "Thymalin — Research-Grade Thymus Peptide | Cryogene Laboratories",
    seoDescription:
      "Thymalin supplied as a research-grade thymic peptide reagent for UK laboratory immunology studies. HPLC-tested. Research use only.",
    tags: ["thymus-peptide", "immunology-research"],
  },

  "thymosin-alpha-1": {
    casNumber: "62304-98-7",
    molecularFormula: "C₁₂₉H₂₁₅N₃₃O₅₅",
    molecularWeight: "3108.32 g/mol",
    synonyms: ["Tα1", "Zadaxin"],
    shortDescription:
      "Acetylated 28-residue peptide derived from the N-terminus of prothymosin α, studied in immunological research.",
    fullDescription:
      "Thymosin Alpha-1 (Tα1) is a 28-amino-acid acetylated peptide corresponding to the N-terminal region of prothymosin α. It is one of the most extensively studied synthetic thymic peptides in the academic literature, with references across immunology, virology research, and cell-signalling studies.\n\nThymosin Alpha-1 has been used in preclinical research on Toll-like receptor signalling, T-cell maturation in in vitro systems, and comparative work with other thymic peptide fractions.\n\nSupplied as a lyophilised research peptide, HPLC-characterised at ≥99% purity, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What is the origin of Thymosin Alpha-1?",
        answer:
          "Thymosin Alpha-1 is the 28-residue acetylated peptide derived from the N-terminal region of prothymosin α. It is a synthetic reagent in research use, one of the most widely studied members of the thymosin-alpha family.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "Thymosin Alpha-1 (Tα1) — Research Peptide | Cryogene Laboratories",
    seoDescription:
      "Thymosin Alpha-1 supplied as a research-grade 28-residue peptide for UK laboratory immunology studies. HPLC-tested ≥99%. Research use only.",
    tags: ["thymosin", "prothymosin-derived", "immunology"],
  },

  "adipotide": {
    casNumber: "859216-15-2",
    molecularFormula: "C₁₅₂H₂₅₁N₄₃O₄₂",
    molecularWeight: "3374.90 g/mol",
    synonyms: ["CKGGRAKDC-GG-D(KLAKLAK)2", "Proapoptotic peptide"],
    shortDescription:
      "Chimeric peptide investigated as a proapoptotic agent targeting prohibitin on the white-adipose vasculature in preclinical models.",
    fullDescription:
      "Adipotide is a chimeric proapoptotic peptide described in the research literature as coupling a prohibitin-targeting motif (CKGGRAKDC) to a proapoptotic sequence (the KLAKLAK dimer). It was originally characterised by researchers investigating targeted killing of adipose-tissue vasculature in preclinical obesity models.\n\nPapers address Adipotide in the context of phage-display–derived peptide targeting, preclinical models of white-adipose vasculature, and peptide-drug design principles for tissue-selective delivery.\n\nSupplied as a lyophilised research peptide, HPLC-characterised, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What is the design rationale for Adipotide?",
        answer:
          "Adipotide is a chimeric research peptide that combines a prohibitin-binding motif (CKGGRAKDC) with a pro-apoptotic KLAKLAK dimer. It was designed as a tool compound for targeted-delivery research in preclinical obesity models.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "Adipotide — Research Peptide | Cryogene Laboratories",
    seoDescription:
      "Adipotide supplied as a research-grade chimeric peptide for UK laboratory adipose-targeted research. HPLC-tested, CoA included. Research use only.",
    tags: ["proapoptotic-peptide", "prohibitin-targeting", "chimeric-peptide"],
  },

  "ghrp-2-acetate": {
    casNumber: "158861-67-7",
    molecularFormula: "C₄₅H₅₅N₉O₆",
    molecularWeight: "817.93 g/mol",
    synonyms: ["Pralmorelin", "KP-102", "D-Ala-D-β-Nal-Ala-Trp-D-Phe-Lys-NH2"],
    shortDescription:
      "Synthetic hexapeptide growth hormone secretagogue studied at the GHS-R1a (ghrelin) receptor.",
    fullDescription:
      "GHRP-2 (pralmorelin) is a synthetic hexapeptide belonging to the growth hormone secretagogue family. In the research literature it is referenced as an agonist at the growth hormone secretagogue receptor (GHS-R1a), the same receptor engaged by the endogenous peptide ghrelin.\n\nLaboratory work references GHRP-2 in receptor-binding assays, comparative pharmacology studies against GHRP-6 and Ipamorelin, and in vitro models of pituitary cell biology.\n\nSupplied as the acetate salt, lyophilised, HPLC-characterised, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "How does GHRP-2 compare with GHRP-6 in research use?",
        answer:
          "Both GHRP-2 and GHRP-6 are growth hormone secretagogues studied as agonists at the GHS-R1a receptor. They differ in potency, receptor-binding kinetics, and secondary-receptor profile, and are frequently studied in parallel in in vitro comparative-pharmacology work.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "GHRP-2 Acetate (Pralmorelin) — Research Peptide | Cryogene Laboratories",
    seoDescription:
      "GHRP-2 Acetate supplied as a research-grade hexapeptide secretagogue for UK laboratory GHS-R1a studies. HPLC-tested. Research use only.",
    tags: ["ghrp", "pralmorelin", "ghs-r1a"],
  },

  "ghrp-6-acetate": {
    casNumber: "87616-84-0",
    molecularFormula: "C₄₆H₅₆N₁₂O₆",
    molecularWeight: "873.03 g/mol",
    synonyms: ["His-D-Trp-Ala-Trp-D-Phe-Lys-NH2"],
    shortDescription:
      "Synthetic hexapeptide growth hormone secretagogue studied at the GHS-R1a (ghrelin) receptor.",
    fullDescription:
      "GHRP-6 is a synthetic hexapeptide from the growth hormone secretagogue family, structurally distinct from GHRP-2 but sharing the same primary receptor target, the GHS-R1a. The research literature catalogues it as one of the earliest characterised GHS peptides and a common reference compound in receptor-binding studies.\n\nLaboratory research references GHRP-6 in comparative pharmacology against GHRP-2 and Ipamorelin, cell-based assays of GHS-R1a signalling, and preclinical models of the growth hormone axis.\n\nSupplied as the acetate salt, lyophilised, HPLC-characterised, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What makes GHRP-6 distinct from other GHS peptides in research?",
        answer:
          "GHRP-6 is the earliest-characterised member of the synthetic GHRP family, frequently used as a reference compound for GHS-R1a receptor-binding assays and a comparator in studies of newer secretagogues.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "GHRP-6 Acetate — Research Peptide | Cryogene Laboratories",
    seoDescription:
      "GHRP-6 Acetate supplied as a research-grade hexapeptide secretagogue for UK laboratory ghrelin-receptor studies. HPLC-tested. Research use only.",
    tags: ["ghrp", "ghs-r1a", "secretagogue"],
  },

  "bacteriostatic-water": {
    casNumber: null,
    molecularFormula: "H₂O + 0.9% benzyl alcohol",
    molecularWeight: null,
    synonyms: ["BAC water", "Benzyl alcohol water"],
    shortDescription:
      "Sterile water for laboratory reconstitution, preserved with 0.9% benzyl alcohol. Supplied for laboratory research use.",
    fullDescription:
      "Bacteriostatic water is sterile water preserved with 0.9% benzyl alcohol, used in the laboratory as a reconstitution solvent for lyophilised research compounds. The benzyl alcohol preservative inhibits bacterial growth in multi-use vials across typical laboratory storage conditions.\n\nIn research use, bacteriostatic water is a common diluent for peptide reconstitution prior to in vitro assays. Researchers are responsible for establishing reconstitution protocols appropriate to the experimental design of each investigation.\n\nSupplied in sterile glass vials with a rubber stopper and aluminium crimp. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What is the preservative in bacteriostatic water?",
        answer:
          "0.9% benzyl alcohol — a preservative widely referenced in the laboratory literature for its bacteriostatic properties when used as a reconstitution solvent.",
      },
      {
        question: "How should bacteriostatic water be stored?",
        answer:
          "Store at 15-25°C in the original sealed vial. Once accessed, follow the storage timing referenced in the primary literature for the compound being reconstituted.",
      },
      RUO_FAQ,
    ],
    seoTitle: "Bacteriostatic Water — Laboratory Reconstitution Solvent | Cryogene Laboratories",
    seoDescription:
      "Bacteriostatic water (0.9% benzyl alcohol) supplied for UK laboratory reconstitution of research reagents. Sterile, multi-dose vials. Research use only.",
    tags: ["solvent", "reconstitution", "benzyl-alcohol"],
  },

  "bpc-157": {
    casNumber: "137525-51-0",
    molecularFormula: "C₆₂H₉₈N₁₆O₂₂",
    molecularWeight: "1419.53 g/mol",
    synonyms: ["Body Protection Compound 157", "PL 14736", "Pentadecapeptide BPC 157"],
    shortDescription:
      "Synthetic 15-amino-acid peptide fragment studied in preclinical research on tissue repair mechanisms and gastrointestinal biology.",
    fullDescription:
      "BPC-157 is a synthetic pentadecapeptide whose sequence derives from a region of human gastric juice proteins. In the published research literature it is catalogued as a research reagent in preclinical models of gastrointestinal tissue, connective-tissue biology, and vascular-response research.\n\nPapers discuss BPC-157 in the context of VEGF pathway signalling, preclinical wound-repair models, and comparative peptide-chemistry studies. It is a frequently cited compound in the tissue-repair research literature.\n\nSupplied as a lyophilised research peptide, HPLC-characterised at ≥99% purity, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "Where does the sequence of BPC-157 originate?",
        answer:
          "BPC-157 is a synthetic pentadecapeptide whose sequence derives from a region of human gastric juice proteins. It is a synthetic research reagent; no native counterpart is used commercially.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "BPC-157 (Pentadecapeptide) — Research Peptide | Cryogene Laboratories",
    seoDescription:
      "BPC-157 supplied as a lyophilised research pentadecapeptide for UK laboratory tissue-repair studies. HPLC-tested ≥99%, CoA included. Research use only.",
    tags: ["pentadecapeptide", "tissue-repair-research", "body-protection-compound"],
  },

  "bpc-157-tb-500-blend": {
    casNumber: null,
    molecularFormula: null,
    molecularWeight: null,
    synonyms: ["BPC-157 + TB-500 blend", "Pentadecapeptide + Thymosin Beta 4 fragment"],
    shortDescription:
      "Research-grade blend of BPC-157 (pentadecapeptide) and TB-500 (thymosin β4 fragment), supplied for comparative peptide-biology studies.",
    fullDescription:
      "This research-grade blend combines two extensively studied peptides: BPC-157 (a synthetic 15-residue peptide derived from a gastric-juice-protein region) and TB-500 (a synthetic fragment of thymosin β4). Both appear in the tissue-repair and connective-tissue research literature and are commonly examined in parallel in preclinical studies.\n\nResearchers use blended reagents of this kind in comparative peptide-pharmacology, combinatorial signalling studies, and in vitro work on tissue-repair mechanisms. Users are responsible for documenting the ratio and source of each component for their experimental records.\n\nSupplied as a lyophilised powder, HPLC-characterised, with a Certificate of Analysis for each component peptide per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What is the rationale for a BPC-157 / TB-500 research blend?",
        answer:
          "Both peptides are catalogued in tissue-repair research, and the blend is frequently used in comparative preclinical studies of their signalling profiles. Supplying them together in a single research reagent simplifies documentation and handling for parallel-protocol experiments.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "BPC-157 + TB-500 Blend — Research Peptide Combination | Cryogene Laboratories",
    seoDescription:
      "BPC-157 + TB-500 blend supplied as a research-grade peptide combination for UK laboratory comparative studies. HPLC-tested. Research use only.",
    tags: ["peptide-blend", "bpc-157", "tb-500"],
  },

  "nad-plus": {
    casNumber: "53-84-9",
    molecularFormula: "C₂₁H₂₇N₇O₁₄P₂",
    molecularWeight: "663.43 g/mol",
    synonyms: ["Nicotinamide adenine dinucleotide", "β-NAD⁺"],
    shortDescription:
      "Endogenous coenzyme central to cellular redox reactions; supplied as a research-grade reagent for in vitro biochemistry.",
    fullDescription:
      "NAD⁺ (nicotinamide adenine dinucleotide, oxidised form) is a fundamental redox coenzyme in all living cells, central to hundreds of oxidoreductase reactions, the sirtuin (SIRT) enzyme family, and PARP-mediated signalling. It is a foundational reference reagent in biochemistry research.\n\nLaboratory applications include enzyme-kinetics studies, sirtuin and PARP activity assays, metabolic-pathway reconstructions, and mass-spectrometry reference work on the NAD metabolome.\n\nSupplied as a research-grade powder, HPLC-characterised at ≥99% purity, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What enzymes require NAD⁺ in laboratory assays?",
        answer:
          "NAD⁺ is the cofactor for hundreds of oxidoreductase enzymes, the sirtuin (SIRT) family of deacylases, PARP enzymes, and CD38/CD157 ectoenzymes. It is a foundational reagent in biochemistry research.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "NAD⁺ (Nicotinamide Adenine Dinucleotide) — Research Reagent | Cryogene Laboratories",
    seoDescription:
      "NAD⁺ supplied as a research-grade biochemistry reagent for UK laboratory enzyme-kinetics and metabolomics studies. HPLC-tested ≥99%. Research use only.",
    tags: ["coenzyme", "sirtuin-research", "redox"],
  },

  "aod9604": {
    casNumber: "221231-10-3",
    molecularFormula: "C₇₈H₁₂₃N₂₃O₂₃S₂",
    molecularWeight: "1815.08 g/mol",
    synonyms: ["hGH Fragment 176-191", "Tyr-hGH(177-191)"],
    shortDescription:
      "Synthetic 16-amino-acid peptide corresponding to the C-terminal fragment of human growth hormone (residues 176-191), studied in lipid-metabolism research.",
    fullDescription:
      "AOD9604 is a synthetic 16-residue peptide corresponding to the C-terminal fragment (residues 176-191) of human growth hormone, modified by an N-terminal tyrosine for stability. In the research literature it is characterised as a fragment that has lost the growth-promoting activity of full-length hGH while retaining aspects of lipolytic activity in preclinical fat-cell studies.\n\nPapers reference AOD9604 in in vitro lipolysis assays, preclinical metabolic-model work, and fragment-based studies of the hGH sequence.\n\nSupplied as a lyophilised research peptide, HPLC-characterised, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What region of human growth hormone does AOD9604 correspond to?",
        answer:
          "AOD9604 corresponds to the C-terminal fragment of human growth hormone (residues 176-191), modified with an N-terminal tyrosine. It is a fragment-based research reagent in lipolysis studies.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "AOD9604 (hGH 176-191) — Research Peptide | Cryogene Laboratories",
    seoDescription:
      "AOD9604 supplied as a research-grade hGH-fragment peptide for UK laboratory lipid-metabolism studies. HPLC-tested, CoA included. Research use only.",
    tags: ["hgh-fragment", "lipolysis-research", "fragment-peptide"],
  },

  "ghk-cu": {
    casNumber: "89030-95-5",
    molecularFormula: "C₁₄H₂₄CuN₆O₄",
    molecularWeight: "403.93 g/mol",
    synonyms: ["Copper tripeptide-1", "Gly-His-Lys-Cu"],
    shortDescription:
      "Naturally occurring copper-peptide complex (Gly-His-Lys-Cu²⁺) studied in cosmetic chemistry and tissue-biology research.",
    fullDescription:
      "GHK-Cu is the copper(II) complex of the tripeptide glycyl-histidyl-lysine (GHK), a sequence found endogenously in human plasma. It is extensively catalogued in the cosmetic-chemistry and tissue-biology research literature as a reagent in studies of extracellular-matrix-related gene expression, copper transport chemistry, and in vitro models of skin biology.\n\nResearch papers reference GHK-Cu in transcriptomics studies, collagen-pathway gene panels, and comparative peptide–copper-complex chemistry.\n\nSupplied as a lyophilised research-grade copper-peptide complex, HPLC-characterised, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What is the chemistry of the GHK-Cu complex?",
        answer:
          "GHK-Cu is the 1:1 coordination complex of the tripeptide glycyl-histidyl-lysine with copper(II). The peptide's histidine imidazole and lysine amine dominate the copper-binding coordination chemistry.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "GHK-Cu (Copper Tripeptide-1) — Research Peptide | Cryogene Laboratories",
    seoDescription:
      "GHK-Cu supplied as a research-grade copper-peptide complex for UK laboratory extracellular-matrix studies. HPLC-tested, CoA included. Research use only.",
    tags: ["copper-peptide", "ghk", "ecm-research"],
  },

  "mots-c": {
    casNumber: "1627580-64-6",
    molecularFormula: "C₇₅H₁₂₅N₂₁O₁₉S₂",
    molecularWeight: "1711.00 g/mol",
    synonyms: ["Mitochondrial Open Reading frame of the Twelve S rRNA-c"],
    shortDescription:
      "Mitochondria-encoded 16-amino-acid peptide studied in metabolic and mitochondrial-biology research.",
    fullDescription:
      "MOTS-c is a 16-residue peptide encoded within the mitochondrial 12S ribosomal RNA open reading frame. In the research literature it is catalogued among the small peptides encoded by mitochondrial short open reading frames (sORFs) and is of significant interest in metabolic-biology research.\n\nPapers reference MOTS-c in studies of AMPK pathway activity, mitochondrial-nuclear retrograde signalling, and preclinical models of insulin sensitivity and metabolic regulation.\n\nSupplied as a lyophilised research peptide, HPLC-characterised, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "Where is MOTS-c encoded in the genome?",
        answer:
          "MOTS-c is encoded within the mitochondrial 12S ribosomal RNA gene, as one of several peptides arising from small open reading frames (sORFs) in the mitochondrial genome.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "MOTS-c (Mitochondrial Peptide) — Research Peptide | Cryogene Laboratories",
    seoDescription:
      "MOTS-c supplied as a research-grade mitochondrial peptide for UK laboratory metabolic-biology studies. HPLC-tested, CoA included. Research use only.",
    tags: ["mitochondrial-peptide", "ampk-research", "sorf-peptide"],
  },

  "b12": {
    casNumber: "68-19-9",
    molecularFormula: "C₆₃H₈₈CoN₁₄O₁₄P",
    molecularWeight: "1355.37 g/mol",
    synonyms: ["Cyanocobalamin", "Vitamin B12", "Cobalamin"],
    shortDescription:
      "Cobalt-containing vitamin (cyanocobalamin form) used as a reference compound in biochemistry research.",
    fullDescription:
      "Vitamin B12 (cyanocobalamin) is the cobalt-containing member of the cobalamin family. It is an essential cofactor for methionine synthase and methylmalonyl-CoA mutase, two enzymes central to one-carbon metabolism and branched-chain amino acid processing.\n\nLaboratory applications include enzyme-cofactor kinetics, HPLC method development, nutritional-biochemistry research, and mass-spectrometry reference work.\n\nSupplied as a research-grade crystalline powder, HPLC-characterised, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "Which enzymes require cobalamin as a cofactor?",
        answer:
          "The two mammalian enzymes known to require cobalamin are methionine synthase (which methylates homocysteine to methionine) and methylmalonyl-CoA mutase (which processes branched-chain amino acid catabolites).",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "Vitamin B12 (Cyanocobalamin) — Research Reagent | Cryogene Laboratories",
    seoDescription:
      "Vitamin B12 (cyanocobalamin) supplied as a research-grade biochemistry reagent for UK laboratory studies. HPLC-tested. Research use only.",
    tags: ["cobalamin", "vitamin", "cofactor"],
  },

  "melatonin": {
    casNumber: "73-31-4",
    molecularFormula: "C₁₃H₁₆N₂O₂",
    molecularWeight: "232.28 g/mol",
    synonyms: ["N-Acetyl-5-methoxytryptamine"],
    shortDescription:
      "Endogenous indoleamine chronobiology compound used as a reference reagent in circadian-rhythm and receptor-binding research.",
    fullDescription:
      "Melatonin (N-acetyl-5-methoxytryptamine) is an endogenous indoleamine synthesised from serotonin in the pineal gland. It is a well-characterised reference compound in the chronobiology research literature and a standard reagent in melatonin-receptor pharmacology (MT1/MT2).\n\nLaboratory uses include receptor-binding assays at MT1 and MT2, circadian rhythm research in cell and animal models, and antioxidant-chemistry reference work.\n\nSupplied as a research-grade crystalline powder, HPLC-characterised, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What receptors does melatonin engage in research?",
        answer:
          "Melatonin is a reference agonist at the MT1 and MT2 G-protein-coupled receptors. Both are widely used targets in chronobiology and receptor-pharmacology research.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "Melatonin — Research Reagent | Cryogene Laboratories",
    seoDescription:
      "Melatonin supplied as a research-grade indoleamine reference reagent for UK laboratory chronobiology studies. HPLC-tested. Research use only.",
    tags: ["indoleamine", "chronobiology", "mt1-mt2"],
  },

  "cerebrolysin": {
    casNumber: null,
    molecularFormula: null,
    molecularWeight: null,
    synonyms: ["Porcine brain peptide preparation"],
    shortDescription:
      "Peptide and amino-acid mixture historically derived from porcine brain tissue, studied in neuroscience research.",
    fullDescription:
      "Cerebrolysin is a research-grade peptide and free-amino-acid mixture historically derived from porcine brain tissue. The academic literature references it in preclinical neuroscience research as a tool preparation in studies of neurotrophic-factor signalling and neurodevelopmental cell biology.\n\nResearch papers address Cerebrolysin in in vitro models of neurite outgrowth, preclinical neurological injury models, and reviews of neuropeptide-mixture chemistry.\n\nSupplied as a research-grade preparation, characterised by the supplier, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What is Cerebrolysin composed of?",
        answer:
          "Cerebrolysin is a preparation of free amino acids and short peptides derived from porcine brain tissue. It is described in the research literature as a neuropeptide mixture used in preclinical neuroscience models.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "Cerebrolysin — Research-Grade Neuropeptide Preparation | Cryogene Laboratories",
    seoDescription:
      "Cerebrolysin supplied as a research-grade neuropeptide preparation for UK laboratory neuroscience studies. Research use only.",
    tags: ["neuropeptide-mixture", "neuroscience-research"],
  },

  "ss-31": {
    casNumber: "736992-21-5",
    molecularFormula: "C₃₂H₄₉N₉O₅",
    molecularWeight: "639.79 g/mol",
    synonyms: ["Elamipretide", "MTP-131", "Bendavia", "D-Arg-Dmt-Lys-Phe-NH2"],
    shortDescription:
      "Mitochondria-targeted tetrapeptide studied for interaction with cardiolipin on the inner mitochondrial membrane.",
    fullDescription:
      "SS-31 (elamipretide) is a synthetic mitochondria-targeted tetrapeptide containing a dimethyltyrosine (Dmt) residue. In the research literature it is described as binding cardiolipin on the inner mitochondrial membrane, where it is studied in the context of mitochondrial-function research.\n\nPapers reference SS-31 in preclinical models of mitochondrial dysfunction, in vitro cardiolipin-binding chemistry, and reviews of mitochondria-targeted peptide design.\n\nSupplied as a lyophilised research peptide, HPLC-characterised, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What mitochondrial lipid does SS-31 interact with in research?",
        answer:
          "SS-31 is described as binding cardiolipin on the inner mitochondrial membrane. Cardiolipin is a phospholipid largely specific to mitochondria and a frequent target in mitochondria-oriented peptide design.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "SS-31 (Elamipretide) — Research Peptide | Cryogene Laboratories",
    seoDescription:
      "SS-31 supplied as a research-grade mitochondria-targeted tetrapeptide for UK laboratory cardiolipin studies. HPLC-tested. Research use only.",
    tags: ["mitochondria-targeted", "elamipretide", "cardiolipin"],
  },

  "cjc-1295-with-dac": {
    casNumber: "863288-34-0",
    molecularFormula: "C₁₅₂H₂₅₂N₄₄O₄₂",
    molecularWeight: "3367.90 g/mol",
    synonyms: ["CJC-1295 DAC", "GHRH analogue with DAC"],
    shortDescription:
      "Modified growth hormone releasing hormone (GHRH) analogue coupled with a Drug Affinity Complex (DAC) moiety for extended plasma half-life in preclinical models.",
    fullDescription:
      "CJC-1295 with DAC is a synthetic 30-residue analogue of growth hormone releasing hormone (GHRH, residues 1-29) functionalised with a Drug Affinity Complex (DAC) — a maleimido-propionic-acid group that forms a covalent bond to circulating albumin. The DAC conjugation is described in the research literature as extending the plasma half-life of the peptide in preclinical systems.\n\nResearch papers reference CJC-1295 DAC in studies of the GHRH receptor, comparative pharmacology against non-DAC variants, and pharmacokinetic research on albumin-binding peptide design.\n\nSupplied as a lyophilised research peptide, HPLC-characterised, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What is the function of the DAC moiety on CJC-1295?",
        answer:
          "The Drug Affinity Complex (DAC) is a maleimido-propionic-acid group that forms a covalent bond with circulating albumin via a free cysteine, extending the plasma half-life of the peptide in preclinical research models.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "CJC-1295 with DAC — GHRH Analogue Research Peptide | Cryogene Laboratories",
    seoDescription:
      "CJC-1295 with DAC supplied as a research-grade GHRH analogue peptide for UK laboratory pharmacokinetic studies. HPLC-tested. Research use only.",
    tags: ["ghrh-analogue", "dac", "albumin-binding"],
  },

  "cjc-1295-without-dac": {
    casNumber: "863288-34-0",
    molecularFormula: "C₁₅₂H₂₅₂N₄₄O₄₂",
    molecularWeight: "3367.90 g/mol",
    synonyms: ["Modified GRF (1-29)", "Mod GRF 1-29", "CJC-1295 no-DAC"],
    shortDescription:
      "Modified 30-residue GHRH (1-29) analogue with four substitutions for increased enzymatic stability, supplied without the DAC affinity moiety.",
    fullDescription:
      "CJC-1295 without DAC (also called Mod GRF 1-29) is a synthetic 30-amino-acid analogue of the 1-29 fragment of growth hormone releasing hormone. It carries four amino-acid substitutions (D-Ala, Gln, Ala, Leu) that increase enzymatic stability relative to the native GHRH fragment, without the albumin-conjugating DAC moiety present in the DAC variant.\n\nLaboratory use cases include GHRH receptor pharmacology, comparative research against the DAC variant, and peptide-chemistry studies of amino-acid substitution effects on enzymatic half-life.\n\nSupplied as a lyophilised research peptide, HPLC-characterised, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "How does CJC-1295 without DAC differ from the DAC variant?",
        answer:
          "Both peptides share the same 30-residue GHRH(1-29) analogue sequence with four stability-enhancing substitutions. The DAC variant additionally carries a Drug Affinity Complex that covalently binds circulating albumin, extending plasma half-life. The non-DAC variant does not carry this group.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "CJC-1295 Without DAC (Mod GRF 1-29) — Research Peptide | Cryogene Laboratories",
    seoDescription:
      "CJC-1295 without DAC supplied as a research-grade GHRH analogue for UK laboratory receptor studies. HPLC-tested, CoA included. Research use only.",
    tags: ["ghrh-analogue", "mod-grf-29", "peptide-stability-research"],
  },

  "cjc-1295-ipamorelin-blend": {
    casNumber: null,
    molecularFormula: null,
    molecularWeight: null,
    synonyms: ["CJC-1295 + Ipamorelin", "GHRH analogue + GHS pentapeptide blend"],
    shortDescription:
      "Research-grade blend of CJC-1295 and Ipamorelin supplied for comparative GHRH/GHS pharmacology studies.",
    fullDescription:
      "This research-grade blend combines CJC-1295 (a modified GHRH 1-29 analogue) with Ipamorelin (a selective pentapeptide GHS-R1a agonist). The two peptides address different arms of the growth hormone axis — GHRH receptor signalling and ghrelin receptor signalling — and are frequently studied in parallel in comparative in vitro work.\n\nSupplying the two together in a single research reagent is a convenience for comparative-pharmacology protocols. Users are responsible for documenting blend ratios and component sources for their experimental records.\n\nSupplied as a lyophilised powder, HPLC-characterised, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What receptor systems does this blend target in research?",
        answer:
          "The CJC-1295 component is an analogue of growth hormone releasing hormone and engages the GHRH receptor. The Ipamorelin component is a pentapeptide agonist at the growth hormone secretagogue receptor (GHS-R1a). The two represent complementary arms of the growth hormone axis in comparative studies.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "CJC-1295 + Ipamorelin Blend — Research Peptide | Cryogene Laboratories",
    seoDescription:
      "CJC-1295 + Ipamorelin blend supplied as a research-grade peptide combination for UK laboratory GHRH/GHS studies. HPLC-tested. Research use only.",
    tags: ["peptide-blend", "ghrh-ghs", "comparative-pharmacology"],
  },

  "melanotani": {
    casNumber: "75921-69-6",
    molecularFormula: "C₇₈H₁₁₁N₂₁O₁₉",
    molecularWeight: "1646.85 g/mol",
    synonyms: ["Melanotan I", "MT-1", "Afamelanotide"],
    shortDescription:
      "Synthetic 13-amino-acid α-MSH analogue studied as an agonist across the melanocortin receptor family.",
    fullDescription:
      "Melanotan I (sometimes rendered 'Melanotani' in older catalogues; INN: afamelanotide) is a synthetic 13-residue analogue of α-melanocyte-stimulating hormone (α-MSH). It is catalogued in the research literature as an agonist across the melanocortin receptor family (MC1R through MC5R) and is a frequent reference compound in melanocortin-pharmacology studies.\n\nPapers reference Melanotan I in MC1R-focused research on melanogenesis, comparative pharmacology with Melanotan II and PT-141, and peptide-design studies of α-MSH analogues.\n\nSupplied as a lyophilised research peptide, HPLC-characterised, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "How does Melanotan I differ from Melanotan II?",
        answer:
          "Melanotan I is a linear 13-residue analogue of α-MSH. Melanotan II is a shorter cyclic heptapeptide analogue. Both are melanocortin-receptor agonists but differ in structure, receptor-selectivity profile, and potency in published binding assays.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "Melanotan I (Afamelanotide) — Research Peptide | Cryogene Laboratories",
    seoDescription:
      "Melanotan I supplied as a research-grade α-MSH analogue for UK laboratory melanocortin studies. HPLC-tested. Research use only.",
    tags: ["melanocortin", "alpha-msh-analogue", "afamelanotide"],
  },

  "melanotan-ii": {
    casNumber: "121062-08-6",
    molecularFormula: "C₅₀H₆₉N₁₅O₉",
    molecularWeight: "1024.18 g/mol",
    synonyms: ["MT-II", "MT2", "Ac-Nle-cyclo(Asp-His-D-Phe-Arg-Trp-Lys)-NH2"],
    shortDescription:
      "Synthetic cyclic heptapeptide analogue of α-MSH, studied as a non-selective agonist across the melanocortin receptor family.",
    fullDescription:
      "Melanotan II (MT-II) is a synthetic cyclic heptapeptide derived from the α-melanocyte-stimulating hormone (α-MSH) sequence, with a lactam-bridge cyclisation that confers increased receptor potency and metabolic stability compared with the linear α-MSH fragment. It is catalogued in the research literature as a non-selective agonist across the melanocortin receptor family (MC1R–MC5R).\n\nLaboratory references include MC3R/MC4R receptor-binding assays, preclinical models of melanocortin-system signalling, and comparative work against PT-141 and Melanotan I.\n\nSupplied as a lyophilised research peptide, HPLC-characterised, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What is the structural basis of Melanotan II's activity?",
        answer:
          "Melanotan II is a cyclic heptapeptide analogue of α-MSH with a lactam bridge between the Asp and Lys residues. This cyclisation increases receptor-binding potency and metabolic stability compared with the linear parent sequence.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "Melanotan II (MT-II) — Research Peptide | Cryogene Laboratories",
    seoDescription:
      "Melanotan II supplied as a research-grade cyclic melanocortin-receptor peptide for UK laboratory studies. HPLC-tested. Research use only.",
    tags: ["melanocortin", "cyclic-peptide", "mt-ii"],
  },

  "kpv": {
    casNumber: "67727-97-3",
    molecularFormula: "C₂₂H₃₂N₆O₄",
    molecularWeight: "444.53 g/mol",
    synonyms: ["Lys-Pro-Val", "α-MSH (11-13)"],
    shortDescription:
      "Tripeptide fragment (Lys-Pro-Val) of the C-terminus of α-MSH, studied in research on anti-inflammatory signalling in in vitro models.",
    fullDescription:
      "KPV is the tripeptide Lys-Pro-Val, corresponding to the C-terminal three residues of α-melanocyte-stimulating hormone. In the research literature it is catalogued in in vitro studies of innate-immune signalling and models of epithelial inflammation biology.\n\nResearch papers reference KPV in cell-culture work on NF-κB pathway modulation, comparative studies against longer α-MSH analogues, and peptide-chemistry of the melanocortin C-terminal motif.\n\nSupplied as a lyophilised research peptide, HPLC-characterised, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What is the origin of the KPV tripeptide?",
        answer:
          "KPV (Lys-Pro-Val) corresponds to the C-terminal three residues of α-melanocyte-stimulating hormone (α-MSH 11-13). It is studied as a short-peptide analogue of the C-terminal α-MSH motif.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "KPV (Lys-Pro-Val) — Research Peptide | Cryogene Laboratories",
    seoDescription:
      "KPV supplied as a research-grade α-MSH tripeptide fragment for UK laboratory inflammation-signalling studies. HPLC-tested. Research use only.",
    tags: ["tripeptide", "alpha-msh-fragment", "inflammation-research"],
  },

  "sermorelin": {
    casNumber: "86168-78-7",
    molecularFormula: "C₁₄₉H₂₄₆N₄₄O₄₂S",
    molecularWeight: "3357.88 g/mol",
    synonyms: ["GRF (1-29)", "GHRH(1-29)", "Geref"],
    shortDescription:
      "Synthetic 29-amino-acid peptide corresponding to the first 29 residues of human growth hormone releasing hormone (GHRH).",
    fullDescription:
      "Sermorelin is the synthetic 29-residue N-terminal fragment of human growth hormone releasing hormone (GHRH 1-29). In the research literature it is referenced as the minimal sequence that retains the full biological activity of native GHRH at the GHRH receptor, making it a common reference peptide in GHRH-receptor pharmacology.\n\nLaboratory references include GHRH receptor-binding assays, comparative pharmacology against CJC-1295 and Tesamorelin, and peptide-chemistry studies of the GHRH N-terminus.\n\nSupplied as a lyophilised research peptide, HPLC-characterised, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What is the relationship between Sermorelin and native GHRH?",
        answer:
          "Sermorelin is the synthetic 1-29 N-terminal fragment of the 44-residue native growth hormone releasing hormone. It retains full receptor activity in vitro and is a reference compound in GHRH-receptor research.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "Sermorelin (GHRH 1-29) — Research Peptide | Cryogene Laboratories",
    seoDescription:
      "Sermorelin supplied as a research-grade GHRH(1-29) peptide for UK laboratory growth hormone receptor studies. HPLC-tested. Research use only.",
    tags: ["ghrh-fragment", "growth-hormone-releasing-hormone", "grf-1-29"],
  },

  "tesamorelin": {
    casNumber: "901758-09-6",
    molecularFormula: "C₂₂₁H₃₆₆N₇₂O₆₇S",
    molecularWeight: "5135.87 g/mol",
    synonyms: ["TH9507", "Egrifta"],
    shortDescription:
      "Stabilised synthetic analogue of GHRH(1-44) with an N-terminal trans-3-hexenoyl modification, used in GHRH-receptor research.",
    fullDescription:
      "Tesamorelin is a synthetic 44-residue analogue of human growth hormone releasing hormone (GHRH) with an N-terminal trans-3-hexenoyl modification. In the research literature the modification is described as increasing stability against dipeptidyl peptidase-4 (DPP-4) degradation relative to unmodified GHRH.\n\nPapers reference Tesamorelin in GHRH-receptor pharmacology studies, comparative work against Sermorelin and CJC-1295, and peptide-stability chemistry.\n\nSupplied as a lyophilised research peptide, HPLC-characterised, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What is the role of the trans-3-hexenoyl group on Tesamorelin?",
        answer:
          "The N-terminal trans-3-hexenoyl modification is described in the peptide-chemistry literature as protecting Tesamorelin against DPP-4 cleavage, increasing enzymatic stability compared with unmodified GHRH.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "Tesamorelin (TH9507) — Research Peptide | Cryogene Laboratories",
    seoDescription:
      "Tesamorelin supplied as a research-grade GHRH analogue for UK laboratory receptor studies. HPLC-tested, CoA included. Research use only.",
    tags: ["ghrh-analogue", "dpp4-resistant", "tesamorelin"],
  },

  "tirzepatide": {
    casNumber: "2023788-19-2",
    molecularFormula: "C₂₂₅H₃₄₈N₄₈O₆₈",
    molecularWeight: "4813.45 g/mol",
    synonyms: ["LY3298176", "Mounjaro (INN)"],
    shortDescription:
      "Synthetic 39-amino-acid peptide studied as a dual agonist at the GLP-1 and GIP receptors.",
    fullDescription:
      "Tirzepatide is a synthetic 39-residue peptide described in the research literature as a dual incretin-receptor agonist, engaging both the glucagon-like peptide-1 (GLP-1) receptor and the glucose-dependent insulinotropic polypeptide (GIP) receptor. The peptide incorporates non-natural amino acids and a C20 fatty-di-acid chain that mediates albumin binding and extends its preclinical half-life.\n\nResearch references Tirzepatide in GLP-1R/GIPR comparative pharmacology, albumin-binding peptide design, and preclinical models of incretin-axis signalling.\n\nSupplied as a lyophilised research peptide, HPLC-characterised, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What receptors does Tirzepatide engage in research?",
        answer:
          "Tirzepatide is described as a dual agonist at the GLP-1 receptor and the GIP receptor — the two principal incretin hormone receptors — with balanced affinity for both in published in vitro characterisation.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "Tirzepatide — GLP-1/GIP Dual-Agonist Research Peptide | Cryogene Laboratories",
    seoDescription:
      "Tirzepatide supplied as a research-grade dual-incretin-agonist peptide for UK laboratory receptor studies. HPLC-tested. Research use only.",
    tags: ["incretin", "glp-1-gip", "dual-agonist"],
  },

  "semaglutide": {
    casNumber: "910463-68-2",
    molecularFormula: "C₁₈₇H₂₉₁N₄₅O₅₉",
    molecularWeight: "4113.58 g/mol",
    synonyms: ["NN9535", "Ozempic (INN)", "Wegovy (INN)"],
    shortDescription:
      "Synthetic 31-amino-acid GLP-1 receptor agonist with fatty-acid modification, used in incretin-receptor research.",
    fullDescription:
      "Semaglutide is a synthetic analogue of the glucagon-like peptide-1 (GLP-1) hormone, featuring a C18 fatty-di-acid chain and two amino-acid substitutions that confer albumin binding and resistance to DPP-4 cleavage. It is a standard reference GLP-1 receptor agonist in research.\n\nLaboratory applications include GLP-1R receptor-binding assays, comparative pharmacology against liraglutide and tirzepatide, and in vitro studies of incretin-axis signalling.\n\nSupplied as a lyophilised research peptide, HPLC-characterised, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What peptide modifications confer Semaglutide's extended profile?",
        answer:
          "Semaglutide carries a C18 fatty-di-acid chain that binds circulating albumin, and an α-aminoisobutyric acid (Aib) substitution at position 2 that confers DPP-4 resistance. Both are described in the peptide-chemistry literature as extending its half-life relative to native GLP-1.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "Semaglutide — GLP-1 Receptor Agonist Research Peptide | Cryogene Laboratories",
    seoDescription:
      "Semaglutide supplied as a research-grade GLP-1 receptor agonist for UK laboratory incretin-axis studies. HPLC-tested. Research use only.",
    tags: ["glp-1-agonist", "incretin", "albumin-binding"],
  },

  "retatrutide": {
    casNumber: "2381089-83-2",
    molecularFormula: null,
    molecularWeight: "4731.34 g/mol",
    synonyms: ["LY3437943"],
    shortDescription:
      "Synthetic triple agonist peptide studied at the GLP-1, GIP and glucagon receptors in preclinical metabolic research.",
    fullDescription:
      "Retatrutide is a synthetic peptide described in the peer-reviewed literature as a triple agonist engaging the glucagon-like peptide-1 (GLP-1) receptor, the glucose-dependent insulinotropic polypeptide (GIP) receptor, and the glucagon receptor. It represents a research tool in incretin-plus-glucagon-axis pharmacology.\n\nPublished work references Retatrutide in comparative receptor-binding studies against Tirzepatide and Semaglutide, preclinical metabolic-model work, and peptide-design studies of triple-agonist chemistry.\n\nSupplied as a lyophilised research peptide, HPLC-characterised, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What receptors does Retatrutide engage in research?",
        answer:
          "Retatrutide is described as a triple agonist at the GLP-1 receptor, the GIP receptor and the glucagon receptor — engaging all three components of the incretin-plus-glucagon axis in published in vitro characterisation.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "Retatrutide — Triple Incretin/Glucagon Research Peptide | Cryogene Laboratories",
    seoDescription:
      "Retatrutide supplied as a research-grade triple-agonist peptide for UK laboratory incretin/glucagon receptor studies. HPLC-tested. Research use only.",
    tags: ["triple-agonist", "glp-1-gip-glucagon", "retatrutide"],
  },

  "cagrilintide": {
    casNumber: "1415456-99-3",
    molecularFormula: null,
    molecularWeight: "3749.33 g/mol",
    synonyms: ["NN9838"],
    shortDescription:
      "Long-acting synthetic amylin analogue studied at the amylin and calcitonin receptor family.",
    fullDescription:
      "Cagrilintide is a synthetic long-acting analogue of the pancreatic hormone amylin, engineered for increased receptor residency and circulating half-life in preclinical models. It is described in the research literature as an agonist at the amylin receptor complexes (AMY1-3), which are heterodimers of the calcitonin receptor and receptor-activity-modifying proteins (RAMPs).\n\nPapers reference Cagrilintide in amylin/calcitonin-receptor pharmacology, comparative research against pramlintide, and peptide-design studies of amylin analogues.\n\nSupplied as a lyophilised research peptide, HPLC-characterised, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What receptors does Cagrilintide engage in research?",
        answer:
          "Cagrilintide is an amylin-analogue peptide studied as an agonist at the AMY1, AMY2 and AMY3 receptor complexes — heterodimers of the calcitonin receptor with RAMP accessory proteins.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "Cagrilintide — Amylin Analogue Research Peptide | Cryogene Laboratories",
    seoDescription:
      "Cagrilintide supplied as a research-grade amylin-analogue peptide for UK laboratory receptor studies. HPLC-tested, CoA included. Research use only.",
    tags: ["amylin-analogue", "calcitonin-receptor", "cagrilintide"],
  },

  "lipo-c": {
    casNumber: null,
    molecularFormula: null,
    molecularWeight: null,
    synonyms: ["Lipotropic Blend C", "Methionine-Inositol-Choline-Carnitine research blend"],
    shortDescription:
      "Research-grade blend of methionine, inositol, choline and carnitine used in in vitro studies of lipid metabolism biochemistry.",
    fullDescription:
      "Lipo-C is a research-grade blend of four compounds historically catalogued together as lipotropic reagents: methionine, inositol, choline and carnitine. Each component is individually characterised in the biochemistry literature as a participant in one-carbon metabolism, phospholipid synthesis, or fatty-acid transport.\n\nLaboratory applications include reference-reagent work in lipid-metabolism assays, one-carbon-pathway studies, and metabolomics method development.\n\nSupplied as a research-grade blend, HPLC-characterised per component, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What are the components of Lipo-C?",
        answer:
          "Lipo-C is a blend of methionine, inositol, choline and L-carnitine — four biochemistry reagents individually studied in one-carbon metabolism, phospholipid biosynthesis, and fatty-acid transport.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "Lipo-C (MIC + Carnitine Blend) — Research Reagent | Cryogene Laboratories",
    seoDescription:
      "Lipo-C supplied as a research-grade lipotropic blend for UK laboratory lipid-metabolism studies. HPLC-tested. Research use only.",
    tags: ["lipotropic-blend", "methionine-inositol-choline", "metabolism-research"],
  },

  "glow-blend": {
    casNumber: null,
    molecularFormula: null,
    molecularWeight: null,
    synonyms: ["GHK-Cu + Glutathione + Vitamin C research blend"],
    shortDescription:
      "Research-grade blend of GHK-Cu, glutathione and ascorbic acid used in in vitro studies of extracellular-matrix and redox biology.",
    fullDescription:
      "Glow Blend is a research-grade combination of three reagents widely catalogued in cosmetic-science and redox-biology research: GHK-Cu (copper tripeptide-1), glutathione (the intracellular thiol antioxidant), and ascorbic acid (vitamin C, a co-factor for prolyl and lysyl hydroxylase enzymes in collagen biosynthesis).\n\nLaboratory uses include reference-reagent work in collagen-pathway assays, redox-chemistry experiments, and comparative in vitro studies of skin-biology-related compounds.\n\nSupplied as a research-grade blend, HPLC-characterised per component, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What are the components of Glow Blend?",
        answer:
          "Glow Blend combines GHK-Cu (the copper-tripeptide complex), glutathione (reduced form, the primary intracellular thiol antioxidant), and ascorbic acid (vitamin C, a cofactor for collagen-biosynthesis hydroxylases).",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "Glow Blend (GHK-Cu + Glutathione + Vitamin C) — Research Blend | Cryogene Laboratories",
    seoDescription:
      "Glow Blend supplied as a research-grade peptide/antioxidant blend for UK laboratory ECM and redox studies. HPLC-tested. Research use only.",
    tags: ["research-blend", "ghk-cu-glutathione-vitamin-c", "ecm-redox"],
  },

  "klow-blend": {
    casNumber: null,
    molecularFormula: null,
    molecularWeight: null,
    synonyms: ["KPV + GHK-Cu + Glutathione + Vitamin C blend"],
    shortDescription:
      "Research-grade blend of KPV, GHK-Cu, glutathione and ascorbic acid used in in vitro studies of inflammation and extracellular-matrix biology.",
    fullDescription:
      "Klow Blend is a research-grade combination of four reagents catalogued in the cosmetic-chemistry and inflammation-research literature: KPV (the Lys-Pro-Val C-terminal fragment of α-MSH), GHK-Cu, glutathione and ascorbic acid. Each component is individually referenced in cell-biology and biochemistry research.\n\nLaboratory uses include reference-reagent work in comparative in vitro assays of α-MSH-fragment biology, collagen-pathway assays, and redox chemistry.\n\nSupplied as a research-grade blend, HPLC-characterised per component, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "How does Klow Blend differ from Glow Blend?",
        answer:
          "Klow Blend adds the tripeptide KPV (Lys-Pro-Val, a C-terminal fragment of α-MSH studied in inflammation-signalling research) to the three-component Glow Blend (GHK-Cu + glutathione + ascorbic acid).",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "Klow Blend (KPV + GHK-Cu + Glutathione + Vitamin C) — Research Blend | Cryogene Laboratories",
    seoDescription:
      "Klow Blend supplied as a research-grade peptide/antioxidant blend for UK laboratory inflammation and ECM studies. HPLC-tested. Research use only.",
    tags: ["research-blend", "kpv-ghk-cu", "inflammation-ecm"],
  },

  "tb500": {
    casNumber: "77591-33-4",
    molecularFormula: "C₂₁₂H₃₅₀N₅₆O₇₂S",
    molecularWeight: "4963.44 g/mol",
    synonyms: ["Thymosin Beta 4", "TB-500", "Tβ4 (1-43)"],
    shortDescription:
      "Synthetic 43-amino-acid peptide corresponding to thymosin β4, studied in tissue-biology research.",
    fullDescription:
      "TB-500 is a synthetic peptide corresponding to thymosin β4 (Tβ4), a 43-residue peptide widely characterised in the biology literature as the principal G-actin-sequestering protein in mammalian cells. It is extensively referenced in research on cytoskeletal dynamics and tissue-repair signalling.\n\nPapers reference TB-500 / Tβ4 in in vitro cytoskeletal-assembly assays, preclinical tissue-repair model research, and comparative work against BPC-157 in the wound-biology literature.\n\nSupplied as a lyophilised research peptide, HPLC-characterised at ≥99% purity, with a Certificate of Analysis per batch. " +
      RUO_DISCLAIMER,
    faq: [
      {
        question: "What is the relationship between TB-500 and thymosin β4?",
        answer:
          "TB-500 is a synthetic peptide reagent corresponding to thymosin β4 (Tβ4), a 43-residue intracellular peptide whose principal characterised function is sequestration of G-actin monomers. The terms are frequently used interchangeably in the research literature.",
      },
      STORAGE_FAQ,
      RUO_FAQ,
    ],
    seoTitle: "TB-500 (Thymosin Beta 4) — Research Peptide | Cryogene Laboratories",
    seoDescription:
      "TB-500 supplied as a research-grade thymosin β4 peptide for UK laboratory cytoskeletal studies. HPLC-tested ≥99%. Research use only.",
    tags: ["thymosin-beta-4", "actin-sequestering", "tissue-biology"],
  },

  // ---------------------------------------------------------------------------
  // SUPPLIES
  // ---------------------------------------------------------------------------

  "sterile-petri-dishes": {
    shortDescription:
      "Sterile 90mm polystyrene petri dishes for laboratory cell-culture and microbiology use.",
    fullDescription:
      "Single-use sterile 90mm polystyrene petri dishes with vented lids, supplied in sealed sleeves. Intended for laboratory cell-culture, microbiology plating, and general research protocols.\n\nSupplied pre-sterilised by gamma irradiation. Not intended for clinical or diagnostic use. " +
      RUO_DISCLAIMER,
    tags: ["petri-dish", "cell-culture", "sterile-consumable"],
    seoTitle: "Sterile 90mm Petri Dishes — Laboratory Supplies | Cryogene Laboratories",
    seoDescription:
      "Sterile 90mm polystyrene petri dishes supplied for UK laboratory cell-culture and microbiology research. Gamma-irradiated, vented lids. Research use only.",
    faq: [
      {
        question: "How are these petri dishes sterilised?",
        answer:
          "Gamma-irradiation sterilisation at the point of manufacture. Supplied in sealed sleeves to preserve sterility until the sleeve is opened in the laboratory.",
      },
      RUO_FAQ,
    ],
  },

  "sterile-empty-vials": {
    shortDescription:
      "Sterile 10ml glass vials with silver aluminium crimp caps and rubber stoppers, for laboratory reconstitution and sample storage.",
    fullDescription:
      "Sterile empty 10ml borosilicate-glass vials with butyl-rubber stoppers and aluminium crimp seals. Intended for laboratory reconstitution of lyophilised research reagents, sample-storage workflows, and stock-solution preparation.\n\nSupplied pre-sterilised. Not intended for clinical or diagnostic use. " +
      RUO_DISCLAIMER,
    tags: ["empty-vial", "sterile-container", "reconstitution-supply"],
    seoTitle: "Sterile 10ml Empty Vials — Laboratory Supplies | Cryogene Laboratories",
    seoDescription:
      "Sterile 10ml borosilicate-glass empty vials supplied for UK laboratory reconstitution and sample-storage work. Research use only.",
    faq: [
      {
        question: "What is the closure system on these vials?",
        answer:
          "Butyl-rubber stoppers sealed under an aluminium crimp cap. Compatible with standard laboratory crimping tools.",
      },
      RUO_FAQ,
    ],
  },

  "alcohol-prep-swabs": {
    shortDescription:
      "Individually wrapped 70% isopropyl alcohol prep swabs for laboratory surface preparation.",
    fullDescription:
      "Individually wrapped sterile swabs saturated with 70% isopropyl alcohol. Intended for laboratory surface cleaning, preparation of vial septa prior to piercing, and general aseptic technique in research settings.\n\nEach sachet is pre-sterilised. Not intended for clinical or personal-care use. " +
      RUO_DISCLAIMER,
    tags: ["alcohol-swab", "sterile-swab", "aseptic-technique"],
    seoTitle: "70% IPA Alcohol Prep Swabs — Laboratory Supplies | Cryogene Laboratories",
    seoDescription:
      "Individually wrapped 70% isopropyl alcohol prep swabs for UK laboratory aseptic technique. Research use only.",
    faq: [
      {
        question: "What alcohol concentration is in the swabs?",
        answer:
          "70% isopropyl alcohol (IPA) — the concentration referenced in standard laboratory aseptic protocols for surface decontamination.",
      },
      RUO_FAQ,
    ],
  },

  "nitrile-examination-gloves": {
    shortDescription:
      "Powder-free blue nitrile examination gloves for laboratory handling.",
    fullDescription:
      "Powder-free, latex-free blue nitrile examination gloves for laboratory research use. Available in small, medium and large sizes. Not intended for sterile-field or surgical use — supplied as laboratory consumables.\n\nBatch-lot traceability available on request. " +
      RUO_DISCLAIMER,
    tags: ["nitrile-glove", "laboratory-consumable", "powder-free"],
    seoTitle: "Nitrile Examination Gloves (Powder-Free) — Laboratory Supplies | Cryogene Laboratories",
    seoDescription:
      "Powder-free nitrile examination gloves supplied in S/M/L for UK laboratory research handling. Research use only.",
    faq: [
      {
        question: "Are these gloves latex-free?",
        answer:
          "Yes — 100% synthetic nitrile, powder-free, with no natural rubber latex content.",
      },
      RUO_FAQ,
    ],
  },

  "disposable-transfer-pipettes": {
    shortDescription:
      "Disposable graduated 3ml polyethylene transfer pipettes for laboratory liquid handling.",
    fullDescription:
      "Single-use graduated polyethylene transfer pipettes with a 3ml maximum draw volume. Intended for general liquid-handling work in the laboratory, including aliquoting, sample transfer, and reconstitution protocols.\n\nNot sterile unless specifically labelled. " +
      RUO_DISCLAIMER,
    tags: ["transfer-pipette", "disposable-pipette", "liquid-handling"],
    seoTitle: "3ml Disposable Transfer Pipettes — Laboratory Supplies | Cryogene Laboratories",
    seoDescription:
      "Graduated 3ml polyethylene transfer pipettes for UK laboratory liquid-handling. Research use only.",
    faq: [
      {
        question: "Are these pipettes graduated?",
        answer:
          "Yes — graduated up to 3ml to support semi-quantitative transfer and aliquoting.",
      },
      RUO_FAQ,
    ],
  },

  "ph-test-strips": {
    shortDescription:
      "Laboratory pH test strips (range 4.5–9.0) for semi-quantitative aqueous pH measurement.",
    fullDescription:
      "Laboratory pH test strips covering the 4.5–9.0 pH range with a colour-reference chart on the vial label. Intended for semi-quantitative pH measurement of aqueous laboratory solutions.\n\nFor higher-precision requirements, a calibrated pH meter is recommended. " +
      RUO_DISCLAIMER,
    tags: ["ph-strip", "laboratory-consumable", "semi-quantitative"],
    seoTitle: "pH Test Strips (4.5-9.0 Range) — Laboratory Supplies | Cryogene Laboratories",
    seoDescription:
      "Laboratory pH test strips covering 4.5-9.0 with colour reference chart for UK laboratory aqueous pH measurement. Research use only.",
    faq: [
      {
        question: "What is the precision of these strips?",
        answer:
          "Approximately ±0.5 pH units — appropriate for semi-quantitative work. Calibrated pH meters are recommended where higher precision is required.",
      },
      RUO_FAQ,
    ],
  },

  "sterile-syringe-filters": {
    shortDescription:
      "Sterile 0.22 µm PES syringe filters for laboratory sterile-filtration of aqueous solutions.",
    fullDescription:
      "Single-use sterile syringe filters with a 0.22 µm polyethersulfone (PES) membrane. Intended for laboratory sterile-filtration of aqueous research solutions, reconstitution of lyophilised reagents into sterile stocks, and general cell-culture media filtration.\n\nSterilised by gamma irradiation. " +
      RUO_DISCLAIMER,
    tags: ["syringe-filter", "sterile-filtration", "pes-membrane"],
    seoTitle: "0.22 µm PES Sterile Syringe Filters — Laboratory Supplies | Cryogene Laboratories",
    seoDescription:
      "Sterile 0.22 µm polyethersulfone syringe filters for UK laboratory sterile-filtration. Gamma-irradiated. Research use only.",
    faq: [
      {
        question: "What membrane chemistry do these filters use?",
        answer:
          "Polyethersulfone (PES) at 0.22 µm pore size — the standard for sterile-filtration of aqueous laboratory solutions, including cell-culture media.",
      },
      RUO_FAQ,
    ],
  },

  "laboratory-notebook": {
    shortDescription:
      "A5 hardback grid-ruled laboratory notebook with numbered pages and archival-quality paper.",
    fullDescription:
      "Hardback A5 laboratory notebook with 200 pre-numbered 5mm grid-ruled pages, sewn binding, and archival-quality paper suitable for ink and pencil. Intended for documenting research protocols, experimental observations, and calculations in accordance with standard good laboratory practice record-keeping.\n\nSupplied with a navy cover. " +
      RUO_DISCLAIMER,
    tags: ["laboratory-notebook", "glp-record-keeping", "a5-grid"],
    seoTitle: "A5 Laboratory Notebook (Grid-Ruled) — Laboratory Supplies | Cryogene Laboratories",
    seoDescription:
      "A5 hardback laboratory notebook with numbered pages and archival-quality paper for UK laboratory research record-keeping.",
    faq: [
      {
        question: "How many pages does the notebook contain?",
        answer:
          "200 pre-numbered pages, 5mm grid-ruled, sewn hardback binding. Appropriate for long-term GLP-style record-keeping of research protocols.",
      },
      RUO_FAQ,
    ],
  },
};
