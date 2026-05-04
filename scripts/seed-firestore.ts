// scripts/seed-firestore.ts
/**
 * One-shot seed: pushes data/products.seed.json into Firestore.
 * Run with: npx tsx scripts/seed-firestore.ts
 * Requires Firebase Admin credentials in .env.local (Stage 1b).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "node:fs/promises";
import path from "node:path";
import type { Product } from "../types";

async function main() {
  if (
    !process.env.FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID === "REPLACE_ME" ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !process.env.FIREBASE_PRIVATE_KEY
  ) {
    console.error("Firebase credentials missing. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env.local first.");
    process.exit(1);
  }

  if (getApps().length === 0) {
    const privateKey = Buffer.from(
      process.env.FIREBASE_PRIVATE_KEY!,
      "base64"
    ).toString("utf-8");
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey,
      }),
    });
  }

  const db = getFirestore();
  const seedPath = path.join(process.cwd(), "data", "products.seed.json");
  const raw = await fs.readFile(seedPath, "utf-8");
  const products: Product[] = JSON.parse(raw);

  console.log(`Seeding ${products.length} products to Firestore...`);

  for (const product of products) {
    await db.doc(`products/${product.id}`).set(product);
    console.log(`  ✓ ${product.name}`);
  }

  const defaultConfig = {
    storeName: "Cryogene Laboratories",
    storeEmail: "hello@cryogenelaboratories.co.uk",
    storePhone: null,
    registeredAddress: "[ADDRESS TBC]",
    companyNumber: null,
    vatNumber: null,
    shipping: {
      flatRateInPence: 495,
      freeThresholdInPence: 7500,
      estimatedDispatch: "Dispatched within 1 working day",
    },
    vat: {
      registered: false,
      rate: 0.2,
      displayPricesInclusive: false,
    },
    notifications: {
      newOrderEmailTo: "orders@cryogenelaboratories.co.uk",
    },
    updatedAt: new Date(),
    updatedBy: "seed-script",
  };
  await db.doc("config/main").set(defaultConfig);
  console.log(`  ✓ config/main seeded`);

  console.log(`\nDone. ${products.length} products written to Firestore.`);
  console.log(`\nNext step: run \`npx tsx scripts/set-admin-claim.ts <admin-email>\` to grant admin access.`);

  // Verification: read back what we just wrote
  const productCountSnap = await db.collection("products").count().get();
  const productCount = productCountSnap.data().count;
  const configSnap = await db.doc("config/main").get();
  console.log(`\n--- Verification ---`);
  console.log(`Products in Firestore: ${productCount}`);
  console.log(`config/main exists: ${configSnap.exists}`);
  if (configSnap.exists) {
    console.log(`config/main.storeName: ${(configSnap.data() as { storeName: string }).storeName}`);
  }
  if (productCount !== products.length) {
    console.error(`MISMATCH: expected ${products.length}, got ${productCount}`);
    process.exit(2);
  }
  if (!configSnap.exists) {
    console.error(`MISMATCH: config/main not found after write`);
    process.exit(3);
  }
  console.log(`Verification passed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
