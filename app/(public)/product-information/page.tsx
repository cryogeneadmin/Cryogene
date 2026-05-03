export default function ProductInformationPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <p className="label-editorial mb-4">Product Information</p>
      <h1 className="text-5xl mb-10 leading-tight">Understanding our products and testing.</h1>

      <div className="prose prose-lg max-w-none text-body-grey leading-relaxed space-y-6">

        <p className="text-xl">
          [DRAFT — REVIEW AND ADAPT] This page explains the categories of
          products we supply, how HPLC testing works, how to read a Certificate
          of Analysis, what research use only means in practice, and how our
          products are labelled and packaged.
        </p>

        <h2 className="text-3xl mt-12">Product categories</h2>
        <p>
          [DRAFT — REVIEW AND ADAPT] We supply three categories of research
          products. <strong>Research peptides</strong> are short-chain amino
          acid sequences that appear in published scientific literature across
          a range of research contexts. Each peptide we supply is independently
          tested and accompanied by a Certificate of Analysis. <strong>Laboratory
          mixers and solvents</strong> include bacteriostatic water and other
          standard reconstitution media used in peptide research. These are
          standard laboratory reagents supplied in sterile, sealed vials.
        </p>

        <h2 className="text-3xl mt-12">How HPLC testing works</h2>
        <p>
          [DRAFT — REVIEW AND ADAPT] High-performance liquid chromatography
          (HPLC) is an analytical technique used to separate, identify, and
          quantify the components of a mixture. In peptide analysis, a sample
          is dissolved in a mobile phase and pumped under pressure through a
          column packed with a stationary phase material. The components of the
          sample interact differently with the stationary phase and so elute
          from the column at different times — a property that allows them to
          be detected and quantified by a UV detector downstream.
        </p>
        <p>
          [DRAFT — REVIEW AND ADAPT] The result of an HPLC analysis is a
          chromatogram: a graph of detector response against time. Each peak
          on the chromatogram corresponds to a compound in the sample. The
          area under the target peptide peak, expressed as a percentage of
          all detected peak areas, is the measured purity. We require a minimum
          purity of 99% HPLC before a batch is listed for sale.
        </p>

        <h2 className="text-3xl mt-12">How to read a Certificate of Analysis</h2>
        <p>
          [DRAFT — REVIEW AND ADAPT] A Certificate of Analysis (COA) is a
          laboratory document that records the results of analytical testing
          performed on a specific batch of a compound. Our COAs include the
          following fields:
        </p>
        <ul>
          <li><strong>Product name and synonyms</strong> — the compound name and any common alternative names.</li>
          <li><strong>CAS number</strong> — the unique Chemical Abstracts Service identifier for the compound.</li>
          <li><strong>Batch identifier</strong> — a unique reference that links this COA to the specific batch tested.</li>
          <li><strong>Testing method</strong> — the analytical method used, typically HPLC or HPLC-MS.</li>
          <li><strong>Purity result</strong> — the measured purity percentage by the stated method.</li>
          <li><strong>Date of testing</strong> — the date the analysis was performed.</li>
          <li><strong>Appearance</strong> — the physical form of the material (typically white to off-white lyophilised powder).</li>
        </ul>
        <p>
          [DRAFT — REVIEW AND ADAPT] Every COA we publish is specific to a
          particular batch. When you download a COA from a product page, you
          are downloading the documentation for the specific batch currently
          available for that variant. The batch identifier on the COA should
          match the batch identifier on the label of the vial you receive.
        </p>

        <h2 className="text-3xl mt-12">What research use only means in practice</h2>
        <p>
          [DRAFT — REVIEW AND ADAPT] Every product on this site is supplied
          exclusively for controlled laboratory research. This means that the
          products are not intended for administration to humans or animals in
          any form, and we do not make any claims about their safety or efficacy
          for therapeutic purposes. Placing an order on this site constitutes
          confirmation that you are purchasing the products for laboratory
          research use and that you are eighteen years of age or older.
        </p>
        <p>
          [DRAFT — REVIEW AND ADAPT] We do not provide dosage guidance,
          reconstitution volumes, or any information that could be interpreted
          as instructions for human or animal use. We do not provide medical
          advice. If you have a medical question, please consult a qualified
          healthcare professional.
        </p>

        <h2 className="text-3xl mt-12">Labelling and storage</h2>
        <p>
          [DRAFT — REVIEW AND ADAPT] All products are supplied in sealed vials
          labelled with the product name, batch identifier, quantity, and a
          research use only statement. Peptides are supplied as lyophilised
          (freeze-dried) powder. Unless otherwise stated on the product page,
          we recommend storing peptides at −20°C for long-term storage and at
          4°C once reconstituted, for use within a short period consistent with
          your laboratory protocol. Storage recommendations on the product page
          take precedence over these general guidelines.
        </p>

        <h2 className="text-3xl mt-12">Damaged or incorrect products</h2>
        <p>
          [DRAFT — REVIEW AND ADAPT] If you receive a product that appears
          damaged in transit, or if you believe you have received an incorrect
          item, please contact us within 48 hours of receipt with photographic
          evidence and your order number. Please retain all original packaging.
          We will investigate and respond within one working day. See our{" "}
          <a href="/legal/refunds" className="text-navy underline">Refund and Returns Policy</a>{" "}
          for full details.
        </p>

      </div>
    </div>
  );
}

export const metadata = {
  title: "Product Information",
  description:
    "Product categories, HPLC testing explained, how to read a Certificate of Analysis, research use only policy, labelling and storage guidance.",
};
