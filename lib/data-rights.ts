// lib/data-rights.ts
import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { SignJWT, jwtVerify } from "jose";
import { getAdminDb, getAdminAuthSdk } from "@/lib/firebase/admin";
import { writeAuditEvent } from "@/lib/audit-log";
import type {
  DataRightsRequest,
  DataRightsRequestWritable,
  DataRightType,
  DataRightSource,
  DataRightStatus,
} from "@/types/data-rights";

const SLA_DAYS = 30;
const VERIFICATION_TTL_HOURS = 24;
const MAX_PUBLIC_PER_IP_PER_DAY = 3;

function getJwtSecret(): Uint8Array {
  const raw = process.env.DATA_RIGHTS_JWT_SECRET;
  if (!raw) throw new Error("DATA_RIGHTS_JWT_SECRET is not configured");
  return new TextEncoder().encode(raw);
}

export async function signVerificationToken(
  requestId: string,
  email: string
): Promise<string> {
  return new SignJWT({ requestId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${VERIFICATION_TTL_HOURS}h`)
    .sign(getJwtSecret());
}

export async function verifyVerificationToken(
  token: string
): Promise<{ requestId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (typeof payload.requestId !== "string" || typeof payload.email !== "string") {
      return null;
    }
    return { requestId: payload.requestId, email: payload.email };
  } catch {
    return null;
  }
}

function normaliseRequest(
  id: string,
  data: FirebaseFirestore.DocumentData
): DataRightsRequest {
  const tsToDate = (v: unknown): Date | null =>
    v instanceof Timestamp ? v.toDate() : v ? new Date(v as string) : null;
  return {
    id,
    createdAt: tsToDate(data.createdAt) ?? new Date(),
    type: data.type,
    source: data.source,
    requester: {
      email: data.requester?.email ?? "",
      uid: data.requester?.uid ?? null,
      emailVerifiedAt: tsToDate(data.requester?.emailVerifiedAt),
    },
    status: data.status,
    deadline: tsToDate(data.deadline) ?? new Date(),
    respondedAt: tsToDate(data.respondedAt),
    responseArtefactRef: data.responseArtefactRef ?? null,
    rejectionReason: data.rejectionReason ?? null,
    notes: data.notes ?? null,
    slaWarningsSentAt: Array.isArray(data.slaWarningsSentAt)
      ? data.slaWarningsSentAt.map((ts: unknown) => tsToDate(ts)).filter((d): d is Date => d !== null)
      : [],
    message: data.message ?? null,
  };
}

export type CreateRequestInput = {
  type: DataRightType;
  source: DataRightSource;
  email: string;
  uid: string | null;
  message: string | null;
  /** True when identity is already proven (logged-in customer); skips
   *  email verification and starts the SLA clock immediately. */
  preVerified: boolean;
};

export async function createDataRightsRequest(
  input: CreateRequestInput
): Promise<{ id: string; status: "pending_email_verification" | "queued" }> {
  const db = getAdminDb();
  if (!db) throw new Error("Firestore not configured");

  const now = Timestamp.now();
  const status: DataRightStatus = input.preVerified ? "queued" : "pending_email_verification";
  const deadline = input.preVerified
    ? Timestamp.fromMillis(now.toMillis() + SLA_DAYS * 24 * 60 * 60 * 1000)
    : now; // placeholder; replaced when verification completes

  const writable: DataRightsRequestWritable = {
    createdAt: now,
    type: input.type,
    source: input.source,
    requester: {
      email: input.email,
      uid: input.uid,
      emailVerifiedAt: input.preVerified ? now : null,
    },
    status,
    deadline,
    respondedAt: null,
    responseArtefactRef: null,
    rejectionReason: null,
    notes: null,
    slaWarningsSentAt: [],
    message: input.message,
  };

  const ref = await db.collection("dataRightsRequests").add(writable);

  if (input.preVerified) {
    const auditEventType =
      input.type === "access" ? "customer.access_requested"
      : input.type === "rectification" ? "customer.rectification_requested"
      : input.type === "erasure" ? "customer.erasure_requested"
      : "customer.objection_received";

    await writeAuditEvent({
      // Cast removed in Section C when these event types are added to the enum.
      eventType: auditEventType as never,
      target: { kind: "user", id: input.uid },
      metadata: { requestId: ref.id, email: input.email, source: input.source },
    });
  }

  return { id: ref.id, status: status as "pending_email_verification" | "queued" };
}

export async function markRequestVerified(
  requestId: string,
  email: string
): Promise<{ ok: true; type: DataRightType } | { ok: false; reason: string }> {
  const db = getAdminDb();
  if (!db) throw new Error("Firestore not configured");
  const ref = db.doc(`dataRightsRequests/${requestId}`);

  const result = await db.runTransaction(async (txn) => {
    const snap = await txn.get(ref);
    if (!snap.exists) return { ok: false as const, reason: "not_found" };
    const data = snap.data()!;
    if (data.requester?.email !== email) {
      return { ok: false as const, reason: "email_mismatch" };
    }
    if (data.status !== "pending_email_verification") {
      return { ok: false as const, reason: "already_verified_or_complete" };
    }

    const now = Timestamp.now();
    const deadline = Timestamp.fromMillis(now.toMillis() + SLA_DAYS * 24 * 60 * 60 * 1000);

    // If a customer with this email exists, populate uid
    const auth = getAdminAuthSdk();
    let uid: string | null = data.requester?.uid ?? null;
    if (!uid && auth) {
      try {
        const user = await auth.getUserByEmail(email);
        uid = user.uid;
      } catch {
        uid = null;
      }
    }

    txn.update(ref, {
      status: "queued",
      deadline,
      "requester.emailVerifiedAt": now,
      "requester.uid": uid,
    });

    return { ok: true as const, type: data.type as DataRightType };
  });

  if (result.ok) {
    const auditEventType =
      result.type === "access" ? "customer.access_requested"
      : result.type === "rectification" ? "customer.rectification_requested"
      : result.type === "erasure" ? "customer.erasure_requested"
      : "customer.objection_received";

    await writeAuditEvent({
      // Cast removed in Section C when these event types are added to the enum.
      eventType: auditEventType as never,
      target: { kind: "user", id: null },
      metadata: { requestId, email, source: "public", verified: true },
    });
  }

  return result;
}

export async function getRequestById(id: string): Promise<DataRightsRequest | null> {
  const db = getAdminDb();
  if (!db) throw new Error("Firestore not configured");
  const snap = await db.doc(`dataRightsRequests/${id}`).get();
  return snap.exists ? normaliseRequest(snap.id, snap.data()!) : null;
}

export async function listRequests(
  filters: { status?: DataRightStatus; type?: DataRightType } = {}
): Promise<DataRightsRequest[]> {
  const db = getAdminDb();
  if (!db) throw new Error("Firestore not configured");
  let q: FirebaseFirestore.Query = db.collection("dataRightsRequests");
  if (filters.status) q = q.where("status", "==", filters.status);
  if (filters.type) q = q.where("type", "==", filters.type);
  q = q.orderBy("deadline", "asc").limit(200);
  const snap = await q.get();
  return snap.docs.map((d) => normaliseRequest(d.id, d.data()));
}

// Public-form rate limiting (cheap in-Firestore counter; not as robust as
// a dedicated rate-limit service but adequate for this scale).
export async function checkPublicFormRateLimit(ipHash: string): Promise<boolean> {
  const db = getAdminDb();
  if (!db) return true;
  const dayKey = new Date().toISOString().slice(0, 10);
  const ref = db.doc(`publicFormCounters/${ipHash}_${dayKey}`);
  const result = await db.runTransaction(async (txn) => {
    const snap = await txn.get(ref);
    const current = snap.exists ? (snap.data()?.count ?? 0) : 0;
    if (current >= MAX_PUBLIC_PER_IP_PER_DAY) return false;
    txn.set(ref, { count: current + 1, updatedAt: Timestamp.now() }, { merge: true });
    return true;
  });
  return result;
}
