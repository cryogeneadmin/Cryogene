// scripts/set-admin-claim.ts
/**
 * Grants admin custom claim to a Firebase Auth user by email.
 * Run with: npx tsx scripts/set-admin-claim.ts <email>
 * Requires Firebase Admin credentials in .env.local.
 * The user MUST exist in Firebase Auth already — create them via the
 * sign-up flow on the site first.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/set-admin-claim.ts <email>");
    process.exit(1);
  }

  if (
    !process.env.FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID === "REPLACE_ME"
  ) {
    console.error("Firebase credentials missing in .env.local.");
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

  const auth = getAuth();
  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, { admin: true });
  console.log(`✓ Admin claim set for ${email} (uid: ${user.uid})`);
  console.log("The user must sign out and back in for the claim to take effect in their ID token.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
