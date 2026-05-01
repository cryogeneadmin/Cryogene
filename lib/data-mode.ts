// lib/data-mode.ts
import "server-only";
import { isFirebaseAdminReady } from "@/lib/firebase/admin";

export function isSeedMode(): boolean {
  if (process.env.DATA_MODE === "seed") return true;
  return !isFirebaseAdminReady();
}
