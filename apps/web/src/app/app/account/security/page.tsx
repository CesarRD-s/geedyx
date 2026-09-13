import { requireSession } from "@/lib/api/server";
import { SecurityView } from "@/components/security/security-view";

export default async function AccountSecurityPage() {
  await requireSession();
  return <SecurityView />;
}
