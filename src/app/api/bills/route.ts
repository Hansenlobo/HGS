import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { billSchema, type BillLineValues } from "@/lib/validation/bill.schema";
import { billWithRelationsArgs, productWithRelationsArgs } from "@/types";
import { allocateSequenceNumber } from "@/lib/billing/sequence";
import { computeUnitsSold, computeLineAmounts, computeBillTotals, applyOverallDiscount } from "@/lib/billing/pricing";
import { checkLineAvailability } from "@/lib/stock/stockAvailability";
import {
  sellLineInTx,
  InsufficientStockError,
  type SellLineInput,
} from "@/lib/stock/stockAdjustment.service";
import type { Prisma } from "@/generated/prisma/client";
import { BillType } from "@/generated/prisma/client";
import { maybeRunTransactionCountBackup } from "@/lib/backup/backupService";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const customerName = searchParams.get("customerName")?.trim();
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const where: Prisma.BillWhereInput = {};
  if (type && type in BillType) where.type = type as BillType;
  if (customerName) {
    // Same box also doubles as a bill-number search — e.g. "12" or the
    // number pulled out of a pasted "HGS-INV-0012" invoice number.
    const digits = customerName.replace(/\D/g, "");
    const asNumber = digits ? Number(digits) : NaN;
    where.OR = [
      { customerName: { contains: customerName } },
      ...(Number.isFinite(asNumber) && digits ? [{ billNumber: asNumber }] : []),
    ];
  }
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  }

  const bills = await prisma.bill.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { payments: { where: { isDeleted: false } } },
  });

  return NextResponse.json(bills);
}

function toSellInput(line: BillLineValues, billLineItemId: string): SellLineInput | null {
  switch (line.saleKind) {
    case "SIMPLE":
    case "LENGTH_FULL":
    case "BOX_FULL":
    case "BOX_LOOSE":
      return {
        saleKind: line.saleKind,
        productId: line.productId,
        billLineItemId,
        quantity: line.quantity,
      };
    case "LENGTH_CUT":
      return {
        saleKind: "LENGTH_CUT",
        productId: line.productId,
        billLineItemId,
        cutLength: line.cutLength,
        quantity: line.quantity,
      };
    case "CUSTOM":
      return null;
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = billSchema.safeParse(body);
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

  const shortfalls: string[] = [];
  for (const line of data.lines) {
    if (line.saleKind === "CUSTOM") continue;
    const product = productMap.get(line.productId)!;
    const result = checkLineAvailability(product, {
      saleKind: line.saleKind,
      quantity: line.quantity,
      cutLength: line.saleKind === "LENGTH_CUT" ? line.cutLength : undefined,
    });
    if (!result.ok) {
      shortfalls.push(`${product.name}: ${result.shortfall}`);
    }
  }
  if (shortfalls.length > 0) {
    return NextResponse.json({ error: "Insufficient stock", shortfalls }, { status: 400 });
  }

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
      billType: data.type,
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

  try {
    const bill = await prisma.$transaction(async (tx) => {
      const billNumber = await allocateSequenceNumber(tx, "bill");

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

      const created = await tx.bill.create({
        data: {
          billNumber,
          type: data.type,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerNotes: data.customerNotes,
          partyPercentage: data.type === "PARTY" ? data.partyPercentage : null,
          subtotal: totals.subtotal,
          discountTotal: totals.discountTotal,
          shopAmount: totals.shopAmount,
          marginAmount: totals.marginAmount,
          customerAmount: finalAmount,
          overallDiscountType: data.overallDiscountType ?? null,
          overallDiscountValue: data.overallDiscountValue ?? 0,
          sourceOrderId: data.sourceOrderId,
          sourceQuotationId: data.sourceQuotationId,
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
        include: { lineItems: true },
      });

      for (let i = 0; i < created.lineItems.length; i++) {
        const sellInput = toSellInput(computedLines[i].line, created.lineItems[i].id);
        if (sellInput) await sellLineInTx(tx, sellInput);
      }

      if (data.sourceOrderId) {
        await tx.temporaryOrder.update({
          where: { id: data.sourceOrderId },
          data: { status: "CONVERTED" },
        });
      }

      if (data.sourceQuotationId) {
        await tx.quotation.update({
          where: { id: data.sourceQuotationId },
          data: { status: "CONVERTED" },
        });
      }

      await tx.billAuditLog.create({
        data: {
          billId: created.id,
          action: "BILL_CREATED",
          description: `Bill created with ${created.lineItems.length} line item(s)`,
          performedBy: data.createdBy,
        },
      });

      return tx.bill.findUniqueOrThrow({ where: { id: created.id }, ...billWithRelationsArgs });
    });

    maybeRunTransactionCountBackup();
    return NextResponse.json(bill, { status: 201 });
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
