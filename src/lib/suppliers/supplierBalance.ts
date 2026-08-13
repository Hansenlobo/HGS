import type { SupplierWithLedger } from "@/types";

export interface SupplierBalance {
  opening: number;
  billed: number;
  paid: number;
  remaining: number;
}

/** Balance is derived, never stored: opening balance plus every bill minus
 * every payment. Kept a pure function so the list page, detail page, and
 * every mutating route return a value that's always in sync with the
 * ledger rows, the same "derive don't duplicate" approach as
 * computeAccountBalance / getStockStatus elsewhere in this app. */
export function computeSupplierBalance(supplier: SupplierWithLedger): SupplierBalance {
  const opening = supplier.outstandingBalance;
  const billed = supplier.bills.reduce((sum, b) => sum + b.amount, 0);
  const paid = supplier.payments.reduce((sum, p) => sum + p.amount, 0);
  return { opening, billed, paid, remaining: opening + billed - paid };
}
