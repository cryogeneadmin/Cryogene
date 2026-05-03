// components/storefront/auth/SignUpForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUpWithEmail } from "@/lib/auth";
import { isFirebaseClientReady } from "@/lib/firebase/client";
import { recordSignupCompleted } from "@/app/actions/record-signup";

export function SignUpForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);
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
      const result = await signUpWithEmail(email, password);
      // Fire-and-forget customer event. Don't await — don't block the user.
      void recordSignupCompleted({
        uid: result.user.uid,
        email,
        marketingOptIn,
      });
      const idToken = await result.user.getIdToken();
      const sessionResponse = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!sessionResponse.ok) {
        setError("Account created but session could not be established. Try signing in.");
        setPending(false);
        return;
      }
      router.push("/account");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? "";
      if (code === "auth/network-request-failed") {
        setError("Network error. Try again.");
      } else {
        setError("Could not create account. Email may already be in use.");
      }
      setPending(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      {!firebaseReady && (
        <div className="bg-compliance-amber-bg border border-compliance-amber-border p-4 mb-6">
          <p className="label-editorial text-compliance-amber-text mb-1">Stage 1a notice</p>
          <p className="text-xs text-compliance-amber-text">
            Account creation will be enabled once Firebase credentials are
            wired in Stage 1b.
          </p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="label-editorial block mb-2">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full border border-border p-3" />
        </div>
        <div>
          <label htmlFor="password" className="label-editorial block mb-2">Password (min 8 characters)</label>
          <input id="password" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full border border-border p-3" />
        </div>
        <label className="flex items-start gap-3 cursor-pointer mt-3">
          <input
            type="checkbox"
            name="marketingOptIn"
            checked={marketingOptIn}
            onChange={(e) => setMarketingOptIn(e.target.checked)}
            className="mt-1 accent-navy"
          />
          <span className="text-sm text-navy">
            Email me about new products and special offers. You can unsubscribe at
            any time.
          </span>
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={pending || !firebaseReady} className="w-full py-3 bg-navy text-white uppercase tracking-wider text-sm hover:bg-mid-navy disabled:bg-muted">
          {pending ? "Creating account..." : "Create account"}
        </button>
        <p className="text-sm text-center text-muted">
          Already have an account?{" "}
          <Link href="/sign-in" className="underline hover:text-navy">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
