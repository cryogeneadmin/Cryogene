import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";

type Job = { source: string; outAvif: string; outWebp: string; maxWidth: number };

async function optimizeOne(job: Job) {
  const buf = await fs.readFile(job.source);
  const inBytes = buf.length;
  const pipeline = sharp(buf).resize({ width: job.maxWidth, withoutEnlargement: true });
  const avif = await pipeline.clone().avif({ quality: 65, effort: 4 }).toBuffer();
  const webp = await pipeline.clone().webp({ quality: 80 }).toBuffer();
  await fs.writeFile(job.outAvif, avif);
  await fs.writeFile(job.outWebp, webp);
  return { inBytes, avifBytes: avif.length, webpBytes: webp.length };
}

async function batch(dir: string, maxWidth: number) {
  const entries = await fs.readdir(dir);
  const pngs = entries.filter((e) => e.toLowerCase().endsWith(".png"));
  const jobs: Job[] = pngs.map((name) => {
    const stem = name.replace(/\.png$/i, "");
    return {
      source: path.join(dir, name),
      outAvif: path.join(dir, `${stem}.avif`),
      outWebp: path.join(dir, `${stem}.webp`),
      maxWidth,
    };
  });
  let totalIn = 0, totalAvif = 0, totalWebp = 0;
  for (const job of jobs) {
    const r = await optimizeOne(job);
    totalIn += r.inBytes; totalAvif += r.avifBytes; totalWebp += r.webpBytes;
    console.log(`  ${path.basename(job.source).padEnd(50)} ${(r.inBytes / 1024).toFixed(0).padStart(5)} KB -> ${(r.avifBytes / 1024).toFixed(0).padStart(5)} KB AVIF, ${(r.webpBytes / 1024).toFixed(0).padStart(5)} KB WebP`);
  }
  console.log(`\n${dir}: ${pngs.length} files, ${(totalIn / 1024 / 1024).toFixed(1)} MB -> ${(totalAvif / 1024 / 1024).toFixed(1)} MB AVIF, ${(totalWebp / 1024 / 1024).toFixed(1)} MB WebP`);
}

async function main() {
  await batch(path.join(process.cwd(), "public", "products"), 800);
  await batch(path.join(process.cwd(), "public", "site"), 1280);
}

main().catch((e) => { console.error(e); process.exit(1); });
