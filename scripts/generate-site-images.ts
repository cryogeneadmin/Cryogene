/**
 * Generate site-level imagery (category heroes, about, empty states) with FLUX 1.1 Pro.
 *
 * Output: public/site/{slug}.png
 * Requires: REPLICATE_API_TOKEN in .env.local
 *
 * Run: npx tsx scripts/generate-site-images.ts
 *      npx tsx scripts/generate-site-images.ts --only=peptides-hero
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();
import fs from "node:fs/promises";
import path from "node:path";
import Replicate from "replicate";

const ROOT = path.resolve(process.cwd());
const OUT_DIR = path.join(ROOT, "public", "site");
const MODEL = "black-forest-labs/flux-1.1-pro" as const;
const CONCURRENCY = 1;
const MIN_SPACING_MS = 3_000;

if (!process.env.REPLICATE_API_TOKEN) {
  console.error("REPLICATE_API_TOKEN missing in .env.local");
  process.exit(1);
}

const replicate = new Replicate();

type Target = {
  slug: string;
  prompt: string;
  aspect_ratio: "1:1" | "16:9" | "4:3" | "3:2" | "2:3" | "9:16" | "3:4";
  width?: number;
  height?: number;
};

const STYLE_TRAILER =
  "Editorial boutique-laboratory aesthetic, clean white background, studio lighting, soft shadow, high resolution, sharp focus, no text overlays, no watermarks, no logos.";

const TARGETS: Target[] = [
  {
    slug: "peptides-hero",
    prompt: `An editorial flat-lay photograph of three clear glass pharmaceutical research vials with silver metal crimp caps, empty label space, arranged at even spacing on a neutral off-white background. ${STYLE_TRAILER}`,
    aspect_ratio: "3:2",
  },
  {
    slug: "mixers-hero",
    prompt: `An editorial photograph of a 10ml clear glass vial of bacteriostatic water with silver crimp cap, positioned next to a sterile disposable syringe with needle, on a neutral off-white background. ${STYLE_TRAILER}`,
    aspect_ratio: "3:2",
  },
  {
    slug: "supplies-hero",
    prompt: `An editorial flat-lay photograph of laboratory research supplies arranged geometrically: a stack of petri dishes, a pair of blue nitrile gloves folded neatly, a row of sterile empty vials, and a few alcohol prep swabs. Off-white background, calm composition. ${STYLE_TRAILER}`,
    aspect_ratio: "3:2",
  },
  {
    slug: "about-lab",
    prompt: `An editorial photograph of a clean laboratory bench with a modern HPLC analytical instrument in the background, a rack of glass vials in the foreground, a folded lab coat draped on a stool, clean minimalist composition with lots of negative space. Soft natural light from a large window. ${STYLE_TRAILER}`,
    aspect_ratio: "16:9",
  },
  {
    slug: "empty-basket",
    prompt: `An editorial single-object photograph of one empty clear glass sterile vial with silver crimp cap, centered on a pure white background with a soft grey shadow beneath. Minimalist, negative space around the object. ${STYLE_TRAILER}`,
    aspect_ratio: "1:1",
  },
  {
    slug: "no-results",
    prompt: `An editorial photograph of a closed A5 navy hardback laboratory notebook centered on a pure white background with soft grey shadow. Minimalist and calm. ${STYLE_TRAILER}`,
    aspect_ratio: "1:1",
  },
  {
    slug: "homepage-hero",
    prompt: `An editorial product photograph of a single clear glass pharmaceutical research vial with a silver metal crimp cap. The vial is empty (clear glass) with no label, no text, no logo, no printing of any kind. Centered on a pure white seamless background with a soft grey shadow beneath the vial. Minimalist, boutique laboratory aesthetic, sharp focus, studio lighting. ${STYLE_TRAILER}`,
    aspect_ratio: "1:1",
  },
];

function safeName(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function renderOne(t: Target): Promise<string> {
  const outPath = path.join(OUT_DIR, `${safeName(t.slug)}.png`);
  const output = await replicate.run(MODEL, {
    input: {
      prompt: t.prompt,
      aspect_ratio: t.aspect_ratio,
      output_format: "png",
      safety_tolerance: 2,
      prompt_upsampling: false,
    },
  });

  let buf: Buffer;
  const o = output as unknown;
  if (o && typeof (o as { url?: () => URL }).url === "function") {
    const url = (o as { url: () => URL }).url();
    const res = await fetch(url);
    buf = Buffer.from(await res.arrayBuffer());
  } else if (typeof o === "string") {
    const res = await fetch(o);
    buf = Buffer.from(await res.arrayBuffer());
  } else if (Array.isArray(o) && typeof o[0] === "string") {
    const res = await fetch(o[0] as string);
    buf = Buffer.from(await res.arrayBuffer());
  } else if (o && typeof (o as ReadableStream).getReader === "function") {
    const stream = o as ReadableStream<Uint8Array>;
    const chunks: Uint8Array[] = [];
    const reader = stream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    buf = Buffer.concat(chunks);
  } else {
    throw new Error(`Unexpected output: ${JSON.stringify(o).slice(0, 200)}`);
  }
  await fs.writeFile(outPath, buf);
  return outPath;
}

async function runWithRetry(t: Target, attempt = 1): Promise<string> {
  try {
    return await renderOne(t);
  } catch (err) {
    const msg = (err as Error).message;
    if (attempt >= 5) throw err;
    const rateLimited = msg.includes("429");
    const m = msg.match(/retry_after":(\d+)/);
    const wait = m ? (parseInt(m[1]) + 2) * 1000 : rateLimited ? 12_000 : 2_000 * attempt;
    console.warn(`  retry ${attempt}/4 for ${t.slug} in ${wait}ms${rateLimited ? " (rate limited)" : ""}`);
    await new Promise((r) => setTimeout(r, wait));
    return runWithRetry(t, attempt + 1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const onlyArg = args.find((a) => a.startsWith("--only="));
  const only = onlyArg ? onlyArg.slice("--only=".length) : null;
  const force = args.includes("--force");

  await fs.mkdir(OUT_DIR, { recursive: true });

  const existing = new Set(
    (await fs.readdir(OUT_DIR).catch(() => [])).filter((f) => f.endsWith(".png")),
  );

  const queue: Target[] = [];
  let skipped = 0;
  for (const t of TARGETS) {
    if (only && t.slug !== only) continue;
    const filename = `${safeName(t.slug)}.png`;
    if (!force && existing.has(filename)) {
      skipped += 1;
      continue;
    }
    queue.push(t);
  }
  if (skipped) console.log(`Skipping ${skipped} already-rendered (use --force to regenerate).`);
  console.log(`FLUX 1.1 Pro — rendering ${queue.length} site images`);

  let done = 0;
  let lastStart = 0;
  const failed: string[] = [];

  for (const t of queue) {
    const sinceLast = Date.now() - lastStart;
    if (sinceLast < MIN_SPACING_MS) {
      await new Promise((r) => setTimeout(r, MIN_SPACING_MS - sinceLast));
    }
    lastStart = Date.now();
    try {
      const out = await runWithRetry(t);
      done += 1;
      console.log(`  [${done}/${queue.length}] ${path.relative(ROOT, out)}`);
    } catch (err) {
      failed.push(`${t.slug}: ${(err as Error).message}`);
      console.error(`  FAILED ${t.slug}:`, err);
    }
  }

  console.log(`\nDone. ${done} succeeded, ${failed.length} failed.`);
  if (failed.length) failed.forEach((f) => console.log("  " + f));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
