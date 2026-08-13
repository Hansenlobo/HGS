import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation/auth.schema";
import { logAudit } from "@/lib/audit/log";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { username: parsed.data.username } });
  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const valid = verifyPassword(parsed.data.password, user.passwordHash, user.passwordSalt);
  if (!valid) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const token = await createSessionToken(user);
  await logAudit({
    user: { id: user.id, name: user.name },
    module: "Auth",
    action: "LOGIN",
    description: `${user.name} logged in`,
    entityType: "User",
    entityId: user.id,
  });

  const response = NextResponse.json({
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
  });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
