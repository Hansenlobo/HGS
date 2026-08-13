"use client";

import { useState } from "react";
import type { CategoryModel } from "@/types";
import type { CreditAccountListItem } from "./CreditAccountsPageClient";
import { postJson } from "@/lib/fetcher";
import { useCurrentUser } from "@/components/auth/CurrentUserProvider";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { ReturnItemGrid } from "@/components/returns/ReturnItemGrid";
import { computeReturnLineAmount, type ReturnLineDraft } from "@/components/returns/returnLineDraft";
import { formatPrice } from "@/lib/stock/stockDisplay";

export interface CreditAccountReturnModalProps {
  accountId: string;
  accountName: string;
  customerName: string;
  categories: CategoryModel[];
  open: boolean;
  onClose: () => void;
  onReturned: (updated: CreditAccountListItem) => void;
}

function buildLinePayload(line: ReturnLineDraft): unknown {
  switch (line.saleKind) {
    case "SIMPLE":
    case "LENGTH_FULL":
    case "BOX_FULL":
    case "BOX_LOOSE":
      return { saleKind: line.saleKind, productId: line.product!.id, quantity: line.quantity, rate: line.rate };
    case "LENGTH_CUT":
      return {
        saleKind: "LENGTH_CUT",
        productId: line.product!.id,
        cutLength: line.cutLength,
        quantity: line.quantity,
        rate: line.rate,
      };
    case "CUSTOM":
      return {
        saleKind: "CUSTOM",
        customItemName: line.customItemName ?? line.itemName,
        quantity: line.quantity,
        rate: line.rate,
      };
  }
}

export function CreditAccountReturnModal({
  accountId,
  accountName,
  customerName,
  categories,
  open,
  onClose,
  onReturned,
}: CreditAccountReturnModalProps) {
  const staffName = useCurrentUser().name;
  const { showToast } = useToast();
  const [lines, setLines] = useState<ReturnLineDraft[]>([]);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const total = lines.reduce((sum, l) => sum + computeReturnLineAmount(l), 0);

  function handleClose() {
    setLines([]);
    setReason("");
    setError(undefined);
    onClose();
  }

  async function handleSubmit() {
    if (lines.length === 0) {
      setError("Add at least one item to return");
      return;
    }
    setError(undefined);
    setSubmitting(true);
    try {
      await postJson(`/api/returns`, {
        creditAccountId: accountId,
        customerName: customerName || accountName,
        refundMethod: "ACCOUNT_CREDIT",
        reason,
        createdBy: staffName,
        lines: lines.map(buildLinePayload),
      });
      const updated = await fetch(`/api/credit-accounts/${accountId}`).then((r) => r.json());
      onReturned(updated);
      showToast("Return recorded, stock restored");
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Return Items" size="wide">
      {open && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            Stock is restored and the value is credited against this account&apos;s balance — no cash refund.
          </p>
          <ReturnItemGrid categories={categories} lines={lines} onLinesChange={setLines} />
          <Textarea label="Reason (optional)" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex items-center justify-between rounded-lg border border-border bg-surface p-3">
            <span className="text-sm font-medium text-foreground">Credited to account</span>
            <span className="text-sm font-semibold text-foreground">{formatPrice(total)}</span>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" fullWidth onClick={handleClose}>
              Cancel
            </Button>
            <Button type="button" fullWidth disabled={submitting} onClick={handleSubmit}>
              {submitting ? "Saving…" : "Confirm Return"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
