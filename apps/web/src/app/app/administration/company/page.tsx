import { SettingsView } from "@/components/settings/settings-view";
import { requirePermission } from "@/lib/api/server";

export default async function CompanyPage() {
  await requirePermission("company.manage");
  return <SettingsView />;
}
