import type { Metadata } from "next";
import { UsersView } from "@/components/users/users-view";
import { getAssignableRoles, getUsers, requirePermission } from "@/lib/api/server";

export const metadata: Metadata = { title: "Usuarios · GEEDYX" };

export default async function UsersPage() {
  const user = await requirePermission("users.read");
  const [initialPage, roles] = await Promise.all([
    getUsers({ page: 1, limit: 20 }),
    getAssignableRoles(),
  ]);
  return (
    <UsersView
      initialPage={initialPage}
      roles={roles}
      canManage={user.permissions.includes("users.manage")}
    />
  );
}
