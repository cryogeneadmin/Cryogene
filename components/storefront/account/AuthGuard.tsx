"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { subscribeAuth } from "@/lib/auth";
import { isFirebaseClientReady } from "@/lib/firebase/client";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (!isFirebaseClientReady()) {
      setChecked(true);
      setAuthed(false);
      return;
    }
    const unsub = subscribeAuth((user) => {
      setAuthed(!!user);
      setChecked(true);
      if (!user) router.push("/sign-in");
    });
    return () => unsub();
  }, [router]);

  if (!checked) {
    return <div className="max-w-[1280px] mx-auto px-6 py-16 text-center text-[#6B7280]">Loading...</div>;
  }

  if (!isFirebaseClientReady()) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-16 text-center">
        <div className="max-w-md mx-auto bg-[#FFF3CD] border border-[#E6C97A] p-6">
          <p className="label-editorial text-[#6A4D00] mb-2">Stage 1a notice</p>
          <p className="text-sm text-[#6A4D00]">
            The customer account area requires Firebase Auth, which is wired
            once Sam&apos;s Firebase project is created in Stage 1b. Until then,
            guest checkout remains fully supported.
          </p>
        </div>
      </div>
    );
  }

  if (!authed) return null;

  return <>{children}</>;
}
