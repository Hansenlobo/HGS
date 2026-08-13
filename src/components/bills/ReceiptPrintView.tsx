"use client";

import { useState } from "react";
import type { BillModel, PaymentModel } from "@/types";
import { formatBillNumber } from "@/lib/billing/billDisplay";
import { formatPrice } from "@/lib/stock/stockDisplay";
import { formatDateTime } from "@/lib/formatDate";
import { useCurrentUser } from "@/components/auth/CurrentUserProvider";
import { useAppSettings } from "@/components/settings/AppSettingsProvider";
import { postJson } from "@/lib/fetcher";
import { Button } from "@/components/ui/Button";

export function ReceiptPrintView({ bill, payment }: { bill: BillModel; payment: PaymentModel }) {
  const staffName = useCurrentUser().name;
  const { invoicePrefix } = useAppSettings();
  const [printing, setPrinting] = useState(false);

  async function handlePrint() {
    setPrinting(true);
    try {
      await postJson(`/api/bills/${bill.id}/payments/${payment.id}/print`, { printedBy: staffName });
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
      <div className="print-sheet mx-auto w-full max-w-sm rounded-lg border border-border bg-surface p-6 text-sm">
        <h1 className="text-lg font-semibold text-foreground">Payment Receipt</h1>
        <p className="text-muted">{formatBillNumber(bill.billNumber, invoicePrefix)}</p>
        <p className="text-muted">{formatDateTime(payment.createdAt)}</p>
        <hr className="my-3 border-border" />
        <p>
          <strong>Customer:</strong> {bill.customerName}
        </p>
        <p>
          <strong>Amount:</strong> {formatPrice(payment.amount)}
        </p>
        {payment.notes && (
          <p>
            <strong>Notes:</strong> {payment.notes}
          </p>
        )}
        <p>
          <strong>Received by:</strong> {payment.enteredBy || "—"}
        </p>
      </div>
    </div>
  );
}
