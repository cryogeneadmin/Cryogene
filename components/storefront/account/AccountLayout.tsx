"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutCurrentUser } from "@/lib/auth";
import { useRouter } from "next/navigation";

const links = [
  { href: "/account", label: "Dashboard" },
  { href: "/account/orders", label: "Order history" },
  { href: "/account/data", label: "Data & privacy" },
  { href: "/account/settings", label: "Settings" },
];

export function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOutCurrentUser();
    router.push("/");
  };

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-12">
      <nav className="space-y-2">
        <p className="label-editorial mb-4">My account</p>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`block py-2 text-sm ${pathname === link.href ? "text-navy font-medium" : "text-muted hover:text-navy"}`}
          >
            {link.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={handleSignOut}
          className="block py-2 text-sm text-muted hover:text-navy mt-4"
        >
          Sign out
        </button>
      </nav>
      <div>{children}</div>
    </div>
  );
}
