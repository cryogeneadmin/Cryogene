// lib/marketing-consent.ts
import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { getAdminDb } from "@/lib/firebase/admin";
import type {
  ConsentSource,
  MarketingConsent,
  MarketingConsentEntryWritable,
} from "@/types/data-rights";

function ipHash(ip: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex");
}

/**
 * Update a customer's marketing-consent state and append a history entry.
 * Called from: checkout (granting at order time), signup, /account/data
 * toggle, public /data-rights objection, unsubscribe link.
 *
 * Append-only audit log: repeat calls produce repeat history entries by
 * design — the entries are the authoritative trail. The customer doc
 * `marketingConsent` field is overwritten each call (latest state),
 * preserving `grantedAt` only when the previous state was already granted
 * so re-confirmations don't reset the original grant time.
 */
export async function setMarketingConsent(
  uid: string,
  granted: boolean,
  source: ConsentSource
): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Firestore not configured");

  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = hdrs.get("user-agent")?.slice(0, 512) ?? null;
  const now = Timestamp.now();

  const consent: Omit<MarketingConsent, "grantedAt" | "withdrawnAt"> & {
    grantedAt: Timestamp | null;
    withdrawnAt: Timestamp | null;
  } = {
    granted,
    grantedAt: granted ? now : null,
    withdrawnAt: !granted ? now : null,
    source,
  };

  const customerRef = db.doc(`customers/${uid}`);
  const historyRef = customerRef.collection("marketingConsentHistory").doc();

  const entry: MarketingConsentEntryWritable = {
    granted,
    changedAt: now,
    source,
    ipHash: ipHash(ip),
    userAgent,
  };

  await db.runTransaction(async (txn) => {
    const customerSnap = await txn.get(customerRef);
    if (!customerSnap.exists) {
      throw new Error(`Customer ${uid} does not exist`);
    }

    // Preserve existing grantedAt if state was already granted and we're
    // re-confirming — only stamp a new grantedAt when state changes from
    // not-granted to granted.
    const existing = customerSnap.data()?.marketingConsent;
    const existingGranted = existing?.granted === true;
    const finalConsent = {
      ...consent,
      grantedAt:
        granted && existingGranted && existing?.grantedAt
          ? existing.grantedAt
          : consent.grantedAt,
    };

    txn.update(customerRef, { marketingConsent: finalConsent });
    txn.set(historyRef, entry);
  });
}

/**
 * Read current consent state. Returns a default 'not granted' if the field
 * is absent (legacy customers from before this migration).
 */
export async function getMarketingConsent(uid: string): Promise<MarketingConsent> {
  const db = getAdminDb();
  if (!db) throw new Error("Firestore not configured");
  const snap = await db.doc(`customers/${uid}`).get();
  const data = snap.data();
  if (!data?.marketingConsent) {
    return {
      granted: false,
      grantedAt: null,
      withdrawnAt: null,
      source: "legacy",
    };
  }
  const c = data.marketingConsent;
  return {
    granted: c.granted === true,
    grantedAt: c.grantedAt instanceof Timestamp ? c.grantedAt.toDate() : null,
    withdrawnAt: c.withdrawnAt instanceof Timestamp ? c.withdrawnAt.toDate() : null,
    source: c.source ?? "withdrawal",
  };
}
