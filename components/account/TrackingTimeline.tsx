import type { TrackingEvent, TrackingMilestone } from "@/types/order";
import { coerceToDate } from "@/lib/utils";

const STAGES: Array<{ id: TrackingMilestone; label: string }> = [
  { id: "collected", label: "Royal Mail collected" },
  { id: "in_transit", label: "In transit" },
  { id: "out_for_delivery", label: "Out for delivery" },
  { id: "delivered", label: "Delivered" },
];

export function TrackingTimeline({
  events,
  lastStatus,
  trackingNumber,
}: {
  events: TrackingEvent[];
  lastStatus: TrackingMilestone | null;
  trackingNumber: string | null;
}) {
  if (lastStatus === "failed") {
    return (
      <section className="border border-red-200 bg-red-50 p-4 text-sm">
        <p className="font-medium text-red-900">Delivery problem</p>
        <p className="text-red-900 mt-1">
          We&apos;ve been notified and will be in touch within one working day.
          If you&apos;d like to act sooner, please contact us at hello@cryogenelaboratories.co.uk.
        </p>
      </section>
    );
  }

  if (events.length === 0) {
    if (!trackingNumber) {
      return (
        <section className="border border-border bg-offwhite p-4 text-sm text-muted">
          Awaiting label generation. Tracking will appear here once your parcel
          is in the Royal Mail network.
        </section>
      );
    }
    return (
      <section className="border border-border bg-offwhite p-4 text-sm text-muted">
        Awaiting Royal Mail collection. Tracking updates will appear here as
        your parcel moves.{" "}
        <a
          href={`https://www.royalmail.com/track-your-item#/tracking-results/${encodeURIComponent(
            trackingNumber
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Check Royal Mail directly
        </a>
        .
      </section>
    );
  }

  const reachedStageIndices = new Set<number>();
  for (const event of events) {
    const idx = STAGES.findIndex((s) => s.id === event.milestone);
    if (idx >= 0) reachedStageIndices.add(idx);
  }
  const lastReachedIdx = Math.max(-1, ...reachedStageIndices);

  return (
    <section className="border border-border bg-white p-6">
      <p className="label-editorial mb-4">Tracking</p>
      <ol>
        {STAGES.map((stage, idx) => {
          const reached = reachedStageIndices.has(idx);
          const matchingEvent = events.find((e) => e.milestone === stage.id);
          const isFinal = idx === lastReachedIdx;
          return (
            <li key={stage.id} className="flex items-start gap-3 py-2">
              <span
                aria-hidden="true"
                className={
                  "inline-block w-3 h-3 rounded-full mt-1.5 flex-shrink-0 " +
                  (reached
                    ? "bg-success-bg border-2 border-success-text"
                    : "bg-offwhite border-2 border-border")
                }
              />
              <div className="flex-1">
                <p className={reached ? "text-body" : "text-muted"}>
                  {stage.label}
                  {isFinal && reached && (
                    <span className="ml-2 text-xs text-success-text">(latest)</span>
                  )}
                </p>
                {matchingEvent && (
                  <p className="text-xs text-muted">
                    {coerceToDate(matchingEvent.timestamp)?.toLocaleString("en-GB")}
                    {matchingEvent.location && ` — ${matchingEvent.location}`}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
