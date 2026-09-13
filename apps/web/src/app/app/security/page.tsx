import { requireSession } from "@/lib/api/server";
import { SecurityView } from "@/components/security/security-view";

export default async function SecurityPage() {
  await requireSession();
  return <SecurityView />;
}
