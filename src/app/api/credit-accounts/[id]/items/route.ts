import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth/apiGuard";
import { creditAccountAddItemsSchema, type CreditAccountItemLineValues } from "@/lib/validation/creditAccount.schema";
import { creditAccountWithRelationsArgs, productWithRelationsArgs } from "@/types";
import { computeUnitsSold } from "@/lib/billing/pricing";
import { checkLineAvailability } from "@/lib/stock/stockAvailability";
import {
  sellLineForCreditAccountInTx,
  InsufficientStockError,
  type CreditAccountSellLineInput,
} from "@/lib/stock/stockAdjustment.service";
import { currentRateFor, computeAccountBalance } from "@/lib/creditAccounts/accountBalance";
import { logAudit } from "@/lib/audit/log";

function toSellInput(line: CreditAccountItemLineValues): CreditAccountSellLineInput | null {
  switch (line.saleKind) {
    case "SIMPLE":
    case "LENGTH_FULL":
    case "BOX_FULL":
    case "BOX_LOOSE":
      return { saleKind: line.saleKind, productId: line.productId, quantity: line.quantity };
    case "LENGTH_CUT":
      return { saleKind: "LENGTH_CUT", productId: line.productId, cutLength: line.cutLength, quantity: line.quantity };
    case "CUSTOM":
      return null;
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserApi();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const account = await prisma.creditAccount.findUnique({ where: { id } });
  if (!account) {
    return NextResponse.json({ error: "Credit account not found" }, { status: 404 });
  }
  if (account.status === "CLOSED") {
    return NextResponse.json({ error: "This account is closed" }, { status: 409 });
  }

  const body = await request.json();
  const parsed = creditAccountAddItemsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { lines } = parsed.data;

  const productIds = Array.from(
    new Set(lines.map((l) => ("productId" in l ? l.productId : null)).filter((id): id is string => id !== null)),
  );
  const products = await prisma.product.findMany({ where: { id: { in: productIds } }, ...productWithRelationsArgs });
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const line of lines) {
    if (line.saleKind !== "CUSTOM" && !productMap.has(line.productId)) {
      return NextResponse.json({ error: "One of the selected products no longer exists" }, { status: 400 });
    }
  }

  const shortfalls: string[] = [];
  for (const line of lines) {
    if (line.saleKind === "CUSTOM") continue;
    const product = productMap.get(line.productId)!;
    const result = checkLineAvailability(product, {
      saleKind: line.saleKind,
      quantity: line.quantity,
      cutLength: line.saleKind === "LENGTH_CUT" ? line.cutLength : undefined,
    });
    if (!result.ok) shortfalls.push(`${product.name}: ${result.shortfall}`);
  }
  if (shortfalls.length > 0) {
    return NextResponse.json({ error: "Insufficient stock", shortfalls }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const line of lines) {
        const product = line.saleKind === "CUSTOM" ? null : productMap.get(line.productId)!;
        const cutLength = line.saleKind === "LENGTH_CUT" ? line.cutLength : null;
        const unitsSold = computeUnitsSold(line.saleKind, line.quantity, cutLength);
        const itemName = product ? product.name : line.saleKind === "CUSTOM" ? line.customItemName : "";
        const priceAtTimeTaken =
          line.saleKind === "CUSTOM"
            ? line.rate
            : line.rateLocked && line.rate != null
              ? line.rate
              : currentRateFor(product!, line.saleKind);

        await tx.creditAccountItem.create({
          data: {
            accountId: id,
            productId: product?.id ?? null,
            customItemName: line.saleKind === "CUSTOM" ? line.customItemName : null,
            itemName,
            saleKind: line.saleKind,
            quantity: line.quantity,
            cutLength,
            unitsSold,
            priceAtTimeTaken,
            rateLocked: line.saleKind === "CUSTOM" ? true : (line.rateLocked ?? false),
            applyMarkup: line.saleKind === "CUSTOM" ? line.applyMarkup : false,
            discountType: line.discountType ?? null,
            discountValue: line.discountValue ?? 0,
            notes: line.notes,
            createdBy: parsed.data.createdBy ?? auth.user.name,
          },
        });

        const sellInput = toSellInput(line);
        if (sellInput) await sellLineForCreditAccountInTx(tx, sellInput);
      }

      await logAudit(
        {
          user: { id: auth.user.id, name: auth.user.name },
          module: "CreditAccounts",
          action: "ADD_ITEMS",
          description: `${auth.user.name} added ${lines.length} item(s) to credit account "${account.name}"`,
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
  return NextResponse.json({ ...updated, balance: computeAccountBalance(updated) }, { status: 201 });
}
