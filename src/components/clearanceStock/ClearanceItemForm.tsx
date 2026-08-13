"use client";

import { useState } from "react";
import type { ClearanceItemModel } from "@/types";
import { clearanceItemSchema } from "@/lib/validation/clearanceItem.schema";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ProductPhotoField } from "@/components/products/ProductPhotoField";

export interface ClearanceItemFormSubmitValues {
  itemName: string;
  description: string;
  originalPrice: string;
  discountedPrice: string;
  quantityAvailable: string;
  photoUrl: string;
  status: "AVAILABLE" | "SOLD";
}

export interface ClearanceItemFormProps {
  item?: ClearanceItemModel;
  onSubmit: (values: ClearanceItemFormSubmitValues) => Promise<void>;
  onCancel: () => void;
}

const statusOptions = [
  { value: "AVAILABLE" as const, label: "Available" },
  { value: "SOLD" as const, label: "Sold" },
];

export function ClearanceItemForm({ item, onSubmit, onCancel }: ClearanceItemFormProps) {
  const [itemName, setItemName] = useState(item?.itemName ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [originalPrice, setOriginalPrice] = useState(item?.originalPrice != null ? String(item.originalPrice) : "");
  const [discountedPrice, setDiscountedPrice] = useState(item ? String(item.discountedPrice) : "");
  const [quantityAvailable, setQuantityAvailable] = useState(
    item?.quantityAvailable != null ? String(item.quantityAvailable) : "",
  );
  const [photoUrl, setPhotoUrl] = useState(item?.photoUrl ?? "");
  const [status, setStatus] = useState<"AVAILABLE" | "SOLD">(item?.status ?? "AVAILABLE");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const priceWarning =
    originalPrice !== "" &&
    discountedPrice !== "" &&
    Number(discountedPrice) >= Number(originalPrice)
      ? "Discounted price isn't lower than the original price"
      : undefined;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);

    const candidate = {
      itemName,
      description,
      originalPrice: originalPrice || undefined,
      discountedPrice,
      quantityAvailable: quantityAvailable || undefined,
      photoUrl,
      status,
    };
    const parsed = clearanceItemSchema.safeParse(candidate);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        itemName,
        description,
        originalPrice,
        discountedPrice,
        quantityAvailable,
        photoUrl,
        status,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
      <Input label="Item Name" value={itemName} onChange={(e) => setItemName(e.target.value)} />
      <Textarea
        label="Description"
        hint="Reason for damage, e.g. dented, box torn, scratched"
        rows={2}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <ProductPhotoField value={photoUrl} onChange={(v) => setPhotoUrl(v ?? "")} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Original Price (₹)"
          type="number"
          step="0.01"
          inputMode="decimal"
          value={originalPrice}
          onChange={(e) => setOriginalPrice(e.target.value)}
        />
        <Input
          label="Discounted Price (₹)"
          type="number"
          step="0.01"
          inputMode="decimal"
          value={discountedPrice}
          onChange={(e) => setDiscountedPrice(e.target.value)}
        />
      </div>
      {priceWarning && <p className="-mt-2 text-xs text-warning">{priceWarning}</p>}

      <Input
        label="Quantity Available"
        type="number"
        inputMode="numeric"
        value={quantityAvailable}
        onChange={(e) => setQuantityAvailable(e.target.value)}
      />

      <SegmentedControl label="Status" options={statusOptions} value={status} onChange={setStatus} />

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="sticky bottom-0 -mx-1 flex gap-2 bg-surface px-1 pt-2">
        <Button type="button" variant="secondary" fullWidth onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? "Saving…" : item ? "Save Changes" : "Add Item"}
        </Button>
      </div>
    </form>
  );
}
