// app/(admin)/admin/audit-log/AuditLogRow.tsx
"use client";

import type { AuditLog } from "@/types/audit";

export function AuditLogRow({
  item,
  selected,
  onClick,
}: {
  item: AuditLog;
  selected: boolean;
  onClick: () => void;
}) {
  const formattedDate = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(item.createdAt);

  const actorLabel =
    item.actor.email ?? item.actor.uid ?? `(${item.actor.type})`;
  const targetLabel =
    item.target.kind && item.target.id
      ? `${item.target.kind}/${item.target.id.slice(0, 12)}`
      : "—";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected ? "true" : undefined}
      className={`w-full text-left px-4 py-3 grid grid-cols-[140px_180px_1fr_180px] gap-3 text-sm hover:bg-offwhite ${
        selected ? "bg-offwhite" : ""
      }`}
    >
      <span className="mono text-xs text-muted">{formattedDate}</span>
      <span className="text-navy">{item.eventType}</span>
      <span className="text-muted truncate">{actorLabel}</span>
      <span className="mono text-xs text-muted truncate text-right">{targetLabel}</span>
    </button>
  );
}
