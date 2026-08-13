import type { ProductWithRelations } from "@/types";
import { computeLineAmounts, computeUnitsSold, type DiscountType } from "@/lib/billing/pricing";

export type SaleKind = "SIMPLE" | "LENGTH_FULL" | "LENGTH_CUT" | "BOX_FULL" | "BOX_LOOSE" | "CUSTOM";

export interface LineDraft {
  key: string;
  product?: ProductWithRelations;
  customItemName?: string;
  itemName: string;
  saleKind: SaleKind;
  quantity: string;
  cutLength: string;
  rate: string;
  discountType: DiscountType | "";
  discountValue: string;
  note: string;
  /** Custom items only — no product to carry an isPartyProduct flag, so
   * this opts a specific custom line into the Party bill markup. */
  applyMarkup: boolean;
}

export function defaultSaleKind(product: { saleType: ProductWithRelations["saleType"] }): SaleKind {
  switch (product.saleType) {
    case "SIMPLE":
      return "SIMPLE";
    case "LENGTH":
      return "LENGTH_FULL";
    case "BOX":
      return "BOX_FULL";
  }
}

export function defaultRateFor(product: ProductWithRelations, saleKind: SaleKind): number {
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

export type PriceField = "sellingPrice" | "fullLengthPrice" | "cutUnitPrice" | "boxPrice" | "looseUnitPrice";

/** Which Product price field a given sale kind bills against — mirrors
 * defaultRateFor, used to look up matching ProductPriceHistory rows for
 * the price-suggestion chips while billing. */
export function priceFieldForSaleKind(saleKind: SaleKind): PriceField | null {
  switch (saleKind) {
    case "SIMPLE":
      return "sellingPrice";
    case "LENGTH_FULL":
      return "fullLengthPrice";
    case "LENGTH_CUT":
      return "cutUnitPrice";
    case "BOX_FULL":
      return "boxPrice";
    case "BOX_LOOSE":
      return "looseUnitPrice";
    case "CUSTOM":
      return null;
  }
}

export function draftFromProduct(product: ProductWithRelations): LineDraft {
  return draftFromProductWithKind(product, defaultSaleKind(product));
}

/** Builds a line for a specific sale kind rather than the product's
 * default — used by the "+ Add Cut Length" / "+ Add Loose Units" quick
 * actions so a customer can buy, say, a full-length pipe AND a cut piece
 * of the same product on one bill instead of only one or the other. */
export function draftFromProductWithKind(product: ProductWithRelations, saleKind: SaleKind): LineDraft {
  return {
    key: `${Date.now()}-${Math.random()}`,
    product,
    itemName: product.name,
    saleKind,
    quantity: "1",
    cutLength: "",
    rate: String(defaultRateFor(product, saleKind)),
    discountType: "",
    discountValue: "",
    note: "",
    applyMarkup: false,
  };
}

/** The other sale kind for the same physical stock pool — e.g. a LENGTH
 * product sold as a full length also has a cut-length counterpart. Null
 * for SIMPLE/CUSTOM, which have no counterpart. */
export function counterpartSaleKind(saleKind: SaleKind): SaleKind | null {
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

export function saleKindLabel(saleKind: SaleKind): string {
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

export function draftFromCustomItem(name: string): LineDraft {
  return {
    key: `${Date.now()}-${Math.random()}`,
    customItemName: name,
    itemName: name,
    saleKind: "CUSTOM",
    quantity: "1",
    cutLength: "",
    rate: "0",
    discountType: "",
    discountValue: "",
    note: "",
    applyMarkup: false,
  };
}

export interface LineComputed {
  unitsSold: number;
  baseRate: number;
  partyRate: number;
  shopAmount: number;
  amount: number;
}

export function computeDraft(
  draft: LineDraft,
  billType: "NORMAL" | "PARTY",
  partyPercentage: number,
): LineComputed {
  const rate = Number(draft.rate) || 0;
  const quantity = Number(draft.quantity) || 0;
  const cutLength = Number(draft.cutLength) || 0;
  const unitsSold = computeUnitsSold(draft.saleKind, quantity, cutLength);
  const isPartyProduct = draft.product ? draft.product.isPartyProduct : draft.applyMarkup;
  const discountValue = Number(draft.discountValue) || 0;
  const { baseRate, partyRate, shopAmount, amount } = computeLineAmounts({
    rate,
    discountType: draft.discountType || undefined,
    discountValue,
    unitsSold,
    isPartyProduct,
    billType,
    partyPercentage,
  });
  return { unitsSold, baseRate, partyRate, shopAmount, amount };
}
