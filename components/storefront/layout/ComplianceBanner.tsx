export function ComplianceBanner() {
  return (
    <div
      role="status"
      aria-label="Compliance notice"
      className="fixed top-0 left-0 right-0 z-50 h-9 flex items-center justify-center bg-[#0D1B3E] text-[#AABBCC] text-[11px] uppercase tracking-wider px-4 text-center"
    >
      Products sold on this site are for research purposes only and are not
      for human or veterinary use.
    </div>
  );
}
