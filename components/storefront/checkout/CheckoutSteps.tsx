import Link from "next/link";

type Step = "basket" | "delivery" | "review" | "confirmation";

const STEPS: Array<{ id: Step; label: string; href: string }> = [
  { id: "basket", label: "Basket", href: "/basket" },
  { id: "delivery", label: "Delivery", href: "/checkout/delivery" },
  { id: "review", label: "Review", href: "/checkout/review" },
  { id: "confirmation", label: "Confirmation", href: "" },
];

export function CheckoutSteps({ current }: { current: Step }) {
  const activeIndex = STEPS.findIndex((s) => s.id === current);

  return (
    <nav
      aria-label="Checkout progress"
      className="mb-8 -mx-6 px-6 overflow-x-auto"
    >
      <ol className="flex items-center gap-3 sm:gap-4 min-w-max sm:min-w-0">
        {STEPS.map((step, idx) => {
          const isActive = idx === activeIndex;
          const isPast = idx < activeIndex;
          const isFuture = idx > activeIndex;
          const labelClasses = isActive
            ? "text-navy"
            : isPast
            ? "text-muted hover:text-navy"
            : "text-muted/60";
          const indexClasses = isActive
            ? "border-navy text-navy"
            : isPast
            ? "border-muted text-muted"
            : "border-border text-muted/60";

          const content = (
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`inline-flex items-center justify-center h-5 w-5 border text-[10px] font-mono ${indexClasses}`}
              >
                {idx + 1}
              </span>
              <span className="label-editorial text-[11px]">{step.label}</span>
            </span>
          );

          return (
            <li key={step.id} className="flex items-center gap-3 sm:gap-4">
              {isPast && step.href ? (
                <Link href={step.href} className={labelClasses}>
                  {content}
                </Link>
              ) : (
                <span
                  className={labelClasses}
                  aria-current={isActive ? "step" : undefined}
                >
                  {content}
                </span>
              )}
              {idx < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`h-px w-6 sm:w-10 ${
                    isPast ? "bg-muted" : "bg-border"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
