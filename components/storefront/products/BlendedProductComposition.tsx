// Server component (no "use client" needed)

export function BlendedProductComposition({
  composition,
}: {
  composition: Array<{ compound: string; amount: string }>;
}) {
  return (
    <div className="mt-6 border border-border p-5">
      <p className="label-editorial text-navy mb-3">BLEND COMPOSITION</p>
      <div className="space-y-2">
        {composition.map((item) => (
          <div key={item.compound} className="flex justify-between text-sm py-1 border-b border-border last:border-0">
            <span className="text-body-grey">{item.compound}</span>
            <span className="text-muted">{item.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
