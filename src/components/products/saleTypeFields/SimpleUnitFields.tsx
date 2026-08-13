import { UseFormRegister, FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/Input";
import type { ProductFormInput } from "@/lib/validation/product.schema";

export interface SaleTypeFieldsProps {
  register: UseFormRegister<ProductFormInput>;
  errors: FieldErrors<ProductFormInput>;
}

export function SimpleUnitFields({ register, errors }: SaleTypeFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Input
        label="Cost Price"
        type="number"
        step="0.01"
        inputMode="decimal"
        {...register("costPrice")}
        error={errors.costPrice?.message}
      />
      <Input
        label="Selling Price"
        type="number"
        step="0.01"
        inputMode="decimal"
        {...register("sellingPrice")}
        error={errors.sellingPrice?.message}
      />
      <Input
        label="Current Stock"
        type="number"
        inputMode="numeric"
        {...register("currentStock")}
        error={errors.currentStock?.message}
      />
    </div>
  );
}
