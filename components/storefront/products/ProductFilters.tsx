"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";

type FilterOptions = {
  sizes: string[];
  testingMethods: string[];
};

export function ProductFilters({ sizes, testingMethods }: FilterOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSizes = searchParams.get("sizes")?.split(",").filter(Boolean) ?? [];
  const currentMethods = searchParams.get("methods")?.split(",").filter(Boolean) ?? [];
  const inStockOnly = searchParams.get("instock") === "1";

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const toggleSize = (size: string) => {
    const next = currentSizes.includes(size)
      ? currentSizes.filter((s) => s !== size)
      : [...currentSizes, size];
    updateParam("sizes", next.join(","));
  };

  const toggleMethod = (method: string) => {
    const next = currentMethods.includes(method)
      ? currentMethods.filter((m) => m !== method)
      : [...currentMethods, method];
    updateParam("methods", next.join(","));
  };

  return (
    <aside className="space-y-8 pr-6">
      <div>
        <p className="label-editorial mb-3">Size</p>
        <ul className="space-y-2">
          {sizes.map((size) => (
            <li key={size}>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentSizes.includes(size)}
                  onChange={() => toggleSize(size)}
                  className="accent-[#0D1B3E]"
                />
                <span>{size}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="label-editorial mb-3">Testing Method</p>
        <ul className="space-y-2">
          {testingMethods.map((method) => (
            <li key={method}>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentMethods.includes(method)}
                  onChange={() => toggleMethod(method)}
                  className="accent-[#0D1B3E]"
                />
                <span>{method}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => updateParam("instock", e.target.checked ? "1" : null)}
            className="accent-[#0D1B3E]"
          />
          <span>In stock only</span>
        </label>
      </div>
      {(currentSizes.length > 0 || currentMethods.length > 0 || inStockOnly) && (
        <button
          type="button"
          onClick={() => router.replace(pathname, { scroll: false })}
          className="text-xs underline text-[#6B7280] hover:text-[#0D1B3E]"
        >
          Clear filters
        </button>
      )}
    </aside>
  );
}
