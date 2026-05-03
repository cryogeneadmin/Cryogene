// app/(admin)/admin/data-rights/page.tsx
import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { assertAdmin } from "@/lib/admin-auth";
import { listRequests } from "@/lib/data-rights";
import type { DataRightsRequest } from "@/types/data-rights";

const TYPE_LABELS: Record<DataRightsRequest["type"], string> = {
  access: "Access",
  rectification: "Rectification",
  erasure: "Erasure",
  objection: "Objection",
};

const STATUS_LABELS: Record<DataRightsRequest["status"], string> = {
  pending_email_verification: "Awaiting email confirmation",
  queued: "Queued",
  in_progress: "In progress",
  completed: "Completed",
  rejected: "Rejected",
};

function daysRemaining(deadline: Date): number {
  return Math.floor((deadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function chipClass(days: number): string {
  if (days < 7) return "bg-red-100 text-red-900";
  if (days < 14) return "bg-compliance-amber-bg text-compliance-amber-text";
  return "bg-offwhite text-muted";
}

async function QueueContent() {
  await connection();
  await assertAdmin();
  const requests = await listRequests();

  return (
    <ul className="divide-y divide-border">
      {requests.length === 0 ? (
        <li className="py-12 text-center text-muted">No data-rights requests yet.</li>
      ) : (
        requests.map((r) => {
          const days = daysRemaining(r.deadline);
          return (
            <li key={r.id}>
              <Link
                href={`/admin/data-rights/${r.id}`}
                className="grid grid-cols-[120px_180px_1fr_140px_100px] gap-3 px-4 py-3 text-sm hover:bg-offwhite items-center"
              >
                <span className="text-navy">{TYPE_LABELS[r.type] ?? r.type}</span>
                <span className="text-muted truncate">{r.requester.email}</span>
                <span className="text-xs text-muted">{STATUS_LABELS[r.status] ?? r.status}</span>
                <span className="mono text-[10px] text-muted">
                  {r.createdAt.toLocaleDateString("en-GB")}
                </span>
                <span className={`text-xs px-2 py-1 text-center ${chipClass(days)}`}>
                  {r.status === "completed" || r.status === "rejected"
                    ? "—"
                    : `${days}d`}
                </span>
              </Link>
            </li>
          );
        })
      )}
    </ul>
  );
}

export default function DataRightsQueuePage() {
  return (
    <div className="p-6">
      <h1 className="font-serif text-3xl text-navy mb-2">Data rights queue</h1>
      <p className="text-sm text-muted mb-6">
        UK GDPR requires response within 30 days. Sorted by deadline ascending.
      </p>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <QueueContent />
      </Suspense>
    </div>
  );
}
