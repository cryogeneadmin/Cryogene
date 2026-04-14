// lib/auth.ts
"use client";

import { getFirebaseAuth } from "@/lib/firebase/client";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";

export async function signUpWithEmail(email: string, password: string) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth not configured (Stage 1a)");
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signInWithEmail(email: string, password: string) {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase Auth not configured (Stage 1a)");
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signOutCurrentUser() {
  const auth = getFirebaseAuth();
  if (!auth) return;
  return signOut(auth);
}

export function subscribeAuth(callback: (user: User | null) => void) {
  const auth = getFirebaseAuth();
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}
