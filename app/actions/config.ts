"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { isAdminRequest } from "@/lib/admin-auth";
import { updateConfig } from "@/lib/config";
import type { Config } from "@/types";

const ConfigPatchSchema = z
  .object({
    storeName: z.string().min(1).optional(),
    storeEmail: z.string().email().optional(),
    storePhone: z.string().nullable().optional(),
    companyNumber: z.string().nullable().optional(),
    registeredAddress: z.string().optional(),
    vatNumber: z.string().nullable().optional(),
    vat: z
      .object({
        registered: z.boolean(),
        rate: z.number().min(0).max(1),
        displayPricesInclusive: z.boolean(),
      })
      .optional(),
    shipping: z
      .object({
        flatRateInPence: z.number().int().min(0),
        freeThresholdInPence: z.number().int().min(0).nullable(),
        estimatedDispatch: z.string(),
      })
      .optional(),
    notifications: z
      .object({
        newOrderEmailTo: z.string().email(),
      })
      .optional(),
  })
  .passthrough();

export async function saveConfig(patch: Partial<Config>) {
  if (!(await isAdminRequest())) throw new Error("Unauthorised");

  const validated = ConfigPatchSchema.parse(patch);
  await updateConfig(validated as Partial<Config>);
  revalidateTag("config", "max");
  revalidatePath("/", "layout");
}
