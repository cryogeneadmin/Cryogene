// app/(public)/account/data/AccountDataClient.tsx
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

export function AccountDataClient({
  customerEmail,
  orderCount,
  createdAt,
  marketingGranted,
}: {
  customerEmail: string;
  orderCount: number;
  createdAt: string | null;
  marketingGranted: boolean;
}) {
  const [granted, setGranted] = useState(marketingGranted);
  const [busy, setBusy] = useState(false);
  const [accessSent, setAccessSent] = useState(false);
  const [erasureSent, setErasureSent] = useState(false);
  const [showErasureConfirm, setShowErasureConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function toggleMarketing(next: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/data-rights/objection", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ granted: next, source: "withdrawal" }),
      });
      if (!res.ok) {
        setError("Could not update preference. Please try again.");
        return;
      }
      // Sync UI to the persisted state from the response (defends against
      // edge cases where audit/email failed but consent did land).
      const json = (await res.json().catch(() => null)) as { granted?: boolean } | null;
      setGranted(json?.granted ?? next);
    } finally {
      setBusy(false);
    }
  }

  async function requestAccess() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/data-rights/access", { method: "POST" });
      if (!res.ok) {
        setError("Could not submit access request. Please try again.");
        return;
      }
      setAccessSent(true);
    } finally {
      setBusy(false);
    }
  }

  async function requestErasure() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/data-rights/erasure", { method: "POST" });
      if (!res.ok) {
        setError("Could not submit erasure request. Please try again.");
        return;
      }
      setErasureSent(true);
      setShowErasureConfirm(false);
    } finally {
      setBusy(false);
    }
  }

  // suppress unused-import warning for startTransition (kept for future use)
  void startTransition;

  return (
    <div className="space-y-8">
      <section className="bg-offwhite border border-border p-6">
        <h2 className="font-serif text-xl text-navy mb-3">Your data summary</h2>
        <dl className="grid grid-cols-[140px_1fr] gap-y-1 text-sm">
          <dt className="text-muted">Email</dt>
          <dd className="text-navy">{customerEmail}</dd>
          <dt className="text-muted">Orders</dt>
          <dd className="text-navy">{orderCount}</dd>
          {createdAt && (
            <>
              <dt className="text-muted">Account opened</dt>
              <dd className="text-navy mono text-xs">
                {new Date(createdAt).toLocaleDateString("en-GB")}
              </dd>
            </>
          )}
        </dl>
      </section>

      <section className="border border-border p-6">
        <h2 className="font-serif text-xl text-navy mb-3">Marketing emails</h2>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={granted}
            disabled={busy}
            onChange={(e) => toggleMarketing(e.target.checked)}
            className="mt-1 accent-navy"
          />
          <span className="text-sm text-navy">
            Email me about new products and special offers. You can unsubscribe
            at any time.
          </span>
        </label>
      </section>

      <section className="border border-border p-6">
        <h2 className="font-serif text-xl text-navy mb-3">Download your data</h2>
        <p className="text-sm text-muted mb-4">
          We&apos;ll prepare a ZIP containing your profile, orders, and a record of
          our data interactions. You&apos;ll receive an email within 30 days.
        </p>
        {accessSent ? (
          <p className="text-sm text-navy">
            Request received. We&apos;ll email you the bundle.
          </p>
        ) : (
          <button
            type="button"
            onClick={requestAccess}
            disabled={busy}
            className="px-4 py-2 bg-navy text-white text-xs uppercase tracking-wider hover:bg-mid-navy disabled:opacity-50"
          >
            Request data export
          </button>
        )}
      </section>

      <section className="border border-border p-6">
        <h2 className="font-serif text-xl text-navy mb-3">Update your details</h2>
        <Link
          href="/account/settings"
          className="text-sm text-blue underline hover:no-underline"
        >
          Go to account settings →
        </Link>
      </section>

      <section className="border border-border p-6">
        <h2 className="font-serif text-xl text-navy mb-3">Close your account</h2>
        <p className="text-sm text-muted mb-4">
          We&apos;ll erase your personal data. Order records are retained anonymously
          for 6 years to satisfy HMRC tax-record requirements (UK Companies Act).
        </p>
        {erasureSent ? (
          <p className="text-sm text-navy">
            Erasure request queued. We&apos;ll email you when it completes.
          </p>
        ) : !showErasureConfirm ? (
          <button
            type="button"
            onClick={() => setShowErasureConfirm(true)}
            className="px-4 py-2 border border-navy text-navy text-xs uppercase tracking-wider hover:bg-offwhite"
          >
            Close my account
          </button>
        ) : (
          <div className="bg-compliance-amber-bg border border-compliance-amber-border p-4">
            <p className="text-sm text-compliance-amber-text mb-3">
              Are you sure? This will erase your account. Orders are retained
              anonymously and you&apos;ll lose access to past order records.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={requestErasure}
                disabled={busy}
                className="px-4 py-2 bg-navy text-white text-xs uppercase tracking-wider"
              >
                Yes, queue erasure
              </button>
              <button
                type="button"
                onClick={() => setShowErasureConfirm(false)}
                className="px-4 py-2 border border-border text-xs uppercase tracking-wider"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {error && <p className="text-sm text-red-700" role="alert" aria-live="polite">{error}</p>}
    </div>
  );
}
