// components/storefront/layout/PlaceholderBanner.tsx
export function PlaceholderBanner({
  label = "Placeholder — pending review",
  body,
}: {
  label?: string;
  body: string;
}) {
  return (
    <div className="bg-[#FFF3CD] border border-[#E6C97A] p-4 mb-8">
      <p className="label-editorial text-[#6A4D00] mb-1">⚠️ {label}</p>
      <p className="text-xs text-[#6A4D00]">{body}</p>
    </div>
  );
}
