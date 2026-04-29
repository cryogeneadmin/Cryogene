"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function MobileNav({
  links,
}: {
  links: { href: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="md:hidden flex items-center justify-center w-10 h-10 -ml-2 text-[#0D1B3E] hover:bg-[#F7F8FA] transition-colors"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-6 h-6"
          aria-hidden="true"
        >
          <path
            d="M4 7h16M4 12h16M4 17h16"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[85%] sm:max-w-sm flex flex-col">
          <SheetHeader>
            <SheetTitle className="font-serif text-2xl text-[#0D1B3E]">
              Menu
            </SheetTitle>
          </SheetHeader>
          <ul className="flex-1 mt-6 space-y-1 list-none p-0">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block py-3 px-2 text-base text-[#0D1B3E] border-b border-[#DDE1E7] hover:bg-[#F7F8FA]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/sign-in"
                onClick={() => setOpen(false)}
                className="block py-3 px-2 text-base text-[#0D1B3E] border-b border-[#DDE1E7] hover:bg-[#F7F8FA]"
              >
                Sign in
              </Link>
            </li>
          </ul>
          <p className="text-[11px] uppercase tracking-wider text-[#6B7280] py-4 border-t border-[#DDE1E7]">
            Research use only — not for human or veterinary use.
          </p>
        </SheetContent>
      </Sheet>
    </>
  );
}
