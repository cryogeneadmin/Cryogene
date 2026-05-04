"use client";

import { useState } from "react";
import { rejectRequest } from "./actions";

export function RejectPanel({
  requestId,
  alreadyRejected,
  initialReason,
}: {
  requestId: string;
  alreadyRejected: boolean;
  initialReason: string | null;
}) {
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(alreadyRejected);
  const [doneReason, setDoneReason] = useState(initialReason);

  if (done) {
    return (
      <section className="border border-border bg-compliance-amber-bg p-6 mt-6">
        <p className="label-editorial text-sm text-compliance-amber-text mb-2">
          Request rejected
        </p>
        {doneReason && (
          <p className="text-sm text-compliance-amber-text whitespace-pre-wrap">
            {doneReason}
          </p>
        )}
      </section>
    );
  }

  async function handleReject() {
    setBusy(true);
    setError(null);
    try {
      const result = await rejectRequest(requestId, reason);
      if (!result.ok) {
        setError(result.reason);
        return;
      }
      setDone(true);
      setDoneReason(reason);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reject request");
    } finally {
      setBusy(false);
    }
  }

  if (!showForm) {
    return (
      <section className="border border-border p-6 mt-6">
        <p className="text-xs text-muted mb-3">
          If this request is invalid (not a customer of Cryogene, bot-submitted,
          or out of scope), you can reject it instead of completing it. The
          requester will not receive an automatic notification — reach out
          manually if you want to explain.
        </p>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="px-4 py-2 border border-border text-xs uppercase tracking-wider hover:bg-offwhite text-muted hover:text-navy"
        >
          Reject request
        </button>
      </section>
    );
  }

  return (
    <section className="border border-border p-6 mt-6 bg-offwhite">
      <label className="block">
        <span className="label-editorial text-sm text-navy mb-2 block">
          Rejection reason (audit-logged)
        </span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          maxLength={500}
          placeholder="e.g. Email not found in customer records; please verify."
          className="w-full border border-border bg-white px-3 py-2 text-sm"
          autoFocus
        />
      </label>
      {error && (
        <p className="mt-2 text-sm text-red-700" role="alert" aria-live="polite">
          {error}
        </p>
      )}
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={handleReject}
          disabled={busy || reason.trim().length === 0}
          className="px-4 py-2 bg-navy text-white text-xs uppercase tracking-wider hover:bg-mid-navy disabled:opacity-50"
        >
          {busy ? "Rejecting…" : "Confirm rejection"}
        </button>
        <button
          type="button"
          onClick={() => setShowForm(false)}
          disabled={busy}
          className="px-4 py-2 border border-border text-xs uppercase tracking-wider hover:bg-white"
        >
          Cancel
        </button>
      </div>
    </section>
  );
}
