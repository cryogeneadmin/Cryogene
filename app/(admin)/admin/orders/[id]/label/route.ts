import "server-only";
import { NextResponse } from "next/server";
import { getOrderById } from "@/lib/orders";
import { assertAdmin } from "@/lib/admin-auth";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  await assertAdmin();
  const { id } = await context.params;
  if (!id || id.length > 128 || !/^[\w-]+$/.test(id)) {
    return NextResponse.json({ error: "bad id" }, { status: 400 });
  }
  const order = await getOrderById(id);
  if (!order || !order.fulfilment.labelUrl) {
    return NextResponse.json({ error: "no label" }, { status: 404 });
  }

  // Fetch upstream PDF and stream back. Keeps Click & Drop's signed URL out
  // of the client DOM and re-checks admin auth on every fetch.
  const upstream = await fetch(order.fulfilment.labelUrl);
  if (!upstream.ok) {
    return NextResponse.json(
      { error: "upstream fetch failed", status: upstream.status },
      { status: 502 }
    );
  }
  const buffer = await upstream.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="label-${order.orderNumber}.pdf"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
