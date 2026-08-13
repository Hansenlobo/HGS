"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { ProductWithRelations } from "@/types";
import { adjustmentSchema, type AdjustmentFormValues } from "@/lib/validation/adjustment.schema";
import { SimpleAdjustFields } from "./adjustmentFields/SimpleAdjustFields";
import { LengthAdjustFields, type LengthAdjustMode } from "./adjustmentFields/LengthAdjustFields";
import { BoxAdjustFields, type BoxAdjustMode } from "./adjustmentFields/BoxAdjustFields";

export interface StockAdjustmentModalProps {
  product: ProductWithRelations | null;
  onClose: () => void;
  onSubmit: (values: AdjustmentFormValues) => Promise<void>;
}

export function StockAdjustmentModal({ product, onClose, onSubmit }: StockAdjustmentModalProps) {
  return (
    <Modal open={!!product} onClose={onClose} title={product ? `Adjust Stock — ${product.name}` : ""}>
      {product && (
        <StockAdjustmentForm
          key={product.id}
          product={product}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      )}
    </Modal>
  );
}

interface StockAdjustmentFormProps {
  product: ProductWithRelations;
  onClose: () => void;
  onSubmit: (values: AdjustmentFormValues) => Promise<void>;
}

function StockAdjustmentForm({ product, onClose, onSubmit }: StockAdjustmentFormProps) {
  const [lengthMode, setLengthMode] = useState<LengthAdjustMode>("LENGTH_FULL");
  const [boxMode, setBoxMode] = useState<BoxAdjustMode>("BOX_FULL");
  const [quantity, setQuantity] = useState("");
  const [length, setLength] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<{ quantity?: string; length?: string; form?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  function currentKind() {
    if (product.saleType === "SIMPLE") return "SIMPLE" as const;
    if (product.saleType === "LENGTH") return lengthMode;
    return boxMode;
  }

  function buildCandidate(): unknown {
    const kind = currentKind();
    const base = { kind, quantity, reason };
    if (kind === "LENGTH_CUT" || kind === "LENGTH_MANUAL_CUT") {
      return { ...base, length };
    }
    return base;
  }

  async function handleSubmit() {
    setErrors({});
    const parsed = adjustmentSchema.safeParse(buildCandidate());
    if (!parsed.success) {
      const next: { quantity?: string; length?: string; form?: string } = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "quantity") next.quantity = issue.message;
        else if (field === "length") next.length = issue.message;
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
        Manual inventory correction — for damage, loss, personal use, or count corrections. This
        does not create a bill or charge.
      </p>

      {product.saleType === "SIMPLE" && (
        <SimpleAdjustFields
          quantity={quantity}
          onQuantityChange={setQuantity}
          error={errors.quantity}
        />
      )}

      {product.saleType === "LENGTH" && (
        <LengthAdjustFields
          mode={lengthMode}
          onModeChange={(mode) => {
            setLengthMode(mode);
            setErrors({});
          }}
          length={length}
          onLengthChange={setLength}
          quantity={quantity}
          onQuantityChange={setQuantity}
          cutPieces={product.cutPieces}
          fullLengthValue={product.fullLengthValue}
          unitLabel={product.unitLabel}
          lengthError={errors.length}
          quantityError={errors.quantity}
        />
      )}

      {product.saleType === "BOX" && (
        <BoxAdjustFields
          mode={boxMode}
          onModeChange={(mode) => {
            setBoxMode(mode);
            setErrors({});
          }}
          quantity={quantity}
          onQuantityChange={setQuantity}
          error={errors.quantity}
          boxSize={product.boxSize}
        />
      )}

      <Input
        label="Reason (optional)"
        placeholder="Damaged, personal use, count correction…"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />

      {errors.form && <p className="text-sm text-danger">{errors.form}</p>}

      <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-border bg-surface px-4 pt-3 pb-1 sm:static sm:mx-0 sm:border-0 sm:px-0 sm:pt-0">
        <Button variant="secondary" fullWidth onClick={onClose}>
          Cancel
        </Button>
        <Button fullWidth onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving…" : "Confirm Subtraction"}
        </Button>
      </div>
    </div>
  );
}
