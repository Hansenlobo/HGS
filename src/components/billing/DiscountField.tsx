import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { DiscountType } from "@/lib/billing/pricing";

export interface DiscountFieldProps {
  discountType: DiscountType | "";
  onDiscountTypeChange: (type: DiscountType | "") => void;
  discountValue: string;
  onDiscountValueChange: (value: string) => void;
}

export function DiscountField({
  discountType,
  onDiscountTypeChange,
  discountValue,
  onDiscountValueChange,
}: DiscountFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <SegmentedControl
        options={[
          { value: "" as const, label: "None" },
          { value: "FLAT" as const, label: "₹ Flat" },
          { value: "PERCENT" as const, label: "%" },
        ]}
        value={discountType}
        onChange={onDiscountTypeChange}
      />
      {discountType !== "" && (
        <Input
          label={discountType === "FLAT" ? "Discount (₹)" : "Discount (%)"}
          type="number"
          step="0.01"
          inputMode="decimal"
          value={discountValue}
          onChange={(e) => onDiscountValueChange(e.target.value)}
        />
      )}
    </div>
  );
}
