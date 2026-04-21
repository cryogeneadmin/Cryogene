/**
 * Generate per-variant bottle images for all peptide products using FLUX Kontext Max.
 *
 * Input:  assets/bottle-template.jpeg (the Cryogene template from Sam)
 * Output: public/products/{slug}--{safeSize}.png
 *
 * Requires: REPLICATE_API_TOKEN in .env.local
 *
 * Run:  npx tsx scripts/generate-bottle-images-flux.ts --pilot
 *       npx tsx scripts/generate-bottle-images-flux.ts --only=bpc-157
 *       npx tsx scripts/generate-bottle-images-flux.ts            (full batch)
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();
import fs from "node:fs/promises";
import path from "node:path";
import Replicate from "replicate";
import products from "../data/products.seed.json" with { type: "json" };

type Variant = {
  sku: string;
  size: string;
  packSize: string;
  priceInPence: number;
  stock: number;
  coaUrl: string | null;
  active: boolean;
};

type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  casNumber: string | null;
  variants: Variant[];
};

const ROOT = path.resolve(process.cwd());
const BOTTLE_PATH = path.join(ROOT, "assets", "bottle-template.jpeg");
const OUT_DIR = path.join(ROOT, "public", "products");
const MODEL = "black-forest-labs/flux-kontext-max" as const;
const CONCURRENCY = 1;
// Replicate throttles accounts under $5 credit to 6 req/min, burst 1. Keep 11s between creates.
const MIN_SPACING_MS = 11_000;

if (!process.env.REPLICATE_API_TOKEN) {
  console.error("REPLICATE_API_TOKEN missing. Add it to .env.local first.");
  process.exit(1);
}

const replicate = new Replicate();

function safeSize(size: string): string {
  return size.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function buildPrompt(product: Product, variant: Variant): string {
  return (
    `Replace the text 'LOT: F9042A' in the top blue band with nothing. ` +
    `Replace the '0,9 mL' text and the barcode and QR code at the bottom of the label with empty white background. ` +
    `Add the text '${product.name}' in large dark-navy serif font centered in the middle of the label, with '${variant.size}' in smaller dark-grey text directly below it. ` +
    `Keep the Cryogene hexagon logo, the 'CRYOGENE LABORATORIES' wordmark, the 'FOR RESEARCH USE ONLY' blue band, the 'KEEP REFRIGERATED' text, the metal cap, the glass bottle, and the shadow all exactly as they are.`
  );
}

async function uploadTemplateOnce(): Promise<string> {
  // Replicate accepts data URIs inline — simpler than files.create and works for small images.
  const buf = await fs.readFile(BOTTLE_PATH);
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

async function renderOne(
  product: Product,
  variant: Variant,
  inputImage: string,
): Promise<string> {
  const prompt = buildPrompt(product, variant);
  const outPath = path.join(OUT_DIR, `${product.slug}--${safeSize(variant.size)}.png`);

  const output = await replicate.run(MODEL, {
    input: {
      input_image: inputImage,
      prompt,
      aspect_ratio: "match_input_image",
      output_format: "png",
      safety_tolerance: 2,
    },
  });

  // Replicate SDK returns a FileOutput (with .url()) or a URL string depending on version.
  let pngBuffer: Buffer;
  if (output && typeof (output as { url?: () => URL }).url === "function") {
    const url = (output as { url: () => URL }).url();
    const res = await fetch(url);
    pngBuffer = Buffer.from(await res.arrayBuffer());
  } else if (typeof output === "string") {
    const res = await fetch(output);
    pngBuffer = Buffer.from(await res.arrayBuffer());
  } else if (Array.isArray(output) && typeof output[0] === "string") {
    const res = await fetch(output[0] as string);
    pngBuffer = Buffer.from(await res.arrayBuffer());
  } else if (output && typeof (output as ReadableStream).getReader === "function") {
    const stream = output as ReadableStream<Uint8Array>;
    const chunks: Uint8Array[] = [];
    const reader = stream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    pngBuffer = Buffer.concat(chunks);
  } else {
    throw new Error(`Unexpected Replicate output shape: ${JSON.stringify(output).slice(0, 200)}`);
  }

  await fs.writeFile(outPath, pngBuffer);
  return outPath;
}

async function runWithRetry(
  product: Product,
  variant: Variant,
  inputImage: string,
  attempt = 1,
): Promise<string> {
  try {
    return await renderOne(product, variant, inputImage);
  } catch (err) {
    const msg = (err as Error).message;
    // Parse Retry-After from Replicate 429 if present, else exponential backoff.
    const retryAfterMatch = msg.match(/retry_after":(\d+)/);
    const rateLimited = msg.includes("429") || msg.includes("Too Many Requests");
    if (attempt >= 5) throw err;
    const wait = retryAfterMatch ? (parseInt(retryAfterMatch[1]) + 2) * 1000 : (rateLimited ? 12_000 : 2_000 * attempt);
    console.warn(`  retry ${attempt}/4 for ${product.slug} ${variant.size} in ${wait}ms${rateLimited ? " (rate limited)" : ""}`);
    await new Promise((r) => setTimeout(r, wait));
    return runWithRetry(product, variant, inputImage, attempt + 1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const pilot = args.includes("--pilot");
  const onlyArg = args.find((a) => a.startsWith("--only="));
  const only = onlyArg ? onlyArg.slice("--only=".length) : null;

  await fs.mkdir(OUT_DIR, { recursive: true });

  const inputImage = await uploadTemplateOnce();

  const force = args.includes("--force");
  const existing = new Set(
    (await fs.readdir(OUT_DIR).catch(() => [])).filter((f) => f.endsWith(".png")),
  );

  const peptides = (products as Product[]).filter((p) => p.category === "peptides");
  let targets: { product: Product; variant: Variant }[] = [];
  let skipped = 0;
  for (const p of peptides) {
    if (only && p.slug !== only) continue;
    for (const v of p.variants) {
      const filename = `${p.slug}--${safeSize(v.size)}.png`;
      if (!force && existing.has(filename)) {
        skipped += 1;
        continue;
      }
      targets.push({ product: p, variant: v });
    }
  }
  if (pilot) targets = targets.slice(0, 1);
  if (skipped > 0) console.log(`Skipping ${skipped} already-rendered images (use --force to regenerate).`);

  console.log(`FLUX Kontext Max — rendering ${targets.length} images with concurrency ${CONCURRENCY}`);

  let done = 0;
  let failed: string[] = [];

  // Throttled concurrency pool — min spacing between request starts.
  const queue = [...targets];
  let lastStart = 0;
  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(CONCURRENCY, queue.length); i++) {
    workers.push((async () => {
      for (;;) {
        const next = queue.shift();
        if (!next) return;
        const sinceLast = Date.now() - lastStart;
        if (sinceLast < MIN_SPACING_MS) {
          await new Promise((r) => setTimeout(r, MIN_SPACING_MS - sinceLast));
        }
        lastStart = Date.now();
        try {
          const out = await runWithRetry(next.product, next.variant, inputImage);
          done += 1;
          console.log(`  [${done}/${targets.length}] ${path.relative(ROOT, out)}`);
        } catch (err) {
          failed.push(`${next.product.slug} ${next.variant.size}: ${(err as Error).message}`);
          console.error(`  FAILED ${next.product.slug} ${next.variant.size}:`, err);
        }
      }
    })());
  }
  await Promise.all(workers);

  console.log(`\nDone. ${done} succeeded, ${failed.length} failed.`);
  if (failed.length) {
    console.log("Failures:");
    failed.forEach((f) => console.log("  " + f));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
