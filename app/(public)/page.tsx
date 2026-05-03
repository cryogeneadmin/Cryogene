import Link from "next/link";
import Image from "next/image";
import { getProducts } from "@/lib/products";
import { ProductCard } from "@/components/storefront/products/ProductCard";
import { getConfig } from "@/lib/config";
import { buildOrganizationJsonLd, renderJsonLd } from "@/lib/seo";
import { RESEARCH_TAGS, TAG_SLUGS } from "@/data/research-tags";

export default async function HomePage() {
  const config = await getConfig();
  const orgJsonLd = buildOrganizationJsonLd(config);

  // Fetch once — derive both featured (newest 6) and the full active catalogue
  // for tag counts. Previously called getFeaturedProducts(6) AND getProducts()
  // separately; both hit the same cache entry so the double call was wasteful.
  const allActive = await getProducts({ activeOnly: true });
  const featured = [...allActive]
    .sort((a, b) => {
      const toMs = (v: unknown): number =>
        v instanceof Date ? v.getTime() :
        typeof v === "string" || typeof v === "number" ? new Date(v).getTime() : 0;
      return toMs(b.createdAt) - toMs(a.createdAt);
    })
    .slice(0, 6);
  const tagCount = new Map<string, number>();
  for (const p of allActive) {
    for (const t of p.tags ?? []) if (TAG_SLUGS.has(t)) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
  }
  const tagCloud = RESEARCH_TAGS
    .map((t) => ({ ...t, count: tagCount.get(t.slug) ?? 0 }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="pb-32">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(orgJsonLd) }}
      />
      {/* Hero */}
      <section className="max-w-[1280px] mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="label-editorial mb-4">UK Research Supply</p>
          <h1 className="text-5xl md:text-6xl leading-tight mb-6">
            Research-grade peptides,
            <br />
            documented to the batch.
          </h1>
          <p className="text-lg text-body-grey leading-relaxed mb-8 max-w-xl">
            HPLC-tested compounds with Certificate of Analysis available on
            request for every SKU. Supplied strictly for laboratory research use.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/peptides"
              className="px-8 py-3 bg-navy text-white uppercase tracking-wider text-sm hover:bg-mid-navy text-center"
            >
              Shop peptides
            </Link>
            <Link
              href="/about"
              className="px-8 py-3 border border-border text-navy uppercase tracking-wider text-sm hover:bg-offwhite text-center"
            >
              Our testing process
            </Link>
          </div>
        </div>
        <div className="relative aspect-square bg-offwhite border border-border">
          <Image
            src="/site/homepage-hero.png"
            alt="Clear glass research vial on a neutral background"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        </div>
      </section>

      {/* Research application tag cloud */}
      {tagCloud.length > 0 && (
        <section className="max-w-[1280px] mx-auto px-6 py-16 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-8 md:items-start">
            <div>
              <p className="label-editorial mb-3">Browse by Application</p>
              <h2 className="text-3xl text-navy leading-tight">
                Find compounds by the research area you work in.
              </h2>
              <p className="text-sm text-muted mt-4 max-w-sm">
                Every peptide in the catalogue is tagged by its primary research application.
                Click a tag to see the compounds studied in that area.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {tagCloud.map((t) => (
                <Link
                  key={t.slug}
                  href={`/peptides?tags=${t.slug}`}
                  className="group inline-flex items-center gap-2 bg-white border border-border px-4 py-2 hover:border-navy transition-colors"
                  title={t.description}
                >
                  <span className="text-sm text-navy group-hover:text-mid-navy">
                    {t.label}
                  </span>
                  <span className="text-xs text-gray-400 mono">{t.count}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="max-w-[1280px] mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { slug: "peptides", label: "Research Peptides", description: "HPLC-tested peptide compounds for laboratory research." },
            { slug: "mixers", label: "Mixers & Solvents", description: "Laboratory-grade bacteriostatic water and sterile saline." },
            { slug: "supplies", label: "Research Supplies", description: "Laboratory supplies and consumables with batch documentation." },
          ].map((cat) => (
            <Link
              key={cat.slug}
              href={`/${cat.slug}`}
              className="block bg-white border border-border p-8 hover:border-navy transition-colors"
            >
              <p className="label-editorial mb-3">Category</p>
              <h2 className="font-serif text-2xl text-navy mb-3">{cat.label}</h2>
              <p className="text-sm text-muted mb-4">{cat.description}</p>
              <p className="label-editorial text-navy">View all →</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Trust row */}
      <section className="bg-white border-y border-border py-12">
        <div className="max-w-[1280px] mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: "HPLC Tested", value: "Every batch" },
            { label: "≥99% Purity", value: "Documented on COA" },
            { label: "UK Research Grade", value: "Sourced and tested in Britain" },
            { label: "Certificate of Analysis", value: "Available on request for every SKU" },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <p className="label-editorial mb-2">{item.label}</p>
              <p className="text-sm text-muted">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="max-w-[1280px] mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl">Recently added</h2>
          <Link href="/peptides" className="label-editorial hover:text-navy">
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
        <p className="max-w-3xl mx-auto text-body-grey leading-relaxed mb-6">
          Every product sold on this site is intended exclusively for use in
          controlled laboratory research settings. A Certificate of Analysis
          is available on request for every batch so that the researchers who
          rely on our compounds have the documentation they need.
          None of our products is sold for human or veterinary consumption.
        </p>
        <Link href="/legal/research-use" className="label-editorial hover:text-navy">
          Read our research-use policy →
        </Link>
      </section>
    </div>
  );
}
