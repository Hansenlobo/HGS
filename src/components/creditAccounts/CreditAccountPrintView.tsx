"use client";

import { useState } from "react";
import type { CreditAccountWithRelations } from "@/types";
import { finalRateFor, type AccountBalance } from "@/lib/creditAccounts/accountBalance";
import { formatPrice, formatNumber } from "@/lib/stock/stockDisplay";
import { formatDate, formatDateTime } from "@/lib/formatDate";
import { useCurrentUser } from "@/components/auth/CurrentUserProvider";
import { useAppSettings } from "@/components/settings/AppSettingsProvider";
import { postJson } from "@/lib/fetcher";
import { Button } from "@/components/ui/Button";

const paymentMethodLabels: Record<string, string> = { CASH: "Cash", UPI: "UPI", CARD: "Card", OTHER: "Other" };

function lineQtyDisplay(saleKind: string, quantity: number, cutLength: number | null, unitLabel?: string | null) {
  if (saleKind === "LENGTH_CUT") return `${formatNumber(quantity)} × ${formatNumber(cutLength ?? 0)}${unitLabel ?? ""}`;
  return formatNumber(quantity);
}

export function CreditAccountPrintView({
  account,
  balance,
}: {
  account: CreditAccountWithRelations;
  balance: AccountBalance;
}) {
  const staffName = useCurrentUser().name;
  const settings = useAppSettings();
  const [printing, setPrinting] = useState(false);

  async function handlePrint() {
    setPrinting(true);
    try {
      await postJson(`/api/credit-accounts/${account.id}/print`, { printedBy: staffName });
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
        <h2 className="text-base font-semibold text-foreground">Account Statement</h2>
        <p className="text-muted">{account.name}</p>
        <p className="text-muted">
          Opened {formatDate(account.createdAt)} · Printed {formatDateTime(new Date())}
        </p>
        {account.status === "CLOSED" && <p className="font-semibold text-foreground">CLOSED</p>}
        <hr className="my-3 border-border" />
        {account.customerName && (
          <p>
            <strong>Customer:</strong> {account.customerName}
          </p>
        )}
        {account.customerPhone && (
          <p>
            <strong>Phone:</strong> {account.customerPhone}
          </p>
        )}
        <hr className="my-3 border-border" />

        <h3 className="mb-1 font-semibold text-foreground">Items Taken</h3>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border">
              <th className="py-1">Date</th>
              <th className="py-1">Item</th>
              <th className="py-1">Qty</th>
              <th className="py-1">Price</th>
            </tr>
          </thead>
          <tbody>
            {account.items.map((item) => {
              // Matches computeAccountBalance's basis exactly (live price
              // unless rate-locked, with its own discount and the
              // account's markup applied) so the printed line price never
              // disagrees with the Balance total below it.
              const rate = finalRateFor(item, account.percentageIncrease);
              return (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="py-1 align-top">{formatDate(item.dateTaken)}</td>
                  <td className="py-1 align-top">
                    {item.itemName}
                    {item.notes && <div className="text-xs italic text-muted">{item.notes}</div>}
                  </td>
                  <td className="py-1 align-top">
                    {lineQtyDisplay(item.saleKind, item.quantity, item.cutLength, item.product?.unitLabel)}
                  </td>
                  <td className="py-1 align-top">{formatPrice(rate)}</td>
                </tr>
              );
            })}
            {account.items.length === 0 && (
              <tr>
                <td colSpan={4} className="py-2 text-center text-muted">
                  No items taken yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <hr className="my-3 border-border" />
        <h3 className="mb-1 font-semibold text-foreground">Payments</h3>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border">
              <th className="py-1">Date</th>
              <th className="py-1">Amount</th>
              <th className="py-1">Method</th>
            </tr>
          </thead>
          <tbody>
            {account.payments.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="py-1 align-top">{formatDate(p.date)}</td>
                <td className="py-1 align-top">
                  {formatPrice(p.amount)}
                  {p.notes && <div className="text-xs italic text-muted">{p.notes}</div>}
                </td>
                <td className="py-1 align-top">{paymentMethodLabels[p.method]}</td>
              </tr>
            ))}
            {account.payments.length === 0 && (
              <tr>
                <td colSpan={3} className="py-2 text-center text-muted">
                  No payments recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <hr className="my-3 border-border" />
        <Row label="Amount (approx.)" value={balance.approximateAmount} />
        <Row label="Paid" value={balance.approximatePaid} />
        <Row label="Remaining" value={balance.remaining} strong />
        <p className="no-print mt-2 text-xs text-muted">
          Amounts are approximate — priced at today&apos;s rates until a final bill is generated.
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
