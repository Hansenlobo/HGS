import { Input } from "@/components/ui/Input";
import type { SaleTypeFieldsProps } from "./SimpleUnitFields";

export function BoxLooseFields({ register, errors }: SaleTypeFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Input
        label="Box Size (units per box)"
        type="number"
        inputMode="numeric"
        {...register("boxSize")}
        error={errors.boxSize?.message}
      />
      <div className="hidden sm:block" />
      <Input
        label="Box Cost Price"
        type="number"
        step="0.01"
        inputMode="decimal"
        {...register("boxCostPrice")}
        error={errors.boxCostPrice?.message}
      />
      <Input
        label="Box Selling Price"
        type="number"
        step="0.01"
        inputMode="decimal"
        {...register("boxPrice")}
        error={errors.boxPrice?.message}
      />
      <Input
        label="Loose Unit Cost Price"
        type="number"
        step="0.01"
        inputMode="decimal"
        {...register("looseUnitCostPrice")}
        error={errors.looseUnitCostPrice?.message}
      />
      <Input
        label="Loose Unit Selling Price"
        type="number"
        step="0.01"
        inputMode="decimal"
        {...register("looseUnitPrice")}
        error={errors.looseUnitPrice?.message}
      />
      <Input
        label="Sealed Box Count (stock)"
        type="number"
        inputMode="numeric"
        {...register("boxCount")}
        error={errors.boxCount?.message}
      />
      <Input
        label="Loose Unit Count (stock)"
        type="number"
        inputMode="numeric"
        {...register("looseCount")}
        error={errors.looseCount?.message}
      />
    </div>
  );
}
