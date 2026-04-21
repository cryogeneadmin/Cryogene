/**
 * Update products.seed.json to reference the newly generated bottle images.
 *
 * For each peptide product, looks for public/products/{slug}--{safeSize}.png matching
 * its variants. Updates product.images[] with all found variant images, sets
 * primaryImageIndex to the lowest-size variant.
 *
 * Run:  npx tsx scripts/update-product-images.ts
 *       npx tsx scripts/update-product-images.ts --dry   (print changes only)
 */

import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(process.cwd());
const SEED_PATH = path.join(ROOT, "data", "products.seed.json");
const PRODUCTS_DIR = path.join(ROOT, "public", "products");

function safeSize(size: string): string {
  return size.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Parse mg amount from size string for sorting. "0.1mg" -> 0.1, "1mg" -> 1, "10mg" -> 10.
function sizeAmount(size: string): number {
  const m = size.match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : Number.MAX_SAFE_INTEGER;
}

type Variant = { sku: string; size: string; [k: string]: unknown };
type Product = {
  slug: string;
  category: string;
  variants: Variant[];
  images: string[];
  primaryImageIndex: number;
  [k: string]: unknown;
};

async function main() {
  const dry = process.argv.includes("--dry");
  const raw = await fs.readFile(SEED_PATH, "utf8");
  const products = JSON.parse(raw) as Product[];

  const existing = new Set(
    (await fs.readdir(PRODUCTS_DIR).catch(() => [])).filter((f) => f.endsWith(".png"))
  );

  let updated = 0;
  let skipped = 0;
  const missing: string[] = [];

  for (const p of products) {
    // Find images for each variant in size order (numeric sizes only; non-numeric keep source order).
    const variantsSorted = [...p.variants].sort(
      (a, b) => sizeAmount(a.size) - sizeAmount(b.size),
    );

    const images: string[] = [];
    for (const v of variantsSorted) {
      const filename = `${p.slug}--${safeSize(v.size)}.png`;
      if (existing.has(filename)) {
        images.push(`/products/${filename}`);
      } else {
        missing.push(`${p.slug} ${v.size} (${filename})`);
      }
    }

    if (images.length === 0) {
      skipped += 1;
      continue;
    }

    const oldImages = p.images;
    p.images = images;
    p.primaryImageIndex = 0;

    const changed = JSON.stringify(oldImages) !== JSON.stringify(images);
    if (changed) {
      updated += 1;
      console.log(`  ${p.slug}: ${oldImages.join(",")} -> ${images.length} image(s)`);
    }
  }

  console.log(`\n${updated} products updated, ${skipped} skipped (no images found).`);
  if (missing.length) {
    console.log(`\n${missing.length} missing image(s):`);
    missing.slice(0, 20).forEach((m) => console.log(`  ${m}`));
    if (missing.length > 20) console.log(`  ... +${missing.length - 20} more`);
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
