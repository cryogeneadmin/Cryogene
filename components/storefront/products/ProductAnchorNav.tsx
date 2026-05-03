"use client";

import { useEffect, useState } from "react";

type Anchor = { id: string; label: string };

export function ProductAnchorNav({ anchors }: { anchors: Anchor[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          // Pick the one closest to the top of the viewport.
          const top = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
          setActive(top.target.id);
        }
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: 0 },
    );

    for (const a of anchors) {
      const el = document.getElementById(a.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [anchors]);

  return (
    <nav
      aria-label="On this page"
      className="sticky top-28 z-10 -mx-6 md:mx-0 bg-white border-y md:border border-border mb-10"
    >
      <ul className="flex overflow-x-auto gap-1 px-6 md:px-2 py-1 list-none m-0">
        {anchors.map((a) => {
          const isActive = active === a.id;
          return (
            <li key={a.id}>
              <a
                href={`#${a.id}`}
                className={[
                  "inline-block text-xs uppercase tracking-wider px-3 py-2 whitespace-nowrap transition-colors",
                  isActive
                    ? "text-navy border-b-2 border-navy"
                    : "text-muted border-b-2 border-transparent hover:text-navy",
                ].join(" ")}
              >
                {a.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
