import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { orderSchema } from "@/lib/validation/order.schema";
import { orderWithRelationsArgs } from "@/types";
import { allocateSequenceNumber } from "@/lib/billing/sequence";
import type { Prisma } from "@/generated/prisma/client";
import { OrderStatus } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const customerName = searchParams.get("customerName")?.trim();
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const where: Prisma.TemporaryOrderWhereInput = {};
  if (status && status in OrderStatus) where.status = status as OrderStatus;
  if (customerName) where.customerName = { contains: customerName };
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  }

  const orders = await prisma.temporaryOrder.findMany({
    where,
    orderBy: { createdAt: "desc" },
    ...orderWithRelationsArgs,
  });

  return NextResponse.json(orders);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { items, createdBy, ...customer } = parsed.data;

  const order = await prisma.$transaction(async (tx) => {
    const orderNumber = await allocateSequenceNumber(tx, "order");
    return tx.temporaryOrder.create({
      data: {
        orderNumber,
        ...customer,
        createdBy,
        items: {
          create: items.map((item, index) => ({
            productId: item.productId ?? null,
            customItemName: item.productId ? null : item.customItemName,
            saleKind: item.saleKind ?? null,
            quantity: item.quantity,
            cutLength: item.cutLength ?? null,
            unit: item.unit,
            remarks: item.remarks,
            sortOrder: index,
          })),
        },
      },
      ...orderWithRelationsArgs,
    });
  });

  return NextResponse.json(order, { status: 201 });
}
