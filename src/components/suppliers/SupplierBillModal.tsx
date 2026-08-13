"use client";

import { useState } from "react";
import type { SupplierListItem } from "./SuppliersPageClient";
import type { SupplierWithLedger } from "@/types";
import { postJson, patchJson } from "@/lib/fetcher";
import { useCurrentUser } from "@/components/auth/CurrentUserProvider";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type SupplierBill = SupplierWithLedger["bills"][number];

export interface SupplierBillModalProps {
  supplierId: string;
  bill?: SupplierBill | null;
  open: boolean;
  onClose: () => void;
  onSaved: (updated: SupplierListItem) => void;
}

function toDateInput(value: string | Date): string {
  return new Date(value).toISOString().slice(0, 10);
}

export function SupplierBillModal({ supplierId, bill, open, onClose, onSaved }: SupplierBillModalProps) {
  const staffName = useCurrentUser().name;
  const { showToast } = useToast();
  const isEdit = !!bill;

  const [amount, setAmount] = useState(bill ? String(bill.amount) : "");
  const [reference, setReference] = useState(bill?.reference ?? "");
  const [date, setDate] = useState(bill ? toDateInput(bill.date) : new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(bill?.notes ?? "");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setAmount(bill ? String(bill.amount) : "");
    setReference(bill?.reference ?? "");
    setDate(bill ? toDateInput(bill.date) : new Date().toISOString().slice(0, 10));
    setNotes(bill?.notes ?? "");
    setError(undefined);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (!amount || Number(amount) <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setError(undefined);
    setSubmitting(true);
    try {
      const payload = { amount, reference, date, notes, createdBy: staffName };
      const updated = isEdit
        ? await patchJson<SupplierListItem>(`/api/suppliers/${supplierId}/bills/${bill!.id}`, payload)
        : await postJson<SupplierListItem>(`/api/suppliers/${supplierId}/bills`, payload);
      onSaved(updated);
      showToast(isEdit ? "Bill updated" : "Bill recorded");
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={isEdit ? "Edit Bill" : "Add Bill"}>
      {open && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount (₹)"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              error={error}
            />
            <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <Input
            label="Reference / Invoice #"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
          <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

          <div className="flex gap-2">
            <Button type="button" variant="secondary" fullWidth onClick={handleClose}>
              Cancel
            </Button>
            <Button type="button" fullWidth disabled={submitting} onClick={handleSubmit}>
              {submitting ? "Saving…" : isEdit ? "Save Bill" : "Add Bill"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
