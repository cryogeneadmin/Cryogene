"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import type { Product } from "@/types";
import { getAdminDb } from "@/lib/firebase/admin";
import { slugify } from "@/lib/slug";

const LOCAL_WRITES_PATH = path.join(process.cwd(), "data", "products.local.json");

const VariantSchema = z.object({
  sku: z.string().min(1),
  size: z.string().min(1),
  packSize: z.string().default(""),
  priceInPence: z.number().int().min(0),
  stock: z.number().int().min(0),
  coaUrl: z.string().nullable().default(null),
  active: z.boolean(),
});

const ProductSchema = z.object({
  id: z.string().optional(),
  slug: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(["peptides", "mixers", "supplies"]),
  shortDescription: z.string().default(""),
  fullDescription: z.string().default(""),
  casNumber: z.string().nullable().default(null),
  molecularFormula: z.string().nullable().default(null),
  molecularWeight: z.string().nullable().default(null),
  synonyms: z.array(z.string()).default([]),
  purity: z.string().nullable().default(null),
  testingMethod: z.enum(["HPLC", "MS", "HPLC-MS"]).nullable().default(null),
  pubchemCid: z.number().int().nullable().default(null),
  moleculeImage: z.string().nullable().default(null),
  composition: z
    .array(z.object({ compound: z.string(), amount: z.string() }))
    .optional(),
  variants: z.array(VariantSchema).min(1),
  images: z.array(z.string()).default([]),
  primaryImageIndex: z.number().int().min(0).default(0),
  seoTitle: z.string().nullable().default(null),
  seoDescription: z.string().nullable().default(null),
  faq: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .default([]),
  tags: z.array(z.string()).default([]),
  active: z.boolean().default(true),
});

function useSeed(): boolean {
  return getAdminDb() === null;
}

async function readLocalWrites(): Promise<Product[]> {
  try {
    return JSON.parse(await fs.readFile(LOCAL_WRITES_PATH, "utf-8")) as Product[];
  } catch {
    return [];
  }
}

async function writeLocalWrites(products: Product[]): Promise<void> {
  await fs.writeFile(
    LOCAL_WRITES_PATH,
    JSON.stringify(products, null, 2),
    "utf-8"
  );
}

export async function saveProduct(data: unknown) {
  const parsed = ProductSchema.parse(data);
  const now = new Date().toISOString();

  const product: Product = {
    id: parsed.id ?? `local-${Date.now()}`,
    slug: parsed.slug || slugify(parsed.name),
    name: parsed.name,
    category: parsed.category,
    shortDescription: parsed.shortDescription,
    fullDescription: parsed.fullDescription,
    casNumber: parsed.casNumber,
    molecularFormula: parsed.molecularFormula,
    molecularWeight: parsed.molecularWeight,
    synonyms: parsed.synonyms,
    purity: parsed.purity,
    testingMethod: parsed.testingMethod,
    pubchemCid: parsed.pubchemCid,
    moleculeImage: parsed.moleculeImage,
    ...(parsed.composition !== undefined
      ? { composition: parsed.composition }
      : {}),
    variants: parsed.variants,
    images: parsed.images,
    primaryImageIndex: parsed.primaryImageIndex,
    seoTitle: parsed.seoTitle,
    seoDescription: parsed.seoDescription,
    faq: parsed.faq,
    tags: parsed.tags,
    active: parsed.active,
    createdAt: now as unknown as Date,
    updatedAt: now as unknown as Date,
    updatedBy: "admin-ui",
  };

  if (useSeed()) {
    const writes = await readLocalWrites();
    const idx = writes.findIndex((p) => p.id === product.id);
    if (idx === -1) {
      writes.push(product);
    } else {
      writes[idx] = product;
    }
    await writeLocalWrites(writes);
  } else {
    const db = getAdminDb()!;
    await db.doc(`products/${product.id}`).set(product);
  }

  revalidatePath("/admin/products");
  revalidatePath(`/${product.category}`);
  revalidatePath(`/${product.category}/${product.slug}`);
  redirect("/admin/products");
}

export async function toggleProductActive(id: string, active: boolean) {
  if (useSeed()) {
    const writes = await readLocalWrites();
    const idx = writes.findIndex((p) => p.id === id);
    if (idx === -1) {
      throw new Error(`Product ${id} not found in local writes store`);
    }
    writes[idx] = {
      ...writes[idx]!,
      active,
      updatedAt: new Date().toISOString() as unknown as Date,
    };
    await writeLocalWrites(writes);
  } else {
    await getAdminDb()!
      .doc(`products/${id}`)
      .update({ active, updatedAt: new Date() });
  }
  revalidatePath("/admin/products");
}
