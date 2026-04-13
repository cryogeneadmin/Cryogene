import "server-only";
import {
  cert,
  getApps as getAdminApps,
  initializeApp as initializeAdminApp,
  type App as AdminApp,
} from "firebase-admin/app";
import { getFirestore as getAdminFirestore, type Firestore as AdminFirestore } from "firebase-admin/firestore";
import { getAuth as getAdminAuth, type Auth as AdminAuth } from "firebase-admin/auth";
import { getStorage as getAdminStorage, type Storage as AdminStorage } from "firebase-admin/storage";

let adminApp: AdminApp | null = null;

function isAdminConfigured(): boolean {
  return (
    !!process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_PROJECT_ID !== "REPLACE_ME" &&
    !!process.env.FIREBASE_CLIENT_EMAIL &&
    !!process.env.FIREBASE_PRIVATE_KEY
  );
}

function getAdminAppOrNull(): AdminApp | null {
  if (!isAdminConfigured()) return null;
  if (adminApp) return adminApp;
  const existing = getAdminApps();
  if (existing.length > 0) {
    adminApp = existing[0]!;
    return adminApp;
  }
  const privateKey = Buffer.from(
    process.env.FIREBASE_PRIVATE_KEY!,
    "base64"
  ).toString("utf-8");
  adminApp = initializeAdminApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey,
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
  return adminApp;
}

export function getAdminDb(): AdminFirestore | null {
  const app = getAdminAppOrNull();
  return app ? getAdminFirestore(app) : null;
}

export function getAdminAuthSdk(): AdminAuth | null {
  const app = getAdminAppOrNull();
  return app ? getAdminAuth(app) : null;
}

export function getAdminStorageSdk(): AdminStorage | null {
  const app = getAdminAppOrNull();
  return app ? getAdminStorage(app) : null;
}

export function isFirebaseAdminReady(): boolean {
  return isAdminConfigured();
}
