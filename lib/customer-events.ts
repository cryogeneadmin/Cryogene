// lib/customer-events.ts
//
// Fire-and-forget customer-events writer. The customerEvents collection is
// rules-enforced admin-SDK-only and gated behind cookie consent. This module:
//   - ONLY uses .add(...) — never .update(), .set(), or .delete()
//   - Writes are dispatched on a microtask and never awaited by the caller
//     (analytics must never block the customer's request path)
//   - All writes are skipped entirely when cookie_consent != "accepted"
//   - The `email` and `uid` fields are populated when known; null otherwise
//   - sessionId is read from a cookie set by proxy.ts at the request edge
//     (Next.js 16 disallows cookie mutations from Server Components, so
//     this module never sets — only reads)
import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { getAdminDb } from "@/lib/firebase/admin";
import { getCustomerSession } from "@/lib/customer-auth";
import type {
  CustomerEventType,
  CustomerEventWritable,
} from "@/types/customer-events";

const SESSION_COOKIE = "cryogene_session_id";
const COOKIE_CONSENT_NAME = "cookie_consent";
const PAYLOAD_BYTE_CAP = 2048;

/**
 * Reads the proxy-minted session cookie. Returns a request-scoped fallback
 * UUID if the cookie is somehow missing (edge: very first request before
 * proxy responds, or contexts where the proxy matcher doesn't apply).
 * Never sets — proxy.ts handles minting.
 */
async function getSessionId(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? randomUUID();
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
  const byteLength = Buffer.byteLength(serialised, "utf-8");
  if (byteLength <= PAYLOAD_BYTE_CAP) return payload;
  return {
    __overSizeCap: true,
    __originalByteLength: byteLength,
  };
}

export type WriteCustomerEventInput = {
  eventType: CustomerEventType;
  payload?: Record<string, unknown>;
  /** Override email (used by checkout.delivery_submitted before session exists) */
  emailOverride?: string | null;
};

/**
 * Fire-and-forget. Resolves immediately; the entire body runs on a
 * microtask so the caller's request path is never blocked or affected by
 * a customer-events failure. The whole body is wrapped in try/catch — any
 * error (Firestore down, missing config, session lookup throw, anything)
 * is logged via console.warn and swallowed.
 *
 * Skipped entirely when cookie consent has not been granted.
 */
export function writeCustomerEvent(input: WriteCustomerEventInput): void {
  Promise.resolve()
    .then(async () => {
      try {
        if (!(await hasConsent())) return;

        const db = getAdminDb();
        if (!db) return;

        const sessionId = await getSessionId();
        const session = await getCustomerSession();

        const writable: CustomerEventWritable = {
          createdAt: Timestamp.now(),
          eventType: input.eventType,
          sessionId,
          uid: session?.uid ?? null,
          email:
            input.emailOverride !== undefined
              ? input.emailOverride
              : session?.email ?? null,
          payload: clampPayload(input.payload ?? {}),
        };

        await db.collection("customerEvents").add(writable);
      } catch (err) {
        console.warn(
          "[customer-events] write failed:",
          err,
          input.eventType,
        );
      }
    })
    .catch((err) => {
      // Defensive — Promise.resolve().then() can't reject in normal
      // operation, but if microtask scheduling itself fails we still
      // never want to surface to the caller.
      console.warn("[customer-events] microtask scheduling failed:", err);
    });
}
