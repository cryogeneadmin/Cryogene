// Server component (no "use client" needed)

export function BlendedProductComposition({
  composition,
}: {
  composition: Array<{ compound: string; amount: string }>;
}) {
  return (
    <div className="mt-6 border border-[#DDE1E7] p-5">
      <p className="label-editorial text-[#0D1B3E] mb-3">BLEND COMPOSITION</p>
      <div className="space-y-2">
        {composition.map((item) => (
          <div key={item.compound} className="flex justify-between text-sm py-1 border-b border-[#F0F1F3] last:border-0">
            <span className="text-[#333333]">{item.compound}</span>
            <span className="text-[#6B7280]">{item.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
