import type { ProductWithRelations } from "@/types";
import { computeUnitsSold } from "@/lib/billing/pricing";

export type ReturnSaleKind = "SIMPLE" | "LENGTH_FULL" | "LENGTH_CUT" | "BOX_FULL" | "BOX_LOOSE" | "CUSTOM";

export interface ReturnLineDraft {
  key: string;
  product?: ProductWithRelations;
  customItemName?: string;
  itemName: string;
  saleKind: ReturnSaleKind;
  quantity: string;
  cutLength: string;
  rate: string;
}

function defaultSaleKind(product: ProductWithRelations): ReturnSaleKind {
  switch (product.saleType) {
    case "SIMPLE":
      return "SIMPLE";
    case "LENGTH":
      return "LENGTH_FULL";
    case "BOX":
      return "BOX_FULL";
  }
}

function defaultRateFor(product: ProductWithRelations, saleKind: ReturnSaleKind): number {
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

export function draftFromProduct(product: ProductWithRelations): ReturnLineDraft {
  return draftFromProductWithKind(product, defaultSaleKind(product));
}

export function draftFromProductWithKind(product: ProductWithRelations, saleKind: ReturnSaleKind): ReturnLineDraft {
  return {
    key: `${Date.now()}-${Math.random()}`,
    product,
    itemName: product.name,
    saleKind,
    quantity: "1",
    cutLength: "",
    rate: String(defaultRateFor(product, saleKind)),
  };
}

export function counterpartSaleKind(saleKind: ReturnSaleKind): ReturnSaleKind | null {
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

export function saleKindLabel(saleKind: ReturnSaleKind): string {
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

export function draftFromCustomItem(name: string): ReturnLineDraft {
  return {
    key: `${Date.now()}-${Math.random()}`,
    customItemName: name,
    itemName: name,
    saleKind: "CUSTOM",
    quantity: "1",
    cutLength: "",
    rate: "0",
  };
}

export function computeReturnLineAmount(line: ReturnLineDraft): number {
  const rate = Number(line.rate) || 0;
  const quantity = Number(line.quantity) || 0;
  const cutLength = Number(line.cutLength) || 0;
  const unitsSold = computeUnitsSold(line.saleKind, quantity, cutLength);
  return rate * unitsSold;
}
