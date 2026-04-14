import Link from "next/link";
import Image from "next/image";
import { getFeaturedProducts } from "@/lib/products";
import { ProductCard } from "@/components/storefront/products/ProductCard";

export default async function HomePage() {
  const featured = await getFeaturedProducts(6);

  return (
    <div className="pb-32">
      {/* Hero */}
      <section className="max-w-[1280px] mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="label-editorial mb-4">UK Research Supply</p>
          <h1 className="text-5xl md:text-6xl leading-tight mb-6">
            Research-grade peptides,
            <br />
            documented to the batch.
          </h1>
          <p className="text-lg text-[#333333] leading-relaxed mb-8 max-w-xl">
            HPLC-tested compounds with a downloadable Certificate of Analysis
            for every SKU. Supplied strictly for laboratory research use.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/peptides"
              className="px-8 py-3 bg-[#0D1B3E] text-white uppercase tracking-wider text-sm hover:bg-[#162040] text-center"
            >
              Shop peptides
            </Link>
            <Link
              href="/about"
              className="px-8 py-3 border border-[#DDE1E7] text-[#0D1B3E] uppercase tracking-wider text-sm hover:bg-[#F7F8FA] text-center"
            >
              Our testing process
            </Link>
          </div>
        </div>
        <div className="relative aspect-square bg-[#F7F8FA] border border-[#DDE1E7]">
          <Image
            src="/placeholder-vial.svg"
            alt="Research peptide vial on white background"
            fill
            className="object-contain p-16"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
            unoptimized
          />
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-[1280px] mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { slug: "peptides", label: "Research Peptides", description: "HPLC-tested peptide compounds for laboratory research." },
            { slug: "capsules", label: "Research Capsules", description: "Encapsulated formulations supplied with batch documentation." },
            { slug: "mixers", label: "Mixers & Solvents", description: "Laboratory-grade bacteriostatic water and sterile saline." },
          ].map((cat) => (
            <Link
              key={cat.slug}
              href={`/${cat.slug}`}
              className="block bg-white border border-[#DDE1E7] p-8 hover:border-[#0D1B3E] transition-colors"
            >
              <p className="label-editorial mb-3">Category</p>
              <h2 className="font-serif text-2xl text-[#0D1B3E] mb-3">{cat.label}</h2>
              <p className="text-sm text-[#6B7280] mb-4">{cat.description}</p>
              <p className="label-editorial text-[#0D1B3E]">View all →</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Trust row */}
      <section className="bg-white border-y border-[#DDE1E7] py-12">
        <div className="max-w-[1280px] mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: "HPLC Tested", value: "Every batch" },
            { label: "≥98% Purity", value: "Documented on COA" },
            { label: "UK Research Grade", value: "Sourced and tested in Britain" },
            { label: "Certificate of Analysis", value: "Downloadable for every SKU" },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <p className="label-editorial mb-2">{item.label}</p>
              <p className="text-sm text-[#6B7280]">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="max-w-[1280px] mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl">Recently added</h2>
          <Link href="/peptides" className="label-editorial hover:text-[#0D1B3E]">
            View all peptides →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Research framing */}
      <section className="max-w-[1280px] mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl mb-6">Supplied for research. Documented for rigour.</h2>
        <p className="max-w-3xl mx-auto text-[#333333] leading-relaxed mb-6">
          Every product sold on this site is intended exclusively for use in
          controlled laboratory research settings. We publish a Certificate of
          Analysis for every batch, supplied with every order, so that the
          researchers who rely on our compounds have the documentation they need.
          None of our products is sold for human or veterinary consumption.
        </p>
        <Link href="/legal/research-use" className="label-editorial hover:text-[#0D1B3E]">
          Read our research-use policy →
        </Link>
      </section>
    </div>
  );
}
