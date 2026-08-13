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
import { Chip } from "@/components/ui/Chip";

type SupplierPayment = SupplierWithLedger["payments"][number];

const paymentMethods = [
  { value: "CASH" as const, label: "Cash" },
  { value: "UPI" as const, label: "UPI" },
  { value: "CARD" as const, label: "Card" },
  { value: "OTHER" as const, label: "Other" },
];

export interface SupplierPaymentModalProps {
  supplierId: string;
  payment?: SupplierPayment | null;
  open: boolean;
  onClose: () => void;
  onSaved: (updated: SupplierListItem) => void;
}

function toDateInput(value: string | Date): string {
  return new Date(value).toISOString().slice(0, 10);
}

export function SupplierPaymentModal({ supplierId, payment, open, onClose, onSaved }: SupplierPaymentModalProps) {
  const staffName = useCurrentUser().name;
  const { showToast } = useToast();
  const isEdit = !!payment;

  const [amount, setAmount] = useState(payment ? String(payment.amount) : "");
  const [method, setMethod] = useState<"CASH" | "UPI" | "CARD" | "OTHER">(payment?.method ?? "CASH");
  const [date, setDate] = useState(payment ? toDateInput(payment.date) : new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(payment?.notes ?? "");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setAmount(payment ? String(payment.amount) : "");
    setMethod(payment?.method ?? "CASH");
    setDate(payment ? toDateInput(payment.date) : new Date().toISOString().slice(0, 10));
    setNotes(payment?.notes ?? "");
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
      const payload = { amount, method, date, notes, enteredBy: staffName };
      const updated = isEdit
        ? await patchJson<SupplierListItem>(`/api/suppliers/${supplierId}/payments/${payment!.id}`, payload)
        : await postJson<SupplierListItem>(`/api/suppliers/${supplierId}/payments`, payload);
      onSaved(updated);
      showToast(isEdit ? "Payment updated" : "Payment recorded");
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={isEdit ? "Edit Payment" : "Add Payment"}>
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
          <div className="flex flex-wrap gap-2">
            {paymentMethods.map((m) => (
              <Chip key={m.value} active={method === m.value} onClick={() => setMethod(m.value)}>
                {m.label}
              </Chip>
            ))}
          </div>
          <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

          <div className="flex gap-2">
            <Button type="button" variant="secondary" fullWidth onClick={handleClose}>
              Cancel
            </Button>
            <Button type="button" fullWidth disabled={submitting} onClick={handleSubmit}>
              {submitting ? "Saving…" : isEdit ? "Save Payment" : "Add Payment"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
