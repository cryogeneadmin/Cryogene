import { Suspense } from "react";
import { connection } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { DispatchClient } from "./DispatchClient";
import type { Order } from "@/types";
import type { DispatchBatchRun } from "@/types/dispatch";

async function getDispatchQueue(): Promise<Order[]> {
  const db = getAdminDb();
  if (!db) return [];

  // Two-pass: paid+unprinted (or failed), then paid+printed-not-dispatched.
  const unprintedSnap = await db
    .collection("orders")
    .where("status", "==", "paid")
    .where("fulfilment.printerStatus", "in", [null, "failed"])
    .orderBy("createdAt", "asc")
    .get();
  const printedSnap = await db
    .collection("orders")
    .where("status", "==", "paid")
    .where("fulfilment.printerStatus", "==", "printed")
    .where("fulfilment.dispatchedAt", "==", null)
    .orderBy("createdAt", "asc")
    .get();

  const all = [...unprintedSnap.docs, ...printedSnap.docs].map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Order, "id">),
  }));
  return all;
}

async function getLastBatchRun(): Promise<DispatchBatchRun | null> {
  const db = getAdminDb();
  if (!db) return null;
  const snap = await db
    .collection("dispatchBatchRuns")
    .orderBy("startedAt", "desc")
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  return { id: doc.id, ...(doc.data() as Omit<DispatchBatchRun, "id">) };
}

async function DispatchContent() {
  await connection();
  const [orders, lastRun] = await Promise.all([getDispatchQueue(), getLastBatchRun()]);
  return <DispatchClient orders={orders} lastBatchRun={lastRun} />;
}

export default function AdminDispatchPage() {
  return (
    <div>
      <h1 className="text-4xl mb-2">Dispatch</h1>
      <p className="mb-8 text-muted">
        Paid orders awaiting label generation and dispatch.
      </p>
      <Suspense fallback={<p>Loading dispatch queue…</p>}>
        <DispatchContent />
      </Suspense>
    </div>
  );
}
