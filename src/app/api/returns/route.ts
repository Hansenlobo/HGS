import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth/apiGuard";
import { returnSchema, type ReturnLineValues } from "@/lib/validation/return.schema";
import { returnWithRelationsArgs, productWithRelationsArgs } from "@/types";
import { allocateSequenceNumber } from "@/lib/billing/sequence";
import { computeUnitsSold } from "@/lib/billing/pricing";
import { receiveReturnStockInTx, type ReturnLineInput } from "@/lib/stock/stockAdjustment.service";
import { logAudit } from "@/lib/audit/log";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const customerName = searchParams.get("customerName")?.trim();
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const where: Prisma.ReturnTransactionWhereInput = {};
  if (customerName) where.customerName = { contains: customerName };
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  }

  const returns = await prisma.returnTransaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    ...returnWithRelationsArgs,
  });

  return NextResponse.json(returns);
}

function toReturnStockInput(line: ReturnLineValues): ReturnLineInput | null {
  switch (line.saleKind) {
    case "SIMPLE":
    case "LENGTH_FULL":
    case "BOX_FULL":
    case "BOX_LOOSE":
      return { saleKind: line.saleKind, productId: line.productId, quantity: line.quantity };
    case "LENGTH_CUT":
      return {
        saleKind: "LENGTH_CUT",
        productId: line.productId,
        cutLength: line.cutLength,
        quantity: line.quantity,
      };
    case "CUSTOM":
      return null;
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireUserApi();
  if ("response" in auth) return auth.response;

  const body = await request.json();
  const parsed = returnSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const productIds = Array.from(
    new Set(data.lines.map((l) => ("productId" in l ? l.productId : null)).filter((id): id is string => id !== null)),
  );
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    ...productWithRelationsArgs,
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const line of data.lines) {
    if (line.saleKind !== "CUSTOM" && !productMap.has(line.productId)) {
      return NextResponse.json({ error: "One of the selected products no longer exists" }, { status: 400 });
    }
  }

  const computedLines = data.lines.map((line) => {
    const product = line.saleKind === "CUSTOM" ? null : productMap.get(line.productId)!;
    const cutLength = line.saleKind === "LENGTH_CUT" ? line.cutLength : null;
    const unitsSold = computeUnitsSold(line.saleKind, line.quantity, cutLength);
    const itemName = product ? product.name : line.saleKind === "CUSTOM" ? line.customItemName : "";
    const amount = line.rate * unitsSold;
    return { line, product, itemName, cutLength, unitsSold, amount };
  });

  const refundAmount = computedLines.reduce((sum, c) => sum + c.amount, 0);

  const returnTxn = await prisma.$transaction(async (tx) => {
    const returnNumber = await allocateSequenceNumber(tx, "return");

    const created = await tx.returnTransaction.create({
      data: {
        returnNumber,
        billId: data.billId,
        creditAccountId: data.creditAccountId,
        customerName: data.customerName,
        refundAmount,
        refundMethod: data.refundMethod,
        reason: data.reason,
        createdBy: auth.user.name,
        lineItems: {
          create: computedLines.map((c) => ({
            productId: c.product?.id ?? null,
            itemName: c.itemName,
            saleKind: c.line.saleKind,
            quantity: c.line.quantity,
            cutLength: c.cutLength,
            rate: c.line.rate,
            amount: c.amount,
          })),
        },
      },
      include: { lineItems: true },
    });

    for (let i = 0; i < created.lineItems.length; i++) {
      const stockInput = toReturnStockInput(computedLines[i].line);
      if (stockInput) await receiveReturnStockInTx(tx, stockInput, created.lineItems[i].id);
    }

    await logAudit(
      {
        user: { id: auth.user.id, name: auth.user.name },
        module: "Returns",
        action: "CREATE",
        description: `${auth.user.name} recorded a return of ${refundAmount} for ${data.customerName}`,
        entityType: "ReturnTransaction",
        entityId: created.id,
      },
      tx,
    );

    return tx.returnTransaction.findUniqueOrThrow({ where: { id: created.id }, ...returnWithRelationsArgs });
  });

  return NextResponse.json(returnTxn, { status: 201 });
}
