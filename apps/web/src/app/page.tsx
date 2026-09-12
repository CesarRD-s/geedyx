import { redirect } from "next/navigation";
import { getSession } from "@/lib/api/server";

export default async function HomePage() {
  const user = await getSession();
  redirect(user ? "/app" : "/login");
}
