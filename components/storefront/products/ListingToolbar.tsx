"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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
            className="lg:hidden inline-flex items-center gap-2 border border-border bg-white px-3 py-1.5 text-xs uppercase tracking-wider text-navy hover:border-navy"
            aria-expanded={drawerOpen}
            aria-controls="cryogene-filter-drawer"
          >
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-navy text-white text-[10px] px-1.5 py-0.5 font-sans">
                {activeFilterCount}
              </span>
            )}
          </button>
          <p className="text-sm text-muted">
            {count} {count === 1 ? "product" : "products"}
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs">
          <span className="uppercase tracking-wider text-muted">Sort</span>
          <select
            value={currentSort}
            onChange={(e) => setSort(e.target.value)}
            className="border border-border bg-white px-2 py-1.5 text-sm text-navy focus:outline-none focus:border-navy"
            aria-label="Sort products"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          id="cryogene-filter-drawer"
          className="lg:hidden w-[85vw] sm:max-w-sm flex flex-col"
        >
          <SheetHeader>
            <SheetTitle className="label-editorial text-sm text-navy">
              Filters
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto -mx-6 px-6 mt-4">
            {filtersSlot}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
