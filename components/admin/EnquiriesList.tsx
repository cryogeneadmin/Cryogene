"use client";

import { useState } from "react";
import type { Enquiry, EnquiryStatus } from "@/types";
import { setEnquiryStatusAction } from "@/app/actions/enquiries-admin";
import { coerceToDate } from "@/lib/utils";

export function EnquiriesList({ enquiries }: { enquiries: Enquiry[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (enquiries.length === 0) {
    return <p className="text-sm text-[#6B7280]">No enquiries yet.</p>;
  }

  return (
    <ul className="space-y-3">
      {enquiries.map((e) => (
        <li key={e.id} className="bg-white border border-[#DDE1E7]">
          <button
            type="button"
            onClick={() => setExpanded(expanded === e.id ? null : e.id)}
            className="w-full p-4 text-left flex justify-between items-start hover:bg-[#F7F8FA]"
          >
            <div>
              <p className="font-medium">{e.subject}</p>
              <p className="text-xs text-[#6B7280] mt-1">
                From {e.name} ({e.email}) —{" "}
                {(coerceToDate(e.createdAt) ?? new Date()).toLocaleDateString("en-GB")}
              </p>
            </div>
            <StatusBadge status={e.status} />
          </button>
          {expanded === e.id && (
            <div className="p-4 border-t border-[#DDE1E7] space-y-4">
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{e.message}</p>
              <div className="flex gap-2 flex-wrap">
                <a
                  href={`mailto:${e.email}?subject=Re: ${encodeURIComponent(e.subject)}`}
                  className="px-4 py-2 text-xs uppercase tracking-wider bg-[#0D1B3E] text-white"
                >
                  Reply by email
                </a>
                {e.status !== "replied" && (
                  <button
                    type="button"
                    onClick={() => setEnquiryStatusAction(e.id, "replied")}
                    className="px-4 py-2 text-xs uppercase tracking-wider border border-[#DDE1E7] hover:bg-[#F7F8FA]"
                  >
                    Mark as replied
                  </button>
                )}
                {e.status !== "archived" && (
                  <button
                    type="button"
                    onClick={() => setEnquiryStatusAction(e.id, "archived")}
                    className="px-4 py-2 text-xs uppercase tracking-wider border border-[#DDE1E7] hover:bg-[#F7F8FA]"
                  >
                    Archive
                  </button>
                )}
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function StatusBadge({ status }: { status: EnquiryStatus }) {
  const colorMap: Record<EnquiryStatus, string> = {
    new: "bg-amber-100 text-amber-800",
    replied: "bg-green-100 text-green-800",
    archived: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`px-2 py-0.5 text-xs shrink-0 ${colorMap[status]}`}>
      {status}
    </span>
  );
}
