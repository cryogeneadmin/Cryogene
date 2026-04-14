// components/storefront/basket/BasketIconButton.tsx
"use client";

import { useEffect, useState } from "react";
import { useBasket } from "@/lib/basket";

export function BasketIconButton() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { openDrawer, itemCount } = useBasket();
  const count = mounted ? itemCount() : 0;

  return (
    <button
      type="button"
      onClick={openDrawer}
      aria-label={`Open basket (${count} items)`}
      className="label-editorial hover:text-[#0D1B3E] transition-colors flex items-center gap-2"
    >
      <span>Basket</span>
      {mounted && count > 0 && (
        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[#0D1B3E] text-white text-[10px]">
          {count}
        </span>
      )}
    </button>
  );
}
