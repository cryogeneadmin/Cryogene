// components/storefront/layout/Footer.tsx
import Link from "next/link";
import Image from "next/image";
import { getConfig } from "@/lib/config";

const CREDIBILITY_ITEMS: { label: string; sub: string; icon: React.ReactNode }[] = [
  {
    label: "HPLC-Tested",
    sub: "Every batch ≥99% purity",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden="true">
        <path d="M3 20h18M5 20V8l4-4h6l4 4v12M9 12h6M9 16h6" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    label: "CoA Per Batch",
    sub: "Certificate of Analysis available on request",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden="true">
        <path d="M6 3h9l5 5v13H6V3z M15 3v5h5 M9 13h7 M9 17h7" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    label: "UK Dispatched",
    sub: "Insulated, next-working-day",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden="true">
        <path d="M3 7h13v10H3z M16 10h3l2 3v4h-5 M6 20a2 2 0 100-4 2 2 0 000 4z M17 20a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    label: "Research Use Only",
    sub: "Supplied to qualified researchers",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" aria-hidden="true">
        <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
];

export async function Footer() {
  "use cache";
  const config = await getConfig();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#0D1B3E] text-[#8BAAD4] mt-24">
      {/* Trust manifold — credibility row */}
      <div className="border-b border-[#162040]">
        <div className="max-w-[1280px] mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {CREDIBILITY_ITEMS.map((item) => (
            <div key={item.label} className="flex items-start gap-3 text-white">
              <div className="text-[#8BAAD4] shrink-0">{item.icon}</div>
              <div>
                <p className="text-sm font-medium tracking-wide">{item.label}</p>
                <p className="text-[11px] text-[#8BAAD4] mt-0.5">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Core link columns */}
      <div className="max-w-[1280px] mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2 md:col-span-2">
          <Image
            src="/brand/cryogene-logo-nav.png"
            alt={config.storeName}
            width={216}
            height={60}
            className="h-10 w-auto invert opacity-90 mb-4"
          />
          <p className="text-[13px] leading-relaxed text-[#AABBCC] max-w-sm">
            UK-based research-peptide supply. HPLC-documented, batch-traceable,
            research-use only.
          </p>
          {config.companyNumber && (
            <p className="text-[11px] mono text-[#5B7BA3] mt-4 tracking-[0.25em]">
              Company No. {config.companyNumber}
            </p>
          )}
          {config.vatNumber && (
            <p className="text-[11px] mono text-[#5B7BA3] mt-1 tracking-[0.25em]">
              VAT No. {config.vatNumber}
            </p>
          )}
        </div>
        <div>
          <p className="label-editorial text-[#AABBCC] mb-4">Shop</p>
          <ul className="space-y-2 text-sm list-none p-0">
            <li><Link href="/peptides" className="hover:text-white">Research Peptides</Link></li>
            <li><Link href="/supplies" className="hover:text-white">Research Supplies</Link></li>
            <li><Link href="/mixers" className="hover:text-white">Mixers &amp; Solvents</Link></li>
          </ul>
        </div>
        <div>
          <p className="label-editorial text-[#AABBCC] mb-4">Legal</p>
          <ul className="space-y-2 text-sm list-none p-0">
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
          <ul className="space-y-2 text-sm list-none p-0">
            <li><Link href="/about" className="hover:text-white">About</Link></li>
            <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
            <li><Link href="/product-information" className="hover:text-white">Product Information</Link></li>
            {config.storeEmail && (
              <li>
                <a href={`mailto:${config.storeEmail}`} className="hover:text-white break-all">
                  {config.storeEmail}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Research-use only legal strip */}
      <div className="border-t border-[#162040]">
        <div className="max-w-[1280px] mx-auto px-6 py-6 text-xs text-[#8BAAD4] flex flex-col md:flex-row md:justify-between gap-2">
          <p>&copy; {year} {config.storeName}. {config.registeredAddress}.</p>
          <p className="uppercase tracking-wider">
            All products for research use only — not for human or veterinary consumption.
          </p>
        </div>
      </div>
    </footer>
  );
}
