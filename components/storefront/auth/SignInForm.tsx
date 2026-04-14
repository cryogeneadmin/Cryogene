// components/storefront/auth/SignInForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmail } from "@/lib/auth";
import { isFirebaseClientReady } from "@/lib/firebase/client";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const firebaseReady = isFirebaseClientReady();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await signInWithEmail(email, password);
      router.push("/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
      setPending(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      {!firebaseReady && (
        <div className="bg-[#FFF3CD] border border-[#E6C97A] p-4 mb-6">
          <p className="label-editorial text-[#6A4D00] mb-1">Stage 1a notice</p>
          <p className="text-xs text-[#6A4D00]">
            Authentication will be enabled once Firebase credentials are wired
            in Stage 1b. Guest checkout remains fully supported.
          </p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="label-editorial block mb-2">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full border border-[#DDE1E7] p-3" />
        </div>
        <div>
          <label htmlFor="password" className="label-editorial block mb-2">Password</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full border border-[#DDE1E7] p-3" />
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={pending || !firebaseReady} className="w-full py-3 bg-[#0D1B3E] text-white uppercase tracking-wider text-sm hover:bg-[#162040] disabled:bg-[#6B7280]">
          {pending ? "Signing in..." : "Sign in"}
        </button>
        <p className="text-sm text-center text-[#6B7280]">
          New customer?{" "}
          <Link href="/sign-up" className="underline hover:text-[#0D1B3E]">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}
