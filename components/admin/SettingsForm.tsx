"use client";

import { useState, useTransition } from "react";
import type { Config } from "@/types";
import { saveConfig } from "@/app/actions/config";

export function SettingsForm({ initial }: { initial: Config }) {
  const [config, setConfig] = useState<Config>(initial);
  const [isPending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<Config>) =>
    setConfig((c) => ({ ...c, ...patch }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await saveConfig(config);
        setSavedAt(new Date());
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to save settings"
        );
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10 max-w-3xl">
      {/* Store identity */}
      <section>
        <h2 className="font-serif text-2xl text-navy mb-6">
          Store identity
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label-editorial block mb-2">Store name</label>
            <input
              type="text"
              value={config.storeName}
              onChange={(e) => update({ storeName: e.target.value })}
              required
              className="w-full border border-border p-2"
            />
          </div>
          <div>
            <label className="label-editorial block mb-2">Store email</label>
            <input
              type="email"
              value={config.storeEmail}
              onChange={(e) => update({ storeEmail: e.target.value })}
              required
              className="w-full border border-border p-2"
            />
          </div>
          <div>
            <label className="label-editorial block mb-2">
              Store phone (optional)
            </label>
            <input
              type="tel"
              value={config.storePhone ?? ""}
              onChange={(e) =>
                update({ storePhone: e.target.value || null })
              }
              className="w-full border border-border p-2"
            />
          </div>
          <div>
            <label className="label-editorial block mb-2">
              Company number (optional)
            </label>
            <input
              type="text"
              value={config.companyNumber ?? ""}
              onChange={(e) =>
                update({ companyNumber: e.target.value || null })
              }
              className="w-full border border-border p-2"
            />
          </div>
          <div className="md:col-span-2">
            <label className="label-editorial block mb-2">
              Registered address
            </label>
            <textarea
              value={config.registeredAddress}
              onChange={(e) => update({ registeredAddress: e.target.value })}
              rows={3}
              className="w-full border border-border p-2"
            />
          </div>
        </div>
      </section>

      {/* VAT */}
      <section>
        <h2 className="font-serif text-2xl text-navy mb-6">VAT</h2>
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={config.vat.registered}
              onChange={(e) =>
                update({ vat: { ...config.vat, registered: e.target.checked } })
              }
            />
            <span>VAT registered</span>
          </label>
          {config.vat.registered && (
            <>
              <div>
                <label className="label-editorial block mb-2">VAT number</label>
                <input
                  type="text"
                  value={config.vatNumber ?? ""}
                  onChange={(e) =>
                    update({ vatNumber: e.target.value || null })
                  }
                  className="w-full border border-border p-2"
                />
              </div>
              <div>
                <label className="label-editorial block mb-2">VAT rate</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={config.vat.rate}
                  onChange={(e) =>
                    update({
                      vat: {
                        ...config.vat,
                        rate: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full border border-border p-2"
                />
                <p className="text-xs text-muted mt-1">
                  Enter as decimal, e.g. 0.20 for 20%
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.vat.displayPricesInclusive}
                  onChange={(e) =>
                    update({
                      vat: {
                        ...config.vat,
                        displayPricesInclusive: e.target.checked,
                      },
                    })
                  }
                />
                <span>Display prices inclusive of VAT</span>
              </label>
            </>
          )}
        </div>
      </section>

      {/* Shipping */}
      <section>
        <h2 className="font-serif text-2xl text-navy mb-6">Shipping</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="label-editorial block mb-2">Flat rate (£)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={(config.shipping.flatRateInPence / 100).toFixed(2)}
              onChange={(e) => {
                const parsed = parseFloat(e.target.value || "0");
                update({
                  shipping: {
                    ...config.shipping,
                    flatRateInPence: Math.round(
                      (isNaN(parsed) ? 0 : parsed) * 100
                    ),
                  },
                });
              }}
              className="w-full border border-border p-2"
            />
          </div>
          <div>
            <label className="label-editorial block mb-2">
              Free over (£, blank for none)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={
                config.shipping.freeThresholdInPence === null
                  ? ""
                  : (config.shipping.freeThresholdInPence / 100).toFixed(2)
              }
              onChange={(e) => {
                const parsed = parseFloat(e.target.value);
                update({
                  shipping: {
                    ...config.shipping,
                    freeThresholdInPence: e.target.value
                      ? Math.round((isNaN(parsed) ? 0 : parsed) * 100)
                      : null,
                  },
                });
              }}
              className="w-full border border-border p-2"
            />
          </div>
          <div className="md:col-span-2">
            <label className="label-editorial block mb-2">
              Estimated dispatch text
            </label>
            <input
              type="text"
              value={config.shipping.estimatedDispatch}
              onChange={(e) =>
                update({
                  shipping: {
                    ...config.shipping,
                    estimatedDispatch: e.target.value,
                  },
                })
              }
              className="w-full border border-border p-2"
            />
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section>
        <h2 className="font-serif text-2xl text-navy mb-6">
          Notifications
        </h2>
        <div>
          <label className="label-editorial block mb-2">
            Order notifications email
          </label>
          <input
            type="email"
            value={config.notifications.newOrderEmailTo}
            onChange={(e) =>
              update({ notifications: { newOrderEmailTo: e.target.value } })
            }
            required
            className="w-full border border-border p-2"
          />
        </div>
      </section>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="flex items-center gap-4 sticky bottom-0 bg-offwhite py-4 border-t border-border">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-3 bg-navy text-white uppercase tracking-wider text-xs hover:bg-mid-navy disabled:bg-muted"
        >
          {isPending ? "Saving..." : "Save settings"}
        </button>
        {savedAt && (
          <p className="text-xs text-green-700">
            Saved at {savedAt.toLocaleTimeString("en-GB")}
          </p>
        )}
      </div>
    </form>
  );
}
