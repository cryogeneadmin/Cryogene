"use client";

import { useState } from "react";
import type { DataRightsRequest } from "@/types/data-rights";
import { markRectificationComplete } from "./actions";

export function RectificationRequestPanel({ request }: { request: DataRightsRequest }) {
  const [done, setDone] = useState(request.status === "completed");
  const [busy, setBusy] = useState(false);

  return (
    <div>
      <h1 className="font-serif text-3xl text-navy mb-2">Rectification request</h1>
      <dl className="grid grid-cols-[140px_1fr] gap-y-1 text-sm bg-offwhite p-4 border border-border mb-6">
        <dt className="text-muted">Requester</dt>
        <dd className="text-navy">{request.requester.email}</dd>
        {request.message && (
          <>
            <dt className="text-muted">Message</dt>
            <dd className="text-navy whitespace-pre-wrap">{request.message}</dd>
          </>
        )}
      </dl>

      <section className="border border-border p-6">
        <p className="text-sm text-muted mb-4">
          The customer can self-serve at <strong>/account/settings</strong>. If
          they cannot access their account (lost password, account closed),
          confirm identity manually before making any changes on their behalf.
        </p>
        {done ? (
          <p className="text-sm text-navy">Marked complete.</p>
        ) : (
          <button
            type="button"
            onClick={async () => {
              setBusy(true);
              await markRectificationComplete(request.id);
              setDone(true);
              setBusy(false);
            }}
            disabled={busy}
            className="px-4 py-2 bg-navy text-white text-xs uppercase tracking-wider hover:bg-mid-navy disabled:opacity-50"
          >
            {busy ? "Saving…" : "Mark complete"}
          </button>
        )}
      </section>
    </div>
  );
}
