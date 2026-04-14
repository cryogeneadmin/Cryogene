"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import type { Product } from "@/types";
import { formatPriceFromPence } from "@/lib/basket";

export function ProductTable({ products }: { products: Product[] }) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const filtered = products.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
    if (activeFilter === "active" && !p.active) return false;
    if (activeFilter === "inactive" && p.active) return false;
    return true;
  });

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="search"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-[#DDE1E7] px-3 py-2 text-sm flex-1 min-w-[200px]"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-[#DDE1E7] px-3 py-2 text-sm"
        >
          <option value="all">All categories</option>
          <option value="peptides">Peptides</option>
          <option value="mixers">Mixers</option>
          <option value="supplies">Supplies</option>
        </select>
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="border border-[#DDE1E7] px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
      </div>
      <table className="w-full text-sm bg-white border border-[#DDE1E7]">
        <thead className="text-left border-b border-[#DDE1E7]">
          <tr>
            <th className="p-3">Image</th>
            <th className="p-3">Name</th>
            <th className="p-3">Category</th>
            <th className="p-3">Variants</th>
            <th className="p-3">Stock</th>
            <th className="p-3">Price from</th>
            <th className="p-3">Status</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((p) => {
            const totalStock = p.variants.reduce((sum, v) => sum + v.stock, 0);
            const activeVariantPrices = p.variants.filter((v) => v.active).map((v) => v.priceInPence);
            const lowestPrice = activeVariantPrices.length > 0 ? Math.min(...activeVariantPrices) : 0;
            return (
              <tr key={p.id} className="border-b border-[#DDE1E7] last:border-0">
                <td className="p-3">
                  <div className="relative h-10 w-10 bg-[#F7F8FA]">
                    {p.images[0] && (
                      <Image src={p.images[0]} alt={p.name} fill className="object-contain p-1" sizes="40px" />
                    )}
                  </div>
                </td>
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3 text-[#6B7280]">{p.category}</td>
                <td className="p-3 text-[#6B7280]">{p.variants.length} sizes</td>
                <td className="p-3">{totalStock}</td>
                <td className="p-3 mono">{lowestPrice > 0 ? formatPriceFromPence(lowestPrice) : "TBC"}</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 text-xs ${p.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                    {p.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <Link href={`/admin/products/${p.id}`} className="text-xs underline">Edit</Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {filtered.length === 0 && (
        <p className="text-sm text-[#6B7280] mt-4">No products match your filters.</p>
      )}
    </div>
  );
}
