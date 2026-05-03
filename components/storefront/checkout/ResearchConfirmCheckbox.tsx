"use client";

import { useState } from "react";
import { useBasket } from "@/lib/basket";
import { createOrderAction } from "@/app/actions/create-order";

export function ResearchConfirmCheckbox() {
  const [confirmed, setConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { items, clearBasket } = useBasket();

  const handlePay = async () => {
    if (!confirmed) {
      setError("Please confirm research-only use before placing your order");
      return;
    }
    if (!termsAccepted) {
      setError("Please accept the Terms & Conditions and Privacy Policy before placing your order");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await createOrderAction({
        // Only send the minimum identifiers — server recomputes all prices
        items: items.map(({ productSlug, sku, quantity }) => ({
          productSlug,
          sku,
          quantity,
        })),
        // Zod z.literal(true) — these only reach the action if the customer
        // actively ticked each checkbox. If any is false/missing the action
        // returns an error before touching Firestore.
        researchConfirmed: true,
        ageGateConfirmed: true,
        termsAccepted: true,
      });
      if (result.status === "error") {
        setError(result.message);
        setPending(false);
        return;
      }
      clearBasket();
      window.location.href = result.redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setPending(false);
    }
  };

  return (
    <div className="space-y-4 mt-8">
      <label className="flex items-start gap-3 cursor-pointer bg-[#FFF3CD] border border-[#E6C97A] p-4">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-1 accent-[#6A4D00]"
          required
        />
        <span className="text-sm text-[#6A4D00] leading-relaxed">
          I confirm that I am purchasing these products for laboratory research
          purposes only, that I am 18 years or older, and that I understand
          these products are not for human or veterinary consumption.
        </span>
      </label>
      <label className="flex items-start gap-2 mt-4 cursor-pointer">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
          className="mt-1 accent-[#0D1B3E]"
        />
        <span className="text-sm">
          I have read and accept the{" "}
          <a href="/legal/terms" target="_blank" rel="noopener" className="underline text-[#0D1B3E]">
            Terms &amp; Conditions
          </a>
          {" "}and{" "}
          <a href="/legal/privacy" target="_blank" rel="noopener" className="underline text-[#0D1B3E]">
            Privacy Policy
          </a>.
        </span>
      </label>
      {error && (
        <p className="text-sm text-red-700">{error}</p>
      )}
      <button
        type="button"
        onClick={handlePay}
        disabled={!confirmed || !termsAccepted || pending || items.length === 0}
        className="w-full py-4 bg-[#0D1B3E] text-white uppercase tracking-wider text-sm hover:bg-[#162040] disabled:bg-[#6B7280] disabled:cursor-not-allowed"
      >
        {pending ? "Processing..." : "Pay now"}
      </button>
    </div>
  );
}
