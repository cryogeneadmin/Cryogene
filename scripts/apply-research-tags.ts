/**
 * Merge data/research-tags.ts into data/products.seed.json by replacing the
 * `tags` field on each product with the canonical research-tag set.
 *
 * Run: npx tsx scripts/apply-research-tags.ts
 *      npx tsx scripts/apply-research-tags.ts --dry
 */

import fs from "node:fs/promises";
import path from "node:path";
import { APPLIED_TAGS, flaggedForReview, TAG_SLUGS } from "../data/research-tags";

const ROOT = path.resolve(process.cwd());
const SEED_PATH = path.join(ROOT, "data", "products.seed.json");

type Product = { slug: string; tags?: string[]; [k: string]: unknown };

async function main() {
  const dry = process.argv.includes("--dry");
  const raw = await fs.readFile(SEED_PATH, "utf8");
  const products = JSON.parse(raw) as Product[];

  let updated = 0;
  const untagged: string[] = [];

  for (const p of products) {
    const assignment = APPLIED_TAGS[p.slug];
    if (!assignment) {
      untagged.push(p.slug);
      // Wipe research-tag-looking tags but preserve non-research category tags.
      p.tags = (p.tags ?? []).filter((t) => !TAG_SLUGS.has(t));
      continue;
    }
    // Validate tags exist in taxonomy.
    const validTags = assignment.tags.filter((t) => TAG_SLUGS.has(t));
    const invalid = assignment.tags.filter((t) => !TAG_SLUGS.has(t));
    if (invalid.length > 0) {
      console.warn(`  ${p.slug}: unknown tag(s) ignored: ${invalid.join(", ")}`);
    }
    const existingNonResearch = (p.tags ?? []).filter((t) => !TAG_SLUGS.has(t));
    p.tags = [...validTags, ...existingNonResearch];
    updated += 1;
  }

  console.log(`${updated} products tagged. ${untagged.length} not in tag file.`);
  if (untagged.length > 0) {
    console.log("Untagged (expected for supplies/mixers):");
    untagged.forEach((s) => console.log("  " + s));
  }

  const flagged = flaggedForReview();
  if (flagged.length > 0) {
    console.log(`\n${flagged.length} flagged for Sam's review (low confidence):`);
    flagged.forEach((f) => console.log(`  ${f.slug}: ${f.reason}`));
  }

  if (!dry) {
    await fs.writeFile(SEED_PATH, JSON.stringify(products, null, 2) + "\n");
    console.log(`\nWrote ${SEED_PATH}`);
  } else {
    console.log("\n(dry run — no file written)");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
