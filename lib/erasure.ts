// lib/erasure.ts
//
// UK-GDPR Art. 17 erasure executor. Performs partial-erasure (anonymisation)
// on orders to satisfy HMRC's 6-year tax-record retention while removing
// all PII; full deletion on customer/events/enquiries/auth; PII-scrub on
// auditLogs entries that referenced the customer.
//
// Idempotent — re-running on an already-erased customer is a no-op.
import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { createHash } from "node:crypto";
import { getAdminDb, getAdminAuthSdk } from "@/lib/firebase/admin";

const ERASED_FIELDS = ["email", "name", "phone", "address.line1", "address.line2"] as const;

// Keys whose VALUES we replace with "[erased]" inside any nested object
// during audit-log scrubbing. Address line fields use the order/customer
// shape ({line1, line2, city, postcode, country}) — line1/line2 are PII;
// city/postcode/country are kept as VAT-aggregate signals (non-PII at
// e-commerce scale).
const PII_FIELD_NAMES = new Set([
  "email",
  "name",
  "phone",
  "line1",
  "line2",
]);

export type ErasurePreviewResult = {
  authUserExists: boolean;
  customerDocExists: boolean;
  customerEventsCount: number;
  enquiriesCount: number;
  ordersToAnonymise: number;
  auditLogScrubCount: number;
  blockers: string[];
};

export type ErasureInput = {
  email: string;
  uid: string | null;
  requestId: string;
};

export type ErasureResult =
  | {
      ok: true;
      summaryId: string;
      ordersAnonymised: number;
      eventsDeleted: number;
      auditLogsScrubbed: number;
    }
  | { ok: false; reason: string };

function erasedEmailFor(uid: string | null, email: string): string {
  const seed = uid ?? email;
  const hash = createHash("sha256").update(seed).digest("hex").slice(0, 12);
  return `erased+${hash}@cryogenelaboratories.co.uk`;
}

/**
 * Recursively walk a value and replace any object key that matches a PII
 * field name with the literal "[erased]". Does not mutate the input.
 */
function piiScrub(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(piiScrub);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (PII_FIELD_NAMES.has(key)) {
        out[key] = "[erased]";
      } else {
        out[key] = piiScrub(v);
      }
    }
    return out;
  }
  return value;
}

export async function previewErasure(input: { email: string; uid: string | null }): Promise<ErasurePreviewResult> {
  const db = getAdminDb();
  const auth = getAdminAuthSdk();
  if (!db || !auth) {
    return {
      authUserExists: false,
      customerDocExists: false,
      customerEventsCount: 0,
      enquiriesCount: 0,
      ordersToAnonymise: 0,
      auditLogScrubCount: 0,
      blockers: ["Firestore or Auth admin SDK not configured"],
    };
  }

  // Resolve uid if missing
  let resolvedUid = input.uid;
  let authUserExists = false;
  if (resolvedUid) {
    try {
      await auth.getUser(resolvedUid);
      authUserExists = true;
    } catch {
      authUserExists = false;
    }
  } else {
    try {
      const u = await auth.getUserByEmail(input.email);
      resolvedUid = u.uid;
      authUserExists = true;
    } catch {
      authUserExists = false;
    }
  }

  const blockers: string[] = [];

  // Open-order check
  let openOrders = 0;
  if (resolvedUid) {
    const openSnap = await db
      .collection("orders")
      .where("customer.uid", "==", resolvedUid)
      .where("status", "in", ["pending", "paid"])
      .get();
    openOrders = openSnap.size;
    if (openOrders > 0) {
      blockers.push(
        `Customer has ${openOrders} open order(s) (status pending/paid). Complete or cancel before erasure.`
      );
    }
  }

  // Counts (best-effort by uid OR email)
  const customerEvents = resolvedUid
    ? await db.collection("customerEvents").where("uid", "==", resolvedUid).count().get()
    : await db.collection("customerEvents").where("email", "==", input.email).count().get();

  const enquiries = await db.collection("enquiries").where("email", "==", input.email).count().get();

  const orders = resolvedUid
    ? await db.collection("orders").where("customer.uid", "==", resolvedUid).count().get()
    : null;

  // Audit-log scrub queries both axes (actor + target.id when target.kind=user).
  // Use Promise.all + sum the counts; some entries may match both, so the
  // count is an upper bound — close enough for a preview.
  let auditLogScrubCount = 0;
  if (resolvedUid) {
    const [actorCount, targetCount] = await Promise.all([
      db.collection("auditLogs").where("actor.uid", "==", resolvedUid).count().get(),
      db
        .collection("auditLogs")
        .where("target.kind", "==", "user")
        .where("target.id", "==", resolvedUid)
        .count()
        .get(),
    ]);
    auditLogScrubCount = (actorCount.data().count ?? 0) + (targetCount.data().count ?? 0);
  }

  const customerDoc = resolvedUid ? await db.doc(`customers/${resolvedUid}`).get() : null;

  return {
    authUserExists,
    customerDocExists: !!customerDoc?.exists,
    customerEventsCount: customerEvents.data().count ?? 0,
    enquiriesCount: enquiries.data().count ?? 0,
    ordersToAnonymise: orders?.data().count ?? 0,
    auditLogScrubCount,
    blockers,
  };
}

async function deleteCollectionByQuery(
  db: FirebaseFirestore.Firestore,
  query: FirebaseFirestore.Query,
  batchSize: number = 500
): Promise<number> {
  let total = 0;
  while (true) {
    const snap = await query.limit(batchSize).get();
    if (snap.empty) return total;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    total += snap.size;
    if (snap.size < batchSize) return total;
  }
}

export async function runErasure(input: ErasureInput): Promise<ErasureResult> {
  if (!input.requestId || input.requestId.length === 0) {
    return { ok: false, reason: "Erasure requires a valid requestId" };
  }

  const db = getAdminDb();
  const auth = getAdminAuthSdk();
  if (!db || !auth) return { ok: false, reason: "Firestore or Auth not configured" };

  // Resolve uid if missing — match preview behaviour
  let uid = input.uid;
  if (!uid) {
    try {
      const u = await auth.getUserByEmail(input.email);
      uid = u.uid;
    } catch {
      uid = null;
    }
  }

  // Pre-flight: re-check open orders (preview was advisory; the actual gate is here)
  if (uid) {
    const openSnap = await db
      .collection("orders")
      .where("customer.uid", "==", uid)
      .where("status", "in", ["pending", "paid"])
      .get();
    if (openSnap.size > 0) {
      return {
        ok: false,
        reason: `Customer has ${openSnap.size} open order(s); complete or cancel before erasure.`,
      };
    }
  }

  // 1. Delete auth user (idempotent — no-op if already deleted)
  if (uid) {
    try { await auth.deleteUser(uid); } catch (err) {
      console.warn("[erasure] auth.deleteUser failed (may already be gone):", err);
    }
  }

  // 2. Delete customer doc + history subcollection
  if (uid) {
    const historyRef = db.collection(`customers/${uid}/marketingConsentHistory`);
    await deleteCollectionByQuery(db, historyRef);
    await db.doc(`customers/${uid}`).delete().catch(() => {});
  }

  // 3. Delete customerEvents (by uid AND by email — covers anon sessions
  //    that were later identified)
  let eventsDeleted = 0;
  if (uid) {
    eventsDeleted += await deleteCollectionByQuery(
      db,
      db.collection("customerEvents").where("uid", "==", uid)
    );
  }
  eventsDeleted += await deleteCollectionByQuery(
    db,
    db.collection("customerEvents").where("email", "==", input.email)
  );

  // 4. Delete enquiries (by email — enquiries are not uid-bound)
  await deleteCollectionByQuery(
    db,
    db.collection("enquiries").where("email", "==", input.email)
  );

  // Note: orders are uid-keyed (customer.uid). If uid resolution failed
  // earlier, no orders will be found and none will be anonymised. If a
  // future contributor adds an email-based order anonymise path, the
  // open-order pre-flight (above) MUST be extended to query by email
  // too — otherwise a customer's open orders could be anonymised
  // mid-flight, breaking fulfilment and HMRC reconciliation.

  // 5. Anonymise orders (NOT delete — HMRC 6-year retention)
  let ordersAnonymised = 0;
  if (uid) {
    const orderSnap = await db
      .collection("orders")
      .where("customer.uid", "==", uid)
      .get();
    const replacementEmail = erasedEmailFor(uid, input.email);
    const batchSize = 400;
    for (let i = 0; i < orderSnap.docs.length; i += batchSize) {
      const batch = db.batch();
      const slice = orderSnap.docs.slice(i, i + batchSize);
      for (const d of slice) {
        batch.update(d.ref, {
          "customer.email": replacementEmail,
          "customer.name": "Erased Customer",
          "customer.phone": null,
          "customer.uid": null,
          "customer.address.line1": null,
          "customer.address.line2": null,
          erasedAt: Timestamp.now(),
          erasureRequestId: input.requestId,
        });
      }
      await batch.commit();
      ordersAnonymised += slice.length;
    }
  }

  // 6. Scrub PII from audit logs — entries where customer is the actor
  //    OR the target. Spec requires both axes; an admin action ON this
  //    customer would otherwise leave PII in before/after/snapshotAfter.
  let auditLogsScrubbed = 0;
  if (uid) {
    const replacementEmail = erasedEmailFor(uid, input.email);

    // Run two queries; dedupe by doc.id since some entries may match both.
    const [actorSnap, targetSnap] = await Promise.all([
      db.collection("auditLogs").where("actor.uid", "==", uid).get(),
      db
        .collection("auditLogs")
        .where("target.kind", "==", "user")
        .where("target.id", "==", uid)
        .get(),
    ]);

    const seen = new Set<string>();
    const docs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    for (const d of [...actorSnap.docs, ...targetSnap.docs]) {
      if (seen.has(d.id)) continue;
      seen.add(d.id);
      docs.push(d);
    }

    const batchSize = 400;
    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = db.batch();
      const slice = docs.slice(i, i + batchSize);
      for (const d of slice) {
        const data = d.data();
        const wasActor = data.actor?.uid === uid;
        const update: Record<string, unknown> = {
          before: piiScrub(data.before),
          after: piiScrub(data.after),
          snapshotAfter: piiScrub(data.snapshotAfter),
        };
        // Only scrub the actor block if this customer WAS the actor.
        // Don't overwrite an admin actor with the customer's replacement.
        if (wasActor) {
          update["actor.email"] = replacementEmail;
          update["actor.uid"] = null;
        }
        batch.update(d.ref, update);
      }
      await batch.commit();
      auditLogsScrubbed += slice.length;
    }
  }

  // 7. Write summary doc for evidence retention. Captures identity via the
  //    deterministic erasedEmailFor hash so a regulator looking up "what
  //    happened to jane@example.com" can compute her hash and find this
  //    summary. The dataRightsRequests doc id is the second axis. No raw
  //    PII stored here — that would defeat the purpose of erasure.
  const identityHash = erasedEmailFor(uid, input.email);
  const summaryRef = await db.collection("erasureSummaries").add({
    createdAt: Timestamp.now(),
    requestId: input.requestId,
    identityHash,
    uidWasResolved: uid !== null,
    erasedFields: ERASED_FIELDS,
    ordersAnonymised,
    eventsDeleted,
    auditLogsScrubbed,
  });

  return {
    ok: true,
    summaryId: summaryRef.id,
    ordersAnonymised,
    eventsDeleted,
    auditLogsScrubbed,
  };
}
