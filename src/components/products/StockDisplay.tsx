import type { ProductWithRelations } from "@/types";
import { formatStock } from "@/lib/stock/stockDisplay";

export function StockDisplay({ product }: { product: ProductWithRelations }) {
  return <span className="text-sm text-foreground">{formatStock(product)}</span>;
}
