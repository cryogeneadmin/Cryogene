export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <p className="label-editorial mb-4">About</p>
      <h1 className="text-5xl mb-8 leading-tight">Research supply, done carefully.</h1>
      <div className="text-[#333333] leading-relaxed space-y-6">
        <p className="text-xl">
          [DRAFT — TO BE ADAPTED BY SAM] We supply research-grade peptides,
          capsules, and laboratory mixers to researchers across the United
          Kingdom. Every product we sell is intended exclusively for controlled
          laboratory research and is supplied with a Certificate of Analysis.
        </p>
        <h2 className="text-3xl mt-12">Our approach</h2>
        <p>
          [DRAFT] We work with compounds that appear in current research
          literature, source them from manufacturers we have vetted for
          documentation and process quality, and verify purity before releasing
          any batch for sale. This section will be drafted in Plan 5 and
          reviewed by Sam&apos;s solicitor before launch.
        </p>
        <h2 className="text-3xl mt-12">Our testing process</h2>
        <p>
          [DRAFT] Every batch we receive is independently tested by HPLC (high-
          performance liquid chromatography) before being listed for sale. The
          Certificate of Analysis for each variant is available for download
          from its product page.
        </p>
        <h2 className="text-3xl mt-12">Our commitment to research use</h2>
        <p>
          [DRAFT] We do not sell products for human or veterinary consumption,
          and we do not provide dosage guidance, therapeutic claims, or
          application advice. Our customers are researchers; our role is to
          supply them with documented research-grade compounds.
        </p>
      </div>
    </div>
  );
}

export const metadata = {
  title: "About",
  description: "Who we are, our testing process, and our commitment to research use.",
};
