import { Input } from "@/components/ui/Input";

export interface SimpleSaleFieldsProps {
  quantity: string;
  onQuantityChange: (value: string) => void;
}

export function SimpleSaleFields({ quantity, onQuantityChange }: SimpleSaleFieldsProps) {
  return (
    <Input
      label="Quantity"
      type="number"
      inputMode="numeric"
      value={quantity}
      onChange={(e) => onQuantityChange(e.target.value)}
    />
  );
}
