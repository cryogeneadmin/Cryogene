import { getConfig } from "@/lib/config";
import { SettingsForm } from "@/components/admin/SettingsForm";

export default async function AdminSettingsPage() {
  const config = await getConfig();
  return (
    <div>
      <h1 className="text-4xl mb-8">Settings</h1>
      <SettingsForm initial={config} />
    </div>
  );
}
