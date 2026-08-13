export type DiscountType = "FLAT" | "PERCENT";

/** Rate after a per-line discount, floored at 0. Shared by the client's
 * live preview and the server save route so the math can't drift apart. */
export function resolveDiscount(
  rate: number,
  discountType: DiscountType | null | undefined,
  discountValue: number,
): number {
  if (!discountType || discountValue <= 0) return rate;
  if (discountType === "FLAT") {
    return Math.max(0, rate - discountValue);
  }
  const pct = Math.min(100, Math.max(0, discountValue));
  return Math.max(0, rate * (1 - pct / 100));
}

/** unitsSold is what pricing actually multiplies against: quantity for
 * every sale kind except LENGTH_CUT, where it's quantity * cutLength. */
export function computeUnitsSold(
  saleKind: string,
  quantity: number,
  cutLength?: number | null,
): number {
  if (saleKind === "LENGTH_CUT") return quantity * (cutLength ?? 0);
  return quantity;
}

export interface LinePricingInput {
  rate: number;
  discountType?: DiscountType | null;
  discountValue?: number;
  unitsSold: number;
  isPartyProduct: boolean;
  billType: "NORMAL" | "PARTY";
  partyPercentage?: number | null;
}

export interface LinePricingResult {
  baseRate: number;
  partyRate: number;
  shopAmount: number;
  amount: number;
}

/** Base Rate = Rate after discount. Party Rate = Base Rate marked up by
 * Party Percentage, but ONLY on PARTY bills for products flagged
 * isPartyProduct — otherwise Party Rate == Base Rate (no markup). */
export function computeLineAmounts(input: LinePricingInput): LinePricingResult {
  const baseRate = resolveDiscount(input.rate, input.discountType, input.discountValue ?? 0);
  const applyMarkup =
    input.billType === "PARTY" && input.isPartyProduct && (input.partyPercentage ?? 0) > 0;
  const partyRate = applyMarkup ? baseRate * (1 + (input.partyPercentage ?? 0) / 100) : baseRate;
  const shopAmount = baseRate * input.unitsSold;
  const amount = partyRate * input.unitsSold;
  return { baseRate, partyRate, shopAmount, amount };
}

export interface OverallDiscountResult {
  discountAmount: number;
  finalAmount: number;
}

/** Bill-level discount applied once on top of the line-item total —
 * separate from and in addition to per-line discounts. Reuses
 * resolveDiscount so the math (and the 0-floor) can't drift apart. */
export function applyOverallDiscount(
  amount: number,
  discountType: DiscountType | null | undefined,
  discountValue: number,
): OverallDiscountResult {
  const finalAmount = resolveDiscount(amount, discountType, discountValue);
  return { discountAmount: amount - finalAmount, finalAmount };
}

export interface BillTotals {
  subtotal: number;
  discountTotal: number;
  shopAmount: number;
  marginAmount: number;
  customerAmount: number;
}

/** Bill-level aggregates from line items — always stored on the Bill row
 * itself (not just derivable) so a future Sales Report can read
 * shopAmount directly without recomputing from line items. */
export function computeBillTotals(
  lines: { rate: number; unitsSold: number; shopAmount: number; amount: number }[],
): BillTotals {
  const subtotal = lines.reduce((sum, l) => sum + l.rate * l.unitsSold, 0);
  const shopAmount = lines.reduce((sum, l) => sum + l.shopAmount, 0);
  const customerAmount = lines.reduce((sum, l) => sum + l.amount, 0);
  return {
    subtotal,
    discountTotal: subtotal - shopAmount,
    shopAmount,
    marginAmount: customerAmount - shopAmount,
    customerAmount,
  };
}
