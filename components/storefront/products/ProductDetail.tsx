import Link from "next/link";
import Image from "next/image";
import type { Product, ProductCategory } from "@/types";
import { VariantSelector } from "./VariantSelector";
import { ResearchDisclaimerCallout } from "./ResearchDisclaimerCallout";
import { ProductFAQ } from "./ProductFAQ";
import { ProductCard } from "./ProductCard";
import { BlendedProductComposition } from "./BlendedProductComposition";
import { getProducts } from "@/lib/products";

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

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-12">
      <nav aria-label="Breadcrumb" className="label-editorial mb-6">
        <Link href="/" className="hover:text-[#0D1B3E]">Home</Link>
        <span className="mx-2">/</span>
        <Link href={`/${product.category}`} className="hover:text-[#0D1B3E]">
          {categoryLabel}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[#0D1B3E]">{product.name}</span>
      </nav>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <div className="border border-[#DDE1E7] bg-[#F7F8FA] p-12 flex items-center justify-center aspect-square">
            {product.moleculeImage ? (
              <Image
                src={product.moleculeImage}
                alt={`${product.name} molecular structure`}
                width={600}
                height={600}
                className="object-contain w-full h-full"
                priority
                unoptimized
              />
            ) : primaryImage ? (
              <Image
                src={primaryImage}
                alt={`${product.name} research peptide vial`}
                width={600}
                height={600}
                className="object-contain w-full h-full"
                priority
                unoptimized
              />
            ) : null}
          </div>
        </div>
        <div>
          <p className="label-editorial mb-2">{categoryLabel}</p>
          <h1 className="text-5xl leading-tight mb-4">{product.name}</h1>
          {(product.casNumber || product.molecularFormula || product.molecularWeight) && (
            <p className="font-mono text-sm text-[#6B7280] mb-6">
              {[
                product.casNumber ? `CAS ${product.casNumber}` : null,
                product.molecularFormula,
                product.molecularWeight,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          <div className="flex gap-3 mb-8">
            {product.purity && (
              <div className="px-3 py-1 border border-[#DDE1E7]">
                <p className="label-editorial text-[10px] mb-0.5">Purity</p>
                <p className="text-sm">{product.purity}</p>
              </div>
            )}
            {product.testingMethod && (
              <div className="px-3 py-1 border border-[#DDE1E7]">
                <p className="label-editorial text-[10px] mb-0.5">Tested</p>
                <p className="text-sm">{product.testingMethod}</p>
              </div>
            )}
          </div>
          {product.composition && product.composition.length > 0 && (
            <BlendedProductComposition composition={product.composition} />
          )}
          <VariantSelector product={product} />
          <ResearchDisclaimerCallout />
        </div>
      </div>

      <section className="mt-16 max-w-3xl">
        <h2 className="text-3xl mb-6">About {product.name}</h2>
        <div className="prose prose-lg max-w-none text-[#333333] leading-relaxed">
          {product.fullDescription.split("\n\n").map((para, i) => (
            <p key={i} className="mb-4">{para}</p>
          ))}
        </div>
      </section>

      <section className="mt-16 max-w-3xl">
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

      <ProductFAQ items={product.faq} />

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
