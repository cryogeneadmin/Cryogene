// components/ui/Skeleton.tsx
//
// Editorial skeleton — uses brand offwhite + border tokens, no shimmer
// animation (would be killed by prefers-reduced-motion anyway, and the
// brand discipline is "no shadows, no gradients, no decoration").
export function Skeleton({
  className = "",
  width = "100%",
  height = "1rem",
}: {
  className?: string;
  width?: string;
  height?: string;
}) {
  return (
    <div
      aria-hidden="true"
      style={{ width, height }}
      className={`bg-offwhite border border-border ${className}`}
    />
  );
}

/** Stack of N skeleton rows for list/table fallbacks. */
export function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height="2.5rem" />
      ))}
    </div>
  );
}
