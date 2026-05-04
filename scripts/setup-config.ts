// scripts/setup-config.ts
/**
 * One-shot script: populates Firestore `config/main` with the real trader
 * identity Cryogene Laboratories needs in production. Replaces the
 * "[ADDRESS TBC]" placeholder rendered in the footer.
 *
 * Companies Act 2006 s.82 + E-Commerce Regs 2002 reg.6 require trader
 * details on every page; without this, the footer shows the placeholder
 * literal and the site is not legally compliant.
 *
 * Run with: npx tsx scripts/setup-config.ts
 *
 * Edit the TRADER_DETAILS constant below with David-confirmed values
 * BEFORE running. The script is idempotent — `set({...}, { merge: true })`
 * means re-running with updated values is safe and only changes what you
 * change in the literal.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// ─── EDIT THESE BEFORE RUNNING ────────────────────────────────────────────
const TRADER_DETAILS = {
  // Customer-facing contact email. Must be a working address Sam monitors.
  storeEmail: "TODO_CONFIRM@cryogenelaboratories.co.uk",

  // Optional public phone number. Use null if not yet confirmed.
  storePhone: null as string | null,

  // The full postal address that appears in the footer. Required by
  // Companies Act 2006 s.82 + E-Commerce Regs 2002 reg.6. If sole trader,
  // this is the correspondence address; if Ltd, the registered office.
  registeredAddress: "TODO_CONFIRM_REGISTERED_ADDRESS",

  // Companies House number if Ltd, null if sole trader.
  companyNumber: null as string | null,

  // VAT registration number, null if not VAT-registered. Per project memory,
  // Cryogene is not currently VAT-registered.
  vatNumber: null as string | null,

  // Email that gets the new-order notification.
  newOrderEmailTo: "samcowling118@googlemail.com",
};
// ─────────────────────────────────────────────────────────────────────────

if (
  TRADER_DETAILS.storeEmail.startsWith("TODO_") ||
  TRADER_DETAILS.registeredAddress.startsWith("TODO_")
) {
  console.error(
    "ERROR: Edit scripts/setup-config.ts and replace the TODO_ markers " +
      "with David-confirmed values before running."
  );
  process.exit(1);
}

if (
  !process.env.FIREBASE_PROJECT_ID ||
  !process.env.FIREBASE_CLIENT_EMAIL ||
  !process.env.FIREBASE_PRIVATE_KEY
) {
  console.error(
    "ERROR: Firebase credentials missing. Set FIREBASE_PROJECT_ID, " +
      "FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env.local first."
  );
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

async function main() {
  const db = getFirestore();
  await db.doc("config/main").set(
    {
      storeName: "Cryogene Laboratories",
      storeEmail: TRADER_DETAILS.storeEmail,
      storePhone: TRADER_DETAILS.storePhone,
      registeredAddress: TRADER_DETAILS.registeredAddress,
      companyNumber: TRADER_DETAILS.companyNumber,
      vatNumber: TRADER_DETAILS.vatNumber,
      // Existing nested config preserved via merge — only re-state the
      // fields we want to overwrite.
      shipping: {
        flatRateInPence: 495,
        freeThresholdInPence: 7500,
        estimatedDispatch: "Dispatched within 1 working day",
      },
      vat: {
        registered: TRADER_DETAILS.vatNumber !== null,
        rate: 0.2,
        displayPricesInclusive: false,
      },
      notifications: {
        newOrderEmailTo: TRADER_DETAILS.newOrderEmailTo,
      },
      updatedAt: new Date(),
      updatedBy: "setup-config-script",
    },
    { merge: true }
  );

  const after = await db.doc("config/main").get();
  if (!after.exists) {
    console.error("MISMATCH: config/main not found after write");
    process.exit(2);
  }
  console.log("config/main updated:");
  console.log(JSON.stringify(after.data(), null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
