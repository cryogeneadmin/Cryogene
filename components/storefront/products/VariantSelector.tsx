// components/storefront/products/VariantSelector.tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Product, ProductVariant } from "@/types";
import { useBasket, formatPriceFromPence } from "@/lib/basket";

export function VariantSelector({ product }: { product: Product }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { addItem, openDrawer } = useBasket();

  const initialSize = searchParams.get("size");
  const initialVariant =
    product.variants.find((v) => v.size === initialSize && v.active) ??
    product.variants.find((v) => v.active) ??
    product.variants[0];

  const [selectedSku, setSelectedSku] = useState<string>(initialVariant.sku);
  const selected: ProductVariant =
    product.variants.find((v) => v.sku === selectedSku) ?? initialVariant;

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (selected.size !== searchParams.get("size")) {
      params.set("size", selected.size);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [selected.size, router, pathname, searchParams]);

  const handleAdd = () => {
    addItem(product, selected.sku, 1);
    openDrawer();
  };

  const outOfStock = selected.stock === 0;
  const pricingTbc = selected.priceInPence === 0;

  const radioRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectableIndices = product.variants
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => v.active && v.stock > 0)
    .map(({ i }) => i);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, currentIdx: number) => {
      const pos = selectableIndices.indexOf(currentIdx);
      if (pos === -1) return;
      let next = pos;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (pos + 1) % selectableIndices.length;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (pos - 1 + selectableIndices.length) % selectableIndices.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = selectableIndices.length - 1;
      else return;
      e.preventDefault();
      const targetIdx = selectableIndices[next];
      const targetVariant = product.variants[targetIdx];
      setSelectedSku(targetVariant.sku);
      radioRefs.current[targetIdx]?.focus();
    },
    [product.variants, selectableIndices],
  );

  return (
    <div className="space-y-6">
      <div>
        <p id={`${product.id}-size-label`} className="label-editorial mb-2">Size</p>
        <div
          role="radiogroup"
          aria-labelledby={`${product.id}-size-label`}
          className="flex flex-wrap gap-2"
        >
          {product.variants.map((variant, idx) => {
            const isSelected = variant.sku === selectedSku;
            const unavailable = !variant.active || variant.stock === 0;
            return (
              <button
                key={variant.sku}
                ref={(el) => { radioRefs.current[idx] = el; }}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-disabled={unavailable || undefined}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => !unavailable && setSelectedSku(variant.sku)}
                onKeyDown={(e) => !unavailable && handleKeyDown(e, idx)}
                disabled={unavailable}
                className={`px-5 py-2 border text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-1 ${
                  isSelected
                    ? "bg-navy text-white border-navy"
                    : unavailable
                    ? "border-border text-muted line-through cursor-not-allowed"
                    : "border-border hover:border-navy"
                }`}
              >
                {variant.size}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="text-3xl font-medium text-navy">
          {pricingTbc ? "Pricing TBC" : formatPriceFromPence(selected.priceInPence)}
        </p>
        {selected.stock > 0 && selected.stock <= 5 && (
          <p className="text-xs text-amber-700 mt-1">
            Low stock — {selected.stock} remaining
          </p>
        )}
        {outOfStock && (
          <p className="text-xs text-red-700 mt-1">Out of stock</p>
        )}
      </div>
      <button
        type="button"
        onClick={handleAdd}
        disabled={outOfStock || pricingTbc}
        className="w-full py-4 bg-navy text-white uppercase tracking-wider text-sm hover:bg-mid-navy disabled:bg-muted disabled:cursor-not-allowed"
      >
        {pricingTbc ? "Pricing to be confirmed" : outOfStock ? "Out of stock" : "Add to basket"}
      </button>
      {selected.coaUrl && (
        <a
          href={selected.coaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-3 border border-border text-center uppercase tracking-wider text-xs hover:bg-offwhite"
        >
          Download Certificate of Analysis
        </a>
      )}
    </div>
  );
}
