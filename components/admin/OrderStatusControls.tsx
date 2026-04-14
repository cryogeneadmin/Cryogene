// components/admin/OrderStatusControls.tsx
"use client";

import { useState } from "react";
import { setOrderStatus } from "@/app/actions/orders";
import type { Order, OrderStatus } from "@/types";

const STATUSES: OrderStatus[] = ["pending", "paid", "fulfilled", "cancelled", "refunded"];

export function OrderStatusControls({ order }: { order: Order }) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (newStatus: OrderStatus) => {
    if (newStatus === status) return;
    setPending(true);
    setError(null);
    try {
      await setOrderStatus(order.id, newStatus);
      setStatus(newStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="bg-white border border-[#DDE1E7] p-6 sticky top-8">
      <p className="label-editorial mb-4">Status</p>
      <div className="space-y-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            disabled={pending || s === status}
            onClick={() => handleChange(s)}
            className={`w-full py-2 text-xs uppercase tracking-wider transition-colors ${
              s === status
                ? "bg-[#0D1B3E] text-white"
                : "border border-[#DDE1E7] hover:bg-[#F7F8FA]"
            } disabled:opacity-60`}
          >
            {s}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-700 mt-3">{error}</p>}
    </div>
  );
}
