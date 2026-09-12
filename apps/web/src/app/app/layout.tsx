import { requireSession } from "@/lib/api/server";
import { WorkspaceShell } from "@/components/workspace-shell";

export default async function WorkspaceLayout({ children }: LayoutProps<"/app">) {
  const user = await requireSession();
  return <WorkspaceShell user={user}>{children}</WorkspaceShell>;
}
