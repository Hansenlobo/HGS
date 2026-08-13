import type { ProductWithRelations } from "@/types";

export function isOutOfStock(product: ProductWithRelations): boolean {
  switch (product.saleType) {
    case "SIMPLE":
      return (product.currentStock ?? 0) <= 0;
    case "LENGTH":
      return (
        (product.fullLengthCount ?? 0) === 0 &&
        product.cutPieces.every((piece) => piece.quantity === 0)
      );
    case "BOX":
      return (product.boxCount ?? 0) === 0 && (product.looseCount ?? 0) === 0;
  }
}

export function isLowStock(product: ProductWithRelations): boolean {
  switch (product.saleType) {
    case "SIMPLE":
      return (product.currentStock ?? 0) < product.minStock;
    case "LENGTH":
      return (product.fullLengthCount ?? 0) < product.minStock;
    case "BOX":
      return (product.boxCount ?? 0) < product.minStock;
  }
}

export type StockStatus = "out" | "low" | "ok";

export function getStockStatus(product: ProductWithRelations): StockStatus {
  if (isOutOfStock(product)) return "out";
  if (isLowStock(product)) return "low";
  return "ok";
}
