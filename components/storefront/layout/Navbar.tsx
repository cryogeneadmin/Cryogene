// components/storefront/layout/Navbar.tsx
import Link from "next/link";
import { BasketIconButton } from "@/components/storefront/basket/BasketIconButton";
import { BasketDrawer } from "@/components/storefront/basket/BasketDrawer";

const navLinks = [
  { href: "/peptides", label: "Peptides" },
  { href: "/capsules", label: "Capsules" },
  { href: "/mixers", label: "Mixers" },
  { href: "/product-information", label: "Product Info" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  return (
    <>
      <nav className="sticky top-9 z-30 bg-white border-b border-[#DDE1E7]">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-serif text-[#0D1B3E] tracking-tight">
            [PEPTIDE STORE]
          </Link>
          <ul className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="label-editorial hover:text-[#0D1B3E] transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-4">
            <BasketIconButton />
          </div>
        </div>
      </nav>
      <BasketDrawer />
    </>
  );
}
