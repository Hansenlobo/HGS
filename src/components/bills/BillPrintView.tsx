"use client";

import { useState } from "react";
import type { BillWithRelations } from "@/types";
import { formatBillNumber, getPaidTotal, getPendingAmount } from "@/lib/billing/billDisplay";
import { formatPrice, formatNumber } from "@/lib/stock/stockDisplay";
import { formatDate, formatDateTime } from "@/lib/formatDate";
import { useCurrentUser } from "@/components/auth/CurrentUserProvider";
import { useAppSettings } from "@/components/settings/AppSettingsProvider";
import { postJson } from "@/lib/fetcher";
import { Button } from "@/components/ui/Button";
import { BillQrCode } from "./BillQrCode";

export function BillPrintView({ bill }: { bill: BillWithRelations }) {
  const staffName = useCurrentUser().name;
  const settings = useAppSettings();
  const [printing, setPrinting] = useState(false);
  const [showPurchaseDate, setShowPurchaseDate] = useState(false);

  const pending = getPendingAmount(bill.customerAmount, getPaidTotal(bill.payments));
  const hasPurchaseDates = bill.lineItems.some((l) => l.takenAt);
  const overallDiscountAmount = bill.shopAmount + bill.marginAmount - bill.customerAmount;

  async function handlePrint() {
    setPrinting(true);
    try {
      await postJson(`/api/bills/${bill.id}/print`, { printedBy: staffName });
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
        {hasPurchaseDates && (
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={showPurchaseDate}
              onChange={(e) => setShowPurchaseDate(e.target.checked)}
            />
            <span className="text-sm text-foreground">Print with date item was purchased</span>
          </label>
        )}
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
        <h2 className="text-base font-semibold text-foreground">
          {bill.type === "NORMAL" ? "Invoice" : "Party Invoice"}
        </h2>
        <p className="text-muted">{formatBillNumber(bill.billNumber, settings.invoicePrefix)}</p>
        <p className="text-muted">{formatDateTime(bill.createdAt)}</p>
        {bill.isCancelled && <p className="font-semibold text-danger">CANCELLED</p>}
        <hr className="my-3 border-border" />
        <p>
          <strong>Customer:</strong> {bill.customerName}
        </p>
        {bill.customerPhone && (
          <p>
            <strong>Phone:</strong> {bill.customerPhone}
          </p>
        )}
        <hr className="my-3 border-border" />
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border">
              <th className="py-1">Item</th>
              <th className="py-1">Qty</th>
              <th className="py-1">Rate</th>
              <th className="py-1">Amount</th>
            </tr>
          </thead>
          <tbody>
            {bill.lineItems.map((line) => (
              <tr key={line.id} className="border-b border-border last:border-0">
                <td className="py-1">
                  {line.itemName}
                  {line.note && <div className="text-xs italic text-muted">{line.note}</div>}
                  {showPurchaseDate && line.takenAt && (
                    <div className="text-xs text-muted">Purchased {formatDate(line.takenAt)}</div>
                  )}
                </td>
                <td className="py-1">
                  {formatNumber(line.quantity)}
                  {line.saleKind === "LENGTH_CUT" ? ` × ${formatNumber(line.cutLength ?? 0)}` : ""}
                </td>
                <td className="py-1">{formatPrice(bill.type === "PARTY" ? line.partyRate : line.baseRate)}</td>
                <td className="py-1">{formatPrice(line.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <hr className="my-3 border-border" />
        {bill.type === "PARTY" ? (
          <>
            {bill.overallDiscountType && <Row label="Overall Discount" value={overallDiscountAmount} />}
            <Row label="Total" value={bill.customerAmount} strong />
          </>
        ) : settings.showDiscountOnBill ? (
          <>
            <Row label="Subtotal" value={bill.subtotal} />
            <Row label="Discount" value={bill.discountTotal} />
            {bill.overallDiscountType && <Row label="Overall Discount" value={overallDiscountAmount} />}
            <Row label="Grand Total" value={bill.customerAmount} strong />
          </>
        ) : (
          <>
            {bill.overallDiscountType && <Row label="Overall Discount" value={overallDiscountAmount} />}
            <Row label="Grand Total" value={bill.customerAmount} strong />
          </>
        )}
        {settings.showQrOnBill && settings.upiId && !bill.isCancelled && pending > 0 && (
          <>
            <hr className="my-3 border-border" />
            <BillQrCode
              upiId={settings.upiId}
              storeName={settings.storeName || "Store"}
              amount={pending}
              billLabel={formatBillNumber(bill.billNumber, settings.invoicePrefix)}
            />
          </>
        )}
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
