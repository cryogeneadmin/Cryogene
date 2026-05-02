import type { Product } from "@/types";

// Default storage specs — these are safe for all lyophilised research peptides
// supplied by Cryogene. Non-peptide categories get different defaults.
type Spec = { label: string; value: string };

function specsFor(product: Product): Spec[] {
  if (product.category === "supplies") {
    return [
      { label: "Storage", value: "Ambient, dry" },
      { label: "Shipping", value: "Sealed primary packaging" },
    ];
  }
  if (product.category === "mixers") {
    return [
      { label: "Storage", value: "15–25 °C, sealed" },
      { label: "Appearance", value: "Clear sterile solution" },
      { label: "Shipping form", value: "Sealed glass vial, crimped" },
      { label: "Stability", value: "Per label expiry" },
    ];
  }
  // peptides
  return [
    { label: "Storage", value: "−20 °C sealed (long-term)" },
    { label: "Appearance", value: "Lyophilised white powder" },
    { label: "Shipping form", value: "Sealed glass vial, crimped" },
    { label: "Stability", value: "24 months at −20 °C" },
  ];
}

const colsByCount: Record<number, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
};

export function StorageHandlingPanel({ product }: { product: Product }) {
  const specs = specsFor(product);
  if (specs.length === 0) return null;

  return (
    <section
      aria-label="Storage and handling"
      className="mb-8 border border-[#DDE1E7]"
    >
      <header className="px-4 py-2 bg-[#F7F8FA] border-b border-[#DDE1E7]">
        <h2 className="label-editorial text-[10px] text-[#6B7280] m-0">
          Storage &amp; Handling
        </h2>
      </header>
      <dl className={`grid grid-cols-2 ${colsByCount[specs.length] ?? "md:grid-cols-4"}`}>
        {specs.map((s, i) => (
          <div
            key={s.label}
            className={[
              "px-4 py-3",
              i % 2 === 0 ? "border-r border-[#DDE1E7]" : "",
              i < specs.length - 2 ? "border-b md:border-b-0 border-[#DDE1E7]" : "",
              "md:border-r md:last:border-r-0",
            ].join(" ")}
          >
            <dt className="text-[10px] uppercase tracking-wider text-[#6B7280] mb-1">{s.label}</dt>
            <dd className="text-sm text-[#0D1B3E] font-medium">{s.value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-[11px] text-[#6B7280] px-4 py-2 bg-[#F7F8FA] border-t border-[#DDE1E7]">
        Storage guidance describes chemical handling conditions. Not administration guidance. For research use only.
      </p>
    </section>
  );
}
