// components/storefront/layout/Navbar.tsx
import Link from "next/link";
import Image from "next/image";
import { BasketIconButton } from "@/components/storefront/basket/BasketIconButton";
import { BasketDrawer } from "@/components/storefront/basket/BasketDrawer";
import { NavbarShell } from "./NavbarShell";
import { MobileNav } from "./MobileNav";
import { getConfig } from "@/lib/config";

const navLinks = [
  { href: "/peptides", label: "Peptides" },
  { href: "/mixers", label: "Mixers" },
  { href: "/supplies", label: "Supplies" },
  { href: "/product-information", label: "Product Info" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export async function Navbar() {
  const config = await getConfig();
  return (
    <>
      <NavbarShell>
        <nav className="bg-white">
          <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between transition-[height] duration-200 group-data-[scrolled=true]:h-14">
            <div className="flex items-center gap-2">
              <MobileNav links={navLinks} />
              <Link href="/" aria-label={`${config.storeName} home`} className="flex items-center">
                <Image
                  src="/brand/cryogene-logo-nav.png"
                  alt={config.storeName}
                  width={216}
                  height={60}
                  priority
                  className="h-10 w-auto transition-[height] duration-200 group-data-[scrolled=true]:h-8"
                />
              </Link>
            </div>
            <ul className="hidden md:flex items-center gap-8 list-none p-0">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="label-editorial hover:text-[#0D1B3E] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-6">
              <Link href="/sign-in" className="label-editorial hover:text-[#0D1B3E] hidden md:inline-block">
                Sign in
              </Link>
              <BasketIconButton />
            </div>
          </div>
        </nav>
      </NavbarShell>
      <BasketDrawer />
    </>
  );
}
