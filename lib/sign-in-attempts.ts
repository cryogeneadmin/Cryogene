// lib/sign-in-attempts.ts
import "server-only";
import { createHash } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { writeAuditEvent } from "@/lib/audit-log";

const WINDOW_MS = 15 * 60 * 1000;       // 15 min rolling window
const THRESHOLD = 5;                    // emit audit after Nth failure

function ipHash(ip: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex");
}

/**
 * Called on a failed sign-in attempt. Increments the IP's counter inside a
 * transaction; if this attempt crosses the threshold and we haven't already
 * fired for this window, emits auth.login_failed_threshold.
 */
export async function recordFailedSignIn(ip: string | null, attemptedEmail: string | null): Promise<void> {
  const hash = ipHash(ip);
  if (!hash) return;
  const db = getAdminDb();
  if (!db) return;

  const ref = db.collection("signInAttempts").doc(hash);

  let shouldFireThreshold = false;
  let totalFailures = 0;

  await db.runTransaction(async (txn) => {
    const snap = await txn.get(ref);
    const now = Timestamp.now();
    const nowMs = now.toMillis();

    if (!snap.exists) {
      txn.set(ref, {
        ipHash: hash,
        failures: 1,
        windowStartedAt: now,
        lastFailureAt: now,
        thresholdFiredAt: null,
      });
      totalFailures = 1;
      return;
    }

    const data = snap.data()!;
    const windowStartedAt = data.windowStartedAt;
    const windowStartedAtMs =
      windowStartedAt instanceof Timestamp ? windowStartedAt.toMillis() : 0;
    const windowExpired =
      windowStartedAtMs === 0 || nowMs - windowStartedAtMs > WINDOW_MS;

    if (windowExpired) {
      txn.update(ref, {
        failures: 1,
        windowStartedAt: now,
        lastFailureAt: now,
        thresholdFiredAt: null,
      });
      totalFailures = 1;
      return;
    }

    const newCount = (data.failures ?? 0) + 1;
    const alreadyFired = !!data.thresholdFiredAt;

    txn.update(ref, {
      failures: newCount,
      lastFailureAt: now,
      ...(newCount >= THRESHOLD && !alreadyFired
        ? { thresholdFiredAt: now }
        : {}),
    });

    totalFailures = newCount;
    shouldFireThreshold = newCount >= THRESHOLD && !alreadyFired;
  });

  if (shouldFireThreshold) {
    await writeAuditEvent({
      eventType: "auth.login_failed_threshold",
      actor: { type: "anonymous", uid: null, email: null },
      target: { kind: "session", id: hash.slice(0, 12) },
      metadata: {
        ipHash: hash,
        attemptedEmail: attemptedEmail ?? "(unknown)",
        thresholdFailures: totalFailures,
        windowMinutes: WINDOW_MS / 60_000,
      },
    });
  }
}

/**
 * Called on a successful sign-in to clear that IP's counter.
 */
export async function clearFailedSignIns(ip: string | null): Promise<void> {
  const hash = ipHash(ip);
  if (!hash) return;
  const db = getAdminDb();
  if (!db) return;
  await db
    .collection("signInAttempts")
    .doc(hash)
    .delete()
    .catch((err) => {
      console.warn("[sign-in-attempts] clearFailedSignIns delete failed:", err);
    });
}
