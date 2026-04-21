import Image from "next/image";

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <p className="label-editorial mb-4">About</p>
      <h1 className="text-5xl mb-6 leading-tight">Research supply, done carefully.</h1>

      <div className="relative aspect-[16/9] bg-[#F7F8FA] border border-[#DDE1E7] overflow-hidden mb-12">
        <Image
          src="/site/about-lab.png"
          alt="Laboratory bench with HPLC instrument and glass vials"
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 768px"
        />
      </div>

      <div className="prose prose-lg max-w-none text-[#333333] leading-relaxed space-y-6">
        <p className="text-xl">
          [DRAFT — REVIEW AND ADAPT] We supply research-grade peptides and
          laboratory mixers to researchers across the United Kingdom. Every
          product we sell is supplied exclusively for controlled laboratory
          research, accompanied by a Certificate of Analysis, and backed by a
          transparent approach to sourcing and testing.
        </p>

        <h2 className="text-3xl mt-12">Our approach</h2>
        <p>
          [DRAFT — REVIEW AND ADAPT] We work with compounds that appear in
          current research literature, source them from manufacturers we have
          vetted for documentation and process quality, and independently verify
          purity before any batch is released for sale. We publish the
          Certificate of Analysis for every variant on its product page so that
          researchers can review the data before they order.
        </p>

        <h2 className="text-3xl mt-12">Our testing process</h2>
        <p>
          [DRAFT — REVIEW AND ADAPT] Every batch we receive is independently
          tested by high-performance liquid chromatography (HPLC) before being
          listed for sale. HPLC separates the compounds in a sample so that
          purity can be measured against a known reference. Our Certificates of
          Analysis report the HPLC trace, the measured purity percentage, and
          the batch identifier so that each order can be traced back to the
          specific test that was performed on the material supplied.
        </p>

        <h2 className="text-3xl mt-12">Our commitment to research use</h2>
        <p>
          [DRAFT — REVIEW AND ADAPT] We do not sell products for human or
          veterinary consumption, and we do not provide dosage guidance,
          therapeutic claims, or application advice. Our customers are
          researchers and laboratory professionals; our role is to supply them
          with documented research-grade compounds and the paperwork that
          accompanies them. Every order placed on this site must be confirmed
          as intended for laboratory research use before it is accepted.
        </p>

        <h2 className="text-3xl mt-12">Why documentation matters</h2>
        <p>
          [DRAFT — REVIEW AND ADAPT] In research, the compound is only as good
          as the documentation that accompanies it. A Certificate of Analysis is
          a standard piece of laboratory paperwork that records the purity,
          testing method, batch, and reference standards used in analysis. We
          treat the COA as a first-class product alongside the compound itself,
          and we make it downloadable from every product page so that
          researchers have access to the data whenever they need it.
        </p>
      </div>
    </div>
  );
}

export const metadata = {
  title: "About",
  description:
    "Who we are, our approach to research supply, our testing process, and our commitment to research use.",
};
