import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { quotationSchema } from "@/lib/validation/quotation.schema";
import { quotationWithRelationsArgs, productWithRelationsArgs } from "@/types";
import { allocateSequenceNumber } from "@/lib/billing/sequence";
import { computeUnitsSold, computeLineAmounts, computeBillTotals, applyOverallDiscount } from "@/lib/billing/pricing";
import type { Prisma } from "@/generated/prisma/client";
import { QuotationStatus } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const customerName = searchParams.get("customerName")?.trim();
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const where: Prisma.QuotationWhereInput = {};
  if (status && status in QuotationStatus) where.status = status as QuotationStatus;
  if (customerName) {
    const digits = customerName.replace(/\D/g, "");
    const asNumber = digits ? Number(digits) : NaN;
    where.OR = [
      { customerName: { contains: customerName } },
      ...(Number.isFinite(asNumber) && digits ? [{ quotationNumber: asNumber }] : []),
    ];
  }
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  }

  const quotations = await prisma.quotation.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(quotations);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = quotationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const productIds = Array.from(
    new Set(
      data.lines
        .map((l) => ("productId" in l ? l.productId : null))
        .filter((id): id is string => id !== null),
    ),
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

  // No stock availability check — a quotation never touches stock.
  const computedLines = data.lines.map((line) => {
    const product = line.saleKind === "CUSTOM" ? null : productMap.get(line.productId)!;
    const cutLength = line.saleKind === "LENGTH_CUT" ? line.cutLength : null;
    const unitsSold = computeUnitsSold(line.saleKind, line.quantity, cutLength);
    const isPartyProduct = product ? product.isPartyProduct : line.saleKind === "CUSTOM" ? line.applyMarkup : false;
    const itemName = product ? product.name : line.saleKind === "CUSTOM" ? line.customItemName : "";
    const { baseRate, partyRate, shopAmount, amount } = computeLineAmounts({
      rate: line.rate,
      discountType: line.discountType,
      discountValue: line.discountValue,
      unitsSold,
      isPartyProduct,
      billType: "PARTY",
      partyPercentage: data.partyPercentage,
    });
    return { line, product, itemName, cutLength, unitsSold, isPartyProduct, baseRate, partyRate, shopAmount, amount };
  });

  const totals = computeBillTotals(
    computedLines.map((c) => ({
      rate: c.line.rate,
      unitsSold: c.unitsSold,
      shopAmount: c.shopAmount,
      amount: c.amount,
    })),
  );
  const { finalAmount } = applyOverallDiscount(
    totals.customerAmount,
    data.overallDiscountType,
    data.overallDiscountValue ?? 0,
  );

  const quotation = await prisma.$transaction(async (tx) => {
    const quotationNumber = await allocateSequenceNumber(tx, "quotation");

    const customItemIds = new Map<string, string>();
    for (const c of computedLines) {
      if (c.line.saleKind === "CUSTOM") {
        const customItem = await tx.customItem.upsert({
          where: { name: c.itemName },
          update: { lastRate: c.line.rate },
          create: { name: c.itemName, lastRate: c.line.rate },
        });
        customItemIds.set(c.itemName, customItem.id);
      }
    }

    const created = await tx.quotation.create({
      data: {
        quotationNumber,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerNotes: data.customerNotes,
        partyPercentage: data.partyPercentage,
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        shopAmount: totals.shopAmount,
        marginAmount: totals.marginAmount,
        customerAmount: finalAmount,
        overallDiscountType: data.overallDiscountType ?? null,
        overallDiscountValue: data.overallDiscountValue ?? 0,
        createdBy: data.createdBy,
        lineItems: {
          create: computedLines.map((c, index) => ({
            sortOrder: index,
            productId: c.product?.id ?? null,
            customItemId: c.line.saleKind === "CUSTOM" ? customItemIds.get(c.itemName) : null,
            itemName: c.itemName,
            saleKind: c.line.saleKind,
            quantity: c.line.quantity,
            cutLength: c.cutLength,
            unitsSold: c.unitsSold,
            rate: c.line.rate,
            discountType: c.line.discountType ?? null,
            discountValue: c.line.discountValue ?? 0,
            baseRate: c.baseRate,
            isPartyProduct: c.isPartyProduct,
            partyRate: c.partyRate,
            shopAmount: c.shopAmount,
            amount: c.amount,
            note: c.line.note,
          })),
        },
      },
    });

    return tx.quotation.findUniqueOrThrow({ where: { id: created.id }, ...quotationWithRelationsArgs });
  });

  return NextResponse.json(quotation, { status: 201 });
}
