import { Input } from "@/components/ui/Input";
import type { SaleTypeFieldsProps } from "./SimpleUnitFields";

export function LengthBasedFields({ register, errors }: SaleTypeFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Input
        label="Full Length Value"
        type="number"
        step="0.01"
        inputMode="decimal"
        hint="e.g. 20"
        {...register("fullLengthValue")}
        error={errors.fullLengthValue?.message}
      />
      <Input
        label="Unit Label"
        placeholder="ft, m…"
        {...register("unitLabel")}
        error={errors.unitLabel?.message}
      />
      <Input
        label="Full Length Cost Price"
        type="number"
        step="0.01"
        inputMode="decimal"
        {...register("fullLengthCostPrice")}
        error={errors.fullLengthCostPrice?.message}
      />
      <Input
        label="Full Length Selling Price"
        type="number"
        step="0.01"
        inputMode="decimal"
        {...register("fullLengthPrice")}
        error={errors.fullLengthPrice?.message}
      />
      <Input
        label="Cut Unit Cost Price"
        type="number"
        step="0.01"
        inputMode="decimal"
        hint="Cost per unit of length when cut"
        {...register("cutUnitCostPrice")}
        error={errors.cutUnitCostPrice?.message}
      />
      <Input
        label="Cut Unit Selling Price"
        type="number"
        step="0.01"
        inputMode="decimal"
        hint="Price per unit of length when cut"
        {...register("cutUnitPrice")}
        error={errors.cutUnitPrice?.message}
      />
      <Input
        label="Full Length Count (stock)"
        type="number"
        inputMode="numeric"
        {...register("fullLengthCount")}
        error={errors.fullLengthCount?.message}
      />
    </div>
  );
}
