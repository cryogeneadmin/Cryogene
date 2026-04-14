// components/storefront/auth/SignUpForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUpWithEmail } from "@/lib/auth";
import { isFirebaseClientReady } from "@/lib/firebase/client";

export function SignUpForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const firebaseReady = isFirebaseClientReady();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await signUpWithEmail(email, password);
      router.push("/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-up failed");
      setPending(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      {!firebaseReady && (
        <div className="bg-[#FFF3CD] border border-[#E6C97A] p-4 mb-6">
          <p className="label-editorial text-[#6A4D00] mb-1">Stage 1a notice</p>
          <p className="text-xs text-[#6A4D00]">
            Account creation will be enabled once Firebase credentials are
            wired in Stage 1b.
          </p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="label-editorial block mb-2">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full border border-[#DDE1E7] p-3" />
        </div>
        <div>
          <label htmlFor="password" className="label-editorial block mb-2">Password (min 8 characters)</label>
          <input id="password" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full border border-[#DDE1E7] p-3" />
        </div>
        {error && <p className="text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={pending || !firebaseReady} className="w-full py-3 bg-[#0D1B3E] text-white uppercase tracking-wider text-sm hover:bg-[#162040] disabled:bg-[#6B7280]">
          {pending ? "Creating account..." : "Create account"}
        </button>
        <p className="text-sm text-center text-[#6B7280]">
          Already have an account?{" "}
          <Link href="/sign-in" className="underline hover:text-[#0D1B3E]">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
