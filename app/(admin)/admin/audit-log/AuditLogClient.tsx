// app/(admin)/admin/audit-log/AuditLogClient.tsx
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { ALL_AUDIT_EVENT_TYPES } from "@/types/audit";
import type { AuditLog, AuditEventType } from "@/types/audit";
import type { QueryFilters } from "./actions";
import { exportAuditLogsCsv } from "./actions";
import { AuditLogRow } from "./AuditLogRow";
import { AuditLogDrillDown } from "./AuditLogDrillDown";

export function AuditLogClient({
  items,
  nextCursor,
  initialFilters,
}: {
  items: AuditLog[];
  nextCursor: string | null;
  initialFilters: QueryFilters;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [exporting, setExporting] = useState(false);
  const [, startTransition] = useTransition();

  function applyFilters(next: QueryFilters) {
    const params = new URLSearchParams();
    if (next.eventTypes?.length) params.set("types", next.eventTypes.join(","));
    if (next.fromDate) params.set("from", next.fromDate);
    if (next.toDate) params.set("to", next.toDate);
    if (next.targetKind) params.set("tk", next.targetKind);
    if (next.targetId) params.set("tid", next.targetId);
    startTransition(() => {
      router.push(params.size ? `${pathname}?${params}` : pathname);
    });
  }

  async function handleExport() {
    setExporting(true);
    try {
      const csv = await exportAuditLogsCsv(initialFilters);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const trailLink = initialFilters.targetKind && initialFilters.targetId
    ? `Trail for ${initialFilters.targetKind}: ${initialFilters.targetId}`
    : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
      <div>
        {trailLink && (
          <div className="mb-4 p-3 bg-offwhite border border-border text-sm">
            <span className="text-muted">Filtered: </span>
            <span className="text-navy">{trailLink}</span>
            <button
              type="button"
              onClick={() => applyFilters({})}
              className="ml-3 underline text-blue text-xs"
            >
              Clear
            </button>
          </div>
        )}

        <FilterBar initial={initialFilters} onApply={applyFilters} onExport={handleExport} exporting={exporting} />

        {items.length === 0 ? (
          <p className="py-12 text-center text-muted">No events match these filters.</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id}>
                <AuditLogRow
                  item={item}
                  selected={selected?.id === item.id}
                  onClick={() => setSelected(item)}
                />
              </li>
            ))}
          </ul>
        )}

        {nextCursor && (
          <div className="mt-6 text-center">
            <Link
              href={`${pathname}?${new URLSearchParams({ cursor: nextCursor })}`}
              className="inline-block px-4 py-2 border border-border text-sm uppercase tracking-wider hover:bg-offwhite"
            >
              Next page
            </Link>
          </div>
        )}
      </div>

      <aside className="hidden lg:block">
        {selected ? (
          <AuditLogDrillDown item={selected} onClose={() => setSelected(null)} />
        ) : (
          <p className="text-sm text-muted p-4 border border-border">
            Click a row to inspect.
          </p>
        )}
      </aside>
    </div>
  );
}

function FilterBar({
  initial,
  onApply,
  onExport,
  exporting,
}: {
  initial: QueryFilters;
  onApply: (filters: QueryFilters) => void;
  onExport: () => void;
  exporting: boolean;
}) {
  const [types, setTypes] = useState<AuditEventType[]>(
    (initial.eventTypes ?? []).filter((t): t is AuditEventType =>
      (ALL_AUDIT_EVENT_TYPES as readonly string[]).includes(t)
    )
  );
  const [from, setFrom] = useState(initial.fromDate ?? "");
  const [to, setTo] = useState(initial.toDate ?? "");

  function toggleType(t: AuditEventType) {
    setTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onApply({ eventTypes: types, fromDate: from || null, toDate: to || null });
      }}
      className="mb-6 p-4 bg-offwhite border border-border space-y-3"
    >
      <div>
        <p className="label-editorial text-xs text-navy mb-2">Event types</p>
        <div className="flex flex-wrap gap-2">
          {ALL_AUDIT_EVENT_TYPES.map((t) => (
            <label
              key={t}
              className={`px-2 py-1 text-xs cursor-pointer border ${
                types.includes(t)
                  ? "bg-navy text-white border-navy"
                  : "bg-white border-border hover:border-navy"
              }`}
            >
              <input
                type="checkbox"
                checked={types.includes(t)}
                onChange={() => toggleType(t)}
                className="sr-only"
              />
              {t}
            </label>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-3 items-end">
        <label className="flex flex-col gap-1 text-xs">
          <span className="label-editorial text-navy">From</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border border-border bg-white px-2 py-1 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="label-editorial text-navy">To</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border border-border bg-white px-2 py-1 text-sm"
          />
        </label>
        <button
          type="submit"
          className="px-4 py-2 bg-navy text-white text-xs uppercase tracking-wider hover:bg-mid-navy"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={onExport}
          disabled={exporting}
          className="px-4 py-2 border border-border text-xs uppercase tracking-wider hover:bg-white disabled:opacity-50"
        >
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>
    </form>
  );
}
