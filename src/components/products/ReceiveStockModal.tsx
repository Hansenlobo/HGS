"use client";

import { useState } from "react";
import useSWR from "swr";
import type { ProductWithRelations, SupplierModel } from "@/types";
import { fetcher } from "@/lib/fetcher";
import { receiveStockSchema, type ReceiveStockFormValues } from "@/lib/validation/receiveStock.schema";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export interface ReceiveStockModalProps {
  product: ProductWithRelations | null;
  onClose: () => void;
  onSubmit: (values: ReceiveStockFormValues) => Promise<void>;
}

export function ReceiveStockModal({ product, onClose, onSubmit }: ReceiveStockModalProps) {
  return (
    <Modal open={!!product} onClose={onClose} title={product ? `Receive Stock — ${product.name}` : ""}>
      {product && <ReceiveStockForm key={product.id} product={product} onClose={onClose} onSubmit={onSubmit} />}
    </Modal>
  );
}

const kindByLabel = {
  SIMPLE: {
    kind: "SIMPLE" as const,
    quantity: "Quantity to Receive",
    cost: "Cost per Unit (₹)",
    selling: "New Selling Price per Unit (₹)",
  },
  LENGTH: {
    kind: "LENGTH_FULL" as const,
    quantity: "Full Lengths to Receive",
    cost: "Cost per Full Length (₹)",
    selling: "New Selling Price per Full Length (₹)",
  },
  BOX: {
    kind: "BOX_FULL" as const,
    quantity: "Full Boxes to Receive",
    cost: "Cost per Box (₹)",
    selling: "New Selling Price per Box (₹)",
  },
};

function ReceiveStockForm({
  product,
  onClose,
  onSubmit,
}: {
  product: ProductWithRelations;
  onClose: () => void;
  onSubmit: (values: ReceiveStockFormValues) => Promise<void>;
}) {
  const { data: suppliers } = useSWR<SupplierModel[]>("/api/suppliers", fetcher);
  const labels = kindByLabel[product.saleType];

  const [quantity, setQuantity] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [newSellingPrice, setNewSellingPrice] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<{
    quantity?: string;
    costPrice?: string;
    newSellingPrice?: string;
    form?: string;
  }>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setErrors({});
    const parsed = receiveStockSchema.safeParse({
      kind: labels.kind,
      quantity,
      costPrice,
      newSellingPrice,
      supplierId,
      reason,
    });
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "quantity") next.quantity = issue.message;
        else if (field === "costPrice") next.costPrice = issue.message;
        else if (field === "newSellingPrice") next.newSellingPrice = issue.message;
        else next.form = issue.message;
      }
      setErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(parsed.data);
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted">
        Record newly received stock. This adds to what&apos;s on the shelf — optionally note the cost
        price and supplier so it doubles as a purchase record.
      </p>

      <Input
        label={labels.quantity}
        type="number"
        inputMode="numeric"
        autoFocus
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        error={errors.quantity}
      />

      <Input
        label={labels.cost}
        placeholder="Optional"
        type="number"
        step="0.01"
        inputMode="decimal"
        value={costPrice}
        onChange={(e) => setCostPrice(e.target.value)}
        error={errors.costPrice}
        hint="Updates the product's cost price for future margin calculations."
      />

      <Input
        label={labels.selling}
        placeholder="Optional"
        type="number"
        step="0.01"
        inputMode="decimal"
        value={newSellingPrice}
        onChange={(e) => setNewSellingPrice(e.target.value)}
        error={errors.newSellingPrice}
        hint="Updates the price charged going forward — the old price is kept as a quick-pick option while billing."
      />

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-foreground">Supplier (optional)</span>
        <select
          className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
        >
          <option value="">— None —</option>
          {(suppliers ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

      <Input
        label="Reason / Reference (optional)"
        placeholder="Invoice #, notes…"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />

      {errors.form && <p className="text-sm text-danger">{errors.form}</p>}

      <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-border bg-surface px-4 pt-3 pb-1 sm:static sm:mx-0 sm:border-0 sm:px-0 sm:pt-0">
        <Button variant="secondary" fullWidth onClick={onClose}>
          Cancel
        </Button>
        <Button fullWidth onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving…" : "Confirm Receipt"}
        </Button>
      </div>
    </div>
  );
}
