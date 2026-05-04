// app/(admin)/admin/audit-log/page.tsx
import { Suspense } from "react";
import { connection } from "next/server";
import { assertAdmin } from "@/lib/admin-auth";
import { queryAuditLogs, type QueryFilters } from "./actions";
import { AuditLogClient } from "./AuditLogClient";

async function AuditLogContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  await assertAdmin();
  const params = await searchParams;

  const filters: QueryFilters = {
    eventTypes: typeof params.types === "string"
      ? params.types.split(",")
      : Array.isArray(params.types)
      ? params.types
      : undefined,
    fromDate: typeof params.from === "string" ? params.from : null,
    toDate: typeof params.to === "string" ? params.to : null,
    targetKind: ["order", "product", "user", "session"].includes(params.tk as string)
      ? (params.tk as "order" | "product" | "user" | "session")
      : null,
    targetId: typeof params.tid === "string" ? params.tid : null,
    actorUid: typeof params.actor === "string" ? params.actor : null,
    cursor: typeof params.cursor === "string" ? params.cursor : null,
  };

  const { items, nextCursor } = await queryAuditLogs(filters);

  return (
    <AuditLogClient
      items={items}
      nextCursor={nextCursor}
      initialFilters={filters}
    />
  );
}

export default function AuditLogPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div className="p-6">
      <h1 className="font-serif text-3xl text-navy mb-2">Audit log</h1>
      <p className="text-sm text-muted mb-6">
        Append-only record of order, product, admin and security events.
        Retained 7 years per HMRC business-record requirement.
      </p>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <AuditLogContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
