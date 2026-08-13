import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

export interface LengthSaleFieldsProps {
  saleKind: "LENGTH_FULL" | "LENGTH_CUT";
  onSaleKindChange: (kind: "LENGTH_FULL" | "LENGTH_CUT") => void;
  quantity: string;
  onQuantityChange: (value: string) => void;
  cutLength: string;
  onCutLengthChange: (value: string) => void;
  unitLabel?: string | null;
}

export function LengthSaleFields({
  saleKind,
  onSaleKindChange,
  quantity,
  onQuantityChange,
  cutLength,
  onCutLengthChange,
  unitLabel,
}: LengthSaleFieldsProps) {
  return (
    <div className="flex flex-col gap-2">
      <SegmentedControl
        options={[
          { value: "LENGTH_FULL" as const, label: "Full Length" },
          { value: "LENGTH_CUT" as const, label: "Cut Length" },
        ]}
        value={saleKind}
        onChange={onSaleKindChange}
      />
      <div className="grid grid-cols-2 gap-2">
        {saleKind === "LENGTH_CUT" && (
          <Input
            label={`Length${unitLabel ? ` (${unitLabel})` : ""}`}
            type="number"
            step="0.01"
            inputMode="decimal"
            value={cutLength}
            onChange={(e) => onCutLengthChange(e.target.value)}
          />
        )}
        <Input
          label={saleKind === "LENGTH_FULL" ? "Full Lengths" : "Pieces"}
          type="number"
          inputMode="numeric"
          value={quantity}
          onChange={(e) => onQuantityChange(e.target.value)}
        />
      </div>
    </div>
  );
}
