import { useState } from "react";
import { Trash2, Info } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/stock/stockDisplay";
import { checkLineAvailability } from "@/lib/stock/stockAvailability";
import {
  computeDraft,
  counterpartSaleKind,
  defaultRateFor,
  priceFieldForSaleKind,
  saleKindLabel,
  type LineDraft,
} from "./lineDraft";
import { SimpleSaleFields } from "./saleEntryFields/SimpleSaleFields";
import { LengthSaleFields } from "./saleEntryFields/LengthSaleFields";
import { BoxSaleFields } from "./saleEntryFields/BoxSaleFields";
import { DiscountField } from "./DiscountField";

export interface BillItemRowProps {
  line: LineDraft;
  billType: "NORMAL" | "PARTY";
  partyPercentage: number;
  onChange: (patch: Partial<LineDraft>) => void;
  onRemove: () => void;
  onAddVariant?: (saleKind: LineDraft["saleKind"]) => void;
}

export function BillItemRow({ line, billType, partyPercentage, onChange, onRemove, onAddVariant }: BillItemRowProps) {
  const [notesOpen, setNotesOpen] = useState(false);
  const computed = computeDraft(line, billType, partyPercentage);
  const counterpart = counterpartSaleKind(line.saleKind);

  const shortfall =
    line.product && line.saleKind !== "CUSTOM"
      ? checkLineAvailability(line.product, {
          saleKind: line.saleKind,
          quantity: Number(line.quantity) || 0,
          cutLength: Number(line.cutLength) || undefined,
        })
      : { ok: true as const };

  function handleSaleKindChange(kind: LineDraft["saleKind"]) {
    if (!line.product) return;
    onChange({ saleKind: kind, rate: String(defaultRateFor(line.product, kind)) });
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
        {line.saleKind === "CUSTOM" && billType === "PARTY" && (
          <label className="mt-1 flex items-center gap-1.5">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={line.applyMarkup}
              onChange={(e) => onChange({ applyMarkup: e.target.checked })}
            />
            <span className="text-xs text-foreground">Apply party markup</span>
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
          onChange={(e) => onChange({ rate: e.target.value })}
        />
        {priceSuggestions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {priceSuggestions.map((price) => (
              <button
                key={price}
                type="button"
                onClick={() => onChange({ rate: String(price) })}
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

      <td className="min-w-[110px] py-3 pr-3 text-sm text-foreground">
        {billType === "PARTY" ? "Base Rate" : "Final Rate"}
        <br />
        <span className="font-medium">{formatPrice(computed.baseRate)}</span>
      </td>

      {billType === "PARTY" && (
        <td className="min-w-[110px] py-3 pr-3 text-sm text-foreground">
          Party Rate
          <br />
          <span className="font-medium">{formatPrice(computed.partyRate)}</span>
        </td>
      )}

      <td className="min-w-[100px] py-3 pr-3 text-sm font-semibold text-foreground">
        {formatPrice(computed.amount)}
      </td>

      <td className="min-w-[160px] py-3 pr-4">
        <Input
          label="Note"
          placeholder="Optional"
          value={line.note}
          onChange={(e) => onChange({ note: e.target.value })}
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
