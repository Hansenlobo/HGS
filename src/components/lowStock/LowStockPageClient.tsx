"use client";

import { useState } from "react";
import useSWR from "swr";
import type { ProductWithRelations } from "@/types";
import type { AdjustmentFormValues } from "@/lib/validation/adjustment.schema";
import type { ReceiveStockFormValues } from "@/lib/validation/receiveStock.schema";
import { fetcher, postJson } from "@/lib/fetcher";
import { getStockStatus } from "@/lib/stock/stockMetrics";
import { formatStock } from "@/lib/stock/stockDisplay";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { StockAdjustmentModal } from "@/components/products/StockAdjustmentModal";
import { ReceiveStockModal } from "@/components/products/ReceiveStockModal";

export interface LowStockPageClientProps {
  initialProducts: ProductWithRelations[];
}

export function LowStockPageClient({ initialProducts }: LowStockPageClientProps) {
  const { showToast } = useToast();
  const [adjustProduct, setAdjustProduct] = useState<ProductWithRelations | null>(null);
  const [receiveProduct, setReceiveProduct] = useState<ProductWithRelations | null>(null);

  const { data: products, mutate } = useSWR<ProductWithRelations[]>("/api/products/low-stock", fetcher, {
    fallbackData: initialProducts,
    refreshInterval: 30_000,
  });

  async function handleAdjust(values: AdjustmentFormValues) {
    if (!adjustProduct) return;
    await postJson(`/api/products/${adjustProduct.id}/adjust`, values);
    await mutate();
    setAdjustProduct(null);
    showToast("Stock adjusted");
  }

  async function handleReceive(values: ReceiveStockFormValues) {
    if (!receiveProduct) return;
    await postJson(`/api/products/${receiveProduct.id}/receive-stock`, values);
    await mutate();
    setReceiveProduct(null);
    showToast("Stock received");
  }

  const list = products ?? [];
  const outCount = list.filter((p) => getStockStatus(p) === "out").length;
  const lowCount = list.length - outCount;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Low Stock</h1>
        <p className="text-sm text-muted">
          {list.length === 0
            ? "Nothing needs restocking right now."
            : `${outCount} out of stock, ${lowCount} running low.`}
        </p>
      </div>

      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">
          All products are above their minimum stock level.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Min Stock</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {list.map((product) => {
                const status = getStockStatus(product);
                return (
                  <tr key={product.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{product.name}</td>
                    <td className="px-4 py-3 text-sm text-foreground">{formatStock(product)}</td>
                    <td className="px-4 py-3 text-sm text-muted">{product.minStock}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          status === "out"
                            ? "rounded-full bg-danger-bg px-2 py-0.5 text-xs font-medium text-danger"
                            : "rounded-full bg-warning-bg px-2 py-0.5 text-xs font-medium text-warning"
                        }
                      >
                        {status === "out" ? "Out of Stock" : "Low Stock"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => setReceiveProduct(product)}>
                          Receive Stock
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setAdjustProduct(product)}>
                          Adjust
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <StockAdjustmentModal product={adjustProduct} onClose={() => setAdjustProduct(null)} onSubmit={handleAdjust} />
      <ReceiveStockModal product={receiveProduct} onClose={() => setReceiveProduct(null)} onSubmit={handleReceive} />
    </div>
  );
}
