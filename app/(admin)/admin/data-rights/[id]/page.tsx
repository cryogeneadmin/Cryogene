// app/(admin)/admin/data-rights/[id]/page.tsx
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { assertAdmin } from "@/lib/admin-auth";
import { getRequestById } from "@/lib/data-rights";
import { AccessRequestPanel } from "./AccessRequestPanel";
import { ErasureRequestPanel } from "./ErasureRequestPanel";
import { RectificationRequestPanel } from "./RectificationRequestPanel";
import { ObjectionRequestPanel } from "./ObjectionRequestPanel";

async function RequestDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  await assertAdmin();
  const { id } = await params;
  const request = await getRequestById(id);
  if (!request) notFound();

  switch (request.type) {
    case "access":
      return <AccessRequestPanel request={request} />;
    case "erasure":
      return <ErasureRequestPanel request={request} />;
    case "rectification":
      return <RectificationRequestPanel request={request} />;
    case "objection":
      return <ObjectionRequestPanel request={request} />;
    default: {
      // Exhaustiveness check — adding a new DataRightType causes a
      // compile error here, forcing the dispatcher to handle it.
      const _exhaustive: never = request.type;
      return <p className="text-red-700">Unknown request type: {String(_exhaustive)}</p>;
    }
  }
}

export default function RequestDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="p-6 max-w-4xl">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <RequestDetail params={props.params} />
      </Suspense>
    </div>
  );
}
