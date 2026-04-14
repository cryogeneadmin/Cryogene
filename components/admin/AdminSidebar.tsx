// components/admin/AdminSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/enquiries", label: "Enquiries" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-[#0D1B3E] text-white min-h-screen p-6">
      <p className="font-serif text-2xl mb-10">Admin</p>
      <nav className="space-y-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`block py-2 px-3 text-sm rounded ${
              link.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(link.href)
                ? "bg-[#162040] text-white"
                : "text-[#8BAAD4] hover:bg-[#162040] hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="mt-10 pt-6 border-t border-[#162040]">
        <Link href="/" className="text-xs text-[#8BAAD4] hover:text-white">
          ← Back to storefront
        </Link>
      </div>
    </aside>
  );
}
