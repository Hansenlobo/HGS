"use client";

import { useState } from "react";
import type { CreditAccountWithRelations } from "@/types";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export interface CreditAccountFormSubmitValues {
  name: string;
  customerName: string;
  customerPhone: string;
  percentageIncrease: string;
  notes: string;
}

export interface CreditAccountFormProps {
  account?: CreditAccountWithRelations;
  onSubmit: (values: CreditAccountFormSubmitValues) => Promise<void>;
  onCancel: () => void;
}

export function CreditAccountForm({ account, onSubmit, onCancel }: CreditAccountFormProps) {
  const [name, setName] = useState(account?.name ?? "");
  const [customerName, setCustomerName] = useState(account?.customerName ?? "");
  const [customerPhone, setCustomerPhone] = useState(account?.customerPhone ?? "");
  const [percentageIncrease, setPercentageIncrease] = useState(
    account ? String(account.percentageIncrease) : "0",
  );
  const [notes, setNotes] = useState(account?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Name is required");
    setError(undefined);
    setSubmitting(true);
    try {
      await onSubmit({ name, customerName, customerPhone, percentageIncrease, notes });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Site / Account Name"
        placeholder="e.g. Riverside Apartments — Block C"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input label="Customer / Contact Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
      <Input label="Phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
      <Input
        label="Percentage Increase (%)"
        type="number"
        step="0.01"
        inputMode="decimal"
        value={percentageIncrease}
        onChange={(e) => setPercentageIncrease(e.target.value)}
        hint="Applied on top of current prices when the final bill is generated."
      />
      <Textarea label="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" variant="secondary" fullWidth onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? "Saving…" : account ? "Save Changes" : "Open Account"}
        </Button>
      </div>
    </form>
  );
}
