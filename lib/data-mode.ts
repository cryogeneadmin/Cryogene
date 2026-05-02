// lib/data-mode.ts
import "server-only";
import { isFirebaseAdminReady } from "@/lib/firebase/admin";

export function isSeedMode(): boolean {
  // DATA_MODE=seed forces JSON reads while the Firestore migration is in flight.
  // Remove this branch once lib/{products,orders,customers,config,enquiries}.ts
  // and app/actions/products.ts have working Firestore branches.
  if (process.env.DATA_MODE === "seed") return true;
  return !isFirebaseAdminReady();
}
