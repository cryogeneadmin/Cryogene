import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

import { ComplianceBanner } from "@/components/storefront/layout/ComplianceBanner";
import { AgeVerificationGate } from "@/components/storefront/layout/AgeVerificationGate";
import { CookieConsent } from "@/components/storefront/layout/CookieConsent";
import { Navbar } from "@/components/storefront/layout/Navbar";
import { Footer } from "@/components/storefront/layout/Footer";
import { isAgeVerified } from "@/app/actions/age-gate";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

const jetBrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "[Store Name] — UK Research Peptides, HPLC-Tested & Documented",
    template: "%s | [Store Name]",
  },
  description:
    "Research-grade peptides, capsules, and mixers for UK laboratory research. Every product HPLC-tested with a Certificate of Analysis. For laboratory research use only.",
  robots: { index: true, follow: true },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const verified = await isAgeVerified();

  return (
    <html
      lang="en-GB"
      className={`${cormorant.variable} ${dmSans.variable} ${jetBrains.variable}`}
    >
      <body className="min-h-screen flex flex-col">
        <ComplianceBanner />
        {!verified && <AgeVerificationGate />}
        <div className="pt-9 flex-1 flex flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
        <CookieConsent />
      </body>
    </html>
  );
}
