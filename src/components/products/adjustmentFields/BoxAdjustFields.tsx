import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

export type BoxAdjustMode = "BOX_FULL" | "BOX_LOOSE";

export interface BoxAdjustFieldsProps {
  mode: BoxAdjustMode;
  onModeChange: (mode: BoxAdjustMode) => void;
  quantity: string;
  onQuantityChange: (value: string) => void;
  error?: string;
  boxSize: number | null;
}

export function BoxAdjustFields({
  mode,
  onModeChange,
  quantity,
  onQuantityChange,
  error,
  boxSize,
}: BoxAdjustFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl
        options={[
          { value: "BOX_FULL", label: "Full Boxes" },
          { value: "BOX_LOOSE", label: "Loose Units" },
        ]}
        value={mode}
        onChange={onModeChange}
      />
      <Input
        label={mode === "BOX_FULL" ? "Boxes to Subtract" : "Loose Units to Subtract"}
        type="number"
        inputMode="numeric"
        autoFocus
        value={quantity}
        onChange={(e) => onQuantityChange(e.target.value)}
        error={error}
        hint={
          mode === "BOX_LOOSE" && boxSize
            ? `If loose stock runs short, a box (${boxSize} units) will be opened automatically.`
            : undefined
        }
      />
    </div>
  );
}
