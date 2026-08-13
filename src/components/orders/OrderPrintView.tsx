"use client";

import { useState } from "react";
import type { OrderWithRelations } from "@/types";
import { formatOrderNumber } from "@/lib/billing/billDisplay";
import { formatDateTime } from "@/lib/formatDate";
import { formatNumber } from "@/lib/stock/stockDisplay";
import { saleKindLabel } from "@/components/billing/lineDraft";
import { useCurrentUser } from "@/components/auth/CurrentUserProvider";
import { postJson } from "@/lib/fetcher";
import { Button } from "@/components/ui/Button";

export function OrderPrintView({ order }: { order: OrderWithRelations }) {
  const staffName = useCurrentUser().name;
  const [printing, setPrinting] = useState(false);

  async function handlePrint() {
    setPrinting(true);
    try {
      await postJson(`/api/orders/${order.id}/print`, { printedBy: staffName });
    } catch {
      // still let them print even if the log write failed
    } finally {
      setPrinting(false);
      window.print();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print flex justify-end">
        <Button onClick={handlePrint} disabled={printing}>
          {printing ? "…" : "Print"}
        </Button>
      </div>
      <div className="print-sheet mx-auto w-full max-w-md rounded-lg border border-border bg-surface p-6 text-sm">
        <h1 className="text-lg font-semibold text-foreground">Picking Slip</h1>
        <p className="text-muted">{formatOrderNumber(order.orderNumber)}</p>
        <p className="text-muted">{formatDateTime(order.createdAt)}</p>
        <hr className="my-3 border-border" />
        <p>
          <strong>Customer:</strong> {order.customerName}
        </p>
        {order.customerPhone && (
          <p>
            <strong>Phone:</strong> {order.customerPhone}
          </p>
        )}
        {order.customerNotes && (
          <p>
            <strong>Notes:</strong> {order.customerNotes}
          </p>
        )}
        <hr className="my-3 border-border" />
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border">
              <th className="w-8 py-1" />
              <th className="py-1">Product</th>
              <th className="py-1">Qty</th>
              <th className="py-1">Unit</th>
              <th className="py-1">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0">
                <td className="py-1">
                  <span className="inline-block h-4 w-4 border border-foreground align-middle" />
                </td>
                <td className="py-1">{item.product?.name ?? item.customItemName}</td>
                <td className="py-1">
                  {formatNumber(item.quantity)}
                  {item.saleKind === "LENGTH_CUT"
                    ? ` × ${formatNumber(item.cutLength ?? 0)}${item.product?.unitLabel ?? ""}`
                    : ""}
                </td>
                <td className="py-1">{item.saleKind ? saleKindLabel(item.saleKind) : item.unit || "—"}</td>
                <td className="py-1">{item.remarks ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {order.printLogs.length > 0 && (
          <p className="no-print mt-3 text-xs text-muted">
            Last printed {formatDateTime(order.printLogs[0].printedAt)}
            {order.printLogs[0].printedBy ? ` by ${order.printLogs[0].printedBy}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}
