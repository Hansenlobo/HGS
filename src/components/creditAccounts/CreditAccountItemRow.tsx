import { useState } from "react";
import { Trash2, Info } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/stock/stockDisplay";
import { checkLineAvailability } from "@/lib/stock/stockAvailability";
import { priceFieldForSaleKind } from "@/components/billing/lineDraft";
import { DiscountField } from "@/components/billing/DiscountField";
import { SimpleSaleFields } from "@/components/billing/saleEntryFields/SimpleSaleFields";
import { LengthSaleFields } from "@/components/billing/saleEntryFields/LengthSaleFields";
import { BoxSaleFields } from "@/components/billing/saleEntryFields/BoxSaleFields";
import {
  computeDraftAmount,
  counterpartSaleKind,
  defaultRateFor,
  saleKindLabel,
  type CreditAccountItemDraft,
} from "./creditAccountItemDraft";

export interface CreditAccountItemRowProps {
  line: CreditAccountItemDraft;
  percentageIncrease: number;
  onChange: (patch: Partial<CreditAccountItemDraft>) => void;
  onRemove: () => void;
  onAddVariant?: (saleKind: CreditAccountItemDraft["saleKind"]) => void;
}

export function CreditAccountItemRow({
  line,
  percentageIncrease,
  onChange,
  onRemove,
  onAddVariant,
}: CreditAccountItemRowProps) {
  const [notesOpen, setNotesOpen] = useState(false);
  const amount = computeDraftAmount(line, percentageIncrease);
  const counterpart = counterpartSaleKind(line.saleKind);

  const shortfall =
    line.product && line.saleKind !== "CUSTOM"
      ? checkLineAvailability(line.product, {
          saleKind: line.saleKind,
          quantity: Number(line.quantity) || 0,
          cutLength: Number(line.cutLength) || undefined,
        })
      : { ok: true as const };

  function handleSaleKindChange(kind: CreditAccountItemDraft["saleKind"]) {
    if (!line.product) return;
    onChange({ saleKind: kind, rate: String(defaultRateFor(line.product, kind)), rateLocked: false });
  }

  const priceField = line.product ? priceFieldForSaleKind(line.saleKind) : null;
  const currentPrice = line.product && priceField ? line.product[priceField] : null;
  const priceSuggestions =
    line.product && priceField
      ? [
          ...(currentPrice != null ? [currentPrice] : []),
          ...Array.from(
            new Set(
              (line.product.priceHistory ?? [])
                .filter((h) => h.field === priceField && h.price !== currentPrice)
                .map((h) => h.price),
            ),
          ),
        ].slice(0, 3)
      : [];

  return (
    <>
    <tr className="border-b border-border align-top last:border-0">
      <td className="min-w-[140px] py-3 pl-4 pr-3">
        <div className="flex items-start justify-between gap-2">
          <span className="flex items-center gap-1 font-medium text-foreground">
            {line.itemName}
            {line.product?.notes && (
              <button
                type="button"
                aria-label={`View notes for ${line.itemName}`}
                onClick={() => setNotesOpen(true)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted hover:bg-black/5 dark:hover:bg-white/5"
              >
                <Info size={13} />
              </button>
            )}
          </span>
          <button
            type="button"
            aria-label={`Remove ${line.itemName}`}
            onClick={onRemove}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-danger hover:bg-danger-bg"
          >
            <Trash2 size={14} />
          </button>
        </div>
        {!shortfall.ok && (
          <p className="mt-1 rounded-md bg-danger-bg px-2 py-1 text-xs text-danger">{shortfall.shortfall}</p>
        )}
      </td>

      <td className="min-w-[180px] py-3 pr-3">
        {line.saleKind === "SIMPLE" && (
          <SimpleSaleFields quantity={line.quantity} onQuantityChange={(v) => onChange({ quantity: v })} />
        )}
        {(line.saleKind === "LENGTH_FULL" || line.saleKind === "LENGTH_CUT") && (
          <LengthSaleFields
            saleKind={line.saleKind}
            onSaleKindChange={handleSaleKindChange}
            quantity={line.quantity}
            onQuantityChange={(v) => onChange({ quantity: v })}
            cutLength={line.cutLength}
            onCutLengthChange={(v) => onChange({ cutLength: v })}
            unitLabel={line.product?.unitLabel}
          />
        )}
        {(line.saleKind === "BOX_FULL" || line.saleKind === "BOX_LOOSE") && (
          <BoxSaleFields
            saleKind={line.saleKind}
            onSaleKindChange={handleSaleKindChange}
            quantity={line.quantity}
            onQuantityChange={(v) => onChange({ quantity: v })}
          />
        )}
        {line.saleKind === "CUSTOM" && (
          <SimpleSaleFields quantity={line.quantity} onQuantityChange={(v) => onChange({ quantity: v })} />
        )}
        {line.saleKind === "CUSTOM" && (
          <label className="mt-1 flex items-center gap-1.5">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={line.applyMarkup}
              onChange={(e) => onChange({ applyMarkup: e.target.checked })}
            />
            <span className="text-xs text-foreground">Apply {percentageIncrease}% account markup</span>
          </label>
        )}
        {counterpart && onAddVariant && (
          <button
            type="button"
            onClick={() => onAddVariant(counterpart)}
            className="mt-1 text-xs font-medium text-primary hover:underline"
          >
            + Add {saleKindLabel(counterpart)}
          </button>
        )}
      </td>

      <td className="min-w-[150px] py-3 pr-3">
        <Input
          label="Rate (₹)"
          type="number"
          step="0.01"
          inputMode="decimal"
          value={line.rate}
          onChange={(e) => onChange({ rate: e.target.value, rateLocked: true })}
        />
        {line.saleKind !== "CUSTOM" && (
          <p className="mt-1 text-xs text-muted">
            {line.rateLocked
              ? "Locked — won't re-price if the product's price changes."
              : "Live — follows the product's current price until you pick a rate."}
            {line.product?.isPartyProduct ? ` +${percentageIncrease}% markup` : " No markup"}
          </p>
        )}
        {priceSuggestions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {priceSuggestions.map((price) => (
              <button
                key={price}
                type="button"
                onClick={() => onChange({ rate: String(price), rateLocked: true })}
                className="h-6 rounded-full border border-border px-2 text-[11px] text-muted hover:bg-black/5 dark:hover:bg-white/5"
              >
                {price === currentPrice ? `Current ${formatPrice(price)}` : formatPrice(price)}
              </button>
            ))}
          </div>
        )}
      </td>

      <td className="min-w-[150px] py-3 pr-3">
        <DiscountField
          discountType={line.discountType}
          onDiscountTypeChange={(t) => onChange({ discountType: t })}
          discountValue={line.discountValue}
          onDiscountValueChange={(v) => onChange({ discountValue: v })}
        />
      </td>

      <td className="min-w-[100px] py-3 pr-3 text-sm font-semibold text-foreground">{formatPrice(amount)}</td>

      <td className="min-w-[160px] py-3 pr-4">
        <Input
          label="Note"
          placeholder="Optional"
          value={line.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
        />
      </td>
    </tr>
    {line.product?.notes && (
      <Modal
        open={notesOpen}
        onClose={() => setNotesOpen(false)}
        title={`Notes — ${line.itemName}`}
        footer={
          <Button variant="secondary" fullWidth onClick={() => setNotesOpen(false)}>
            Close
          </Button>
        }
      >
        <p className="whitespace-pre-wrap text-sm text-foreground">{line.product.notes}</p>
      </Modal>
    )}
    </>
  );
}
