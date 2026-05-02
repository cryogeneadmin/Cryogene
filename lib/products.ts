import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import seedProducts from "@/data/products.seed.json";
import type { Product, ProductCategory } from "@/types";
import { isSeedMode } from "@/lib/data-mode";
import { getAdminDb } from "@/lib/firebase/admin";
import type { Query } from "firebase-admin/firestore";

/**
 * Data-layer abstraction for product reads.
 *
 * Stage 1a (local): reads from two layers merged by ID:
 *   1. data/products.seed.json — read-only bundled seed (25 products)
 *   2. data/products.local.json — optional overlay written by the admin UI
 *
 * Stage 1b onward: when FIREBASE_PROJECT_ID is set and non-placeholder,
 * reads from Firestore `products` collection instead.
 */

const LOCAL_OVERLAY_PATH = path.join(process.cwd(), "data", "products.local.json");
const seed = seedProducts as unknown as Product[];

async function readLocalOverlay(): Promise<Product[]> {
  try {
    const raw = await fs.readFile(LOCAL_OVERLAY_PATH, "utf-8");
    return JSON.parse(raw) as Product[];
  } catch {
    return [];
  }
}

async function mergedSeed(): Promise<Product[]> {
  const overlay = await readLocalOverlay();
  const byId = new Map<string, Product>();
  for (const p of seed) byId.set(p.id, p);
  for (const p of overlay) byId.set(p.id, p); // overlay wins
  return Array.from(byId.values());
}

export async function getProducts(options?: {
  category?: ProductCategory;
  activeOnly?: boolean;
  limit?: number;
}): Promise<Product[]> {
  if (isSeedMode()) {
    let results = await mergedSeed();
    if (options?.activeOnly) {
      results = results.filter((p) => p.active);
    }
    if (options?.category) {
      results = results.filter((p) => p.category === options.category);
    }
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }
    return results;
  }
  const db = getAdminDb();
  if (!db) throw new Error("Firestore not configured (admin SDK unavailable)");
  let query: Query = db.collection("products");
  if (options?.activeOnly) {
    query = query.where("active", "==", true);
  }
  if (options?.category) {
    query = query.where("category", "==", options.category);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  const snap = await query.get();
  return snap.docs.map((d) => d.data() as Product);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (isSeedMode()) {
    const all = await mergedSeed();
    return all.find((p) => p.slug === slug) ?? null;
  }
  const db = getAdminDb();
  if (!db) throw new Error("Firestore not configured (admin SDK unavailable)");
  const snap = await db
    .collection("products")
    .where("slug", "==", slug)
    .limit(1)
    .get();
  return snap.empty ? null : (snap.docs[0]!.data() as Product);
}

export async function getFeaturedProducts(limit = 6): Promise<Product[]> {
  const all = await getProducts({ activeOnly: true });
  return all
    .sort((a, b) => {
      const toMs = (v: unknown): number =>
        v instanceof Date
          ? v.getTime()
          : typeof v === "string" || typeof v === "number"
          ? new Date(v).getTime()
          : 0;
      return toMs(b.createdAt) - toMs(a.createdAt);
    })
    .slice(0, limit);
}

export async function getAllProductSlugs(): Promise<string[]> {
  const all = await getProducts({ activeOnly: true });
  return all.map((p) => p.slug);
}
