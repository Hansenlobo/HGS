import type { ProductWithRelations } from "@/types";
import { getStockStatus } from "@/lib/stock/stockMetrics";
import clsx from "clsx";

export function StockBadge({ product }: { product: ProductWithRelations }) {
  const status = getStockStatus(product);
  if (status === "ok") return null;

  return (
    <span
      className={clsx(
        "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium",
        status === "out" ? "bg-danger-bg text-danger" : "bg-warning-bg text-warning",
      )}
    >
      {status === "out" ? "Out of Stock" : "Low Stock"}
    </span>
  );
}
