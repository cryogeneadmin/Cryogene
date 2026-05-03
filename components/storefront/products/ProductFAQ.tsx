import type { ProductFaqItem } from "@/types";

export function ProductFAQ({ items }: { items: ProductFaqItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mt-16">
      <h2 className="text-3xl mb-8">Research FAQ</h2>
      <div className="space-y-8">
        {items.map((item, idx) => (
          <div key={idx} className="border-b border-border pb-8 last:border-0">
            <h3 className="font-serif text-xl text-navy mb-3">
              {item.question}
            </h3>
            <p className="text-body-grey leading-relaxed">{item.answer}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
