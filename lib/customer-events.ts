// lib/customer-events.ts
//
// Fire-and-forget customer-events writer. The customerEvents collection is
// rules-enforced admin-SDK-only and gated behind cookie consent. This module:
//   - ONLY uses .add(...) — never .update(), .set(), or .delete()
//   - Writes are dispatched on a microtask and never awaited by the caller
//     (analytics must never block the customer's request path)
//   - All writes are skipped entirely when cookie_consent != "accepted"
//   - The `email` and `uid` fields are populated when known; null otherwise
//   - sessionId is minted from a 12-month httpOnly first-party cookie
import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { cookies, headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { getAdminDb } from "@/lib/firebase/admin";
import { getCustomerSession } from "@/lib/customer-auth";
import type {
  CustomerEventType,
  CustomerEventWritable,
} from "@/types/customer-events";

const SESSION_COOKIE = "cryogene_session_id";
const SESSION_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;       // 12 months
const COOKIE_CONSENT_NAME = "cookie_consent";
const PAYLOAD_BYTE_CAP = 2048;

/**
 * Reads or mints the session ID cookie. Always strictly-necessary (used for
 * checkout-session correlation), so it sets even before consent. Customer
 * events writes still gate on consent — see writeCustomerEvent.
 */
export async function getOrCreateSessionId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(SESSION_COOKIE)?.value;
  if (existing) return existing;

  const id = randomUUID();
  cookieStore.set(SESSION_COOKIE, id, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE,
  });
  return id;
}

async function hasConsent(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_CONSENT_NAME)?.value === "accepted";
}

function clampPayload(payload: Record<string, unknown>): Record<string, unknown> {
  let serialised: string;
  try {
    serialised = JSON.stringify(payload);
  } catch (err) {
    return {
      __serialiseFailed: true,
      __error: err instanceof Error ? err.message : String(err),
    };
  }
  if (Buffer.byteLength(serialised, "utf-8") <= PAYLOAD_BYTE_CAP) return payload;
  return {
    __overSizeCap: true,
    __originalByteLength: Buffer.byteLength(serialised, "utf-8"),
  };
}

export type WriteCustomerEventInput = {
  eventType: CustomerEventType;
  payload?: Record<string, unknown>;
  /** Override email (used by checkout.delivery_submitted before session exists) */
  emailOverride?: string | null;
};

/**
 * Fire-and-forget. Returns immediately; the write is dispatched on a
 * microtask. Failures are console.warn only — analytics must never block
 * customer flow. Skipped entirely if cookie consent has not been granted.
 */
export async function writeCustomerEvent(input: WriteCustomerEventInput): Promise<void> {
  if (!(await hasConsent())) return;

  const db = getAdminDb();
  if (!db) return;

  const sessionId = await getOrCreateSessionId();
  const session = await getCustomerSession();

  const writable: CustomerEventWritable = {
    createdAt: Timestamp.now(),
    eventType: input.eventType,
    sessionId,
    uid: session?.uid ?? null,
    email: input.emailOverride !== undefined
      ? input.emailOverride
      : session?.email ?? null,
    payload: clampPayload(input.payload ?? {}),
  };

  // Fire-and-forget: don't await the write, never block the caller
  Promise.resolve()
    .then(() => db.collection("customerEvents").add(writable))
    .catch((err) => console.warn("[customer-events] write failed:", err, input.eventType));
}
