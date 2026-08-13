import { formatPrice } from "@/lib/stock/stockDisplay";
import { applyOverallDiscount, type BillTotals, type DiscountType } from "@/lib/billing/pricing";

export interface BillSummaryProps {
  billType: "NORMAL" | "PARTY";
  totals: BillTotals;
  overallDiscountType?: DiscountType | "";
  overallDiscountValue?: number;
}

export function BillSummary({ billType, totals, overallDiscountType, overallDiscountValue }: BillSummaryProps) {
  const { discountAmount, finalAmount } = applyOverallDiscount(
    totals.customerAmount,
    overallDiscountType || undefined,
    overallDiscountValue ?? 0,
  );
  const hasOverallDiscount = !!overallDiscountType;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
      {billType === "NORMAL" ? (
        <>
          <Row label="Subtotal" value={totals.subtotal} />
          <Row label="Discount Total" value={totals.discountTotal} />
          {hasOverallDiscount && <Row label="Overall Discount" value={discountAmount} />}
          <Row label="Grand Total" value={finalAmount} strong />
        </>
      ) : (
        <>
          <Row label="Shop Amount" value={totals.shopAmount} />
          <Row label="Margin Amount" value={totals.marginAmount} />
          {hasOverallDiscount && <Row label="Overall Discount" value={discountAmount} />}
          <Row label="Customer Amount" value={finalAmount} strong />
        </>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? "font-semibold text-foreground" : "text-sm text-muted"}>{label}</span>
      <span className={strong ? "text-lg font-semibold text-foreground" : "text-sm text-foreground"}>
        {formatPrice(value)}
      </span>
    </div>
  );
}
