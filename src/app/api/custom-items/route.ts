import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CustomItemStatus, Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const status = searchParams.get("status");

  const where: Prisma.CustomItemWhereInput = {};
  if (search) where.name = { contains: search };
  if (status && status in CustomItemStatus) where.status = status as CustomItemStatus;

  const items = await prisma.customItem.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: search ? 20 : undefined,
    include: search ? undefined : { _count: { select: { billLineItems: true } } },
  });

  return NextResponse.json(items);
}
