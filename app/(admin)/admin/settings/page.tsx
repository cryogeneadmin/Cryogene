import { Suspense } from "react";
import { connection } from "next/server";
import { getConfig } from "@/lib/config";
import { getDispatchConfig } from "@/lib/fulfilment/dispatch-config";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { DispatchSettingsForm } from "@/components/admin/DispatchSettingsForm";

async function SettingsContent() {
  await connection();
  const [config, dispatch] = await Promise.all([getConfig(), getDispatchConfig()]);
  return (
    <>
      <SettingsForm initial={config} />
      <DispatchSettingsForm initial={dispatch} />
    </>
  );
}

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8">
      <h1 className="text-4xl mb-8">Settings</h1>
      <Suspense fallback={<p>Loading settings…</p>}>
        <SettingsContent />
      </Suspense>
    </div>
  );
}
