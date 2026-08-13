import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth/apiGuard";
import { CustomItemStatus } from "@/generated/prisma/client";
import { logAudit } from "@/lib/audit/log";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserApi();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const status = body?.status;
  if (typeof status !== "string" || !(status in CustomItemStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const existing = await prisma.customItem.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Custom item not found" }, { status: 404 });
  }

  const updated = await prisma.customItem.update({
    where: { id },
    data: {
      status: status as CustomItemStatus,
      resolvedAt: status === "PENDING" ? null : new Date(),
      resolvedBy: status === "PENDING" ? null : auth.user.name,
    },
  });

  await logAudit({
    user: { id: auth.user.id, name: auth.user.name },
    module: "CustomItems",
    action: status === "PENDING" ? "REOPEN" : status,
    description: `${auth.user.name} marked custom item "${existing.name}" as ${status}`,
    entityType: "CustomItem",
    entityId: id,
  });

  return NextResponse.json(updated);
}
