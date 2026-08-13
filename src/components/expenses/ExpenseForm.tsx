"use client";

import { useState } from "react";
import type { ExpenseModel } from "@/types";
import { expenseCategories, formatExpenseCategory, type ExpenseCategoryValue } from "@/lib/expenses/expenseDisplay";
import { Input, Textarea } from "@/components/ui/Input";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";

export interface ExpenseFormValues {
  date: string;
  category: ExpenseCategoryValue;
  amount: string;
  notes: string;
}

export interface ExpenseFormProps {
  expense?: ExpenseModel;
  onSubmit: (values: ExpenseFormValues) => Promise<void>;
  onCancel: () => void;
}

function toDateInput(date: Date | string): string {
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

export function ExpenseForm({ expense, onSubmit, onCancel }: ExpenseFormProps) {
  const [date, setDate] = useState(expense ? toDateInput(expense.date) : toDateInput(new Date()));
  const [category, setCategory] = useState<ExpenseCategoryValue>(
    (expense?.category as ExpenseCategoryValue) ?? "MISCELLANEOUS",
  );
  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [notes, setNotes] = useState(expense?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return setError("Date is required");
    if (!amount || Number(amount) <= 0) return setError("Enter a valid amount");
    setError(undefined);
    setSubmitting(true);
    try {
      await onSubmit({ date, category, amount, notes });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input type="date" label="Date" value={date} onChange={(e) => setDate(e.target.value)} />

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">Category</span>
        <div className="flex flex-wrap gap-2">
          {expenseCategories.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
              {formatExpenseCategory(c)}
            </Chip>
          ))}
        </div>
      </div>

      <Input
        label="Amount (₹)"
        type="number"
        step="0.01"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <Textarea label="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" variant="secondary" fullWidth onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? "Saving…" : "Save Expense"}
        </Button>
      </div>
    </form>
  );
}
