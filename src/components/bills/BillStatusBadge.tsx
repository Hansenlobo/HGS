import clsx from "clsx";
import { getBillStatus, formatBillStatusLabel, type BillStatus } from "@/lib/billing/billDisplay";

const toneClasses: Record<BillStatus, string> = {
  cancelled: "bg-danger-bg text-danger",
  unpaid: "bg-warning-bg text-warning",
  partial: "bg-warning-bg text-warning",
  paid: "bg-success-bg text-primary",
};

export function BillStatusBadge({
  bill,
}: {
  bill: { isCancelled: boolean; customerAmount: number; payments: { amount: number; isDeleted: boolean }[] };
}) {
  const status = getBillStatus(bill);
  return (
    <span className={clsx("inline-flex h-6 w-fit items-center rounded-full px-2.5 text-xs font-medium", toneClasses[status])}>
      {formatBillStatusLabel(status)}
    </span>
  );
}
