"use client";

import { useState } from "react";
import type { CreditAccountListItem } from "./CreditAccountsPageClient";
import { postJson } from "@/lib/fetcher";
import { useCurrentUser } from "@/components/auth/CurrentUserProvider";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Chip } from "@/components/ui/Chip";

const paymentMethods = [
  { value: "CASH" as const, label: "Cash" },
  { value: "UPI" as const, label: "UPI" },
  { value: "CARD" as const, label: "Card" },
  { value: "OTHER" as const, label: "Other" },
];

export interface AddPaymentModalProps {
  accountId: string;
  open: boolean;
  onClose: () => void;
  onAdded: (updated: CreditAccountListItem) => void;
}

export function AddPaymentModal({ accountId, open, onClose, onAdded }: AddPaymentModalProps) {
  const staffName = useCurrentUser().name;
  const { showToast } = useToast();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"CASH" | "UPI" | "CARD" | "OTHER">("CASH");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  function handleClose() {
    setAmount("");
    setMethod("CASH");
    setNotes("");
    setError(undefined);
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
      const updated = await postJson<CreditAccountListItem>(`/api/credit-accounts/${accountId}/payments`, {
        amount,
        method,
        date,
        notes,
        enteredBy: staffName,
      });
      onAdded(updated);
      showToast("Payment recorded");
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add Payment">
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
              {submitting ? "Saving…" : "Add Payment"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
