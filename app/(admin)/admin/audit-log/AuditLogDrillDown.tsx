// app/(admin)/admin/audit-log/AuditLogDrillDown.tsx
"use client";

import type { AuditLog } from "@/types/audit";

export function AuditLogDrillDown({
  item,
  onClose,
}: {
  item: AuditLog;
  onClose: () => void;
}) {
  return (
    <div className="border border-border bg-white p-4 sticky top-6 max-h-[80vh] overflow-y-auto">
      <div className="flex items-start justify-between mb-3">
        <p className="label-editorial text-sm text-navy">{item.eventType}</p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted underline"
          aria-label="Close detail panel"
        >
          Close
        </button>
      </div>

      <dl className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-1 text-xs mb-4">
        <dt className="text-muted">Time</dt>
        <dd className="mono">{item.createdAt.toISOString()}</dd>
        <dt className="text-muted">Actor</dt>
        <dd>
          <span className="text-muted">{item.actor.type}</span>
          {item.actor.email && <span> · {item.actor.email}</span>}
          {item.actor.uid && (
            <span className="mono text-[10px] text-muted block">{item.actor.uid}</span>
          )}
        </dd>
        <dt className="text-muted">Target</dt>
        <dd className="mono text-[10px]">
          {item.target.kind ?? "—"}
          {item.target.id && <> / {item.target.id}</>}
        </dd>
        <dt className="text-muted">IP</dt>
        <dd className="mono text-[10px]">{item.ip ?? "—"}</dd>
      </dl>

      {(item.before || item.after) && (
        <div className="mb-4">
          <p className="label-editorial text-xs text-navy mb-1">Before / After</p>
          <div className="grid grid-cols-2 gap-2 text-[10px] mono">
            <pre className="p-2 bg-offwhite border border-border overflow-x-auto whitespace-pre-wrap">
              {item.before ? JSON.stringify(item.before, null, 2) : "(none)"}
            </pre>
            <pre className="p-2 bg-offwhite border border-border overflow-x-auto whitespace-pre-wrap">
              {item.after ? JSON.stringify(item.after, null, 2) : "(none)"}
            </pre>
          </div>
        </div>
      )}

      {item.snapshotAfter && (
        <div className="mb-4">
          <p className="label-editorial text-xs text-navy mb-1">Snapshot</p>
          <pre className="p-2 bg-offwhite border border-border text-[10px] mono overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(item.snapshotAfter, null, 2)}
          </pre>
        </div>
      )}

      {Object.keys(item.metadata).length > 0 && (
        <div>
          <p className="label-editorial text-xs text-navy mb-1">Metadata</p>
          <pre className="p-2 bg-offwhite border border-border text-[10px] mono overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(item.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
