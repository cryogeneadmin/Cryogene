import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/types";
import { formatPriceFromPence } from "@/lib/basket";

export function ProductCard({ product }: { product: Product }) {
  const lowestPriceVariant = product.variants.reduce((lowest, v) =>
    v.priceInPence < lowest.priceInPence ? v : lowest
  );
  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
  const primaryImage = product.images[product.primaryImageIndex] ?? product.images[0];

  return (
    <Link
      href={`/${product.category}/${product.slug}`}
      className="group block border border-[#DDE1E7] bg-white hover:border-[#0D1B3E] transition-colors"
    >
      <div className="relative aspect-square bg-[#F7F8FA] overflow-hidden">
        {primaryImage && (
          <Image
            src={primaryImage}
            alt={`${product.name} research peptide ${lowestPriceVariant.size} vial`}
            fill
            className="object-contain p-6"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized
          />
        )}
      </div>
      <div className="p-5 border-t border-[#DDE1E7]">
        <h3 className="font-serif text-xl text-[#0D1B3E] leading-tight mb-1">
          {product.name}
        </h3>
        <p className="font-mono text-[11px] text-[#6B7280] mb-3">
          CAS {product.casNumber}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#333333]">
            From {formatPriceFromPence(lowestPriceVariant.priceInPence)}
          </span>
          <span className="label-editorial text-[11px]">
            {product.purity} purity
          </span>
        </div>
        {totalStock === 0 && (
          <p className="text-xs text-red-700 mt-2">Out of stock</p>
        )}
      </div>
    </Link>
  );
}
