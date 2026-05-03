// app/(admin)/admin/audit-log/actions.ts
"use server";

import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { assertAdmin } from "@/lib/admin-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { ALL_AUDIT_EVENT_TYPES } from "@/types/audit";
import type { AuditLog, AuditEventType } from "@/types/audit";

const PAGE_SIZE = 50;
const CSV_EXPORT_CAP = 10_000;

const QueryFiltersSchema = z.object({
  eventTypes: z.array(z.string()).optional(),
  fromDate: z.string().nullable().optional(),    // ISO date
  toDate: z.string().nullable().optional(),
  targetKind: z.enum(["order", "product", "user", "session"]).nullable().optional(),
  targetId: z.string().nullable().optional(),
  cursor: z.string().nullable().optional(),       // doc id of last seen row
});
export type QueryFilters = z.infer<typeof QueryFiltersSchema>;

function normaliseAuditDoc(id: string, data: FirebaseFirestore.DocumentData): AuditLog {
  const createdAt = data.createdAt instanceof Timestamp
    ? data.createdAt.toDate()
    : new Date(data.createdAt);
  return {
    id,
    createdAt,
    eventType: data.eventType,
    actor: data.actor ?? { type: "system", uid: null, email: null },
    target: data.target ?? { kind: null, id: null },
    before: data.before ?? null,
    after: data.after ?? null,
    snapshotAfter: data.snapshotAfter ?? null,
    metadata: data.metadata ?? {},
    ip: data.ip ?? null,
    userAgent: data.userAgent ?? null,
    prevHash: data.prevHash ?? null,
  };
}

export async function queryAuditLogs(filters: QueryFilters): Promise<{
  items: AuditLog[];
  nextCursor: string | null;
}> {
  await assertAdmin();
  const parsed = QueryFiltersSchema.parse(filters);
  const db = getAdminDb();
  if (!db) throw new Error("Firestore not configured");

  let query: FirebaseFirestore.Query = db.collection("auditLogs");

  // Index choice depends on which filters are active.
  if (parsed.targetKind && parsed.targetId) {
    query = query
      .where("target.kind", "==", parsed.targetKind)
      .where("target.id", "==", parsed.targetId);
  } else if (parsed.eventTypes && parsed.eventTypes.length > 0) {
    const validTypes = parsed.eventTypes.filter((t): t is AuditEventType =>
      (ALL_AUDIT_EVENT_TYPES as readonly string[]).includes(t)
    );
    if (validTypes.length > 0) {
      query = query.where("eventType", "in", validTypes);
    }
  }

  if (parsed.fromDate) {
    query = query.where("createdAt", ">=", Timestamp.fromDate(new Date(parsed.fromDate)));
  }
  if (parsed.toDate) {
    // Inclusive of the chosen calendar day — bump to end of day so events
    // from the date itself are returned. Without this, "to: today" returns
    // zero rows from today.
    const endOfDay = new Date(parsed.toDate);
    endOfDay.setUTCHours(23, 59, 59, 999);
    query = query.where("createdAt", "<=", Timestamp.fromDate(endOfDay));
  }

  query = query.orderBy("createdAt", "desc").limit(PAGE_SIZE + 1);

  if (parsed.cursor) {
    const cursorDoc = await db.collection("auditLogs").doc(parsed.cursor).get();
    if (cursorDoc.exists) {
      query = query.startAfter(cursorDoc);
    }
  }

  const snap = await query.get();
  const items = snap.docs.slice(0, PAGE_SIZE).map((d) => normaliseAuditDoc(d.id, d.data()));
  const nextCursor = snap.docs.length > PAGE_SIZE ? snap.docs[PAGE_SIZE - 1]!.id : null;

  return { items, nextCursor };
}

const CSV_HEADER = [
  "id",
  "createdAt",
  "eventType",
  "actorType",
  "actorUid",
  "actorEmail",
  "targetKind",
  "targetId",
  "ip",
  "metadata",
];

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "string" ? value : JSON.stringify(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function exportAuditLogsCsv(filters: QueryFilters): Promise<string> {
  await assertAdmin();
  const parsed = QueryFiltersSchema.parse(filters);
  const db = getAdminDb();
  if (!db) throw new Error("Firestore not configured");

  let query: FirebaseFirestore.Query = db.collection("auditLogs");
  if (parsed.targetKind && parsed.targetId) {
    query = query
      .where("target.kind", "==", parsed.targetKind)
      .where("target.id", "==", parsed.targetId);
  } else if (parsed.eventTypes && parsed.eventTypes.length > 0) {
    const validTypes = parsed.eventTypes.filter((t): t is AuditEventType =>
      (ALL_AUDIT_EVENT_TYPES as readonly string[]).includes(t)
    );
    if (validTypes.length > 0) query = query.where("eventType", "in", validTypes);
  }
  if (parsed.fromDate)
    query = query.where("createdAt", ">=", Timestamp.fromDate(new Date(parsed.fromDate)));
  if (parsed.toDate) {
    // Inclusive of the chosen calendar day — bump to end of day so events
    // from the date itself are returned. Without this, "to: today" returns
    // zero rows from today.
    const endOfDay = new Date(parsed.toDate);
    endOfDay.setUTCHours(23, 59, 59, 999);
    query = query.where("createdAt", "<=", Timestamp.fromDate(endOfDay));
  }

  query = query.orderBy("createdAt", "desc").limit(CSV_EXPORT_CAP);

  const snap = await query.get();
  const rows = [CSV_HEADER.join(",")];
  for (const doc of snap.docs) {
    const data = normaliseAuditDoc(doc.id, doc.data());
    rows.push(
      [
        csvEscape(data.id),
        csvEscape(data.createdAt.toISOString()),
        csvEscape(data.eventType),
        csvEscape(data.actor.type),
        csvEscape(data.actor.uid),
        csvEscape(data.actor.email),
        csvEscape(data.target.kind),
        csvEscape(data.target.id),
        csvEscape(data.ip),
        csvEscape(data.metadata),
      ].join(",")
    );
  }
  // RFC 4180 specifies CRLF; LF causes some legacy importers to merge rows.
  // The UTF-8 BOM is added client-side at download time (lets Excel detect
  // encoding on double-click without mojibake).
  return rows.join("\r\n");
}
