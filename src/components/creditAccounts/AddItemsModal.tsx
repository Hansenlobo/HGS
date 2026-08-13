"use client";

import { useState } from "react";
import type { CategoryModel } from "@/types";
import type { CreditAccountListItem } from "./CreditAccountsPageClient";
import { postJson } from "@/lib/fetcher";
import { useCurrentUser } from "@/components/auth/CurrentUserProvider";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { CreditAccountItemGrid } from "./CreditAccountItemGrid";
import type { CreditAccountItemDraft } from "./creditAccountItemDraft";

export interface AddItemsModalProps {
  accountId: string;
  categories: CategoryModel[];
  percentageIncrease: number;
  open: boolean;
  onClose: () => void;
  onAdded: (updated: CreditAccountListItem) => void;
}

function buildLinePayload(line: CreditAccountItemDraft): unknown {
  const notes = line.notes || undefined;
  const discountType = line.discountType || undefined;
  const discountValue = line.discountValue || undefined;
  switch (line.saleKind) {
    case "SIMPLE":
    case "LENGTH_FULL":
    case "BOX_FULL":
    case "BOX_LOOSE":
      return {
        saleKind: line.saleKind,
        productId: line.product!.id,
        quantity: line.quantity,
        notes,
        rate: line.rate,
        rateLocked: line.rateLocked,
        discountType,
        discountValue,
      };
    case "LENGTH_CUT":
      return {
        saleKind: "LENGTH_CUT",
        productId: line.product!.id,
        cutLength: line.cutLength,
        quantity: line.quantity,
        notes,
        rate: line.rate,
        rateLocked: line.rateLocked,
        discountType,
        discountValue,
      };
    case "CUSTOM":
      return {
        saleKind: "CUSTOM",
        customItemName: line.customItemName ?? line.itemName,
        quantity: line.quantity,
        rate: line.rate,
        notes,
        applyMarkup: line.applyMarkup,
        discountType,
        discountValue,
      };
  }
}

export function AddItemsModal({ accountId, categories, percentageIncrease, open, onClose, onAdded }: AddItemsModalProps) {
  const staffName = useCurrentUser().name;
  const { showToast } = useToast();
  const [lines, setLines] = useState<CreditAccountItemDraft[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  function handleClose() {
    setLines([]);
    setError(undefined);
    onClose();
  }

  async function handleSubmit() {
    if (lines.length === 0) {
      setError("Add at least one item");
      return;
    }
    setError(undefined);
    setSubmitting(true);
    try {
      const updated = await postJson<CreditAccountListItem>(`/api/credit-accounts/${accountId}/items`, {
        lines: lines.map(buildLinePayload),
        createdBy: staffName,
      });
      onAdded(updated);
      showToast("Items added, stock updated");
      setLines([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add Products" size="wide">
      {open && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            Items are taken from stock now. Unless you pick a specific rate, pricing stays live and
            follows the product&apos;s current price (plus this account&apos;s markup) right up until the
            final bill is generated.
          </p>
          <CreditAccountItemGrid
            categories={categories}
            lines={lines}
            percentageIncrease={percentageIncrease}
            onLinesChange={setLines}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" fullWidth onClick={handleClose}>
              Cancel
            </Button>
            <Button type="button" fullWidth disabled={submitting} onClick={handleSubmit}>
              {submitting ? "Saving…" : "Add to Account"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
