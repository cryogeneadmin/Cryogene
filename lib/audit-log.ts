// lib/audit-log.ts
import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { headers } from "next/headers";
import { getAdminDb } from "@/lib/firebase/admin";
import { getCustomerSession } from "@/lib/customer-auth";
import type {
  AuditLog,
  AuditEventType,
  AuditActorType,
  AuditTargetKind,
  AuditLogWritable,
} from "@/types/audit";

const SNAPSHOT_BYTE_CAP = 2048;
const METADATA_BYTE_CAP = 2048;
const USER_AGENT_CHAR_CAP = 200;

function clampJsonObject(
  obj: Record<string, unknown> | null,
  cap: number
): Record<string, unknown> | null {
  if (obj === null) return null;
  const serialised = JSON.stringify(obj);
  if (Buffer.byteLength(serialised, "utf-8") <= cap) return obj;
  // Over cap — replace with a single marker key so downstream readers see
  // intent rather than silent truncation.
  return { __overSizeCap: true, __originalByteLength: Buffer.byteLength(serialised, "utf-8") };
}

export type WriteAuditEventInput = {
  eventType: AuditEventType;
  actor?: {
    type: AuditActorType;
    uid: string | null;
    email: string | null;
  };
  target: {
    kind: AuditTargetKind;
    id: string | null;
  };
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  snapshotAfter?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
};

/**
 * Write an audit event. If `actor` is omitted, the helper resolves it from
 * the current request session (admin or customer). Failures are logged to
 * console and swallowed — auditing must never break the user's path.
 */
export async function writeAuditEvent(input: WriteAuditEventInput): Promise<void> {
  try {
    const db = getAdminDb();
    if (!db) {
      console.warn("[audit-log] Firestore not configured; event dropped:", input.eventType);
      return;
    }

    let actor = input.actor;
    if (!actor) {
      const session = await getCustomerSession();
      if (session?.admin) {
        actor = { type: "admin", uid: session.uid, email: session.email };
      } else if (session) {
        actor = { type: "customer", uid: session.uid, email: session.email };
      } else {
        actor = { type: "anonymous", uid: null, email: null };
      }
    }

    const hdrs = await headers();
    const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const userAgent = hdrs.get("user-agent")?.slice(0, USER_AGENT_CHAR_CAP) ?? null;

    const writable: AuditLogWritable = {
      createdAt: Timestamp.now(),
      eventType: input.eventType,
      actor,
      target: input.target,
      before: input.before ?? null,
      after: input.after ?? null,
      snapshotAfter: clampJsonObject(input.snapshotAfter ?? null, SNAPSHOT_BYTE_CAP),
      metadata: clampJsonObject(input.metadata ?? {}, METADATA_BYTE_CAP) ?? {},
      ip,
      userAgent,
      prevHash: null,            // reserved for forensic-hardening upsell
    };

    await db.collection("auditLogs").add(writable);
  } catch (err) {
    console.warn("[audit-log] write failed:", err, "event:", input.eventType);
  }
}

/**
 * Wraps a server action so a successful run automatically writes an audit
 * event. The wrapped action runs first; only on resolution does the audit
 * event fire. Throws from the wrapped action propagate normally — failed
 * actions do NOT emit events (would be misleading).
 */
export function withAudit<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
  eventBuilder: (
    args: TArgs,
    result: TResult
  ) => WriteAuditEventInput | Promise<WriteAuditEventInput>
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs) => {
    const result = await action(...args);
    try {
      const input = await eventBuilder(args, result);
      await writeAuditEvent(input);
    } catch (err) {
      console.warn("[withAudit] eventBuilder failed:", err);
    }
    return result;
  };
}
