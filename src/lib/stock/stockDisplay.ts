import type { ProductWithRelations } from "@/types";

export function formatNumber(value: number): string {
  return Number(value.toFixed(2)).toString();
}

export function formatStock(product: ProductWithRelations): string {
  switch (product.saleType) {
    case "SIMPLE":
      return `${product.currentStock ?? 0} units`;
    case "LENGTH": {
      const full = `${product.fullLengthCount ?? 0} full`;
      const unit = product.unitLabel ?? "";
      const cuts = product.cutPieces
        .filter((piece) => piece.quantity > 0)
        .sort((a, b) => b.length - a.length)
        .map((piece) => `${formatNumber(piece.length)}${unit} x${piece.quantity}`)
        .join(", ");
      return cuts ? `${full} + ${cuts}` : full;
    }
    case "BOX":
      return `${product.boxCount ?? 0} boxes + ${product.looseCount ?? 0} loose`;
  }
}

export function formatPrice(value: number | null | undefined): string {
  if (value == null) return "—";
  return `₹${value.toFixed(2)}`;
}

export function formatPricingSummary(product: ProductWithRelations): string {
  switch (product.saleType) {
    case "SIMPLE":
      return formatPrice(product.sellingPrice);
    case "LENGTH":
      return `${formatPrice(product.fullLengthPrice)}/length, ${formatPrice(product.cutUnitPrice)}/${product.unitLabel ?? "unit"}`;
    case "BOX":
      return `${formatPrice(product.boxPrice)}/box, ${formatPrice(product.looseUnitPrice)}/unit`;
  }
}
