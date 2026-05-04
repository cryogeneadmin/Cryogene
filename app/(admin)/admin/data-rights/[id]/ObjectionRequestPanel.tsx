import type { DataRightsRequest } from "@/types/data-rights";
import { RejectPanel } from "./RejectPanel";

export function ObjectionRequestPanel({ request }: { request: DataRightsRequest }) {
  return (
    <div>
      <h1 className="font-serif text-3xl text-navy mb-2">Marketing objection</h1>
      <dl className="grid grid-cols-[140px_1fr] gap-y-1 text-sm bg-offwhite p-4 border border-border mb-6">
        <dt className="text-muted">Requester</dt>
        <dd className="text-navy">{request.requester.email}</dd>
        <dt className="text-muted">Status</dt>
        <dd className="text-navy">
          {request.status === "completed" ? "Auto-processed (instant)" : request.status}
        </dd>
      </dl>
      <p className="text-sm text-muted">
        Objections are auto-processed at the API layer. Sam doesn&apos;t need to
        action this — it&apos;s recorded here for audit purposes only.
      </p>
      {request.status !== "completed" && (
        <RejectPanel
          requestId={request.id}
          alreadyRejected={request.status === "rejected"}
          initialReason={request.rejectionReason}
        />
      )}
    </div>
  );
}
