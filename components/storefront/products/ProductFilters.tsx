"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { RESEARCH_TAGS } from "@/data/research-tags";

type TagFacet = { slug: string; count: number };

type FilterOptions = {
  sizes: string[];
  testingMethods: string[];
  tagFacets?: TagFacet[];
};

export function ProductFilters({ sizes, testingMethods, tagFacets = [] }: FilterOptions) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSizes = searchParams.get("sizes")?.split(",").filter(Boolean) ?? [];
  const currentMethods = searchParams.get("methods")?.split(",").filter(Boolean) ?? [];
  const currentTags = searchParams.get("tags")?.split(",").filter(Boolean) ?? [];
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

  const toggleTag = (slug: string) => {
    const next = currentTags.includes(slug)
      ? currentTags.filter((t) => t !== slug)
      : [...currentTags, slug];
    updateParam("tags", next.join(","));
  };

  const tagLabel = (slug: string) =>
    RESEARCH_TAGS.find((t) => t.slug === slug)?.label ?? slug;

  return (
    <aside className="space-y-8 pr-6">
      {tagFacets.length > 0 && (
        <fieldset className="border-0 p-0 m-0">
          <legend className="label-editorial mb-3 p-0">Research Application</legend>
          <ul className="space-y-2 list-none p-0">
            {tagFacets.map(({ slug, count }) => (
              <li key={slug}>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentTags.includes(slug)}
                    onChange={() => toggleTag(slug)}
                    className="accent-[#0D1B3E]"
                  />
                  <span className="flex-1">{tagLabel(slug)}</span>
                  <span className="text-xs text-[#9CA3AF]">({count})</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
      <fieldset className="border-0 p-0 m-0">
        <legend className="label-editorial mb-3 p-0">Size</legend>
        <ul className="space-y-2 list-none p-0">
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
      </fieldset>
      <fieldset className="border-0 p-0 m-0">
        <legend className="label-editorial mb-3 p-0">Testing Method</legend>
        <ul className="space-y-2 list-none p-0">
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
      </fieldset>
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
      {(currentSizes.length > 0 || currentMethods.length > 0 || currentTags.length > 0 || inStockOnly) && (
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
