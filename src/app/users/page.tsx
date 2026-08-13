import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { safeUserSelect } from "@/types";
import { UsersPageClient } from "@/components/users/UsersPageClient";

export default async function UsersPage() {
  await requireAdmin();
  const users = await prisma.user.findMany({
    select: safeUserSelect,
    orderBy: { name: "asc" },
  });

  return <UsersPageClient initialUsers={users} />;
}
