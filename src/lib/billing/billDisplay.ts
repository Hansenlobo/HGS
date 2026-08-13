export function formatOrderNumber(orderNumber: number): string {
  return `ORD-${String(orderNumber).padStart(4, "0")}`;
}

// Fixed prefix, unlike formatBillNumber's store-configurable invoicePrefix
// — a quotation isn't a real invoice.
export function formatQuotationNumber(quotationNumber: number): string {
  return `QT-${String(quotationNumber).padStart(4, "0")}`;
}

/** `prefix` comes from AppSettings.invoicePrefix (store-configurable on the
 * Settings page), not a hardcoded NB-/PB- per bill type — Normal and Party
 * bills share one global numbering sequence. */
export function formatBillNumber(billNumber: number, prefix: string): string {
  return `${prefix}${String(billNumber).padStart(4, "0")}`;
}

export function getPaidTotal(payments: { amount: number; isDeleted: boolean }[]): number {
  return payments.filter((p) => !p.isDeleted).reduce((sum, p) => sum + p.amount, 0);
}

export function getPendingAmount(customerAmount: number, paidTotal: number): number {
  return Math.max(0, customerAmount - paidTotal);
}

export type BillStatus = "cancelled" | "unpaid" | "partial" | "paid";

export function getBillStatus(bill: {
  isCancelled: boolean;
  customerAmount: number;
  payments: { amount: number; isDeleted: boolean }[];
}): BillStatus {
  if (bill.isCancelled) return "cancelled";
  const paid = getPaidTotal(bill.payments);
  if (paid <= 0) return "unpaid";
  if (paid < bill.customerAmount) return "partial";
  return "paid";
}

export function formatBillStatusLabel(status: BillStatus): string {
  switch (status) {
    case "cancelled":
      return "Cancelled";
    case "unpaid":
      return "Unpaid";
    case "partial":
      return "Partially Paid";
    case "paid":
      return "Paid";
  }
}
