import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const adjustments = await prisma.stockAdjustment.findMany({
    where: { productId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(adjustments);
}
