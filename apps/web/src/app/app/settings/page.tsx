import { SettingsView } from "@/components/settings/settings-view";
import { requirePermission } from "@/lib/api/server";

export default async function SettingsPage() {
  await requirePermission("company.manage");
  return <SettingsView />;
}
