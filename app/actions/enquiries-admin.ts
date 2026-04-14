"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { updateEnquiryStatus } from "@/lib/enquiries";
import type { EnquiryStatus } from "@/types";

export async function setEnquiryStatusAction(id: string, status: EnquiryStatus) {
  if (!(await isAdminRequest())) throw new Error("Unauthorised");

  const validated = z
    .object({
      id: z.string().min(1).max(128),
      status: z.enum(["new", "replied", "archived"]),
    })
    .parse({ id, status });

  await updateEnquiryStatus(validated.id, validated.status as EnquiryStatus);
  revalidatePath("/admin/enquiries");
}
