"use client";

import { useEffect, useState } from "react";

export function NavbarShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(total > 0 ? Math.min(1, Math.max(0, y / total)) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={[
        "group sticky top-9 z-30 bg-white border-b transition-[border-color] duration-200",
        scrolled ? "border-navy" : "border-border",
      ].join(" ")}
      data-scrolled={scrolled ? "true" : "false"}
    >
      <div className="[&_nav]:border-b-0">{children}</div>
      <div
        aria-hidden="true"
        className="absolute left-0 bottom-0 h-[2px] bg-navy transition-[width] duration-100"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}
