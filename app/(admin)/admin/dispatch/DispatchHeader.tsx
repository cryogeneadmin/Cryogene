"use client";

import { useState, useTransition } from "react";
import type { DispatchBatchRun } from "@/types/dispatch";
import { coerceToDate } from "@/lib/utils";

export function DispatchHeader({
  lastBatchRun,
  printedCount,
}: {
  lastBatchRun: DispatchBatchRun | null;
  printedCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRunBatch() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/dispatch/run-batch", { method: "POST" });
        if (!res.ok) throw new Error(await res.text());
        window.location.reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Batch run failed");
      }
    });
  }

  function handleMarkAllDispatched() {
    if (!confirm(`Mark ${printedCount} orders as dispatched and notify customers?`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const { markBatchDispatched } = await import("@/app/actions/fulfilment");
        const result = await markBatchDispatched();
        if (result.failed > 0) {
          setError(
            `${result.marked} marked, ${result.failed} failed. ${result.errors
              .map((e) => e.orderNumber)
              .join(", ")}`
          );
        }
        window.location.reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bulk dispatch failed");
      }
    });
  }

  return (
    <div className="border border-border bg-white p-4 mb-6 flex justify-between items-center gap-4 flex-wrap">
      <div className="flex gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={handleRunBatch}
          className="px-4 py-2 bg-navy text-white text-sm uppercase tracking-wider disabled:opacity-50"
        >
          {pending ? "Running…" : "Run batch now"}
        </button>
        <button
          type="button"
          disabled={pending || printedCount === 0}
          onClick={handleMarkAllDispatched}
          className="px-4 py-2 border border-border text-sm uppercase tracking-wider disabled:opacity-50"
        >
          Mark all printed as dispatched ({printedCount})
        </button>
      </div>
      {lastBatchRun && (
        <p className="text-xs text-muted">
          Last batch: {coerceToDate(lastBatchRun.startedAt)?.toLocaleString("en-GB")}{" "}
          — {lastBatchRun.ordersProcessed} processed, {lastBatchRun.ordersFailed} failed
        </p>
      )}
      {error && <p className="text-xs text-red-700 w-full">{error}</p>}
    </div>
  );
}
