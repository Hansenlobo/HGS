import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { formatPrice } from "@/lib/stock/stockDisplay";
import { SimpleSaleFields } from "@/components/billing/saleEntryFields/SimpleSaleFields";
import { LengthSaleFields } from "@/components/billing/saleEntryFields/LengthSaleFields";
import { BoxSaleFields } from "@/components/billing/saleEntryFields/BoxSaleFields";
import {
  computeReturnLineAmount,
  counterpartSaleKind,
  defaultRateFor,
  saleKindLabel,
  type ReturnLineDraft,
} from "./returnLineDraft";

export interface ReturnItemRowProps {
  line: ReturnLineDraft;
  onChange: (patch: Partial<ReturnLineDraft>) => void;
  onRemove: () => void;
  onAddVariant?: (saleKind: ReturnLineDraft["saleKind"]) => void;
}

export function ReturnItemRow({ line, onChange, onRemove, onAddVariant }: ReturnItemRowProps) {
  const amount = computeReturnLineAmount(line);
  const counterpart = counterpartSaleKind(line.saleKind);

  function handleSaleKindChange(kind: ReturnLineDraft["saleKind"]) {
    if (!line.product) return;
    onChange({ saleKind: kind, rate: String(defaultRateFor(line.product, kind)) });
  }

  return (
    <tr className="border-b border-border align-top last:border-0">
      <td className="min-w-[140px] py-3 pl-4 pr-3">
        <div className="flex items-start justify-between gap-2">
          <span className="font-medium text-foreground">{line.itemName}</span>
          <button
            type="button"
            aria-label={`Remove ${line.itemName}`}
            onClick={onRemove}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-danger hover:bg-danger-bg"
          >
            <Trash2 size={14} />
          </button>
        </div>
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

      <td className="min-w-[110px] py-3 pr-3">
        <Input
          label="Rate (₹)"
          type="number"
          step="0.01"
          inputMode="decimal"
          value={line.rate}
          onChange={(e) => onChange({ rate: e.target.value })}
        />
      </td>

      <td className="min-w-[100px] py-3 pr-4 text-sm font-semibold text-foreground">{formatPrice(amount)}</td>
    </tr>
  );
}
