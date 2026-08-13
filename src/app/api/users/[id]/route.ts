import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth/apiGuard";
import { updateUserSchema } from "@/lib/validation/user.schema";
import { safeUserSelect } from "@/types";
import { logAudit } from "@/lib/audit/log";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { name: parsed.data.name, role: parsed.data.role, pin: parsed.data.pin ?? null },
      select: safeUserSelect,
    });
    await logAudit({
      user: auth.user,
      module: "Users",
      action: "UPDATE",
      description: `Updated user "${user.name}"`,
      entityType: "User",
      entityId: user.id,
    });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
}
