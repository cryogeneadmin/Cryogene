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
  { href: "/admin/audit-log", label: "Audit log" },
  { href: "/admin/erasure-summaries", label: "Erasure summaries" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 bg-navy text-white min-h-screen p-6">
      <p className="font-serif text-2xl mb-10">Admin</p>
      <nav className="space-y-1">
        {links.map((link) => {
          const isActive =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className={`block py-2 px-3 text-sm rounded ${
                isActive
                  ? "bg-mid-navy text-white"
                  : "text-navy-icon hover:bg-mid-navy hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-10 pt-6 border-t border-mid-navy">
        <Link href="/" className="text-xs text-navy-icon hover:text-white">
          ← Back to storefront
        </Link>
      </div>
    </aside>
  );
}
