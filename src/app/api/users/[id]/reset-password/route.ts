import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth/apiGuard";
import { hashPassword } from "@/lib/auth/password";
import { resetPasswordSchema } from "@/lib/validation/user.schema";
import { safeUserSelect } from "@/types";
import { logAudit } from "@/lib/audit/log";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminApi();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { hash, salt } = hashPassword(parsed.data.password);
  try {
    const user = await prisma.user.update({
      where: { id },
      data: { passwordHash: hash, passwordSalt: salt },
      select: safeUserSelect,
    });
    await logAudit({
      user: auth.user,
      module: "Users",
      action: "RESET_PASSWORD",
      description: `Reset password for user "${user.name}"`,
      entityType: "User",
      entityId: user.id,
    });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
}
