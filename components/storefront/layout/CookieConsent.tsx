// components/storefront/layout/CookieConsent.tsx
import Link from "next/link";
import {
  acceptCookies,
  declineCookies,
  getCookieConsent,
} from "@/app/actions/cookie-consent";

export async function CookieConsent() {
  const consent = await getCookieConsent();
  if (consent !== "unknown") return null;

  return (
    <>
      {/*
        In-flow spacer: keeps the fixed banner from overlapping page content
        (form fields, CTAs, footer). Mounted as a sibling of the fixed
        element below so the document flow naturally allocates the height.
      */}
      <div aria-hidden="true" className="h-32 md:h-20 shrink-0" />
      <div
        role="region"
        aria-label="Cookie consent"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#DDE1E7] shadow-[0_-4px_12px_rgba(13,27,62,0.06)]"
      >
        <div className="max-w-[1280px] mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-sm leading-relaxed text-[#333333] max-w-2xl">
            We use cookies for essential site functionality and, with your
            consent, anonymous analytics to understand how visitors use the
            site. You can accept, decline, or{" "}
            <Link
              href="/legal/cookies"
              className="underline hover:text-[#0D1B3E]"
            >
              read our cookie policy
            </Link>
            .
          </p>
          {/*
            Buttons are visually equal weight per ICO guidance — Accept must
            not be more prominent than Decline, otherwise consent is not
            "freely given" under UK GDPR.
          */}
          <div className="flex gap-3">
            <form action={acceptCookies}>
              <button
                type="submit"
                className="px-5 py-2 border border-[#0D1B3E] text-[#0D1B3E] uppercase tracking-wider text-xs hover:bg-[#0D1B3E] hover:text-white transition-colors"
              >
                Accept
              </button>
            </form>
            <form action={declineCookies}>
              <button
                type="submit"
                className="px-5 py-2 border border-[#0D1B3E] text-[#0D1B3E] uppercase tracking-wider text-xs hover:bg-[#0D1B3E] hover:text-white transition-colors"
              >
                Decline
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
