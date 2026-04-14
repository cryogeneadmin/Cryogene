import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/types";
import { VariantSelector } from "./VariantSelector";
import { ResearchDisclaimerCallout } from "./ResearchDisclaimerCallout";
import { ProductFAQ } from "./ProductFAQ";
import { ProductCard } from "./ProductCard";
import { getProducts } from "@/lib/products";

export async function ProductDetail({ product }: { product: Product }) {
  const primaryImage = product.images[product.primaryImageIndex] ?? product.images[0];
  const categoryLabel =
    product.category === "peptides"
      ? "Research Peptides"
      : product.category === "supplies"
      ? "Research Supplies"
      : "Mixers & Solvents";

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
          <div className="relative aspect-square bg-[#F7F8FA] border border-[#DDE1E7]">
            {primaryImage && (
              <Image
                src={primaryImage}
                alt={`${product.name} research peptide vial`}
                fill
                className="object-contain p-12"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
                unoptimized
              />
            )}
          </div>
        </div>
        <div>
          <p className="label-editorial mb-2">{categoryLabel}</p>
          <h1 className="text-5xl leading-tight mb-4">{product.name}</h1>
          <p className="font-mono text-sm text-[#6B7280] mb-6">
            CAS {product.casNumber} · {product.molecularFormula} · {product.molecularWeight}
          </p>
          <div className="flex gap-3 mb-8">
            <div className="px-3 py-1 border border-[#DDE1E7]">
              <p className="label-editorial text-[10px] mb-0.5">Purity</p>
              <p className="text-sm">{product.purity}</p>
            </div>
            <div className="px-3 py-1 border border-[#DDE1E7]">
              <p className="label-editorial text-[10px] mb-0.5">Tested</p>
              <p className="text-sm">{product.testingMethod}</p>
            </div>
          </div>
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
          <div><dt className="label-editorial">CAS Number</dt><dd className="font-mono">{product.casNumber}</dd></div>
          <div><dt className="label-editorial">Molecular Formula</dt><dd className="font-mono">{product.molecularFormula}</dd></div>
          <div><dt className="label-editorial">Molecular Weight</dt><dd className="font-mono">{product.molecularWeight}</dd></div>
          <div><dt className="label-editorial">Purity</dt><dd>{product.purity}</dd></div>
          <div><dt className="label-editorial">Testing Method</dt><dd>{product.testingMethod}</dd></div>
          {product.synonyms.length > 0 && (
            <div className="sm:col-span-2"><dt className="label-editorial">Synonyms</dt><dd>{product.synonyms.join(", ")}</dd></div>
          )}
        </dl>
      </section>

      <ProductFAQ items={product.faq} />

      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="text-3xl mb-8">Other research peptides</h2>
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
