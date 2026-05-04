import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/types";
import { formatPriceFromPence } from "@/lib/basket";
import { RESEARCH_TAGS, TAG_SLUGS } from "@/data/research-tags";
import { ProductImageShell } from "./ProductImageShell";

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
  const href = `/${product.category}/${product.slug}`;
  const tags = (product.tags ?? []).filter((t) => TAG_SLUGS.has(t)).slice(0, 2);
  const descriptionId = `product-${product.id}-meta`;

  return (
    <article
      aria-labelledby={`product-${product.id}-name`}
      className="group block border border-border bg-white hover:border-navy focus-within:border-navy transition-colors"
    >
      <Link
        href={href}
        className="block relative aspect-square focus:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
        aria-describedby={descriptionId}
      >
        <ProductImageShell
          src={cardImage}
          alt={`${product.name} research ${product.category === "supplies" ? "supply" : "peptide"} vial`}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          padding="p-6"
        />
        {/* hover reveal: "View datasheet →" */}
        <span
          aria-hidden="true"
          className="absolute bottom-3 right-3 text-[11px] uppercase tracking-wider text-navy bg-white/90 border border-silver px-2 py-1 opacity-0 translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0"
        >
          View datasheet →
        </span>
      </Link>
      <div className="p-5 border-t border-border flex items-end gap-3" id={descriptionId}>
        <div className="flex-1 min-w-0">
          <h3
            id={`product-${product.id}-name`}
            className="font-serif text-xl text-navy leading-tight mb-1"
          >
            <Link href={href} className="hover:underline focus:outline-none focus-visible:underline">
              {product.name}
            </Link>
          </h3>
          <div className="flex items-center gap-2 mb-3">
            {product.casNumber && (
              <p className="mono text-xs text-muted">CAS {product.casNumber}</p>
            )}
            {product.composition && (
              <span className="label-editorial text-muted bg-offwhite border border-border px-1.5 py-0.5 text-[10px]">BLEND</span>
            )}
          </div>
          {tags.length > 0 && (
            <ul className="flex flex-wrap gap-1.5 mb-3 list-none p-0">
              {tags.map((t) => (
                <li key={t}>
                  <span className="inline-block text-[10px] uppercase tracking-wider bg-navy text-white px-2 py-0.5">
                    {TAG_LABEL[t] ?? t}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-body-grey">
              {pricingTbc ? "Pricing TBC" : `From ${formatPriceFromPence(lowestPriceVariant.priceInPence)}`}
            </span>
            <span className="label-editorial text-[11px]">
              {product.purity} purity
            </span>
          </div>
          {totalStock === 0 && (
            <p className="text-xs text-red-700 mt-2" role="status">Out of stock</p>
          )}
        </div>
        {product.moleculeImage && (
          <div
            aria-hidden="true"
            className="shrink-0 w-12 h-12 bg-offwhite border border-border p-1"
          >
            <Image
              src={product.moleculeImage}
              alt=""
              width={40}
              height={40}
              className="object-contain w-full h-full"
              unoptimized
            />
          </div>
        )}
      </div>
    </article>
  );
}
