import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { orderSchema } from "@/lib/validation/order.schema";
import { orderWithRelationsArgs } from "@/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const order = await prisma.temporaryOrder.findUnique({
    where: { id },
    ...orderWithRelationsArgs,
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  return NextResponse.json(order);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const existing = await prisma.temporaryOrder.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (existing.status === "CONVERTED") {
    return NextResponse.json(
      { error: "Converted orders can't be edited" },
      { status: 409 },
    );
  }

  const body = await request.json();
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { items, customerName, customerPhone, customerNotes } = parsed.data;

  const order = await prisma.$transaction(async (tx) => {
    await tx.temporaryOrder.update({
      where: { id },
      data: { customerName, customerPhone, customerNotes },
    });
    await tx.orderItem.deleteMany({ where: { orderId: id } });
    await tx.orderItem.createMany({
      data: items.map((item, index) => ({
        orderId: id,
        productId: item.productId ?? null,
        customItemName: item.productId ? null : item.customItemName,
        saleKind: item.saleKind ?? null,
        quantity: item.quantity,
        cutLength: item.cutLength ?? null,
        unit: item.unit,
        remarks: item.remarks,
        sortOrder: index,
      })),
    });
    return tx.temporaryOrder.findUniqueOrThrow({ where: { id }, ...orderWithRelationsArgs });
  });

  return NextResponse.json(order);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const existing = await prisma.temporaryOrder.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (existing.status === "CONVERTED") {
    return NextResponse.json(
      { error: "Converted orders can't be deleted" },
      { status: 409 },
    );
  }

  await prisma.temporaryOrder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
