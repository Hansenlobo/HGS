"use client";

import { useForm, Controller } from "react-hook-form";
import { useState } from "react";
import type { CategoryModel, ProductWithRelations } from "@/types";
import {
  productSchema,
  type ProductFormInput,
  type ProductFormValues,
} from "@/lib/validation/product.schema";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { CategoryMultiSelect } from "@/components/categories/CategoryMultiSelect";
import { SimpleUnitFields } from "./saleTypeFields/SimpleUnitFields";
import { LengthBasedFields } from "./saleTypeFields/LengthBasedFields";
import { BoxLooseFields } from "./saleTypeFields/BoxLooseFields";
import { ProductPhotoField } from "./ProductPhotoField";

export interface ProductFormProps {
  mode: "create" | "edit";
  product?: ProductWithRelations;
  initialName?: string;
  categories: CategoryModel[];
  onSubmit: (values: ProductFormValues) => Promise<void>;
  onCancel: () => void;
}

const saleTypeOptions = [
  { value: "SIMPLE" as const, label: "Simple Unit" },
  { value: "LENGTH" as const, label: "Length-Based" },
  { value: "BOX" as const, label: "Box / Loose" },
];

function defaultValuesFor(product?: ProductWithRelations, initialName?: string): ProductFormInput {
  if (!product) {
    return {
      name: initialName ?? "",
      notes: "",
      imageUrl: "",
      minStock: 0,
      shelfLocation: "",
      isActive: true,
      isPartyProduct: false,
      categoryIds: [],
      saleType: "SIMPLE",
      currentStock: 0,
    };
  }
  return {
    name: product.name,
    notes: product.notes ?? "",
    imageUrl: product.imageUrl ?? "",
    minStock: product.minStock,
    shelfLocation: product.shelfLocation ?? "",
    isActive: product.isActive,
    isPartyProduct: product.isPartyProduct,
    categoryIds: product.categories.map((pc) => pc.categoryId),
    saleType: product.saleType,
    costPrice: product.costPrice ?? undefined,
    sellingPrice: product.sellingPrice ?? undefined,
    currentStock: product.currentStock ?? undefined,
    fullLengthValue: product.fullLengthValue ?? undefined,
    unitLabel: product.unitLabel ?? "",
    fullLengthCostPrice: product.fullLengthCostPrice ?? undefined,
    fullLengthPrice: product.fullLengthPrice ?? undefined,
    cutUnitCostPrice: product.cutUnitCostPrice ?? undefined,
    cutUnitPrice: product.cutUnitPrice ?? undefined,
    fullLengthCount: product.fullLengthCount ?? undefined,
    boxSize: product.boxSize ?? undefined,
    boxCostPrice: product.boxCostPrice ?? undefined,
    boxPrice: product.boxPrice ?? undefined,
    looseUnitCostPrice: product.looseUnitCostPrice ?? undefined,
    looseUnitPrice: product.looseUnitPrice ?? undefined,
    boxCount: product.boxCount ?? undefined,
    looseCount: product.looseCount ?? undefined,
  };
}

function buildSubmitCandidate(data: ProductFormInput): unknown {
  const common = {
    name: data.name,
    notes: data.notes,
    imageUrl: data.imageUrl,
    minStock: data.minStock,
    shelfLocation: data.shelfLocation,
    isActive: data.isActive,
    isPartyProduct: data.isPartyProduct,
    categoryIds: data.categoryIds,
    saleType: data.saleType,
  };

  if (data.saleType === "SIMPLE") {
    return {
      ...common,
      costPrice: data.costPrice,
      sellingPrice: data.sellingPrice,
      currentStock: data.currentStock,
    };
  }
  if (data.saleType === "LENGTH") {
    return {
      ...common,
      fullLengthValue: data.fullLengthValue,
      unitLabel: data.unitLabel,
      fullLengthCostPrice: data.fullLengthCostPrice,
      fullLengthPrice: data.fullLengthPrice,
      cutUnitCostPrice: data.cutUnitCostPrice,
      cutUnitPrice: data.cutUnitPrice,
      fullLengthCount: data.fullLengthCount,
    };
  }
  return {
    ...common,
    boxSize: data.boxSize,
    boxCostPrice: data.boxCostPrice,
    boxPrice: data.boxPrice,
    looseUnitCostPrice: data.looseUnitCostPrice,
    looseUnitPrice: data.looseUnitPrice,
    boxCount: data.boxCount,
    looseCount: data.looseCount,
  };
}

export function ProductForm({ mode, product, initialName, categories, onSubmit, onCancel }: ProductFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<ProductFormInput>({
    defaultValues: defaultValuesFor(product, initialName),
  });

  const saleType = watch("saleType");

  async function handleFormSubmit(data: ProductFormInput) {
    setFormError(undefined);
    const candidate = buildSubmitCandidate(data);
    const parsed = productSchema.safeParse(candidate);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string") {
          setError(field as keyof ProductFormInput, { message: issue.message });
        }
      }
      setFormError("Please fix the highlighted fields.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(parsed.data);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      id="product-form"
      onSubmit={handleSubmit(handleFormSubmit)}
      className="flex flex-col gap-5"
    >
      <Input label="Name" {...register("name")} error={errors.name?.message} />

      <Controller
        control={control}
        name="imageUrl"
        render={({ field }) => (
          <ProductPhotoField value={field.value} onChange={field.onChange} />
        )}
      />

      <Textarea
        label="Notes"
        hint="Supplier/origin info, alternate names or acronyms it's known by — also searchable."
        rows={3}
        {...register("notes")}
        error={errors.notes?.message}
      />

      <Controller
        control={control}
        name="categoryIds"
        render={({ field }) => (
          <CategoryMultiSelect
            label="Categories"
            categories={categories}
            selected={field.value}
            onChange={field.onChange}
          />
        )}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Minimum Stock Threshold"
          type="number"
          inputMode="numeric"
          hint="Flags Low Stock when count drops below this"
          {...register("minStock")}
          error={errors.minStock?.message}
        />
        <Input
          label="Shelf / Location"
          {...register("shelfLocation")}
          error={errors.shelfLocation?.message}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2">
          <input type="checkbox" className="h-5 w-5" {...register("isActive")} />
          <span className="text-sm font-medium text-foreground">Active</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" className="h-5 w-5" {...register("isPartyProduct")} />
          <span className="text-sm font-medium text-foreground">Is Party Product</span>
        </label>
        <p className="pl-7 text-xs text-muted">
          Eligible for markup on Party Bills. Non-party products always bill at base rate.
        </p>
      </div>

      <Controller
        control={control}
        name="saleType"
        render={({ field }) => (
          <SegmentedControl
            label="Sale Type"
            options={saleTypeOptions}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />

      {saleType === "SIMPLE" && <SimpleUnitFields register={register} errors={errors} />}
      {saleType === "LENGTH" && <LengthBasedFields register={register} errors={errors} />}
      {saleType === "BOX" && <BoxLooseFields register={register} errors={errors} />}

      {formError && <p className="text-sm text-danger">{formError}</p>}

      <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-border bg-surface px-4 pt-3 pb-1 sm:static sm:mx-0 sm:border-0 sm:px-0 sm:pt-0">
        <Button type="button" variant="secondary" fullWidth onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? "Saving…" : mode === "create" ? "Add Product" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
