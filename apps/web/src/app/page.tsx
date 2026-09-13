import { redirect } from "next/navigation";
import { getInstallationStatus, getSession } from "@/lib/api/server";

export default async function HomePage() {
  const [user, installation] = await Promise.all([
    getSession(),
    getInstallationStatus(),
  ]);
  redirect(user ? "/app" : installation.installed ? "/login" : "/setup");
}
