// lib/data-mode.ts
import "server-only";
import { isFirebaseAdminReady } from "@/lib/firebase/admin";

export function isSeedMode(): boolean {
  return !isFirebaseAdminReady();
}
