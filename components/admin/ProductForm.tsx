"use client";

import { useState } from "react";
import type { Product, ProductVariant } from "@/types";
import { saveProduct } from "@/app/actions/products";
import { slugify } from "@/lib/slug";

type Draft = Omit<Product, "createdAt" | "updatedAt" | "updatedBy">;

const emptyVariant: ProductVariant = {
  sku: "",
  size: "",
  packSize: "",
  priceInPence: 0,
  stock: 0,
  coaUrl: null,
  active: true,
};

const emptyDraft: Draft = {
  id: "",
  slug: "",
  name: "",
  category: "peptides",
  shortDescription: "",
  fullDescription: "",
  casNumber: null,
  molecularFormula: null,
  molecularWeight: null,
  synonyms: [],
  purity: "≥98%",
  testingMethod: "HPLC",
  pubchemCid: null,
  moleculeImage: null,
  variants: [{ ...emptyVariant }],
  images: [],
  primaryImageIndex: 0,
  seoTitle: null,
  seoDescription: null,
  faq: [],
  tags: [],
  active: true,
};

export function ProductForm({ initial }: { initial?: Product }) {
  const [draft, setDraft] = useState<Draft>(() => {
    if (initial) {
      const { createdAt: _c, updatedAt: _u, updatedBy: _b, ...rest } = initial;
      return { ...rest };
    }
    return { ...emptyDraft };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const onNameChange = (name: string) => {
    setDraft((d) => ({
      ...d,
      name,
      // Only auto-fill slug if it hasn't been manually edited
      slug: d.slug === slugify(d.name) || d.slug === "" ? slugify(name) : d.slug,
    }));
  };

  const updateVariant = (idx: number, patch: Partial<ProductVariant>) => {
    setDraft((d) => ({
      ...d,
      variants: d.variants.map((v, i) => (i === idx ? { ...v, ...patch } : v)),
    }));
  };

  const addVariant = () => {
    setDraft((d) => ({
      ...d,
      variants: [...d.variants, { ...emptyVariant }],
    }));
  };

  const removeVariant = (idx: number) => {
    setDraft((d) => ({
      ...d,
      variants: d.variants.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await saveProduct(draft);
    } catch (err) {
      // Re-throw Next.js redirect errors so the router can handle them
      if (
        err instanceof Error &&
        (err as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")
      ) {
        throw err;
      }
      setError(err instanceof Error ? err.message : "Failed to save");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10 max-w-4xl">
      {/* Basic Information */}
      <section>
        <h2 className="font-serif text-2xl text-[#0D1B3E] mb-6">
          Basic information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label-editorial block mb-2">Name</label>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => onNameChange(e.target.value)}
              required
              className="w-full border border-[#DDE1E7] p-2"
            />
          </div>
          <div>
            <label className="label-editorial block mb-2">Slug</label>
            <input
              type="text"
              value={draft.slug}
              onChange={(e) => update("slug", e.target.value)}
              required
              className="w-full border border-[#DDE1E7] p-2 mono"
            />
          </div>
          <div>
            <label className="label-editorial block mb-2">Category</label>
            <select
              value={draft.category}
              onChange={(e) =>
                update("category", e.target.value as Product["category"])
              }
              className="w-full border border-[#DDE1E7] p-2"
            >
              <option value="peptides">Peptides</option>
              <option value="mixers">Mixers</option>
              <option value="supplies">Supplies</option>
            </select>
          </div>
          <div>
            <label className="label-editorial block mb-2">Active</label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => update("active", e.target.checked)}
              />
              <span>Product is visible in storefront</span>
            </label>
          </div>
        </div>
        <div className="mt-6">
          <label className="label-editorial block mb-2">Short description</label>
          <textarea
            value={draft.shortDescription}
            onChange={(e) => update("shortDescription", e.target.value)}
            rows={2}
            className="w-full border border-[#DDE1E7] p-2"
          />
        </div>
        <div className="mt-6">
          <label className="label-editorial block mb-2">
            Full description (markdown)
          </label>
          <textarea
            value={draft.fullDescription}
            onChange={(e) => update("fullDescription", e.target.value)}
            rows={8}
            className="w-full border border-[#DDE1E7] p-2 font-mono text-sm"
          />
        </div>
      </section>

      {/* Chemical Identity */}
      <section>
        <h2 className="font-serif text-2xl text-[#0D1B3E] mb-6">
          Chemical identity
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="label-editorial block mb-2">CAS Number</label>
            <input
              type="text"
              value={draft.casNumber ?? ""}
              onChange={(e) =>
                update("casNumber", e.target.value || null)
              }
              className="w-full border border-[#DDE1E7] p-2 mono"
            />
          </div>
          <div>
            <label className="label-editorial block mb-2">
              Molecular Formula
            </label>
            <input
              type="text"
              value={draft.molecularFormula ?? ""}
              onChange={(e) =>
                update("molecularFormula", e.target.value || null)
              }
              className="w-full border border-[#DDE1E7] p-2 mono"
            />
          </div>
          <div>
            <label className="label-editorial block mb-2">
              Molecular Weight
            </label>
            <input
              type="text"
              value={draft.molecularWeight ?? ""}
              onChange={(e) =>
                update("molecularWeight", e.target.value || null)
              }
              className="w-full border border-[#DDE1E7] p-2 mono"
            />
          </div>
          <div>
            <label className="label-editorial block mb-2">Purity</label>
            <input
              type="text"
              value={draft.purity ?? ""}
              onChange={(e) => update("purity", e.target.value || null)}
              className="w-full border border-[#DDE1E7] p-2"
            />
          </div>
          <div>
            <label className="label-editorial block mb-2">Testing method</label>
            <select
              value={draft.testingMethod ?? ""}
              onChange={(e) =>
                update(
                  "testingMethod",
                  (e.target.value || null) as Product["testingMethod"]
                )
              }
              className="w-full border border-[#DDE1E7] p-2"
            >
              <option value="">— none —</option>
              <option value="HPLC">HPLC</option>
              <option value="MS">MS</option>
              <option value="HPLC-MS">HPLC-MS</option>
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="label-editorial block mb-2">
              Synonyms (comma-separated)
            </label>
            <input
              type="text"
              value={draft.synonyms.join(", ")}
              onChange={(e) =>
                update(
                  "synonyms",
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
              className="w-full border border-[#DDE1E7] p-2"
            />
          </div>
        </div>
      </section>

      {/* Variants */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl text-[#0D1B3E]">Variants</h2>
          <button
            type="button"
            onClick={addVariant}
            className="text-xs underline"
          >
            + Add variant
          </button>
        </div>
        <div className="space-y-4">
          {draft.variants.map((v, idx) => (
            <div
              key={idx}
              className="bg-white border border-[#DDE1E7] p-4 grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto_auto] gap-3 items-end"
            >
              <div>
                <label className="label-editorial block mb-1">SKU</label>
                <input
                  type="text"
                  value={v.sku}
                  onChange={(e) => updateVariant(idx, { sku: e.target.value })}
                  className="w-full border border-[#DDE1E7] p-2 mono text-xs"
                />
              </div>
              <div>
                <label className="label-editorial block mb-1">Size</label>
                <input
                  type="text"
                  value={v.size}
                  onChange={(e) =>
                    updateVariant(idx, { size: e.target.value })
                  }
                  className="w-full border border-[#DDE1E7] p-2"
                />
              </div>
              <div>
                <label className="label-editorial block mb-1">Pack size</label>
                <input
                  type="text"
                  value={v.packSize}
                  onChange={(e) =>
                    updateVariant(idx, { packSize: e.target.value })
                  }
                  className="w-full border border-[#DDE1E7] p-2"
                />
              </div>
              <div>
                <label className="label-editorial block mb-1">Price (£)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={(v.priceInPence / 100).toFixed(2)}
                  onChange={(e) =>
                    updateVariant(idx, {
                      priceInPence: Math.round(
                        parseFloat(e.target.value || "0") * 100
                      ),
                    })
                  }
                  className="w-full border border-[#DDE1E7] p-2"
                />
              </div>
              <div>
                <label className="label-editorial block mb-1">Stock</label>
                <input
                  type="number"
                  min="0"
                  value={v.stock}
                  onChange={(e) =>
                    updateVariant(idx, {
                      stock: parseInt(e.target.value || "0", 10),
                    })
                  }
                  className="w-full border border-[#DDE1E7] p-2"
                />
              </div>
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={v.active}
                  onChange={(e) =>
                    updateVariant(idx, { active: e.target.checked })
                  }
                />
                <span>Active</span>
              </label>
              <button
                type="button"
                onClick={() => removeVariant(idx)}
                className="text-xs text-red-700 underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-[#6B7280] mt-3">
          Image and COA upload arrive in the next iteration — for Stage 1a,
          variant COA URLs can be left empty.
        </p>
      </section>

      {/* SEO */}
      <section>
        <h2 className="font-serif text-2xl text-[#0D1B3E] mb-6">
          SEO (optional overrides)
        </h2>
        <div className="space-y-4">
          <div>
            <label className="label-editorial block mb-2">
              Meta title override
            </label>
            <input
              type="text"
              value={draft.seoTitle ?? ""}
              onChange={(e) => update("seoTitle", e.target.value || null)}
              className="w-full border border-[#DDE1E7] p-2"
            />
          </div>
          <div>
            <label className="label-editorial block mb-2">
              Meta description override
            </label>
            <textarea
              value={draft.seoDescription ?? ""}
              onChange={(e) =>
                update("seoDescription", e.target.value || null)
              }
              rows={2}
              className="w-full border border-[#DDE1E7] p-2"
            />
          </div>
        </div>
      </section>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="flex gap-3 sticky bottom-0 bg-[#F7F8FA] py-4 border-t border-[#DDE1E7]">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 bg-[#0D1B3E] text-white uppercase tracking-wider text-xs hover:bg-[#162040] disabled:bg-[#6B7280]"
        >
          {saving ? "Saving..." : "Save product"}
        </button>
        <a
          href="/admin/products"
          className="px-6 py-3 border border-[#DDE1E7] uppercase tracking-wider text-xs hover:bg-white"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}
