// lib/data-export.ts
import "server-only";
import JSZip from "jszip";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb, getAdminStorageSdk } from "@/lib/firebase/admin";

type ExportInput = { email: string; uid: string | null; requestId: string };

function tsToIso(v: unknown): string {
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (v instanceof Date) return v.toISOString();
  return "";
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "string" ? value : JSON.stringify(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv<T extends Record<string, unknown>>(rows: T[], columns: (keyof T)[]): string {
  const header = columns.join(",");
  const body = rows.map((r) =>
    columns.map((c) => csvEscape(r[c])).join(",")
  );
  return [header, ...body].join("\r\n");
}

const README = `Cryogene Laboratories — your data export
=========================================

This bundle contains everything we hold on you, in two formats:

- *.csv — opens in Excel, Google Sheets, or any text editor
- *.json — machine-readable for portability under UK GDPR Art. 20

Files included:
- profile.json: your customer profile
- orders.csv / orders.json: every order you've placed
- customer-events.csv: anonymised analytics signals
- audit-log.csv: our internal audit-trail entries that reference you
- enquiries.csv: messages you've sent us via the contact form
- marketing-consent-history.csv: provenance of marketing consent changes

Questions? Email Cryogene at the address on our /contact page.

This export was generated under your right of access (UK GDPR Art. 15).
You also have the right to rectification, erasure, and to object to direct
marketing — see https://cryogene.co.uk/data-rights.
`;

export async function buildAccessExport(input: ExportInput): Promise<{ downloadUrl: string }> {
  const db = getAdminDb();
  const storage = getAdminStorageSdk();
  if (!db || !storage) throw new Error("Firestore or Storage admin SDK not configured");

  const zip = new JSZip();
  zip.file("README.txt", README);

  // Profile
  if (input.uid) {
    const customerSnap = await db.doc(`customers/${input.uid}`).get();
    if (customerSnap.exists) {
      zip.file(
        "profile.json",
        JSON.stringify({ ...customerSnap.data(), id: customerSnap.id }, null, 2)
      );
    }
  }

  // Orders (uid OR email)
  const orderQuery = input.uid
    ? db.collection("orders").where("customer.uid", "==", input.uid)
    : db.collection("orders").where("customer.email", "==", input.email);
  const orderSnap = await orderQuery.get();
  const orderRows = orderSnap.docs.map((d) => ({
    id: d.id,
    orderNumber: (d.data().orderNumber ?? "") as string,
    status: (d.data().status ?? "") as string,
    createdAt: tsToIso(d.data().createdAt),
    totalInPence: (d.data().totalInPence ?? 0) as number,
  }));
  zip.file("orders.csv", toCsv(orderRows, ["id", "orderNumber", "status", "createdAt", "totalInPence"]));
  zip.file(
    "orders.json",
    JSON.stringify(orderSnap.docs.map((d) => ({ ...d.data(), id: d.id })), null, 2)
  );

  // Customer events
  const eventsQuery = input.uid
    ? db.collection("customerEvents").where("uid", "==", input.uid)
    : db.collection("customerEvents").where("email", "==", input.email);
  const eventsSnap = await eventsQuery.limit(50_000).get();
  const eventRows = eventsSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      eventType: data.eventType ?? "",
      createdAt: tsToIso(data.createdAt),
      sessionId: data.sessionId ?? "",
      payload: data.payload ?? {},
    };
  });
  zip.file("customer-events.csv", toCsv(eventRows, ["id", "eventType", "createdAt", "sessionId", "payload"]));

  // Audit log — both axes (matches the erasure executor's coverage)
  if (input.uid) {
    const [actorSnap, targetSnap] = await Promise.all([
      db.collection("auditLogs").where("actor.uid", "==", input.uid).limit(50_000).get(),
      db
        .collection("auditLogs")
        .where("target.kind", "==", "user")
        .where("target.id", "==", input.uid)
        .limit(50_000)
        .get(),
    ]);
    const seen = new Set<string>();
    const audDocs = [...actorSnap.docs, ...targetSnap.docs].filter((d) => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });
    const audRows = audDocs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        eventType: data.eventType ?? "",
        createdAt: tsToIso(data.createdAt),
        targetKind: data.target?.kind ?? "",
        targetId: data.target?.id ?? "",
      };
    });
    zip.file("audit-log.csv", toCsv(audRows, ["id", "eventType", "createdAt", "targetKind", "targetId"]));
  }

  // Enquiries
  const enqSnap = await db.collection("enquiries").where("email", "==", input.email).get();
  const enqRows = enqSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      subject: data.subject ?? "",
      message: data.message ?? "",
      status: data.status ?? "",
      createdAt: tsToIso(data.createdAt),
    };
  });
  zip.file("enquiries.csv", toCsv(enqRows, ["id", "subject", "message", "status", "createdAt"]));

  // Marketing consent history
  if (input.uid) {
    const histSnap = await db.collection(`customers/${input.uid}/marketingConsentHistory`).get();
    const histRows = histSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        granted: !!data.granted,
        changedAt: tsToIso(data.changedAt),
        source: data.source ?? "",
      };
    });
    zip.file("marketing-consent-history.csv", toCsv(histRows, ["id", "granted", "changedAt", "source"]));
  }

  const buf = await zip.generateAsync({ type: "nodebuffer" });

  const bucket = storage.bucket();
  const objectPath = `dataExports/${input.requestId}.zip`;
  const file = bucket.file(objectPath);
  await file.save(buf, {
    contentType: "application/zip",
    metadata: { metadata: { requestId: input.requestId, email: input.email } },
  });

  // 7-day signed URL
  const [signedUrl] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  return { downloadUrl: signedUrl };
}
