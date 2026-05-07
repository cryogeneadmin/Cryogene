"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { Order } from "@/types";
import { ROYAL_MAIL_GB_SERVICES, type RoyalMailServiceCode } from "@/types/dispatch";
import { coerceToDate } from "@/lib/utils";
import {
  generateLabel,
  voidLabel,
  markDispatched,
  retryLabel,
} from "@/app/actions/fulfilment";

type SubState = "queue" | "printed" | "failed";

function getSubState(order: Order): SubState {
  if (order.fulfilment.printerStatus === "printed") return "printed";
  if (order.fulfilment.printerStatus === "failed") return "failed";
  return "queue";
}

export function DispatchRow({ order }: { order: Order }) {
  const subState = getSubState(order);
  const [serviceCode, setServiceCode] = useState<RoyalMailServiceCode>("TPN48");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function action(fn: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        window.location.reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
      }
    });
  }

  return (
    <tr className="border-b border-border">
      <td className="p-3">
        <Link
          href={`/admin/orders/${order.id}`}
          className="mono text-xs underline text-navy"
        >
          {order.orderNumber}
        </Link>
      </td>
      <td className="p-3 text-muted text-xs">
        {(coerceToDate(order.createdAt) ?? new Date()).toLocaleDateString("en-GB")}
      </td>
      <td className="p-3 text-sm">{order.customer.name}</td>
      <td className="p-3 text-sm">
        {order.items.reduce((s, i) => s + i.quantity, 0)}
      </td>
      <td className="p-3">
        {subState === "queue" ? (
          <select
            value={serviceCode}
            onChange={(e) => setServiceCode(e.target.value as RoyalMailServiceCode)}
            className="border border-border px-2 py-1 text-xs"
            disabled={pending}
          >
            {Object.entries(ROYAL_MAIL_GB_SERVICES).map(([code, info]) => (
              <option key={code} value={code}>
                {info.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs">
            {order.fulfilment.carrier === "royalmail" ? "Royal Mail" : "—"}
          </span>
        )}
      </td>
      <td className="p-3">
        {subState === "queue" && (
          <span className="px-2 py-0.5 text-xs bg-gray-100">In queue</span>
        )}
        {subState === "printed" && (
          <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-900">
            Label printed
          </span>
        )}
        {subState === "failed" && (
          <span className="px-2 py-0.5 text-xs bg-red-100 text-red-900">Failed</span>
        )}
      </td>
      <td className="p-3 text-right">
        <div className="flex gap-2 justify-end items-center flex-wrap">
          {subState === "queue" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => action(() => generateLabel(order.id, { serviceCode }))}
              className="px-3 py-1 bg-navy text-white text-xs uppercase tracking-wider disabled:opacity-50"
            >
              Generate label
            </button>
          )}
          {subState === "printed" && (
            <>
              <Link
                href={`/admin/orders/${order.id}/packing-slip`}
                target="_blank"
                className="px-3 py-1 border border-border text-xs uppercase tracking-wider"
              >
                Packing slip
              </Link>
              <Link
                href={`/admin/orders/${order.id}/label`}
                target="_blank"
                className="px-3 py-1 border border-border text-xs uppercase tracking-wider"
              >
                Reprint
              </Link>
              <button
                type="button"
                disabled={pending}
                onClick={() => action(() => markDispatched(order.id))}
                className="px-3 py-1 bg-navy text-white text-xs uppercase tracking-wider disabled:opacity-50"
              >
                Mark dispatched
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => action(() => voidLabel(order.id, { reason: "manual void" }))}
                className="px-3 py-1 border border-border text-xs uppercase tracking-wider text-red-700"
              >
                Void
              </button>
            </>
          )}
          {subState === "failed" && (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => action(() => retryLabel(order.id, { serviceCode }))}
                className="px-3 py-1 bg-navy text-white text-xs uppercase tracking-wider disabled:opacity-50"
              >
                Retry
              </button>
              {order.fulfilment.lastError && (
                <span
                  className="text-xs text-red-700"
                  title={order.fulfilment.lastError}
                >
                  ⚠ {order.fulfilment.lastError.slice(0, 40)}…
                </span>
              )}
            </>
          )}
        </div>
        {error && <p className="text-xs text-red-700 mt-1">{error}</p>}
      </td>
    </tr>
  );
}
