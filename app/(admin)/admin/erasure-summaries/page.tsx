import { Suspense } from "react";
import { connection } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { assertAdmin } from "@/lib/admin-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { SkeletonRows } from "@/components/ui/Skeleton";

type ErasureSummary = {
  id: string;
  createdAt: Date;
  requestId: string;
  identityHash: string;
  uidWasResolved: boolean;
  erasedFields: string[];
  ordersAnonymised: number;
  eventsDeleted: number;
  auditLogsScrubbed: number;
};

async function loadSummaries(): Promise<ErasureSummary[]> {
  const db = getAdminDb();
  if (!db) return [];
  const snap = await db
    .collection("erasureSummaries")
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();
  return snap.docs.map((d) => {
    const data = d.data();
    const createdAt = data.createdAt instanceof Timestamp
      ? data.createdAt.toDate()
      : new Date();
    return {
      id: d.id,
      createdAt,
      requestId: data.requestId ?? "",
      identityHash: data.identityHash ?? "",
      uidWasResolved: data.uidWasResolved === true,
      erasedFields: Array.isArray(data.erasedFields) ? data.erasedFields : [],
      ordersAnonymised: data.ordersAnonymised ?? 0,
      eventsDeleted: data.eventsDeleted ?? 0,
      auditLogsScrubbed: data.auditLogsScrubbed ?? 0,
    };
  });
}

async function ErasureSummariesContent() {
  await connection();
  await assertAdmin();
  const summaries = await loadSummaries();

  if (summaries.length === 0) {
    return (
      <p className="py-12 text-center text-muted">
        No erasure summaries yet. Each completed erasure writes one row here
        for regulator-evidence purposes.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {summaries.map((s) => (
        <li
          key={s.id}
          className="px-4 py-3 grid grid-cols-[160px_1fr_280px] gap-3 text-sm items-baseline"
        >
          <span className="mono text-xs text-muted">
            {s.createdAt.toLocaleString("en-GB")}
          </span>
          <div>
            <p className="mono text-xs text-navy">{s.identityHash}</p>
            <p className="text-xs text-muted mt-0.5">
              Request{" "}
              <a
                href={`/admin/data-rights/${s.requestId}`}
                className="underline hover:no-underline"
              >
                {s.requestId.slice(0, 12)}…
              </a>
              {!s.uidWasResolved && (
                <span className="ml-2 text-compliance-amber-text">
                  (uid not resolved at run time)
                </span>
              )}
            </p>
          </div>
          <div className="text-xs text-muted text-right">
            {s.ordersAnonymised} orders · {s.eventsDeleted} events ·{" "}
            {s.auditLogsScrubbed} audit entries
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function ErasureSummariesPage() {
  return (
    <div className="p-6">
      <h1 className="font-serif text-3xl text-navy mb-2">Erasure summaries</h1>
      <p className="text-sm text-muted mb-6">
        Append-only record of every completed erasure. The identity hash is
        deterministic — to find the summary for a specific customer, compute{" "}
        <code className="mono">
          erased+&lt;sha256(uid).slice(0,12)&gt;@cryogenelaboratories.co.uk
        </code>{" "}
        from the original request and search.
      </p>
      <Suspense fallback={<SkeletonRows count={6} />}>
        <ErasureSummariesContent />
      </Suspense>
    </div>
  );
}
