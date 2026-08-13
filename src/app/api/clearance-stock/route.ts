import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clearanceItemSchema } from "@/lib/validation/clearanceItem.schema";
import type { Prisma } from "@/generated/prisma/client";
import { ClearanceStatus } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const status = searchParams.get("status");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");

  const where: Prisma.ClearanceItemWhereInput = {};
  if (status && status in ClearanceStatus) where.status = status as ClearanceStatus;
  if (search) {
    where.OR = [{ itemName: { contains: search } }, { description: { contains: search } }];
  }
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  }
  if (minPrice || maxPrice) {
    where.discountedPrice = {
      ...(minPrice ? { gte: Number(minPrice) } : {}),
      ...(maxPrice ? { lte: Number(maxPrice) } : {}),
    };
  }

  const items = await prisma.clearanceItem.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = clearanceItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const item = await prisma.clearanceItem.create({ data: parsed.data });
  return NextResponse.json(item, { status: 201 });
}
