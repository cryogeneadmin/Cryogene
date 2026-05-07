"use client";

import { useState, useTransition } from "react";
import type { DispatchConfig } from "@/types/dispatch";
import { setDispatchConfig } from "@/app/actions/dispatch-config";

export function DispatchSettingsForm({ initial }: { initial: DispatchConfig }) {
  const [config, setConfig] = useState<DispatchConfig>(initial);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof DispatchConfig>(key: K, value: DispatchConfig[K]) {
    setConfig((c) => ({ ...c, [key]: value }));
  }

  function updateAddress<K extends keyof DispatchConfig["returnAddress"]>(
    key: K,
    value: DispatchConfig["returnAddress"][K]
  ) {
    setConfig((c) => ({ ...c, returnAddress: { ...c.returnAddress, [key]: value } }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await setDispatchConfig(config);
        setSavedAt(new Date());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save dispatch settings");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white border border-border p-6">
      <div>
        <h2 className="text-2xl mb-2">Dispatch</h2>
        <p className="text-sm text-muted">
          Royal Mail Click & Drop integration + Zebra Cloud printing. The
          Cloud Function fires Mon-Fri 13:00 Europe/London and prints all
          paid orders' labels in one batch.
        </p>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={config.enabled}
          onChange={(e) => update("enabled", e.target.checked)}
          disabled={pending}
          className="mt-0.5"
        />
        <span className="text-sm">
          <strong>Enable live dispatch</strong>
          <span className="block text-xs text-muted">
            Switches from stub adapters to Royal Mail + Zebra. Requires return
            address, OBA, Zebra device ID, and the env var keys to be set.
          </span>
        </span>
      </label>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Return address (printed on label)</legend>
        <input
          type="text"
          value={config.returnAddress.line1}
          onChange={(e) => updateAddress("line1", e.target.value)}
          placeholder="Address line 1"
          className="w-full border border-border px-3 py-2 text-sm"
          disabled={pending}
        />
        <input
          type="text"
          value={config.returnAddress.line2 ?? ""}
          onChange={(e) => updateAddress("line2", e.target.value || null)}
          placeholder="Address line 2 (optional)"
          className="w-full border border-border px-3 py-2 text-sm"
          disabled={pending}
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            value={config.returnAddress.city}
            onChange={(e) => updateAddress("city", e.target.value)}
            placeholder="City"
            className="border border-border px-3 py-2 text-sm"
            disabled={pending}
          />
          <input
            type="text"
            value={config.returnAddress.postcode}
            onChange={(e) => updateAddress("postcode", e.target.value)}
            placeholder="Postcode"
            className="border border-border px-3 py-2 text-sm"
            disabled={pending}
          />
        </div>
      </fieldset>

      <div>
        <label className="block text-sm font-medium mb-1">Sender name</label>
        <input
          type="text"
          value={config.senderName}
          onChange={(e) => update("senderName", e.target.value)}
          className="w-full border border-border px-3 py-2 text-sm"
          disabled={pending}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Royal Mail OBA account number</label>
        <input
          type="text"
          value={config.obaAccountNumber}
          onChange={(e) => update("obaAccountNumber", e.target.value)}
          className="w-full border border-border px-3 py-2 text-sm"
          disabled={pending}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Default service code (GB)</label>
        <select
          value={config.defaultServiceCodeByCountry.GB ?? "TPN48"}
          onChange={(e) =>
            update("defaultServiceCodeByCountry", {
              ...config.defaultServiceCodeByCountry,
              GB: e.target.value as "TPN24" | "TPN48",
            })
          }
          className="w-full border border-border px-3 py-2 text-sm"
          disabled={pending}
        >
          <option value="TPN48">Tracked 48 (default — cheapest tracked)</option>
          <option value="TPN24">Tracked 24 (premium next-day)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Default parcel weight (grams)</label>
        <input
          type="number"
          value={config.defaultWeightGrams}
          onChange={(e) => update("defaultWeightGrams", Number(e.target.value) || 100)}
          min={10}
          max={20000}
          className="w-full border border-border px-3 py-2 text-sm"
          disabled={pending}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Zebra printer device ID</label>
        <input
          type="text"
          value={config.zebraPrinterDeviceId}
          onChange={(e) => update("zebraPrinterDeviceId", e.target.value)}
          placeholder="Obtained from Zebra Cloud Connect after printer registration"
          className="w-full border border-border px-3 py-2 text-sm"
          disabled={pending}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Tracking webhook URL</label>
        <input
          type="url"
          value={config.trackingWebhookUrl}
          onChange={(e) => update("trackingWebhookUrl", e.target.value)}
          placeholder="https://cryogenelaboratories.co.uk/api/webhooks/royalmail/tracking"
          className="w-full border border-border px-3 py-2 text-sm"
          disabled={pending}
        />
        <p className="text-xs text-muted mt-1">
          Register this URL with Royal Mail tracking webhooks after deploy.
        </p>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-border">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-navy text-white text-sm uppercase tracking-wider disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save dispatch settings"}
        </button>
        {savedAt && (
          <span className="text-xs text-success-text">
            Saved {savedAt.toLocaleTimeString("en-GB")}
          </span>
        )}
        {error && <span className="text-xs text-red-700">{error}</span>}
      </div>
    </form>
  );
}
