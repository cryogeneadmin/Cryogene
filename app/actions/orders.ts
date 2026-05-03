// app/actions/orders.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateOrder, getOrderById } from "@/lib/orders";
import { assertAdmin } from "@/lib/admin-auth";
import { writeAuditEvent } from "@/lib/audit-log";
import type { OrderStatus } from "@/types";

export async function setOrderStatus(id: string, status: OrderStatus) {
  await assertAdmin();
  const validated = z
    .object({
      id: z.string().min(1).max(128),
      status: z.enum(["pending", "paid", "fulfilled", "cancelled", "refunded"]),
    })
    .parse({ id, status });

  const before = await getOrderById(validated.id);
  const beforeStatus = before?.status ?? null;

  await updateOrder(validated.id, { status: validated.status as OrderStatus });

  await writeAuditEvent({
    eventType: "order.status_changed",
    target: { kind: "order", id: validated.id },
    before: { status: beforeStatus },
    after: { status: validated.status },
    metadata: { orderNumber: before?.orderNumber ?? null },
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${validated.id}`);
}

export async function addAdminNote(id: string, note: string) {
  await assertAdmin();
  const validated = z
    .object({
      id: z.string().min(1).max(128),
      note: z.string().min(1).max(2000),
    })
    .parse({ id, note });

  const before = await getOrderById(validated.id);

  await updateOrder(validated.id, { adminNotes: validated.note });

  await writeAuditEvent({
    eventType: "order.status_changed", // reuse — admin notes are status metadata
    target: { kind: "order", id: validated.id },
    before: { adminNotes: before?.adminNotes ?? null },
    after: { adminNotes: validated.note },
    metadata: { orderNumber: before?.orderNumber ?? null, kind: "admin-note" },
  });

  revalidatePath(`/admin/orders/${validated.id}`);
}
