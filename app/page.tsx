export default function HomePage() {
  return (
    <div className="max-w-[1280px] mx-auto px-6 py-24">
      <p className="label-editorial mb-6">Phase 1 — Foundation Milestone</p>
      <h1 className="text-5xl md:text-6xl mb-8 leading-tight">
        Research-grade peptides,
        <br />
        documented to the batch.
      </h1>
      <p className="text-lg text-[#333333] max-w-2xl leading-relaxed mb-10">
        This is a placeholder homepage served as part of the Phase 1 foundation
        build. Compliance infrastructure, navigation scaffolding, data layer,
        and brand typography are in place. The full storefront will be built in
        Plan 2.
      </p>
      <div className="inline-flex items-center gap-4 px-6 py-3 bg-[#FFF3CD] border border-[#E6C97A] text-[#6A4D00]">
        <span className="label-editorial text-[#6A4D00]">Laboratory research only</span>
        <span className="text-sm">
          Not for human or animal consumption.
        </span>
      </div>
    </div>
  );
}
