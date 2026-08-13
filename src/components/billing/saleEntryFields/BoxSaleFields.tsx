import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

export interface BoxSaleFieldsProps {
  saleKind: "BOX_FULL" | "BOX_LOOSE";
  onSaleKindChange: (kind: "BOX_FULL" | "BOX_LOOSE") => void;
  quantity: string;
  onQuantityChange: (value: string) => void;
}

export function BoxSaleFields({ saleKind, onSaleKindChange, quantity, onQuantityChange }: BoxSaleFieldsProps) {
  return (
    <div className="flex flex-col gap-2">
      <SegmentedControl
        options={[
          { value: "BOX_FULL" as const, label: "Full Boxes" },
          { value: "BOX_LOOSE" as const, label: "Loose Units" },
        ]}
        value={saleKind}
        onChange={onSaleKindChange}
      />
      <Input
        label={saleKind === "BOX_FULL" ? "Boxes" : "Loose Units"}
        type="number"
        inputMode="numeric"
        value={quantity}
        onChange={(e) => onQuantityChange(e.target.value)}
      />
    </div>
  );
}
