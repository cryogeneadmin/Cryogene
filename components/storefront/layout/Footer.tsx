// components/storefront/layout/Footer.tsx
import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-[#0D1B3E] text-[#8BAAD4] mt-24">
      <div className="max-w-[1280px] mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <p className="label-editorial text-[#AABBCC] mb-4">Shop</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/peptides" className="hover:text-white">Research Peptides</Link></li>
            <li><Link href="/supplies" className="hover:text-white">Research Supplies</Link></li>
            <li><Link href="/mixers" className="hover:text-white">Mixers &amp; Solvents</Link></li>
          </ul>
        </div>
        <div>
          <p className="label-editorial text-[#AABBCC] mb-4">Legal</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/legal/terms" className="hover:text-white">Terms</Link></li>
            <li><Link href="/legal/privacy" className="hover:text-white">Privacy</Link></li>
            <li><Link href="/legal/cookies" className="hover:text-white">Cookies</Link></li>
            <li><Link href="/legal/refunds" className="hover:text-white">Refunds</Link></li>
            <li><Link href="/legal/shipping" className="hover:text-white">Shipping</Link></li>
            <li><Link href="/legal/research-use" className="hover:text-white">Research Use Only</Link></li>
          </ul>
        </div>
        <div>
          <p className="label-editorial text-[#AABBCC] mb-4">Company</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/about" className="hover:text-white">About</Link></li>
            <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
          </ul>
        </div>
        <div>
          <p className="label-editorial text-[#AABBCC] mb-4">Research</p>
          <ul className="space-y-2 text-sm">
            <li><Link href="/product-information" className="hover:text-white">Product Information</Link></li>
            <li><Link href="/legal/research-use" className="hover:text-white">Research Use Only</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[#162040]">
        <div className="max-w-[1280px] mx-auto px-6 py-6 text-xs text-[#8BAAD4] flex flex-col md:flex-row md:justify-between gap-2">
          <p>&copy; 2026 Cryogene. Registered in England. [ADDRESS TBC]</p>
          <p className="uppercase tracking-wider">
            All products for research use only — not for human or veterinary consumption.
          </p>
        </div>
      </div>
    </footer>
  );
}
