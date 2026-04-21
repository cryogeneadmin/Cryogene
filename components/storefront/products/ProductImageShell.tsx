"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  src: string;
  alt: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
  /** If true, renders `fill` layout. If false, renders `width`/`height` layout. */
  fill?: boolean;
  width?: number;
  height?: number;
  padding?: string;
};

export function ProductImageShell({
  src,
  alt,
  priority = false,
  sizes,
  className = "",
  fill = true,
  width,
  height,
  padding = "p-6",
}: Props) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-[#F7F8FA] ${className}`}
      aria-busy={!loaded}
    >
      {/* Spec-sheet grid lines + shimmer until the image has loaded. */}
      <div
        aria-hidden="true"
        className={[
          "absolute inset-0 pointer-events-none transition-opacity duration-500",
          loaded ? "opacity-0" : "opacity-100",
        ].join(" ")}
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(13,27,62,0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(13,27,62,0.04) 1px, transparent 1px),
            linear-gradient(105deg, transparent 40%, rgba(192,200,216,0.35) 50%, transparent 60%)
          `,
          backgroundSize: "32px 32px, 32px 32px, 200% 100%",
          animation: loaded ? "none" : "cryogene-shimmer 2.2s ease-in-out infinite",
        }}
      />
      {fill ? (
        <Image
          src={src}
          alt={alt}
          fill
          className={`object-contain ${padding} transition-opacity duration-500 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          sizes={sizes}
          priority={priority}
          unoptimized
          onLoad={() => setLoaded(true)}
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          width={width ?? 600}
          height={height ?? 600}
          className={`object-contain w-full h-full ${padding} transition-opacity duration-500 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          priority={priority}
          unoptimized
          onLoad={() => setLoaded(true)}
        />
      )}
      <style>{`
        @keyframes cryogene-shimmer {
          0%   { background-position: 0 0, 0 0, 200% 0; }
          100% { background-position: 0 0, 0 0, -100% 0; }
        }
      `}</style>
    </div>
  );
}
