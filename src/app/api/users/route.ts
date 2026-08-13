import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/auth/apiGuard";
import { hashPassword } from "@/lib/auth/password";
import { createUserSchema } from "@/lib/validation/user.schema";
import { safeUserSelect } from "@/types";
import { logAudit } from "@/lib/audit/log";

export async function GET() {
  const auth = await requireAdminApi();
  if ("response" in auth) return auth.response;

  const users = await prisma.user.findMany({
    select: safeUserSelect,
    orderBy: { name: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if ("response" in auth) return auth.response;

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { hash, salt } = hashPassword(parsed.data.password);
  try {
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        username: parsed.data.username,
        passwordHash: hash,
        passwordSalt: salt,
        role: parsed.data.role,
        pin: parsed.data.pin,
      },
      select: safeUserSelect,
    });
    await logAudit({
      user: auth.user,
      module: "Users",
      action: "CREATE",
      description: `Created user "${user.name}" (${user.username}, ${user.role})`,
      entityType: "User",
      entityId: user.id,
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "That username is already taken" }, { status: 409 });
    }
    throw error;
  }
}
