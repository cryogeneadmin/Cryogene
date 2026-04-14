export default function ProductInformationPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <p className="label-editorial mb-4">Product Information</p>
      <h1 className="text-5xl mb-8 leading-tight">Product information and labelling</h1>
      <div className="text-[#333333] leading-relaxed space-y-6">
        <p className="text-xl">
          [DRAFT — TO BE FULLY WRITTEN IN PLAN 5] This page explains our
          product categories, testing standards, how to read a Certificate of
          Analysis, and what &quot;research use only&quot; means in practice.
        </p>
        <h2 className="text-3xl mt-12">Product categories</h2>
        <p>[DRAFT] Peptides, capsules, and mixers explained.</p>
        <h2 className="text-3xl mt-12">How HPLC testing works</h2>
        <p>[DRAFT] High-performance liquid chromatography overview.</p>
        <h2 className="text-3xl mt-12">How to read a Certificate of Analysis</h2>
        <p>[DRAFT] Fields on a COA and what each means.</p>
        <h2 className="text-3xl mt-12">What &quot;research use only&quot; means</h2>
        <p>[DRAFT] The legal framework and our position.</p>
      </div>
    </div>
  );
}

export const metadata = {
  title: "Product Information",
  description:
    "Product categories, testing standards, how to read a Certificate of Analysis, and what research use only means.",
};
