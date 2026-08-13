import Link from "next/link";
import type { BillListItem } from "@/types";
import { formatBillNumber, getPaidTotal, getPendingAmount } from "@/lib/billing/billDisplay";
import { formatDate } from "@/lib/formatDate";
import { formatPrice } from "@/lib/stock/stockDisplay";
import { useAppSettings } from "@/components/settings/AppSettingsProvider";
import { BillStatusBadge } from "./BillStatusBadge";
import { Button } from "@/components/ui/Button";

export function BillTableRow({ bill }: { bill: BillListItem }) {
  const { invoicePrefix } = useAppSettings();
  const paid = getPaidTotal(bill.payments);
  const pending = getPendingAmount(bill.customerAmount, paid);

  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-3 pl-4 pr-4 text-sm font-medium text-foreground">
        {formatBillNumber(bill.billNumber, invoicePrefix)}
      </td>
      <td className="py-3 pr-4 text-sm text-muted">{formatDate(bill.createdAt)}</td>
      <td className="py-3 pr-4 text-sm text-foreground">{bill.customerName}</td>
      <td className="py-3 pr-4 text-sm text-muted">{bill.type === "NORMAL" ? "Normal" : "Party"}</td>
      <td className="py-3 pr-4 text-sm text-foreground">{formatPrice(bill.shopAmount)}</td>
      <td className="py-3 pr-4 text-sm text-foreground">
        {bill.type === "PARTY" ? formatPrice(bill.marginAmount) : "—"}
      </td>
      <td className="py-3 pr-4 text-sm text-foreground">{formatPrice(bill.customerAmount)}</td>
      <td className="py-3 pr-4 text-sm text-foreground">{formatPrice(paid)}</td>
      <td className="py-3 pr-4 text-sm text-foreground">{formatPrice(pending)}</td>
      <td className="py-3 pr-4">
        <BillStatusBadge bill={bill} />
      </td>
      <td className="py-3 pr-4">
        <Link href={`/bills/${bill.id}`}>
          <Button variant="secondary" size="sm">
            View
          </Button>
        </Link>
      </td>
    </tr>
  );
}
