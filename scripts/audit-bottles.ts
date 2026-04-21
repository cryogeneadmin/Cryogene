/**
 * Build high-res contact-sheet composites of all generated bottle images for visual audit.
 *
 * Splits output into 3 sheets for readability at reasonable viewer size.
 *
 * Output: audit/contact-sheet-{1,2,3}.png
 *
 * Run:  npx tsx scripts/audit-bottles.ts
 */

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(process.cwd());
const PRODUCTS_DIR = path.join(ROOT, "public", "products");
const OUT_DIR = path.join(ROOT, "audit");

const CELL_W = 400;
const CELL_H = 600;
const COLS = 5;
const LABEL_H = 40;

async function buildSheet(files: string[], sheetIdx: number, startIdx: number) {
  const rows = Math.ceil(files.length / COLS);
  const cellTotalH = CELL_H + LABEL_H;
  const sheetW = COLS * CELL_W;
  const sheetH = rows * cellTotalH;

  const composites: sharp.OverlayOptions[] = [];

  for (let i = 0; i < files.length; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = col * CELL_W;
    const y = row * cellTotalH;

    const img = await sharp(path.join(PRODUCTS_DIR, files[i]))
      .resize(CELL_W, CELL_H, { fit: "contain", background: "#FFFFFF" })
      .toBuffer();
    composites.push({ input: img, left: x, top: y });

    const shortName = files[i].replace(/\.png$/, "").replace(/--/, " / ");
    const labelSvg = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${CELL_W}" height="${LABEL_H}">
        <rect width="${CELL_W}" height="${LABEL_H}" fill="#F7F8FA"/>
        <text x="${CELL_W / 2}" y="26" font-family="Arial, sans-serif" font-size="16"
              fill="#0D1B3E" text-anchor="middle">${startIdx + i + 1}. ${shortName}</text>
      </svg>`,
    );
    const labelBuf = await sharp(labelSvg).png().toBuffer();
    composites.push({ input: labelBuf, left: x, top: y + CELL_H });
  }

  const sheet = await sharp({
    create: { width: sheetW, height: sheetH, channels: 3, background: "#FFFFFF" },
  })
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toBuffer();

  const sheetPath = path.join(OUT_DIR, `contact-sheet-${sheetIdx}.png`);
  await fs.writeFile(sheetPath, sheet);
  console.log(`  sheet ${sheetIdx}: ${files.length} bottles, ${sheetW}x${sheetH}`);
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const files = (await fs.readdir(PRODUCTS_DIR))
    .filter((f) => f.endsWith(".png"))
    .sort();

  console.log(`Building audit sheets for ${files.length} images...`);

  // 3 sheets of roughly equal count.
  const perSheet = Math.ceil(files.length / 3);
  for (let s = 0; s < 3; s++) {
    const slice = files.slice(s * perSheet, (s + 1) * perSheet);
    if (slice.length === 0) continue;
    await buildSheet(slice, s + 1, s * perSheet);
  }

  const listPath = path.join(OUT_DIR, "file-list.txt");
  await fs.writeFile(listPath, files.map((f, i) => `${i + 1}. ${f}`).join("\n") + "\n");
  console.log(`Wrote ${listPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
