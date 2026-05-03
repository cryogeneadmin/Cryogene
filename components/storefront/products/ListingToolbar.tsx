"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "name-asc", label: "Name A–Z" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

export function ListingToolbar({
  count,
  filtersSlot,
  activeFilterCount,
}: {
  count: number;
  filtersSlot: ReactNode;
  activeFilterCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const currentSort = searchParams.get("sort") ?? "newest";

  const setSort = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "newest") params.delete("sort");
    else params.set("sort", value);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden inline-flex items-center gap-2 border border-[#DDE1E7] bg-white px-3 py-1.5 text-xs uppercase tracking-wider text-[#0D1B3E] hover:border-[#0D1B3E]"
            aria-expanded={drawerOpen}
            aria-controls="cryogene-filter-drawer"
          >
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-[#0D1B3E] text-white text-[10px] px-1.5 py-0.5 font-mono">
                {activeFilterCount}
              </span>
            )}
          </button>
          <p className="text-sm text-[#6B7280]">
            {count} {count === 1 ? "product" : "products"}
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs">
          <span className="uppercase tracking-wider text-[#6B7280]">Sort</span>
          <select
            value={currentSort}
            onChange={(e) => setSort(e.target.value)}
            className="border border-[#DDE1E7] bg-white px-2 py-1.5 text-sm text-[#0D1B3E] focus:outline-none focus:border-[#0D1B3E]"
            aria-label="Sort products"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Mobile filter drawer */}
      {drawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
          id="cryogene-filter-drawer"
          className="lg:hidden fixed inset-0 z-50"
        >
          <div
            className="absolute inset-0 bg-[#0D1B3E]/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-0 bottom-0 w-[85vw] max-w-sm bg-white overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#DDE1E7] sticky top-0 bg-white">
              <p className="label-editorial text-sm text-[#0D1B3E]">Filters</p>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="text-sm text-[#0D1B3E] underline"
              >
                Close
              </button>
            </div>
            <div className="p-4">{filtersSlot}</div>
          </div>
        </div>
      )}
    </>
  );
}
