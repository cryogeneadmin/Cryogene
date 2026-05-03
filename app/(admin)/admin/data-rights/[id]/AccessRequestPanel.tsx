"use client";

import { useState } from "react";
import type { DataRightsRequest } from "@/types/data-rights";
import { generateAndSendAccessExport } from "./actions";

export function AccessRequestPanel({ request }: { request: DataRightsRequest }) {
  const [busy, setBusy] = useState(false);
  const [sentAt, setSentAt] = useState<string | null>(
    request.respondedAt?.toISOString() ?? null
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    setBusy(true);
    setError(null);
    try {
      const res = await generateAndSendAccessExport(request.id);
      if (!res.ok) {
        setError(res.reason);
        return;
      }
      setSentAt(new Date().toISOString());
    } catch {
      setError("Failed to send. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-serif text-3xl text-navy mb-2">Access request</h1>
      <RequestHeader request={request} />

      <section className="border border-border p-6 mt-6">
        <h2 className="label-editorial text-sm text-navy mb-3">Action</h2>
        {sentAt ? (
          <div className="text-sm text-navy">
            Bundle sent {new Date(sentAt).toLocaleDateString("en-GB")}.{" "}
            <span className="text-muted">Request marked complete.</span>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted mb-4">
              Click below to generate the export bundle (profile + orders +
              events + audit log + enquiries + consent history) and email it
              to {request.requester.email}.
            </p>
            <button
              type="button"
              onClick={handleSend}
              disabled={busy}
              className="px-4 py-2 bg-navy text-white text-xs uppercase tracking-wider hover:bg-mid-navy disabled:opacity-50"
            >
              {busy ? "Generating…" : "Generate + send bundle"}
            </button>
            {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
          </>
        )}
      </section>
    </div>
  );
}

function RequestHeader({ request }: { request: DataRightsRequest }) {
  return (
    <dl className="grid grid-cols-[140px_1fr] gap-y-1 text-sm bg-offwhite p-4 border border-border">
      <dt className="text-muted">Requester</dt>
      <dd className="text-navy">
        {request.requester.email}
        {request.requester.uid && (
          <span className="ml-2 mono text-xs text-muted">
            uid: {request.requester.uid}
          </span>
        )}
      </dd>
      <dt className="text-muted">Source</dt>
      <dd className="text-navy">{request.source}</dd>
      <dt className="text-muted">Created</dt>
      <dd className="text-navy mono text-xs">{request.createdAt.toLocaleString("en-GB")}</dd>
      <dt className="text-muted">Deadline</dt>
      <dd className="text-navy mono text-xs">{request.deadline.toLocaleString("en-GB")}</dd>
      {request.message && (
        <>
          <dt className="text-muted">Message</dt>
          <dd className="text-navy whitespace-pre-wrap">{request.message}</dd>
        </>
      )}
    </dl>
  );
}
