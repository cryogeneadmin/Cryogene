// app/actions/orders.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateOrder } from "@/lib/orders";
import type { OrderStatus } from "@/types";

export async function setOrderStatus(id: string, status: OrderStatus) {
  const validated = z
    .object({
      id: z.string().min(1).max(128),
      status: z.enum(["pending", "paid", "fulfilled", "cancelled", "refunded"]),
    })
    .parse({ id, status });

  await updateOrder(validated.id, { status: validated.status as OrderStatus });
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${validated.id}`);
}

export async function addAdminNote(id: string, note: string) {
  const validated = z
    .object({
      id: z.string().min(1).max(128),
      note: z.string().max(2000),
    })
    .parse({ id, note });

  await updateOrder(validated.id, { adminNotes: validated.note });
  revalidatePath(`/admin/orders/${validated.id}`);
}
