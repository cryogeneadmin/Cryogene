// components/storefront/layout/PlaceholderBanner.tsx
export function PlaceholderBanner({
  label = "Placeholder — pending review",
  body,
}: {
  label?: string;
  body: string;
}) {
  return (
    <div className="bg-compliance-amber-bg border border-compliance-amber-border p-4 mb-8">
      <p className="label-editorial text-compliance-amber-text mb-1">⚠️ {label}</p>
      <p className="text-xs text-compliance-amber-text">{body}</p>
    </div>
  );
}
