import { RegionalContextProvider } from "@/components/preferences/regional-context";
import { TranslationProvider } from "@/components/preferences/translation-context";
import { requireSession } from "@/lib/api/server";
import { WorkspaceShell } from "@/components/workspace-shell";

export default async function WorkspaceLayout({
  children,
}: LayoutProps<"/app">) {
  const user = await requireSession();
  return (
    <RegionalContextProvider value={user.regionalContext}>
      <TranslationProvider locale={user.regionalContext.locale}>
        <WorkspaceShell user={user}>{children}</WorkspaceShell>
      </TranslationProvider>
    </RegionalContextProvider>
  );
}
