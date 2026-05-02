import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Product, ProductCategory } from "@/types";
import { VariantSelector } from "./VariantSelector";
import { ResearchDisclaimerCallout } from "./ResearchDisclaimerCallout";
import { ProductFAQ } from "./ProductFAQ";
import { ProductCard } from "./ProductCard";
import { BlendedProductComposition } from "./BlendedProductComposition";
import { CompoundStatsBar } from "./CompoundStatsBar";
import { StorageHandlingPanel } from "./StorageHandlingPanel";
import { ProductAnchorNav } from "./ProductAnchorNav";
import { getProducts } from "@/lib/products";
import { getConfig } from "@/lib/config";
import { RESEARCH_TAGS, TAG_SLUGS } from "@/data/research-tags";

const TAG_LABEL: Record<string, string> = Object.fromEntries(
  RESEARCH_TAGS.map((t) => [t.slug, t.label]),
);
import {
  buildProductJsonLd,
  buildFaqJsonLd,
  buildBreadcrumbJsonLd,
  renderJsonLd,
} from "@/lib/seo";

function getCategoryLabel(category: ProductCategory): string {
  switch (category) {
    case "peptides": return "Research Peptides";
    case "supplies": return "Research Supplies";
    case "mixers": return "Mixers & Solvents";
  }
}

export async function ProductDetail({ product }: { product: Product }) {
  const primaryImage = product.images[product.primaryImageIndex] ?? product.images[0];
  const categoryLabel = getCategoryLabel(product.category);

  const related = (await getProducts({ category: product.category, activeOnly: true }))
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  const config = await getConfig();
  const productJsonLd = buildProductJsonLd(product, config);
  const faqJsonLd = buildFaqJsonLd(product.faq);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: categoryLabel, url: `/${product.category}` },
    { name: product.name, url: `/${product.category}/${product.slug}` },
  ]);

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(productJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: renderJsonLd(faqJsonLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: renderJsonLd(breadcrumbJsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="label-editorial mb-6">
        <Link href="/" className="hover:text-[#0D1B3E]">Home</Link>
        <svg aria-hidden="true" viewBox="0 0 8 12" className="inline-block w-2 h-3 mx-2 text-[#C0C8D8]"><path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
        <Link href={`/${product.category}`} className="hover:text-[#0D1B3E]">
          {categoryLabel}
        </Link>
        <svg aria-hidden="true" viewBox="0 0 8 12" className="inline-block w-2 h-3 mx-2 text-[#C0C8D8]"><path d="M1 1l5 5-5 5" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
        <span className="text-[#0D1B3E]" aria-current="page">{product.name}</span>
      </nav>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="md:sticky md:top-28 self-start">
          <div className="border border-[#DDE1E7] bg-[#F7F8FA] p-12 flex items-center justify-center aspect-square">
            <Image
              src={primaryImage ?? "/placeholder-vial.svg"}
              alt={`${product.name} research ${product.category === "supplies" ? "supply" : "peptide"} vial`}
              width={600}
              height={600}
              className="object-contain w-full h-full"
              priority
              unoptimized
            />
          </div>
        </div>
        <div>
          <p className="label-editorial mb-2">{categoryLabel}</p>
          <h1 className="text-5xl leading-tight mb-4">{product.name}</h1>
          {(() => {
            const tags = (product.tags ?? []).filter((t) => TAG_SLUGS.has(t));
            if (tags.length === 0) return null;
            return (
              <div className="flex flex-wrap gap-2 mb-6">
                {tags.map((t) => (
                  <Link
                    key={t}
                    href={`/${product.category}?tags=${t}`}
                    className="inline-block text-xs uppercase tracking-wider bg-[#0D1B3E] text-white px-3 py-1 hover:bg-[#162040]"
                  >
                    {TAG_LABEL[t] ?? t}
                  </Link>
                ))}
              </div>
            );
          })()}

          <CompoundStatsBar product={product} />
          <StorageHandlingPanel product={product} />
          {product.moleculeImage && (
            <div className="flex items-center gap-5 mb-6">
              <div className="shrink-0 bg-gradient-to-br from-[#F0F4FA] via-[#E6ECF5] to-[#CAD4E4] border border-[#DDE1E7] rounded-sm shadow-[0_8px_20px_-6px_rgba(13,27,62,0.3)] p-2">
                <Image
                  src={product.moleculeImage}
                  alt={`${product.name} molecular structure`}
                  width={144}
                  height={144}
                  className="object-contain w-36 h-36 drop-shadow-md"
                  unoptimized
                />
              </div>
              {product.testingMethod && (
                <p className="font-mono text-xs uppercase tracking-wider text-[#6B7280]">
                  Tested by {product.testingMethod}
                </p>
              )}
            </div>
          )}
          {product.composition && product.composition.length > 0 && (
            <BlendedProductComposition composition={product.composition} />
          )}
          <Suspense>
            <VariantSelector product={product} />
          </Suspense>
          <ResearchDisclaimerCallout />
        </div>
      </div>

      <ProductAnchorNav
        anchors={[
          { id: "overview", label: "Overview" },
          { id: "chemistry", label: "Chemistry" },
          ...(product.composition && product.composition.length > 0
            ? [{ id: "composition", label: "Composition" }]
            : []),
          ...(product.faq && product.faq.length > 0
            ? [{ id: "faq", label: "FAQ" }]
            : []),
        ]}
      />

      <section id="overview" className="mt-16 max-w-3xl scroll-mt-40">
        <h2 className="text-3xl mb-6">About {product.name}</h2>
        <div className="prose prose-lg max-w-none text-[#333333] leading-relaxed">
          {product.fullDescription.split("\n\n").map((para, i) => (
            <p key={i} className="mb-4">{para}</p>
          ))}
        </div>
      </section>

      <section id="chemistry" className="mt-16 max-w-3xl scroll-mt-40">
        <h2 className="text-3xl mb-6">Chemical information</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 border-t border-[#DDE1E7] pt-6">
          {product.casNumber && (
            <div><dt className="label-editorial">CAS Number</dt><dd className="font-mono">{product.casNumber}</dd></div>
          )}
          {product.molecularFormula && (
            <div><dt className="label-editorial">Molecular Formula</dt><dd className="font-mono">{product.molecularFormula}</dd></div>
          )}
          {product.molecularWeight && (
            <div><dt className="label-editorial">Molecular Weight</dt><dd className="font-mono">{product.molecularWeight}</dd></div>
          )}
          {product.purity && (
            <div><dt className="label-editorial">Purity</dt><dd>{product.purity}</dd></div>
          )}
          {product.testingMethod && (
            <div><dt className="label-editorial">Testing Method</dt><dd>{product.testingMethod}</dd></div>
          )}
          {product.synonyms.length > 0 && (
            <div className="sm:col-span-2"><dt className="label-editorial">Synonyms</dt><dd>{product.synonyms.join(", ")}</dd></div>
          )}
        </dl>
        {product.pubchemCid && (
          <a
            href={`https://pubchem.ncbi.nlm.nih.gov/compound/${product.pubchemCid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#6B7280] underline hover:text-[#0D1B3E] inline-block mt-2"
          >
            View on PubChem &rarr;
          </a>
        )}
      </section>

      <div id="composition" className="scroll-mt-40">
        {/* composition anchor target — BlendedProductComposition renders within the right column above */}
      </div>
      <div id="faq" className="scroll-mt-40">
        <ProductFAQ items={product.faq} />
      </div>

      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="text-3xl mb-8">Other {getCategoryLabel(product.category).toLowerCase()}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
