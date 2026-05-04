export function ComplianceBanner() {
  return (
    <aside className="fixed top-0 left-0 right-0 z-50 h-9 flex items-center justify-center bg-navy text-navy-text text-[11px] uppercase tracking-wider px-4 text-center">
      <span className="md:hidden">Research use only. Not for human or veterinary use.</span>
      <span className="hidden md:inline">Products sold on this site are for research purposes only and are not for human or veterinary use.</span>
    </aside>
  );
}
