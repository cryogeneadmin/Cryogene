import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/types";
import { formatPriceFromPence } from "@/lib/basket";
import { RESEARCH_TAGS, TAG_SLUGS } from "@/data/research-tags";

const TAG_LABEL: Record<string, string> = Object.fromEntries(
  RESEARCH_TAGS.map((t) => [t.slug, t.label]),
);

export function ProductCard({ product }: { product: Product }) {
  const activeVariants = product.variants.filter((v) => v.active);
  const variantsForPrice = activeVariants.length > 0 ? activeVariants : product.variants;
  const lowestPriceVariant = variantsForPrice.reduce((lowest, v) =>
    v.priceInPence < lowest.priceInPence ? v : lowest
  );
  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
  const cardImage =
    product.images[product.primaryImageIndex] ?? product.images[0] ?? "/placeholder-vial.svg";
  const pricingTbc = lowestPriceVariant.priceInPence === 0;

  return (
    <Link
      href={`/${product.category}/${product.slug}`}
      className="group block border border-[#DDE1E7] bg-white hover:border-[#0D1B3E] transition-colors"
    >
      <div className="relative aspect-square bg-[#F7F8FA] overflow-hidden">
        <Image
          src={cardImage}
          alt={`${product.name} research ${product.category === "supplies" ? "supply" : "peptide"} vial`}
          fill
          className="object-contain p-6"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          unoptimized
        />
      </div>
      <div className="p-5 border-t border-[#DDE1E7] flex items-end gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-xl text-[#0D1B3E] leading-tight mb-1">
            {product.name}
          </h3>
          <div className="flex items-center gap-2 mb-3">
            {product.casNumber && (
              <p className="mono text-xs text-[#9CA3AF]">CAS {product.casNumber}</p>
            )}
            {product.composition && (
              <span className="label-editorial text-[#6B7280] bg-[#F7F8FA] border border-[#DDE1E7] px-1.5 py-0.5 text-[10px]">BLEND</span>
            )}
          </div>
          {(() => {
            const tags = (product.tags ?? []).filter((t) => TAG_SLUGS.has(t)).slice(0, 2);
            if (tags.length === 0) return null;
            return (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-block text-[10px] uppercase tracking-wider bg-[#0D1B3E] text-white px-2 py-0.5"
                  >
                    {TAG_LABEL[t] ?? t}
                  </span>
                ))}
              </div>
            );
          })()}
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#333333]">
              {pricingTbc ? "Pricing TBC" : `From ${formatPriceFromPence(lowestPriceVariant.priceInPence)}`}
            </span>
            <span className="label-editorial text-[11px]">
              {product.purity} purity
            </span>
          </div>
          {totalStock === 0 && (
            <p className="text-xs text-red-700 mt-2">Out of stock</p>
          )}
        </div>
        {product.moleculeImage && (
          <div className="shrink-0 w-12 h-12 bg-gradient-to-br from-[#F0F4FA] via-[#E6ECF5] to-[#CAD4E4] border border-[#DDE1E7] rounded-sm shadow-[0_4px_10px_-2px_rgba(13,27,62,0.25)] p-1">
            <Image
              src={product.moleculeImage}
              alt=""
              width={40}
              height={40}
              className="object-contain w-full h-full"
              unoptimized
              aria-hidden="true"
            />
          </div>
        )}
      </div>
    </Link>
  );
}
