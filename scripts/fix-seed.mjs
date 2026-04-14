import { readFileSync, writeFileSync } from 'fs';
import { setTimeout as sleep } from 'timers/promises';

const SEED_PATH = new URL('../data/products.seed.json', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const RATE_LIMIT_MS = 300;

// CAS numbers match pattern like 73-31-4 or 137525-51-0 (not EINECS like 200-797-7)
function isCASFormat(rn) {
  return /^\d{2,7}-\d{2}-\d$/.test(rn);
}

async function fetchCAS(cid) {
  const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/xrefs/RN/JSON`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      console.log(`  CID ${cid}: HTTP ${res.status}`);
      return null;
    }
    const json = await res.json();
    const info = json?.InformationList?.Information?.[0];
    if (!info?.RN?.length) {
      console.log(`  CID ${cid}: no RN entries`);
      return null;
    }
    // Prefer a proper CAS number over EINECS numbers (200-xxx-x format)
    const properCAS = info.RN.find(isCASFormat);
    return properCAS || info.RN[0];
  } catch (err) {
    console.log(`  CID ${cid}: error - ${err.message}`);
    return null;
  }
}

const data = JSON.parse(readFileSync(SEED_PATH, 'utf8'));
console.log(`Loaded ${data.length} products`);

// Fix 1: Populate CAS numbers
const withCid = data.filter(p => p.pubchemCid !== null);
console.log(`\nFetching CAS numbers for ${withCid.length} products with pubchemCid...\n`);

let successCount = 0;
let failCount = 0;
const failures = [];

for (const product of data) {
  if (product.pubchemCid === null) continue;

  process.stdout.write(`  ${product.name} (CID ${product.pubchemCid}): `);
  const cas = await fetchCAS(product.pubchemCid);

  if (cas) {
    product.casNumber = cas;
    console.log(cas);
    successCount++;
  } else {
    console.log('not found');
    failCount++;
    failures.push(product.name);
  }

  await sleep(RATE_LIMIT_MS);
}

console.log(`\nCAS fetch complete: ${successCount} succeeded, ${failCount} failed`);
if (failures.length) {
  console.log('Failed:', failures.join(', '));
}

// Fix 2: Remove dropped SKUs
const skuProductsToRemove = new Set(['lemon-bottle', 'mazdutide', 'hmg', 'acetic-acid-water', 'hcg']);
const before = data.length;
const filtered = data.filter(p => !skuProductsToRemove.has(p.slug));
const after = filtered.length;

console.log(`\nRemoved ${before - after} products (${[...skuProductsToRemove].join(', ')})`);
console.log(`Products remaining: ${after}`);

// Write back
writeFileSync(SEED_PATH, JSON.stringify(filtered, null, 2) + '\n', 'utf8');
console.log('\nWrote updated seed to', SEED_PATH);
