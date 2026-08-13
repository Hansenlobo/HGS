import { prisma } from "@/lib/prisma";
import type { AdjustmentKind, Prisma } from "@/generated/prisma/client";
import { productWithRelationsArgs } from "@/types";

export class InsufficientStockError extends Error {
  constructor(message = "Insufficient stock") {
    super(message);
    this.name = "InsufficientStockError";
  }
}

type BaseInput = {
  productId: string;
  reason?: string;
  source?: "MANUAL" | "SALE";
  billLineItemId?: string;
};

export type AdjustStockInput =
  | (BaseInput & { kind: "SIMPLE"; quantity: number })
  | (BaseInput & { kind: "LENGTH_FULL"; quantity: number })
  | (BaseInput & { kind: "LENGTH_CUT"; length: number; quantity: number })
  | (BaseInput & { kind: "LENGTH_MANUAL_CUT"; length: number; quantity: number })
  | (BaseInput & { kind: "BOX_FULL"; quantity: number })
  | (BaseInput & { kind: "BOX_LOOSE"; quantity: number });

async function upsertCutPiece(
  tx: Prisma.TransactionClient,
  productId: string,
  length: number,
  quantity: number,
) {
  await tx.cutPieceStock.upsert({
    where: { productId_length: { productId, length } },
    update: { quantity: { increment: quantity } },
    create: { productId, length, quantity },
  });
}

/**
 * Core mutation logic, taking an externally-managed transaction client so a
 * multi-line bill save can compose several of these into one outer
 * transaction. `adjustStock` (below) is the standalone public entry point
 * Phase 1's UI keeps using unchanged; `adjustStockInTx` is the same core
 * exposed for callers that already hold a transaction.
 */
async function adjustStockCore(tx: Prisma.TransactionClient, input: AdjustStockInput) {
  const product = await tx.product.findUniqueOrThrow({
    where: { id: input.productId },
    include: { cutPieces: true },
  });

  switch (input.kind) {
    case "SIMPLE": {
      const current = product.currentStock ?? 0;
      if (current < input.quantity) throw new InsufficientStockError();
      await tx.product.update({
        where: { id: product.id },
        data: { currentStock: current - input.quantity },
      });
      break;
    }
    case "LENGTH_FULL": {
      const count = product.fullLengthCount ?? 0;
      if (count < input.quantity) throw new InsufficientStockError();
      await tx.product.update({
        where: { id: product.id },
        data: { fullLengthCount: count - input.quantity },
      });
      break;
    }
    case "LENGTH_CUT": {
      const piece = product.cutPieces.find((p) => p.length === input.length);
      if (!piece || piece.quantity < input.quantity) {
        throw new InsufficientStockError();
      }
      await tx.cutPieceStock.update({
        where: { id: piece.id },
        data: { quantity: piece.quantity - input.quantity },
      });
      break;
    }
    case "LENGTH_MANUAL_CUT": {
      const count = product.fullLengthCount ?? 0;
      if (count < input.quantity) throw new InsufficientStockError();
      const fullLengthValue = product.fullLengthValue ?? 0;
      const remainder = fullLengthValue - input.length;
      if (remainder < 0) {
        throw new Error("Cut length exceeds the product's full length");
      }
      await tx.product.update({
        where: { id: product.id },
        data: { fullLengthCount: count - input.quantity },
      });
      await upsertCutPiece(tx, product.id, input.length, input.quantity);
      if (remainder > 0) {
        await upsertCutPiece(tx, product.id, remainder, input.quantity);
      }
      break;
    }
    case "BOX_FULL": {
      const count = product.boxCount ?? 0;
      if (count < input.quantity) throw new InsufficientStockError();
      await tx.product.update({
        where: { id: product.id },
        data: { boxCount: count - input.quantity },
      });
      break;
    }
    case "BOX_LOOSE": {
      let boxCount = product.boxCount ?? 0;
      let looseCount = product.looseCount ?? 0;
      const boxSize = product.boxSize ?? 0;
      while (looseCount < input.quantity) {
        if (boxCount <= 0) throw new InsufficientStockError();
        boxCount -= 1;
        looseCount += boxSize;
      }
      looseCount -= input.quantity;
      await tx.product.update({
        where: { id: product.id },
        data: { boxCount, looseCount },
      });
      break;
    }
  }

  await tx.stockAdjustment.create({
    data: {
      productId: input.productId,
      kind: input.kind,
      quantity: input.quantity,
      cutLength: "length" in input ? input.length : null,
      reason: input.reason,
      source: input.source ?? "MANUAL",
      direction: "OUT",
      billLineItemId: input.billLineItemId ?? null,
    },
  });

  return tx.product.findUniqueOrThrow({
    where: { id: input.productId },
    ...productWithRelationsArgs,
  });
}

/**
 * Single source of truth for every stock mutation. Wrapped in a transaction
 * so the mutation and its audit-log row always land together.
 */
export async function adjustStock(input: AdjustStockInput) {
  return prisma.$transaction((tx) => adjustStockCore(tx, input));
}

/** Same core logic, for callers that already hold a transaction client
 * (e.g. a bill-save transaction touching several lines at once). */
export async function adjustStockInTx(
  tx: Prisma.TransactionClient,
  input: AdjustStockInput,
) {
  return adjustStockCore(tx, input);
}

type SourceCutLengthOptions = {
  reason?: string;
  source?: "MANUAL" | "SALE";
  billLineItemId?: string;
};

/**
 * Sources `quantity` pieces of `neededLength`, preferring — in order —
 * (1) an exact-length cut piece already in stock, (2) cutting down an
 * existing LONGER cut piece (e.g. an 18ft offcut can supply a 5ft need,
 * leaving a 13ft offcut behind), and only then (3) opening a fresh full
 * length. Donors are tried smallest-first ("best fit") to leave the
 * least waste. Each step that actually runs writes its own
 * StockAdjustment row, so a single line can produce more than one row —
 * returnStockForLineInTx already reverses every OUT row tied to a line,
 * not just one, so this doesn't need any special-casing to undo cleanly.
 */
async function sourceCutLengthCore(
  tx: Prisma.TransactionClient,
  productId: string,
  neededLength: number,
  quantity: number,
  options: SourceCutLengthOptions,
) {
  const product = await tx.product.findUniqueOrThrow({
    where: { id: productId },
    include: { cutPieces: true },
  });

  let remaining = quantity;

  const exact = product.cutPieces.find((p) => p.length === neededLength);
  if (exact && exact.quantity > 0 && remaining > 0) {
    const use = Math.min(exact.quantity, remaining);
    await tx.cutPieceStock.update({
      where: { id: exact.id },
      data: { quantity: exact.quantity - use },
    });
    await tx.stockAdjustment.create({
      data: {
        productId,
        kind: "LENGTH_CUT",
        quantity: use,
        cutLength: neededLength,
        reason: options.reason,
        source: options.source ?? "MANUAL",
        direction: "OUT",
        billLineItemId: options.billLineItemId ?? null,
      },
    });
    remaining -= use;
  }

  if (remaining > 0) {
    const donors = product.cutPieces
      .filter((p) => p.length > neededLength && p.quantity > 0)
      .sort((a, b) => a.length - b.length);

    for (const donor of donors) {
      if (remaining <= 0) break;
      const use = Math.min(donor.quantity, remaining);
      const donorRemainder = donor.length - neededLength;

      await tx.cutPieceStock.update({
        where: { id: donor.id },
        data: { quantity: donor.quantity - use },
      });
      if (donorRemainder > 0) {
        await upsertCutPiece(tx, productId, donorRemainder, use);
      }
      await tx.stockAdjustment.create({
        data: {
          productId,
          kind: "LENGTH_RECUT",
          quantity: use,
          cutLength: neededLength,
          sourceLength: donor.length,
          reason: options.reason,
          source: options.source ?? "MANUAL",
          direction: "OUT",
          billLineItemId: options.billLineItemId ?? null,
        },
      });
      remaining -= use;
    }
  }

  if (remaining > 0) {
    const count = product.fullLengthCount ?? 0;
    if (count < remaining) throw new InsufficientStockError();
    const fullLengthValue = product.fullLengthValue ?? 0;
    const remainder = fullLengthValue - neededLength;
    if (remainder < 0) {
      throw new Error("Needed length exceeds the product's full length");
    }
    await tx.product.update({
      where: { id: productId },
      data: { fullLengthCount: count - remaining },
    });
    if (remainder > 0) {
      await upsertCutPiece(tx, productId, remainder, remaining);
    }
    await tx.stockAdjustment.create({
      data: {
        productId,
        kind: "LENGTH_MANUAL_CUT",
        quantity: remaining,
        cutLength: neededLength,
        reason: options.reason,
        source: options.source ?? "MANUAL",
        direction: "OUT",
        billLineItemId: options.billLineItemId ?? null,
      },
    });
  }

  return tx.product.findUniqueOrThrow({
    where: { id: productId },
    ...productWithRelationsArgs,
  });
}

/**
 * Sources a needed cut length: uses an exact-match existing cut piece if
 * available, otherwise always opens a fresh full length and stocks the
 * remainder. Used by billing sale lines — kept separate from
 * LENGTH_MANUAL_CUT, which is a deliberate "convert this full length now"
 * action rather than a "find me this length" lookup.
 */
export async function sourceCutLength(
  productId: string,
  neededLength: number,
  quantity: number,
  options: SourceCutLengthOptions = {},
) {
  return prisma.$transaction((tx) =>
    sourceCutLengthCore(tx, productId, neededLength, quantity, options),
  );
}

export async function sourceCutLengthInTx(
  tx: Prisma.TransactionClient,
  productId: string,
  neededLength: number,
  quantity: number,
  options: SourceCutLengthOptions = {},
) {
  return sourceCutLengthCore(tx, productId, neededLength, quantity, options);
}

export type SellLineInput =
  | { saleKind: "SIMPLE"; productId: string; billLineItemId: string; quantity: number }
  | { saleKind: "LENGTH_FULL"; productId: string; billLineItemId: string; quantity: number }
  | {
      saleKind: "LENGTH_CUT";
      productId: string;
      billLineItemId: string;
      cutLength: number;
      quantity: number;
    }
  | { saleKind: "BOX_FULL"; productId: string; billLineItemId: string; quantity: number }
  | { saleKind: "BOX_LOOSE"; productId: string; billLineItemId: string; quantity: number }
  | { saleKind: "CUSTOM"; billLineItemId: string };

/** Dispatches a single bill line's sale-type-aware stock decrement. Called
 * once per line inside the bill-save transaction; CUSTOM lines are a no-op
 * since they have no catalog stock to touch. */
export async function sellLineInTx(tx: Prisma.TransactionClient, input: SellLineInput) {
  switch (input.saleKind) {
    case "SIMPLE":
    case "LENGTH_FULL":
    case "BOX_FULL":
    case "BOX_LOOSE":
      return adjustStockInTx(tx, {
        kind: input.saleKind,
        productId: input.productId,
        quantity: input.quantity,
        source: "SALE",
        billLineItemId: input.billLineItemId,
      });
    case "LENGTH_CUT":
      return sourceCutLengthInTx(tx, input.productId, input.cutLength, input.quantity, {
        source: "SALE",
        billLineItemId: input.billLineItemId,
      });
    case "CUSTOM":
      return null;
  }
}

export type CreditAccountSellLineInput =
  | { saleKind: "SIMPLE"; productId: string; quantity: number }
  | { saleKind: "LENGTH_FULL"; productId: string; quantity: number }
  | { saleKind: "LENGTH_CUT"; productId: string; cutLength: number; quantity: number }
  | { saleKind: "BOX_FULL"; productId: string; quantity: number }
  | { saleKind: "BOX_LOOSE"; productId: string; quantity: number }
  | { saleKind: "CUSTOM" };

/**
 * Same sale-type-aware stock decrement as sellLineInTx, for items taken
 * onto a Credit Account — there's no BillLineItem yet (the account isn't
 * billed until it's finalized), so this just omits billLineItemId rather
 * than requiring one. A mistake is corrected via a Return against the
 * account afterward, not by reversing this specific call, so no linking
 * id is needed on the StockAdjustment row either.
 */
export async function sellLineForCreditAccountInTx(
  tx: Prisma.TransactionClient,
  input: CreditAccountSellLineInput,
) {
  switch (input.saleKind) {
    case "SIMPLE":
    case "LENGTH_FULL":
    case "BOX_FULL":
    case "BOX_LOOSE":
      return adjustStockInTx(tx, {
        kind: input.saleKind,
        productId: input.productId,
        quantity: input.quantity,
        source: "SALE",
      });
    case "LENGTH_CUT":
      return sourceCutLengthInTx(tx, input.productId, input.cutLength, input.quantity, {
        source: "SALE",
      });
    case "CUSTOM":
      return null;
  }
}

/**
 * Adds stock back for a Credit Account item that's being edited down or
 * deleted outright — a data-entry correction, not a customer Return (no
 * refund/credit implied), so it's logged as a plain MANUAL adjustment
 * rather than going through the Returns machinery.
 */
export async function restoreCreditAccountStockInTx(
  tx: Prisma.TransactionClient,
  input: CreditAccountSellLineInput,
  reason: string,
) {
  if (input.saleKind === "CUSTOM") return;

  const product = await tx.product.findUniqueOrThrow({ where: { id: input.productId } });
  let kind: AdjustmentKind = input.saleKind;
  let cutLength: number | null = null;

  switch (input.saleKind) {
    case "SIMPLE":
      await tx.product.update({
        where: { id: product.id },
        data: { currentStock: (product.currentStock ?? 0) + input.quantity },
      });
      break;
    case "LENGTH_FULL":
      await tx.product.update({
        where: { id: product.id },
        data: { fullLengthCount: (product.fullLengthCount ?? 0) + input.quantity },
      });
      break;
    case "LENGTH_CUT":
      await upsertCutPiece(tx, product.id, input.cutLength, input.quantity);
      cutLength = input.cutLength;
      kind = "LENGTH_CUT";
      break;
    case "BOX_FULL":
      await tx.product.update({
        where: { id: product.id },
        data: { boxCount: (product.boxCount ?? 0) + input.quantity },
      });
      break;
    case "BOX_LOOSE":
      await tx.product.update({
        where: { id: product.id },
        data: { looseCount: (product.looseCount ?? 0) + input.quantity },
      });
      break;
  }

  await tx.stockAdjustment.create({
    data: {
      productId: input.productId,
      kind,
      quantity: input.quantity,
      cutLength,
      reason,
      source: "MANUAL",
      direction: "IN",
    },
  });
}

/**
 * Reverses every OUT stock movement tied to a bill line (used by Bill
 * Cancel). Walks the StockAdjustment audit trail rather than re-deriving
 * quantities, so it exactly undoes what was actually recorded. Each
 * reversal writes its own new `direction: "IN"` row rather than deleting
 * history, so a product's adjustment log stays a complete, legible trail.
 *
 * Known limitation: reversing a LENGTH_MANUAL_CUT sale's remainder piece is
 * clamped at 0 rather than ever going negative, if that remainder was
 * already partly consumed by an unrelated sale since. True correctness
 * would require per-batch stock-lot tracking, out of scope here.
 */
export async function returnStockForLineInTx(
  tx: Prisma.TransactionClient,
  billLineItemId: string,
  reason = "Bill cancelled",
) {
  const outRows = await tx.stockAdjustment.findMany({
    where: { billLineItemId, direction: "OUT" },
  });

  for (const row of outRows) {
    const product = await tx.product.findUniqueOrThrow({
      where: { id: row.productId },
      include: { cutPieces: true },
    });

    switch (row.kind) {
      case "SIMPLE":
        await tx.product.update({
          where: { id: product.id },
          data: { currentStock: (product.currentStock ?? 0) + row.quantity },
        });
        break;
      case "LENGTH_FULL":
        await tx.product.update({
          where: { id: product.id },
          data: { fullLengthCount: (product.fullLengthCount ?? 0) + row.quantity },
        });
        break;
      case "LENGTH_CUT":
        await upsertCutPiece(tx, product.id, row.cutLength ?? 0, row.quantity);
        break;
      case "LENGTH_MANUAL_CUT": {
        await tx.product.update({
          where: { id: product.id },
          data: { fullLengthCount: (product.fullLengthCount ?? 0) + row.quantity },
        });
        const fullLengthValue = product.fullLengthValue ?? 0;
        const remainderLength = fullLengthValue - (row.cutLength ?? 0);
        if (remainderLength > 0) {
          const remainderPiece = product.cutPieces.find((p) => p.length === remainderLength);
          const removeQty = Math.min(remainderPiece?.quantity ?? 0, row.quantity);
          if (remainderPiece && removeQty > 0) {
            await tx.cutPieceStock.update({
              where: { id: remainderPiece.id },
              data: { quantity: remainderPiece.quantity - removeQty },
            });
          }
        }
        break;
      }
      case "LENGTH_RECUT": {
        await upsertCutPiece(tx, product.id, row.sourceLength ?? 0, row.quantity);
        const remainderLength = (row.sourceLength ?? 0) - (row.cutLength ?? 0);
        if (remainderLength > 0) {
          const remainderPiece = product.cutPieces.find((p) => p.length === remainderLength);
          const removeQty = Math.min(remainderPiece?.quantity ?? 0, row.quantity);
          if (remainderPiece && removeQty > 0) {
            await tx.cutPieceStock.update({
              where: { id: remainderPiece.id },
              data: { quantity: remainderPiece.quantity - removeQty },
            });
          }
        }
        break;
      }
      case "BOX_FULL":
        await tx.product.update({
          where: { id: product.id },
          data: { boxCount: (product.boxCount ?? 0) + row.quantity },
        });
        break;
      case "BOX_LOOSE":
        await tx.product.update({
          where: { id: product.id },
          data: { looseCount: (product.looseCount ?? 0) + row.quantity },
        });
        break;
    }

    await tx.stockAdjustment.create({
      data: {
        productId: row.productId,
        kind: row.kind,
        quantity: row.quantity,
        cutLength: row.cutLength,
        reason,
        source: row.source,
        direction: "IN",
        billLineItemId,
      },
    });
  }
}

export type ReturnLineInput =
  | { saleKind: "SIMPLE"; productId: string; quantity: number }
  | { saleKind: "LENGTH_FULL"; productId: string; quantity: number }
  | { saleKind: "LENGTH_CUT"; productId: string; cutLength: number; quantity: number }
  | { saleKind: "BOX_FULL"; productId: string; quantity: number }
  | { saleKind: "BOX_LOOSE"; productId: string; quantity: number }
  | { saleKind: "CUSTOM" };

/** Adds returned goods back into sellable stock (a Returns transaction, not
 * a bill cancellation — there may be no StockAdjustment history to walk, so
 * this adds directly rather than reversing recorded rows). BOX_LOOSE
 * returns land as loose units, not reconstituted boxes; LENGTH_CUT returns
 * land as a cut piece at that exact length. CUSTOM lines have no catalog
 * stock to touch. */
export async function receiveReturnStockInTx(
  tx: Prisma.TransactionClient,
  input: ReturnLineInput,
  returnLineItemId: string,
) {
  if (input.saleKind === "CUSTOM") return;

  const product = await tx.product.findUniqueOrThrow({ where: { id: input.productId } });
  let kind: AdjustmentKind = input.saleKind;
  let cutLength: number | null = null;

  switch (input.saleKind) {
    case "SIMPLE":
      await tx.product.update({
        where: { id: product.id },
        data: { currentStock: (product.currentStock ?? 0) + input.quantity },
      });
      break;
    case "LENGTH_FULL":
      await tx.product.update({
        where: { id: product.id },
        data: { fullLengthCount: (product.fullLengthCount ?? 0) + input.quantity },
      });
      break;
    case "LENGTH_CUT":
      await upsertCutPiece(tx, product.id, input.cutLength, input.quantity);
      cutLength = input.cutLength;
      kind = "LENGTH_CUT";
      break;
    case "BOX_FULL":
      await tx.product.update({
        where: { id: product.id },
        data: { boxCount: (product.boxCount ?? 0) + input.quantity },
      });
      break;
    case "BOX_LOOSE":
      await tx.product.update({
        where: { id: product.id },
        data: { looseCount: (product.looseCount ?? 0) + input.quantity },
      });
      break;
  }

  await tx.stockAdjustment.create({
    data: {
      productId: input.productId,
      kind,
      quantity: input.quantity,
      cutLength,
      reason: "Customer return",
      source: "RETURN",
      direction: "IN",
      returnLineItemId,
    },
  });
}

export type ReceiveStockInput = {
  productId: string;
  kind: "SIMPLE" | "LENGTH_FULL" | "BOX_FULL";
  quantity: number;
  costPrice?: number;
  newSellingPrice?: number;
  supplierId?: string;
  reason?: string;
};

const sellingPriceFieldByKind = {
  SIMPLE: "sellingPrice",
  LENGTH_FULL: "fullLengthPrice",
  BOX_FULL: "boxPrice",
} as const;

/**
 * Adds newly received stock (direction: IN, source: PURCHASE) — the
 * counterpart to adjustStock's manual subtraction. Only whole units make
 * sense to *receive*: full lengths for LENGTH products, full boxes for
 * BOX products — cut pieces and loose units only ever come from opening
 * one of those during a sale, never from a delivery. When a cost price is
 * given, it's stamped on the StockAdjustment row (so this receipt doubles
 * as a purchase record) and also becomes the product's current cost for
 * that unit, keeping margins accurate on the next sale. A new selling
 * price is optional too — when given, the old price is kept as a
 * ProductPriceHistory row (a quick-pick option while billing) rather than
 * simply overwritten and lost, since old and new stock sit in the same
 * pooled count with no separate batch tracking.
 */
async function receiveStockCore(tx: Prisma.TransactionClient, input: ReceiveStockInput) {
  const product = await tx.product.findUniqueOrThrow({ where: { id: input.productId } });

  if (input.newSellingPrice != null) {
    const field = sellingPriceFieldByKind[input.kind];
    const oldPrice = product[field];
    if (oldPrice != null && oldPrice !== input.newSellingPrice) {
      await tx.productPriceHistory.create({
        data: { productId: input.productId, field, price: oldPrice },
      });
    }
  }

  switch (input.kind) {
    case "SIMPLE":
      await tx.product.update({
        where: { id: product.id },
        data: {
          currentStock: (product.currentStock ?? 0) + input.quantity,
          ...(input.costPrice != null ? { costPrice: input.costPrice } : {}),
          ...(input.newSellingPrice != null ? { sellingPrice: input.newSellingPrice } : {}),
        },
      });
      break;
    case "LENGTH_FULL":
      await tx.product.update({
        where: { id: product.id },
        data: {
          fullLengthCount: (product.fullLengthCount ?? 0) + input.quantity,
          ...(input.costPrice != null ? { fullLengthCostPrice: input.costPrice } : {}),
          ...(input.newSellingPrice != null ? { fullLengthPrice: input.newSellingPrice } : {}),
        },
      });
      break;
    case "BOX_FULL":
      await tx.product.update({
        where: { id: product.id },
        data: {
          boxCount: (product.boxCount ?? 0) + input.quantity,
          ...(input.costPrice != null ? { boxCostPrice: input.costPrice } : {}),
          ...(input.newSellingPrice != null ? { boxPrice: input.newSellingPrice } : {}),
        },
      });
      break;
  }

  await tx.stockAdjustment.create({
    data: {
      productId: input.productId,
      kind: input.kind,
      quantity: input.quantity,
      reason: input.reason,
      source: "PURCHASE",
      direction: "IN",
      costPrice: input.costPrice,
      supplierId: input.supplierId,
    },
  });

  return tx.product.findUniqueOrThrow({
    where: { id: input.productId },
    ...productWithRelationsArgs,
  });
}

export async function receiveStock(input: ReceiveStockInput) {
  return prisma.$transaction((tx) => receiveStockCore(tx, input));
}

export async function receiveStockInTx(tx: Prisma.TransactionClient, input: ReceiveStockInput) {
  return receiveStockCore(tx, input);
}
