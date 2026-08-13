import { Input } from "@/components/ui/Input";

export interface SimpleAdjustFieldsProps {
  quantity: string;
  onQuantityChange: (value: string) => void;
  error?: string;
}

export function SimpleAdjustFields({ quantity, onQuantityChange, error }: SimpleAdjustFieldsProps) {
  return (
    <Input
      label="Quantity to Subtract"
      type="number"
      inputMode="numeric"
      autoFocus
      value={quantity}
      onChange={(e) => onQuantityChange(e.target.value)}
      error={error}
    />
  );
}
