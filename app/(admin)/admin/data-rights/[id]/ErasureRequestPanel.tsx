"use client";

import { useState } from "react";
import type { DataRightsRequest } from "@/types/data-rights";
import { previewErasure, runErasure, type ErasurePreview } from "./actions";

export function ErasureRequestPanel({ request }: { request: DataRightsRequest }) {
  const [preview, setPreview] = useState<ErasurePreview | null>(null);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(
    request.respondedAt?.toISOString() ?? null
  );
  const [error, setError] = useState<string | null>(null);

  async function loadPreview() {
    setBusy(true);
    setError(null);
    try {
      const result = await previewErasure(request.id);
      setPreview(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleRun() {
    if (confirmEmail !== request.requester.email) {
      setError("Confirmation email does not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await runErasure(request.id, confirmEmail);
      if (!result.ok) {
        setError(result.reason);
        return;
      }
      setCompletedAt(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erasure failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-serif text-3xl text-navy mb-2">Erasure request</h1>
      <Header request={request} />

      {completedAt ? (
        <section className="border border-border p-6 mt-6 bg-offwhite">
          <p className="text-sm text-navy">
            Erasure completed {new Date(completedAt).toLocaleDateString("en-GB")}.
          </p>
        </section>
      ) : (
        <>
          <section className="border border-border p-6 mt-6">
            <h2 className="label-editorial text-sm text-navy mb-3">Step 1 — Preview</h2>
            {preview ? (
              <PreviewSummary preview={preview} />
            ) : (
              <button
                type="button"
                onClick={loadPreview}
                disabled={busy}
                className="px-4 py-2 border border-border text-xs uppercase tracking-wider hover:bg-offwhite disabled:opacity-50"
              >
                {busy ? "Loading…" : "Run erasure preview"}
              </button>
            )}
          </section>

          {preview && preview.blockers.length === 0 && (
            <section className="border border-border p-6 mt-6">
              <h2 className="label-editorial text-sm text-navy mb-3">Step 2 — Confirm</h2>
              <p className="text-sm text-muted mb-4">
                Type the requester&apos;s email exactly to confirm. This action is
                irreversible.
              </p>
              <input
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                placeholder={request.requester.email}
                autoComplete="off"
                spellCheck={false}
                className="w-full border border-border bg-white px-3 py-2 mb-4 mono text-sm"
              />
              <button
                type="button"
                onClick={handleRun}
                disabled={busy || confirmEmail !== request.requester.email}
                className="px-4 py-2 bg-navy text-white text-xs uppercase tracking-wider hover:bg-mid-navy disabled:opacity-50"
              >
                {busy ? "Erasing…" : "Run erasure"}
              </button>
            </section>
          )}
        </>
      )}

      {error && <p className="mt-4 text-sm text-red-700" role="alert">{error}</p>}
    </div>
  );
}

function Header({ request }: { request: DataRightsRequest }) {
  return (
    <dl className="grid grid-cols-[140px_1fr] gap-y-1 text-sm bg-offwhite p-4 border border-border">
      <dt className="text-muted">Requester</dt>
      <dd className="text-navy">{request.requester.email}</dd>
      <dt className="text-muted">Created</dt>
      <dd className="mono text-xs">{request.createdAt.toLocaleString("en-GB")}</dd>
      <dt className="text-muted">Deadline</dt>
      <dd className="mono text-xs">{request.deadline.toLocaleString("en-GB")}</dd>
    </dl>
  );
}

function PreviewSummary({ preview }: { preview: ErasurePreview }) {
  return (
    <div className="text-sm">
      <ul className="space-y-1 mb-4">
        <li>Auth user: <strong>{preview.authUserExists ? "will be deleted" : "already gone"}</strong></li>
        <li>Customer doc: <strong>{preview.customerDocExists ? "will be deleted" : "no doc"}</strong></li>
        <li>Customer events: <strong>{preview.customerEventsCount}</strong> records will be deleted</li>
        <li>Enquiries: <strong>{preview.enquiriesCount}</strong> records will be deleted</li>
        <li>Orders: <strong>{preview.ordersToAnonymise}</strong> orders will be anonymised (NOT deleted)</li>
        <li>Audit log entries: <strong>{preview.auditLogScrubCount}</strong> entries will have PII scrubbed</li>
      </ul>

      {preview.blockers.length > 0 && (
        <div className="bg-compliance-amber-bg border border-compliance-amber-border p-3 text-compliance-amber-text">
          <p className="font-bold text-xs uppercase mb-2">Cannot proceed</p>
          <ul className="text-xs space-y-1">
            {preview.blockers.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
