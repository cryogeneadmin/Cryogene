import { getConfig } from "@/lib/config";
import { getDispatchConfig } from "@/lib/fulfilment/dispatch-config";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { DispatchSettingsForm } from "@/components/admin/DispatchSettingsForm";

export default async function AdminSettingsPage() {
  const [config, dispatch] = await Promise.all([getConfig(), getDispatchConfig()]);
  return (
    <div className="space-y-8">
      <h1 className="text-4xl mb-8">Settings</h1>
      <SettingsForm initial={config} />
      <DispatchSettingsForm initial={dispatch} />
    </div>
  );
}
