import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en-GB"
      className={`${cormorant.variable} ${dmSans.variable} ${jetBrains.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
