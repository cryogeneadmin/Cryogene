/**
 * Last-resort regen for ghrp-2-acetate 5mg using Ideogram V3 Turbo Edit via Replicate.
 * Ideogram has historically better embedded-text accuracy than FLUX Kontext.
 *
 * Run: npx tsx scripts/fix-ghrp-2-acetate.ts
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import Replicate from "replicate";

const ROOT = path.resolve(process.cwd());
const TEMPLATE = path.join(ROOT, "assets", "bottle-template.jpeg");
const OUT = path.join(ROOT, "public", "products", "ghrp-2-acetate--5mg.png");

if (!process.env.REPLICATE_API_TOKEN) {
  console.error("REPLICATE_API_TOKEN missing");
  process.exit(1);
}
const replicate = new Replicate();

async function main() {
  // Build a full-image mask that lets the model rework the label area only.
  // Ideogram expects: image + mask (white = edit, black = keep).
  const meta = await sharp(TEMPLATE).metadata();
  const W = meta.width!;
  const H = meta.height!;

  // Label zone: roughly the middle third of the bottle.
  const maskSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <rect width="${W}" height="${H}" fill="black"/>
      <rect x="170" y="440" width="770" height="840" fill="white"/>
    </svg>`,
  );
  const maskPath = path.join(ROOT, "assets", "bottle-label-mask.png");
  await sharp(maskSvg).png().toFile(maskPath);

  const imageBuf = await fs.readFile(TEMPLATE);
  const maskBuf = await fs.readFile(maskPath);
  const imageDataUri = `data:image/jpeg;base64,${imageBuf.toString("base64")}`;
  const maskDataUri = `data:image/png;base64,${maskBuf.toString("base64")}`;

  const prompt =
    "A pharmaceutical research vial label with a Cryogene Laboratories hexagon logo at top, " +
    "the product name 'GHRP-2 Acetate' in large dark-navy serif font centered, " +
    "'5mg' in smaller dark-grey text below, " +
    "a navy blue horizontal band reading 'FOR RESEARCH USE ONLY' in white uppercase text, " +
    "and 'KEEP REFRIGERATED' in dark-navy text below the band. " +
    "Clean white label background, boutique laboratory-grade aesthetic, sharp readable text.";

  console.log("Calling Ideogram V3 Turbo Edit...");
  const output = await replicate.run("ideogram-ai/ideogram-v3-turbo", {
    input: {
      prompt,
      image: imageDataUri,
      mask: maskDataUri,
      aspect_ratio: "2:3",
      magic_prompt_option: "Off",
      style_type: "Realistic",
    },
  } as { input: Record<string, unknown> });

  let buf: Buffer;
  const o = output as unknown;
  if (o && typeof (o as { url?: () => URL }).url === "function") {
    const res = await fetch((o as { url: () => URL }).url());
    buf = Buffer.from(await res.arrayBuffer());
  } else if (typeof o === "string") {
    buf = Buffer.from(await (await fetch(o)).arrayBuffer());
  } else if (Array.isArray(o) && typeof o[0] === "string") {
    buf = Buffer.from(await (await fetch(o[0] as string)).arrayBuffer());
  } else {
    throw new Error(`Unexpected output shape: ${JSON.stringify(o).slice(0, 200)}`);
  }

  await fs.writeFile(OUT, buf);
  console.log(`Wrote ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
