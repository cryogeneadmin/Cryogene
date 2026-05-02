import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";

import { ComplianceBanner } from "@/components/storefront/layout/ComplianceBanner";
import { AgeVerificationGate } from "@/components/storefront/layout/AgeVerificationGate";
import { CookieConsent } from "@/components/storefront/layout/CookieConsent";
import { Navbar } from "@/components/storefront/layout/Navbar";
import { Footer } from "@/components/storefront/layout/Footer";
import { isAgeVerified } from "@/app/actions/age-gate";

async function AgeGateCheck() {
  const verified = await isAgeVerified();
  if (verified) return null;
  return <AgeVerificationGate />;
}

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-sans",
  display: "swap",
});

const jetBrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://cryogene.co.uk"),
  title: {
    default: "Cryogene Laboratories — UK Research Peptides, HPLC-Tested & Documented",
    template: "%s | Cryogene Laboratories",
  },
  description:
    "Research-grade peptides and research supplies for UK laboratory research. Every product HPLC-tested with a Certificate of Analysis. For laboratory research use only.",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "Cryogene Laboratories",
    locale: "en_GB",
    images: [{ url: "/site/og-default.png", width: 1200, height: 630, alt: "Cryogene Laboratories" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/site/og-default.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en-GB"
      className={`${cormorantGaramond.variable} ${dmSans.variable} ${jetBrains.variable} font-sans`}
    >
      <body className="min-h-screen flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-[#0D1B3E] focus:text-white focus:px-4 focus:py-2 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#0D1B3E]"
        >
          Skip to main content
        </a>
        <ComplianceBanner />
        <Suspense>
          <AgeGateCheck />
        </Suspense>
        <div className="pt-9 flex-1 flex flex-col">
          <Navbar />
          <main id="main" className="flex-1">{children}</main>
          <Footer />
        </div>
        <Suspense>
          <CookieConsent />
        </Suspense>
      </body>
    </html>
  );
}
