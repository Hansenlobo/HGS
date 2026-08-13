import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { bootstrapAdminSchema } from "@/lib/validation/auth.schema";

/** Creates the very first Admin account — only works while the User table
 * is empty, then permanently locks itself out. No auth required to call it
 * (there's nobody to authenticate as yet), safe because of that guard. */
export async function POST(request: NextRequest) {
  const existingCount = await prisma.user.count();
  if (existingCount > 0) {
    return NextResponse.json({ error: "Setup already completed" }, { status: 409 });
  }

  const body = await request.json();
  const parsed = bootstrapAdminSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { hash, salt } = hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      username: parsed.data.username,
      passwordHash: hash,
      passwordSalt: salt,
      role: "ADMIN",
    },
  });

  return NextResponse.json({ id: user.id, username: user.username }, { status: 201 });
}

export async function GET() {
  const existingCount = await prisma.user.count();
  return NextResponse.json({ needsSetup: existingCount === 0 });
}
