import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clearanceItemUpdateSchema } from "@/lib/validation/clearanceItem.schema";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.clearanceItem.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Clearance item not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = clearanceItemUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const item = await prisma.clearanceItem.update({ where: { id }, data: parsed.data });
  return NextResponse.json(item);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await prisma.clearanceItem.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Clearance item not found" }, { status: 404 });
  }

  await prisma.clearanceItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
