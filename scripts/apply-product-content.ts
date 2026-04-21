/**
 * Merge data/product-content.ts into data/products.seed.json.
 *
 * Only writes fields that are populated in the content file.
 * Existing seed fields are preserved unless the content file provides a value.
 *
 * Run:  npx tsx scripts/apply-product-content.ts
 *       npx tsx scripts/apply-product-content.ts --dry
 */

import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { PRODUCT_CONTENT } from "../data/product-content";

const ROOT = path.resolve(process.cwd());
const SEED_PATH = path.join(ROOT, "data", "products.seed.json");

type Product = Record<string, unknown> & {
  slug: string;
  casNumber?: string | null;
  molecularFormula?: string | null;
  molecularWeight?: string | null;
  synonyms?: string[];
  shortDescription?: string;
  fullDescription?: string;
  faq?: { question: string; answer: string }[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  tags?: string[];
};

async function main() {
  const dry = process.argv.includes("--dry");
  const raw = await fs.readFile(SEED_PATH, "utf8");
  const products = JSON.parse(raw) as Product[];

  let updated = 0;
  let missing: string[] = [];
  const slugsInContent = new Set(Object.keys(PRODUCT_CONTENT));
  const slugsInSeed = new Set(products.map((p) => p.slug));

  for (const slug of slugsInContent) {
    if (!slugsInSeed.has(slug)) {
      console.warn(`  content file has slug '${slug}' but seed does not`);
    }
  }

  for (const p of products) {
    const content = PRODUCT_CONTENT[p.slug];
    if (!content) {
      missing.push(p.slug);
      continue;
    }

    const changed: string[] = [];

    const apply = <K extends keyof Product>(k: K, v: Product[K]) => {
      if (v !== undefined && v !== null) {
        p[k] = v;
        changed.push(String(k));
      }
    };

    apply("shortDescription", content.shortDescription as never);
    apply("fullDescription", content.fullDescription as never);
    if (content.casNumber !== undefined) apply("casNumber", content.casNumber as never);
    if (content.molecularFormula !== undefined) apply("molecularFormula", content.molecularFormula as never);
    if (content.molecularWeight !== undefined) apply("molecularWeight", content.molecularWeight as never);
    if (content.synonyms) apply("synonyms", content.synonyms as never);
    if (content.faq) apply("faq", content.faq as never);
    if (content.seoTitle) apply("seoTitle", content.seoTitle as never);
    if (content.seoDescription) apply("seoDescription", content.seoDescription as never);
    if (content.tags) apply("tags", content.tags as never);

    if (changed.length > 0) {
      updated += 1;
      console.log(`  ${p.slug}: updated (${changed.join(", ")})`);
    }
  }

  console.log(`\n${updated} products updated. ${missing.length} not in content file.`);
  if (missing.length > 0) {
    console.log("Not in content file:");
    missing.forEach((s) => console.log("  " + s));
  }

  if (!dry && updated > 0) {
    await fs.writeFile(SEED_PATH, JSON.stringify(products, null, 2) + "\n");
    console.log(`\nWrote ${SEED_PATH}`);
  } else if (dry) {
    console.log("\n(dry run — no file written)");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
