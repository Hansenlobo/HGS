import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const printedBy: string | undefined = typeof body?.printedBy === "string" ? body.printedBy : undefined;

  const order = await prisma.temporaryOrder.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.orderPrintLog.create({ data: { orderId: id, printedBy } });
    if (order.status === "DRAFT") {
      await tx.temporaryOrder.update({ where: { id }, data: { status: "PRINTED" } });
    }
  });

  return NextResponse.json({ ok: true });
}
