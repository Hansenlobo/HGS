import type { BillListItem } from "@/types";
import { BillTableRow } from "./BillTableRow";

export function BillList({ bills }: { bills: BillListItem[] }) {
  if (bills.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No bills match your filters.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[960px] text-left">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3 font-medium">Bill #</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Shop Amount</th>
            <th className="px-4 py-3 font-medium">Margin</th>
            <th className="px-4 py-3 font-medium">Customer Amount</th>
            <th className="px-4 py-3 font-medium">Paid</th>
            <th className="px-4 py-3 font-medium">Pending</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {bills.map((bill) => (
            <BillTableRow key={bill.id} bill={bill} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
