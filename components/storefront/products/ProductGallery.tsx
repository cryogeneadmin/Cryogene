"use client";

import { useState } from "react";
import Image from "next/image";

export function ProductGallery({
  images,
  primaryIndex,
  productName,
  altSuffix,
}: {
  images: string[];
  primaryIndex: number;
  productName: string;
  altSuffix: string;
}) {
  const initial = images[primaryIndex] ?? images[0] ?? "/placeholder-vial.svg";
  const [active, setActive] = useState(initial);

  return (
    <div>
      <div className="border border-border bg-offwhite p-12 flex items-center justify-center aspect-square">
        <Image
          src={active}
          alt={`${productName} research ${altSuffix} vial`}
          width={600}
          height={600}
          className="object-contain w-full h-full"
          priority
          unoptimized
        />
      </div>
      {images.length > 1 && (
        <ul
          aria-label="Product images"
          className="mt-3 grid grid-cols-5 gap-2"
        >
          {images.map((src, i) => {
            const isActive = src === active;
            return (
              <li key={`${src}-${i}`}>
                <button
                  type="button"
                  onClick={() => setActive(src)}
                  aria-pressed={isActive}
                  aria-label={`View image ${i + 1} of ${images.length}`}
                  className={`block w-full aspect-square border bg-offwhite p-2 ${
                    isActive ? "border-navy" : "border-border hover:border-navy"
                  }`}
                >
                  <Image
                    src={src}
                    alt=""
                    width={120}
                    height={120}
                    className="object-contain w-full h-full"
                    unoptimized
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
