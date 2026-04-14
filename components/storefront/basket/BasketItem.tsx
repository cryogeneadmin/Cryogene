// components/storefront/basket/BasketItem.tsx
"use client";

import Image from "next/image";
import { useBasket, formatPriceFromPence, type BasketItem as BasketItemType } from "@/lib/basket";

export function BasketItem({ item }: { item: BasketItemType }) {
  const { updateQuantity, removeItem } = useBasket();

  return (
    <div className="flex gap-4 py-4 border-b border-[#DDE1E7]">
      <div className="relative h-20 w-20 bg-[#F7F8FA] flex-shrink-0">
        {item.primaryImage && (
          <Image
            src={item.primaryImage}
            alt={item.name}
            fill
            className="object-contain"
            sizes="80px"
            unoptimized
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-serif text-lg text-[#0D1B3E] truncate">{item.name}</p>
        <p className="font-mono text-xs text-[#6B7280]">{item.sku} · {item.size}</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateQuantity(item.sku, item.quantity - 1)}
              aria-label="Decrease quantity"
              className="w-7 h-7 border border-[#DDE1E7] hover:bg-[#F7F8FA] text-sm"
            >
              −
            </button>
            <span className="w-8 text-center text-sm">{item.quantity}</span>
            <button
              type="button"
              onClick={() => updateQuantity(item.sku, item.quantity + 1)}
              aria-label="Increase quantity"
              className="w-7 h-7 border border-[#DDE1E7] hover:bg-[#F7F8FA] text-sm"
            >
              +
            </button>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">
              {formatPriceFromPence(item.unitPriceInPence * item.quantity)}
            </p>
            <button
              type="button"
              onClick={() => removeItem(item.sku)}
              className="text-xs text-[#6B7280] hover:text-[#0D1B3E] underline"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
