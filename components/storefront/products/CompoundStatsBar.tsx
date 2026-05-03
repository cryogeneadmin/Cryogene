import type { Product } from "@/types";

type StatCell = {
  label: string;
  value: string;
  mono: boolean;
};

export function CompoundStatsBar({ product }: { product: Product }) {
  // Hide on supplies — these aren't research compounds.
  if (product.category === "supplies") return null;

  const classification =
    product.category === "peptides"
      ? "Research Peptide"
      : product.category === "mixers"
        ? "Research Solvent"
        : "Research Supply";

  const cells: StatCell[] = [
    {
      label: "Molecular Weight",
      value: product.molecularWeight ? String(product.molecularWeight) : "—",
      mono: true,
    },
    {
      label: "Molecular Formula",
      value: product.molecularFormula ? String(product.molecularFormula) : "—",
      mono: true,
    },
    {
      label: "CAS Number",
      value: product.casNumber ? String(product.casNumber) : "—",
      mono: true,
    },
    {
      label: "Purity",
      value: product.purity ?? "—",
      mono: false,
    },
    {
      label: "Classification",
      value: classification,
      mono: false,
    },
  ];

  return (
    <dl className="grid grid-cols-2 md:grid-cols-5 bg-panel border border-silver mb-8">
      {cells.map((cell, i) => (
        <div
          key={cell.label}
          className={[
            "px-4 py-3 flex flex-col gap-1",
            // Inner dividers: right on all but last in row; bottom on mobile wraps.
            "border-silver",
            i < cells.length - 1 ? "md:border-r" : "",
            i % 2 === 0 ? "border-r" : "",
            i < cells.length - 2 ? "border-b md:border-b-0" : "",
          ].join(" ")}
        >
          <dt className="text-[10px] uppercase tracking-wider text-muted font-sans font-medium">
            {cell.label}
          </dt>
          <dd
            className={[
              "text-[14px] font-semibold text-navy truncate",
              cell.mono ? "font-mono" : "font-sans",
            ].join(" ")}
            title={cell.value}
          >
            {cell.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
