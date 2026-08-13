import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { formatNumber } from "@/lib/stock/stockDisplay";

export type LengthAdjustMode = "LENGTH_FULL" | "LENGTH_CUT" | "LENGTH_MANUAL_CUT";

export interface LengthAdjustFieldsProps {
  mode: LengthAdjustMode;
  onModeChange: (mode: LengthAdjustMode) => void;
  length: string;
  onLengthChange: (value: string) => void;
  quantity: string;
  onQuantityChange: (value: string) => void;
  cutPieces: { length: number; quantity: number }[];
  fullLengthValue: number | null;
  unitLabel: string | null;
  lengthError?: string;
  quantityError?: string;
}

export function LengthAdjustFields({
  mode,
  onModeChange,
  length,
  onLengthChange,
  quantity,
  onQuantityChange,
  cutPieces,
  fullLengthValue,
  unitLabel,
  lengthError,
  quantityError,
}: LengthAdjustFieldsProps) {
  const unit = unitLabel ?? "";
  const availablePieces = cutPieces.filter((piece) => piece.quantity > 0);

  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        options={[
          { value: "LENGTH_FULL", label: "Full Length" },
          { value: "LENGTH_CUT", label: "Existing Cut Piece" },
          { value: "LENGTH_MANUAL_CUT", label: "Cut From Full Length" },
        ]}
        value={mode}
        onChange={onModeChange}
      />

      {mode === "LENGTH_FULL" && (
        <Input
          label="Full Lengths to Subtract"
          type="number"
          inputMode="numeric"
          autoFocus
          value={quantity}
          onChange={(e) => onQuantityChange(e.target.value)}
          error={quantityError}
        />
      )}

      {mode === "LENGTH_CUT" && (
        <>
          {availablePieces.length === 0 ? (
            <p className="text-sm text-muted">No cut-piece stock exists yet for this product.</p>
          ) : (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-foreground">Cut-Piece Length</span>
              <select
                className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                value={length}
                onChange={(e) => onLengthChange(e.target.value)}
              >
                <option value="" disabled>
                  Select a length…
                </option>
                {availablePieces.map((piece) => (
                  <option key={piece.length} value={piece.length}>
                    {formatNumber(piece.length)}
                    {unit} ({piece.quantity} in stock)
                  </option>
                ))}
              </select>
              {lengthError && <span className="text-xs text-danger">{lengthError}</span>}
            </label>
          )}
          <Input
            label="Quantity to Subtract"
            type="number"
            inputMode="numeric"
            value={quantity}
            onChange={(e) => onQuantityChange(e.target.value)}
            error={quantityError}
          />
        </>
      )}

      {mode === "LENGTH_MANUAL_CUT" && (
        <>
          <Input
            label={`Length to Cut${unit ? ` (${unit})` : ""}`}
            type="number"
            step="0.01"
            inputMode="decimal"
            autoFocus
            value={length}
            onChange={(e) => onLengthChange(e.target.value)}
            error={lengthError}
            hint={
              fullLengthValue
                ? `Full length is ${formatNumber(fullLengthValue)}${unit}; the remainder is kept as a new cut piece.`
                : undefined
            }
          />
          <Input
            label="Full Lengths to Open"
            type="number"
            inputMode="numeric"
            value={quantity}
            onChange={(e) => onQuantityChange(e.target.value)}
            error={quantityError}
          />
        </>
      )}
    </div>
  );
}
