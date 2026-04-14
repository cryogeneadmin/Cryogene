// components/admin/OrderTable.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import type { Order, OrderStatus } from "@/types";
import { formatPriceFromPence } from "@/lib/basket";
import { coerceToDate } from "@/lib/utils";

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
];

function StatusBadge({ status }: { status: OrderStatus }) {
  const colorMap: Record<OrderStatus, string> = {
    pending: "bg-amber-100 text-amber-800",
    paid: "bg-green-100 text-green-800",
    fulfilled: "bg-blue-100 text-blue-800",
    cancelled: "bg-gray-100 text-gray-800",
    refunded: "bg-red-100 text-red-800",
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded ${colorMap[status] ?? "bg-gray-100"}`}>
      {status}
    </span>
  );
}


export function OrderTable({ orders }: { orders: Order[] }) {
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");

  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    return true;
  });

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | OrderStatus)}
          className="border border-[#DDE1E7] px-3 py-2 text-sm bg-white"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <table className="w-full text-sm bg-white border border-[#DDE1E7]">
        <thead className="text-left border-b border-[#DDE1E7]">
          <tr>
            <th className="p-3 font-medium">Order</th>
            <th className="p-3 font-medium">Date</th>
            <th className="p-3 font-medium">Customer</th>
            <th className="p-3 font-medium">Items</th>
            <th className="p-3 font-medium">Status</th>
            <th className="p-3 font-medium text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((o) => (
            <tr key={o.id} className="border-b border-[#DDE1E7] last:border-0 hover:bg-[#F7F8FA]">
              <td className="p-3">
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="mono text-xs underline text-[#0D1B3E]"
                >
                  {o.orderNumber}
                </Link>
              </td>
              <td className="p-3 text-[#6B7280]">
                {(coerceToDate(o.createdAt) ?? new Date()).toLocaleDateString("en-GB")}
              </td>
              <td className="p-3">{o.customer.name}</td>
              <td className="p-3">{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
              <td className="p-3">
                <StatusBadge status={o.status} />
              </td>
              <td className="p-3 text-right mono">{formatPriceFromPence(o.totalInPence)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {filtered.length === 0 && (
        <p className="text-sm text-[#6B7280] mt-4">No orders match your filter.</p>
      )}
    </div>
  );
}
