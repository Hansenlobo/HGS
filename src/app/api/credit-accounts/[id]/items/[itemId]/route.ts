import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth/apiGuard";
import { creditAccountEditItemSchema } from "@/lib/validation/creditAccount.schema";
import { creditAccountWithRelationsArgs, productWithRelationsArgs } from "@/types";
import { computeUnitsSold } from "@/lib/billing/pricing";
import { checkLineAvailability } from "@/lib/stock/stockAvailability";
import {
  sellLineForCreditAccountInTx,
  restoreCreditAccountStockInTx,
  InsufficientStockError,
  type CreditAccountSellLineInput,
} from "@/lib/stock/stockAdjustment.service";
import { computeAccountBalance } from "@/lib/creditAccounts/accountBalance";
import { logAudit } from "@/lib/audit/log";

function stockInputFor(
  productId: string,
  saleKind: string,
  cutLength: number | null,
  quantity: number,
): CreditAccountSellLineInput | null {
  switch (saleKind) {
    case "SIMPLE":
    case "LENGTH_FULL":
    case "BOX_FULL":
    case "BOX_LOOSE":
      return { saleKind, productId, quantity };
    case "LENGTH_CUT":
      return { saleKind: "LENGTH_CUT", productId, cutLength: cutLength ?? 0, quantity };
    default:
      return null;
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const auth = await requireUserApi();
  if ("response" in auth) return auth.response;

  const { id, itemId } = await params;
  const account = await prisma.creditAccount.findUnique({ where: { id } });
  if (!account) return NextResponse.json({ error: "Credit account not found" }, { status: 404 });
  if (account.status === "CLOSED") {
    return NextResponse.json({ error: "This account is closed" }, { status: 409 });
  }

  const item = await prisma.creditAccountItem.findUnique({ where: { id: itemId } });
  if (!item || item.accountId !== id) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = creditAccountEditItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const delta = parsed.data.quantity - item.quantity;

  if (item.saleKind !== "CUSTOM" && delta > 0 && item.productId) {
    const product = await prisma.product.findUnique({ where: { id: item.productId }, ...productWithRelationsArgs });
    if (!product) return NextResponse.json({ error: "Product no longer exists" }, { status: 400 });
    const result = checkLineAvailability(product, {
      saleKind: item.saleKind as "SIMPLE" | "LENGTH_FULL" | "LENGTH_CUT" | "BOX_FULL" | "BOX_LOOSE",
      quantity: delta,
      cutLength: item.cutLength ?? undefined,
    });
    if (!result.ok) {
      return NextResponse.json({ error: `Not enough stock to increase quantity: ${result.shortfall}` }, { status: 400 });
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (item.saleKind !== "CUSTOM" && item.productId && delta !== 0) {
        const stockInput = stockInputFor(item.productId, item.saleKind, item.cutLength, Math.abs(delta));
        if (stockInput) {
          if (delta > 0) {
            await sellLineForCreditAccountInTx(tx, stockInput);
          } else {
            await restoreCreditAccountStockInTx(tx, stockInput, "Credit account item quantity reduced");
          }
        }
      }

      const unitsSold = computeUnitsSold(item.saleKind, parsed.data.quantity, item.cutLength);
      await tx.creditAccountItem.update({
        where: { id: itemId },
        data: {
          quantity: parsed.data.quantity,
          unitsSold,
          notes: parsed.data.notes,
          priceAtTimeTaken: parsed.data.rate ?? item.priceAtTimeTaken,
          rateLocked: item.saleKind === "CUSTOM" ? true : (parsed.data.rateLocked ?? item.rateLocked),
          applyMarkup: parsed.data.applyMarkup ?? item.applyMarkup,
          discountType: parsed.data.discountType ?? item.discountType,
          discountValue: parsed.data.discountValue ?? item.discountValue,
        },
      });

      await logAudit(
        {
          user: { id: auth.user.id, name: auth.user.name },
          module: "CreditAccounts",
          action: "EDIT_ITEM",
          description: `${auth.user.name} edited "${item.itemName}" on credit account "${account.name}"`,
          entityType: "CreditAccount",
          entityId: id,
        },
        tx,
      );
    });
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const updated = await prisma.creditAccount.findUniqueOrThrow({ where: { id }, ...creditAccountWithRelationsArgs });
  return NextResponse.json({ ...updated, balance: computeAccountBalance(updated) });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const auth = await requireUserApi();
  if ("response" in auth) return auth.response;

  const { id, itemId } = await params;
  const account = await prisma.creditAccount.findUnique({ where: { id } });
  if (!account) return NextResponse.json({ error: "Credit account not found" }, { status: 404 });
  if (account.status === "CLOSED") {
    return NextResponse.json({ error: "This account is closed" }, { status: 409 });
  }

  const item = await prisma.creditAccountItem.findUnique({ where: { id: itemId } });
  if (!item || item.accountId !== id) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    if (item.saleKind !== "CUSTOM" && item.productId) {
      const stockInput = stockInputFor(item.productId, item.saleKind, item.cutLength, item.quantity);
      if (stockInput) await restoreCreditAccountStockInTx(tx, stockInput, "Credit account item removed");
    }

    await tx.creditAccountItem.delete({ where: { id: itemId } });

    await logAudit(
      {
        user: { id: auth.user.id, name: auth.user.name },
        module: "CreditAccounts",
        action: "DELETE_ITEM",
        description: `${auth.user.name} removed "${item.itemName}" from credit account "${account.name}"`,
        entityType: "CreditAccount",
        entityId: id,
      },
      tx,
    );
  });

  const updated = await prisma.creditAccount.findUniqueOrThrow({ where: { id }, ...creditAccountWithRelationsArgs });
  return NextResponse.json({ ...updated, balance: computeAccountBalance(updated) });
}
