import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth/apiGuard";
import { safeUserSelect } from "@/types";
import { logAudit } from "@/lib/audit/log";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (id === auth.user.id) {
    return NextResponse.json({ error: "You can't disable your own account" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const user = await prisma.user.update({
    where: { id },
    data: { isActive: !existing.isActive },
    select: safeUserSelect,
  });
  await logAudit({
    user: auth.user,
    module: "Users",
    action: user.isActive ? "ENABLE" : "DISABLE",
    description: `${user.isActive ? "Enabled" : "Disabled"} user "${user.name}"`,
    entityType: "User",
    entityId: user.id,
  });
  return NextResponse.json(user);
}
