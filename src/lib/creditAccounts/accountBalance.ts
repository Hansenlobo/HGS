import { computeUnitsSold, resolveDiscount, type DiscountType } from "@/lib/billing/pricing";
import type { CreditAccountWithRelations } from "@/types";

export type PricingFields = {
  sellingPrice: number | null;
  fullLengthPrice: number | null;
  cutUnitPrice: number | null;
  boxPrice: number | null;
  looseUnitPrice: number | null;
};

/** Live current price for a sale kind — the same basis the final bill is
 * generated at, so the "approximate" figures shown before finalization
 * never drift from what the customer will actually be billed. */
export function currentRateFor(product: PricingFields, saleKind: string): number {
  switch (saleKind) {
    case "SIMPLE":
      return product.sellingPrice ?? 0;
    case "LENGTH_FULL":
      return product.fullLengthPrice ?? 0;
    case "LENGTH_CUT":
      return product.cutUnitPrice ?? 0;
    case "BOX_FULL":
      return product.boxPrice ?? 0;
    case "BOX_LOOSE":
      return product.looseUnitPrice ?? 0;
    default:
      return 0;
  }
}

export interface RateableItem {
  product: (PricingFields & { isPartyProduct: boolean }) | null;
  saleKind: string;
  priceAtTimeTaken: number;
  rateLocked: boolean;
  discountType: DiscountType | null;
  discountValue: number;
  applyMarkup: boolean;
}

/** Pre-discount rate: live product price unless the item is rate-locked
 * (or has no product to re-price from at all), in which case it's billed
 * at exactly the snapshotted price. */
export function baseRateFor(item: Pick<RateableItem, "product" | "saleKind" | "priceAtTimeTaken" | "rateLocked">): number {
  if (!item.product || item.rateLocked) return item.priceAtTimeTaken;
  return currentRateFor(item.product, item.saleKind);
}

/** Final per-unit rate after any per-item discount — the one place every
 * consumer (Balance card, item list, printed statement) should read the
 * rate from, so a locked price and a discount can never disagree between
 * screens. */
export function effectiveRateFor(item: RateableItem): number {
  return resolveDiscount(baseRateFor(item), item.discountType, item.discountValue);
}

/** effectiveRateFor with the account's percentage markup layered on top,
 * when it actually applies (isPartyProduct catalog items, or custom items
 * with their own "apply markup" flag) — the true per-unit price that
 * composes the account's total, so a displayed line price never
 * disagrees with the aggregate Amount shown beside it. */
export function finalRateFor(item: RateableItem, percentageIncrease: number): number {
  const rate = effectiveRateFor(item);
  const shouldApplyMarkup = item.product ? item.product.isPartyProduct : item.applyMarkup;
  return shouldApplyMarkup ? rate * (1 + percentageIncrease / 100) : rate;
}

export interface AccountBalance {
  approximateAmount: number;
  approximatePaid: number;
  remaining: number;
}

/** Approximate running totals for a Credit Account — priced at CURRENT
 * product prices, with the account's markup applied only where it will
 * actually apply on the final bill: catalog items flagged isPartyProduct,
 * or custom items with their "apply markup" checkbox checked. Net of
 * anything already returned. This is always an estimate until the final
 * bill locks the numbers in. */
export function computeAccountBalance(account: CreditAccountWithRelations): AccountBalance {
  const markup = 1 + account.percentageIncrease / 100;

  const itemsTotal = account.items.reduce((sum, item) => {
    return sum + finalRateFor(item, account.percentageIncrease) * item.unitsSold;
  }, 0);

  const returnsTotal = account.returns.reduce((sum, ret) => {
    const lineTotal = ret.lineItems.reduce((lineSum, line) => {
      const unitsSold = computeUnitsSold(line.saleKind, line.quantity, line.cutLength);
      if (line.product) {
        const rate = currentRateFor(line.product, line.saleKind);
        const shouldApplyMarkup = line.product.isPartyProduct;
        return lineSum + rate * (shouldApplyMarkup ? markup : 1) * unitsSold;
      }
      // Custom items have no product to check for isPartyProduct and no
      // "apply markup" record on the return line itself — trust whatever
      // rate staff typed in the Return form, matching how custom items
      // are always handled elsewhere when there's no catalog price to
      // recompute from.
      return lineSum + line.rate * unitsSold;
    }, 0);
    return sum + lineTotal;
  }, 0);

  const approximatePaid = account.payments.reduce((sum, p) => sum + p.amount, 0);
  const approximateAmount = Math.max(0, itemsTotal - returnsTotal);

  return {
    approximateAmount,
    approximatePaid,
    remaining: approximateAmount - approximatePaid,
  };
}
