// components/admin/OrderStatusTimeline.tsx
import type { OrderStatus } from "@/types";

const STEPS: Array<{ id: OrderStatus; label: string }> = [
  { id: "pending", label: "Pending" },
  { id: "paid", label: "Paid" },
  { id: "fulfilled", label: "Fulfilled" },
];

const FINAL_STATES: Record<string, { label: string; tone: "danger" | "warn" }> = {
  cancelled: { label: "Cancelled", tone: "danger" },
  refunded: { label: "Refunded", tone: "warn" },
};

export function OrderStatusTimeline({ status }: { status: OrderStatus }) {
  // Cancelled / refunded — render as a single status pill instead of the
  // forward stepper (the stepper doesn't represent these states well).
  if (status in FINAL_STATES) {
    const { label, tone } = FINAL_STATES[status]!;
    const cls = tone === "danger"
      ? "bg-red-100 text-red-900 border-red-200"
      : "bg-compliance-amber-bg text-compliance-amber-text border-compliance-amber-border";
    return (
      <div className={`mb-8 border ${cls} px-4 py-3 text-sm uppercase tracking-wider`}>
        <span className="label-editorial text-xs mr-2">Status:</span>
        {label}
      </div>
    );
  }

  const activeIndex = STEPS.findIndex((s) => s.id === status);

  return (
    <ol
      aria-label="Order status timeline"
      className="mb-8 grid grid-cols-3 gap-2 border border-border p-4 bg-white"
    >
      {STEPS.map((step, idx) => {
        const isActive = idx === activeIndex;
        const isPast = idx < activeIndex;
        const pillCls = isActive
          ? "bg-navy text-white border-navy"
          : isPast
          ? "bg-success-bg text-success-text border-success-bg"
          : "bg-offwhite text-muted border-border";
        return (
          <li
            key={step.id}
            aria-current={isActive ? "step" : undefined}
            className="flex items-center gap-3"
          >
            <span
              aria-hidden="true"
              className={`inline-flex items-center justify-center h-7 w-7 border text-xs mono ${pillCls}`}
            >
              {idx + 1}
            </span>
            <span
              className={`text-sm uppercase tracking-wider ${
                isActive ? "text-navy" : isPast ? "text-success-text" : "text-muted"
              }`}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
