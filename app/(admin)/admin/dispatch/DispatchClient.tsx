"use client";

import type { Order } from "@/types";
import type { DispatchBatchRun } from "@/types/dispatch";
import { DispatchHeader } from "./DispatchHeader";
import { DispatchRow } from "./DispatchRow";

export function DispatchClient({
  orders,
  lastBatchRun,
}: {
  orders: Order[];
  lastBatchRun: DispatchBatchRun | null;
}) {
  const printedCount = orders.filter(
    (o) => o.fulfilment.printerStatus === "printed" && !o.fulfilment.dispatchedAt
  ).length;

  return (
    <div>
      <DispatchHeader lastBatchRun={lastBatchRun} printedCount={printedCount} />
      {orders.length === 0 ? (
        <p className="text-muted">No paid orders awaiting dispatch.</p>
      ) : (
        <table className="w-full text-sm bg-white border border-border">
          <thead className="text-left border-b border-border">
            <tr>
              <th className="p-3 font-medium">Order</th>
              <th className="p-3 font-medium">Date paid</th>
              <th className="p-3 font-medium">Customer</th>
              <th className="p-3 font-medium">Items</th>
              <th className="p-3 font-medium">Service</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <DispatchRow key={o.id} order={o} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
