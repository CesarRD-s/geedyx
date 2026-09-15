import type { Metadata } from "next";
import { AuditView } from "@/components/audit/audit-view";
import { getAuditEvents, requirePermission } from "@/lib/api/server";

export const metadata: Metadata = { title: "Auditoría · GEEDYX" };

export default async function AuditPage() {
  await requirePermission("audit.read");
  return <AuditView initialPage={await getAuditEvents()} />;
}
