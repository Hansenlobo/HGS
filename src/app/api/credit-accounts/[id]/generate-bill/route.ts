import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth/apiGuard";
import { billWithRelationsArgs } from "@/types";
import { allocateSequenceNumber } from "@/lib/billing/sequence";
import { computeUnitsSold, computeBillTotals, computeLineAmounts } from "@/lib/billing/pricing";
import { baseRateFor } from "@/lib/creditAccounts/accountBalance";
import { logAudit } from "@/lib/audit/log";
import type { SaleKind, DiscountType } from "@/generated/prisma/client";

function bucketKey(productId: string | null, saleKind: string, cutLength: number | null, itemName: string): string {
  return `${productId ?? `custom:${itemName}`}|${saleKind}|${cutLength ?? ""}`;
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserApi();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const account = await prisma.creditAccount.findUnique({
    where: { id },
    include: {
      items: { include: { product: true }, orderBy: { dateTaken: "asc" } },
      payments: { where: { isDeleted: false } },
      returns: { include: { lineItems: true } },
    },
  });
  if (!account) {
    return NextResponse.json({ error: "Credit account not found" }, { status: 404 });
  }
  if (account.status === "CLOSED") {
    return NextResponse.json({ error: "This account has already been billed" }, { status: 409 });
  }
  if (account.items.length === 0) {
    return NextResponse.json({ error: "This account has no items to bill" }, { status: 400 });
  }

  // Net out returns against items, oldest item first (FIFO), bucketed by
  // product+saleKind+cutLength (or item name for custom items) — a return
  // isn't tied to one specific "items taken" entry, so this is how the
  // two independent, append-only ledgers (items taken vs. items returned)
  // get reconciled into what's actually still owed.
  const returnedByBucket = new Map<string, number>();
  for (const ret of account.returns) {
    for (const line of ret.lineItems) {
      const key = bucketKey(line.productId, line.saleKind, line.cutLength, line.itemName);
      returnedByBucket.set(key, (returnedByBucket.get(key) ?? 0) + line.quantity);
    }
  }

  const billableLines: {
    productId: string | null;
    itemName: string;
    saleKind: SaleKind;
    quantity: number;
    cutLength: number | null;
    unitsSold: number;
    rate: number;
    baseRate: number;
    partyRate: number;
    shopAmount: number;
    amount: number;
    isPartyProduct: boolean;
    dateTaken: Date;
    notes: string | null;
    discountType: DiscountType | null;
    discountValue: number;
  }[] = [];

  for (const item of account.items) {
    const key = bucketKey(item.productId, item.saleKind, item.cutLength, item.itemName);
    const remainingReturned = returnedByBucket.get(key) ?? 0;
    const offset = Math.min(remainingReturned, item.quantity);
    if (offset > 0) returnedByBucket.set(key, remainingReturned - offset);
    const netQuantity = item.quantity - offset;
    if (netQuantity <= 0) continue;

    const unitsSold = computeUnitsSold(item.saleKind, netQuantity, item.cutLength);
    const rate = baseRateFor(item);
    // Markup only applies to catalog items flagged isPartyProduct, or
    // custom items with their own "apply markup" checkbox checked — not
    // uniformly across everything on the account. This is the same
    // shop-amount-vs-customer-amount split Party Billing already uses, so
    // the difference (the markup itself) shows up as real Margin on the
    // bill instead of disappearing into a single blended rate.
    const isPartyProduct = item.product ? item.product.isPartyProduct : item.applyMarkup;
    const { baseRate, partyRate, shopAmount, amount } = computeLineAmounts({
      rate,
      discountType: item.discountType,
      discountValue: item.discountValue,
      unitsSold,
      isPartyProduct,
      billType: "PARTY",
      partyPercentage: account.percentageIncrease,
    });

    billableLines.push({
      productId: item.productId,
      itemName: item.itemName,
      saleKind: item.saleKind,
      quantity: netQuantity,
      cutLength: item.cutLength,
      unitsSold,
      rate,
      baseRate,
      partyRate,
      shopAmount,
      amount,
      isPartyProduct,
      dateTaken: item.dateTaken,
      notes: item.notes,
      discountType: item.discountType,
      discountValue: item.discountValue,
    });
  }

  if (billableLines.length === 0) {
    return NextResponse.json({ error: "Everything on this account has been returned — nothing left to bill" }, { status: 400 });
  }

  const totals = computeBillTotals(
    billableLines.map((l) => ({ rate: l.rate, unitsSold: l.unitsSold, shopAmount: l.shopAmount, amount: l.amount })),
  );

  const bill = await prisma.$transaction(async (tx) => {
    const billNumber = await allocateSequenceNumber(tx, "bill");

    const created = await tx.bill.create({
      data: {
        billNumber,
        type: "PARTY",
        customerName: account.customerName || account.name,
        customerPhone: account.customerPhone,
        customerNotes: `Final bill for credit account "${account.name}"`,
        partyPercentage: account.percentageIncrease,
        subtotal: totals.subtotal,
        discountTotal: totals.discountTotal,
        shopAmount: totals.shopAmount,
        marginAmount: totals.marginAmount,
        customerAmount: totals.customerAmount,
        createdBy: auth.user.name,
        lineItems: {
          create: billableLines.map((l, index) => ({
            sortOrder: index,
            productId: l.productId,
            itemName: l.itemName,
            saleKind: l.saleKind,
            quantity: l.quantity,
            cutLength: l.cutLength,
            unitsSold: l.unitsSold,
            rate: l.rate,
            discountType: l.discountType,
            discountValue: l.discountValue,
            baseRate: l.baseRate,
            isPartyProduct: l.isPartyProduct,
            partyRate: l.partyRate,
            shopAmount: l.shopAmount,
            amount: l.amount,
            takenAt: l.dateTaken,
            note: l.notes,
          })),
        },
        payments: {
          create: account.payments.map((p) => ({
            amount: p.amount,
            method: p.method,
            notes: p.notes,
            enteredBy: p.enteredBy,
            createdAt: p.date,
          })),
        },
      },
    });

    await tx.billAuditLog.create({
      data: {
        billId: created.id,
        action: "BILL_CREATED",
        description: `Final bill generated from credit account "${account.name}" (${account.items.length} item entr${account.items.length === 1 ? "y" : "ies"})`,
        performedBy: auth.user.name,
      },
    });

    await tx.creditAccount.update({
      where: { id },
      data: { status: "CLOSED", finalBillId: created.id },
    });

    await logAudit(
      {
        user: { id: auth.user.id, name: auth.user.name },
        module: "CreditAccounts",
        action: "GENERATE_BILL",
        description: `${auth.user.name} generated the final bill for credit account "${account.name}"`,
        entityType: "CreditAccount",
        entityId: id,
        detail: { billId: created.id, lineCount: billableLines.length, total: totals.customerAmount },
      },
      tx,
    );

    return tx.bill.findUniqueOrThrow({ where: { id: created.id }, ...billWithRelationsArgs });
  });

  return NextResponse.json(bill, { status: 201 });
}
