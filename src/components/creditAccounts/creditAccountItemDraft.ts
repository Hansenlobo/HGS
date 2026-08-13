import type { ProductWithRelations } from "@/types";
import { computeUnitsSold, resolveDiscount, type DiscountType } from "@/lib/billing/pricing";

export type CreditAccountSaleKind = "SIMPLE" | "LENGTH_FULL" | "LENGTH_CUT" | "BOX_FULL" | "BOX_LOOSE" | "CUSTOM";

export interface CreditAccountItemDraft {
  key: string;
  product?: ProductWithRelations;
  customItemName?: string;
  itemName: string;
  saleKind: CreditAccountSaleKind;
  quantity: string;
  cutLength: string;
  rate: string;
  /** True once the rate has been deliberately typed or picked from a
   * price-history chip — the item then bills at exactly this rate
   * instead of always re-pricing to the product's live price. */
  rateLocked: boolean;
  discountType: DiscountType | "";
  discountValue: string;
  notes: string;
  /** Custom items only — no product to carry an isPartyProduct flag, so
   * whether the account's percentage increase applies is opt-in per item. */
  applyMarkup: boolean;
}

function defaultSaleKind(product: ProductWithRelations): CreditAccountSaleKind {
  switch (product.saleType) {
    case "SIMPLE":
      return "SIMPLE";
    case "LENGTH":
      return "LENGTH_FULL";
    case "BOX":
      return "BOX_FULL";
  }
}

function defaultRateFor(product: ProductWithRelations, saleKind: CreditAccountSaleKind): number {
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
    case "CUSTOM":
      return 0;
  }
}

export { defaultRateFor };

export function draftFromProduct(product: ProductWithRelations): CreditAccountItemDraft {
  return draftFromProductWithKind(product, defaultSaleKind(product));
}

export function draftFromProductWithKind(
  product: ProductWithRelations,
  saleKind: CreditAccountSaleKind,
): CreditAccountItemDraft {
  return {
    key: `${Date.now()}-${Math.random()}`,
    product,
    itemName: product.name,
    saleKind,
    quantity: "1",
    cutLength: "",
    rate: String(defaultRateFor(product, saleKind)),
    rateLocked: false,
    discountType: "",
    discountValue: "",
    notes: "",
    applyMarkup: false,
  };
}

export function draftFromCustomItem(name: string): CreditAccountItemDraft {
  return {
    key: `${Date.now()}-${Math.random()}`,
    customItemName: name,
    itemName: name,
    saleKind: "CUSTOM",
    quantity: "1",
    cutLength: "",
    rate: "0",
    rateLocked: false,
    discountType: "",
    discountValue: "",
    notes: "",
    applyMarkup: false,
  };
}

export function counterpartSaleKind(saleKind: CreditAccountSaleKind): CreditAccountSaleKind | null {
  switch (saleKind) {
    case "LENGTH_FULL":
      return "LENGTH_CUT";
    case "LENGTH_CUT":
      return "LENGTH_FULL";
    case "BOX_FULL":
      return "BOX_LOOSE";
    case "BOX_LOOSE":
      return "BOX_FULL";
    default:
      return null;
  }
}

export function saleKindLabel(saleKind: CreditAccountSaleKind): string {
  switch (saleKind) {
    case "SIMPLE":
      return "Unit";
    case "LENGTH_FULL":
      return "Full Length";
    case "LENGTH_CUT":
      return "Cut Length";
    case "BOX_FULL":
      return "Full Box";
    case "BOX_LOOSE":
      return "Loose Units";
    case "CUSTOM":
      return "Custom";
  }
}

/** Mirrors the markup rule the final bill actually applies: catalog items
 * follow their own product's isPartyProduct flag; custom items follow the
 * per-item "apply markup" checkbox — so this estimate never overstates
 * what a non-party item will really be billed at. */
export function computeDraftAmount(draft: CreditAccountItemDraft, percentageIncrease: number): number {
  const baseRate = Number(draft.rate) || 0;
  const rate = resolveDiscount(baseRate, draft.discountType || undefined, Number(draft.discountValue) || 0);
  const quantity = Number(draft.quantity) || 0;
  const cutLength = Number(draft.cutLength) || 0;
  const unitsSold = computeUnitsSold(draft.saleKind, quantity, cutLength);
  const shouldApplyMarkup = draft.product ? draft.product.isPartyProduct : draft.applyMarkup;
  const markup = shouldApplyMarkup ? 1 + percentageIncrease / 100 : 1;
  return rate * markup * unitsSold;
}
