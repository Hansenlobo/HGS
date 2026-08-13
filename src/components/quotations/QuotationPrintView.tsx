"use client";

import { useState } from "react";
import type { QuotationWithRelations } from "@/types";
import { formatQuotationNumber } from "@/lib/billing/billDisplay";
import { formatPrice, formatNumber } from "@/lib/stock/stockDisplay";
import { formatDateTime } from "@/lib/formatDate";
import { useCurrentUser } from "@/components/auth/CurrentUserProvider";
import { useAppSettings } from "@/components/settings/AppSettingsProvider";
import { postJson } from "@/lib/fetcher";
import { Button } from "@/components/ui/Button";

export function QuotationPrintView({ quotation }: { quotation: QuotationWithRelations }) {
  const staffName = useCurrentUser().name;
  const settings = useAppSettings();
  const [printing, setPrinting] = useState(false);
  const overallDiscountAmount = quotation.shopAmount + quotation.marginAmount - quotation.customerAmount;

  async function handlePrint() {
    setPrinting(true);
    try {
      await postJson(`/api/quotations/${quotation.id}/print`, { printedBy: staffName });
    } catch {
      // still let them print even if the log write failed
    } finally {
      setPrinting(false);
      window.print();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print flex flex-col items-end gap-1">
        <Button onClick={handlePrint} disabled={printing}>
          {printing ? "…" : "Print / Save as PDF"}
        </Button>
        <p className="text-xs text-muted">In the print dialog, choose &quot;Save as PDF&quot; as the destination.</p>
      </div>
      <div className="print-sheet mx-auto w-full max-w-md rounded-lg border border-border bg-surface p-6 text-sm">
        {settings.storeName && <h1 className="text-lg font-semibold text-foreground">{settings.storeName}</h1>}
        {settings.storeAddress && <p className="text-muted">{settings.storeAddress}</p>}
        {settings.storePhone && <p className="text-muted">Ph: {settings.storePhone}</p>}
        {settings.gstNumber && <p className="text-muted">GSTIN: {settings.gstNumber}</p>}
        <hr className="my-3 border-border" />
        <h2 className="text-base font-semibold text-foreground">Quotation</h2>
        <p className="text-muted">{formatQuotationNumber(quotation.quotationNumber)}</p>
        <p className="text-muted">{formatDateTime(quotation.createdAt)}</p>
        <hr className="my-3 border-border" />
        <p>
          <strong>Customer:</strong> {quotation.customerName}
        </p>
        {quotation.customerPhone && (
          <p>
            <strong>Phone:</strong> {quotation.customerPhone}
          </p>
        )}
        <hr className="my-3 border-border" />
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border">
              <th className="w-8 py-1" />
              <th className="py-1">Item</th>
              <th className="py-1">Qty</th>
              <th className="py-1">Rate</th>
              <th className="py-1">Amount</th>
            </tr>
          </thead>
          <tbody>
            {quotation.lineItems.map((line) => (
              <tr key={line.id} className="border-b border-border last:border-0">
                <td className="py-1">
                  <span className="inline-block h-4 w-4 border border-foreground align-middle" />
                </td>
                <td className="py-1">
                  {line.itemName}
                  {line.note && <div className="text-xs italic text-muted">{line.note}</div>}
                </td>
                <td className="py-1">
                  {formatNumber(line.quantity)}
                  {line.saleKind === "LENGTH_CUT" ? ` × ${formatNumber(line.cutLength ?? 0)}` : ""}
                </td>
                <td className="py-1">{formatPrice(line.partyRate)}</td>
                <td className="py-1">{formatPrice(line.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <hr className="my-3 border-border" />
        <Row label="Shop Amount" value={quotation.shopAmount} />
        <Row label="Margin Amount" value={quotation.marginAmount} />
        {quotation.overallDiscountType && <Row label="Overall Discount" value={overallDiscountAmount} />}
        <Row label="Total" value={quotation.customerAmount} strong />
        <p className="no-print mt-2 text-xs text-muted">
          This is a quotation, not an invoice — prices are valid until converted to a bill.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={strong ? "font-semibold" : ""}>{label}</span>
      <span className={strong ? "font-semibold" : ""}>{formatPrice(value)}</span>
    </div>
  );
}
