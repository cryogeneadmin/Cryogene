// components/storefront/products/VariantSelector.tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

  return (
    <div className="space-y-6">
      <div>
        <p className="label-editorial mb-2">Size</p>
        <div className="flex flex-wrap gap-2">
          {product.variants.map((variant) => {
            const isSelected = variant.sku === selectedSku;
            const unavailable = !variant.active || variant.stock === 0;
            return (
              <button
                key={variant.sku}
                type="button"
                onClick={() => !unavailable && setSelectedSku(variant.sku)}
                disabled={unavailable}
                className={`px-5 py-2 border text-sm transition-colors ${
                  isSelected
                    ? "bg-[#0D1B3E] text-white border-[#0D1B3E]"
                    : unavailable
                    ? "border-[#DDE1E7] text-[#6B7280] line-through cursor-not-allowed"
                    : "border-[#DDE1E7] hover:border-[#0D1B3E]"
                }`}
                aria-pressed={isSelected}
              >
                {variant.size}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="text-3xl font-medium text-[#0D1B3E]">
          {formatPriceFromPence(selected.priceInPence)}
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
        disabled={outOfStock}
        className="w-full py-4 bg-[#0D1B3E] text-white uppercase tracking-wider text-sm hover:bg-[#162040] disabled:bg-[#6B7280] disabled:cursor-not-allowed"
      >
        {outOfStock ? "Out of stock" : "Add to basket"}
      </button>
      {selected.coaUrl && (
        <a
          href={selected.coaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-3 border border-[#DDE1E7] text-center uppercase tracking-wider text-xs hover:bg-[#F7F8FA]"
        >
          Download Certificate of Analysis
        </a>
      )}
    </div>
  );
}
