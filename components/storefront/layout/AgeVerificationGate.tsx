// components/storefront/layout/AgeVerificationGate.tsx
"use client";

import { useEffect, useRef } from "react";
import { confirmAgeGate, leaveSite } from "@/app/actions/age-gate";

export function AgeVerificationGate() {
  const enterRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    enterRef.current?.focus();
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0D1B3E]/95 p-4"
    >
      <div className="max-w-lg w-full bg-white border border-[#DDE1E7] p-10 text-center">
        <p className="label-editorial mb-4">Laboratory research only</p>
        <h1
          id="age-gate-title"
          className="text-3xl md:text-4xl mb-6 leading-tight"
        >
          For laboratory research use only
        </h1>
        <p className="text-sm md:text-base leading-relaxed mb-8 text-[#333333]">
          The products sold on this website are intended exclusively for
          scientific and laboratory research. They are not for human or
          veterinary consumption. By entering, you confirm you are 18 years or
          older and understand this distinction.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <form action={confirmAgeGate}>
            <button
              ref={enterRef}
              type="submit"
              className="w-full sm:w-auto px-8 py-3 bg-[#0D1B3E] text-white uppercase tracking-wider text-sm hover:bg-[#162040] transition-colors"
            >
              Enter site
            </button>
          </form>
          <form action={leaveSite}>
            <button
              type="submit"
              className="w-full sm:w-auto px-8 py-3 border border-[#DDE1E7] text-[#0D1B3E] uppercase tracking-wider text-sm hover:bg-[#F7F8FA] transition-colors"
            >
              Leave
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
