"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import type { ExpenseModel } from "@/types";
import { fetcher, postJson, patchJson, deleteJson } from "@/lib/fetcher";
import { formatPrice } from "@/lib/stock/stockDisplay";
import { formatDate } from "@/lib/formatDate";
import { expenseCategories, formatExpenseCategory, type ExpenseCategoryValue } from "@/lib/expenses/expenseDisplay";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Modal } from "@/components/ui/Modal";
import { FilterPanel } from "@/components/ui/FilterPanel";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ExpenseForm, type ExpenseFormValues } from "./ExpenseForm";

export interface ExpensesPageClientProps {
  initialExpenses: ExpenseModel[];
}

interface FilterState {
  category: ExpenseCategoryValue | null;
  dateFrom: string;
  dateTo: string;
}

const defaultFilters: FilterState = { category: null, dateFrom: "", dateTo: "" };

function buildQuery(filters: FilterState): string {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  const qs = params.toString();
  return qs ? `/api/expenses?${qs}` : "/api/expenses";
}

export function ExpensesPageClient({ initialExpenses }: ExpensesPageClientProps) {
  const { showToast } = useToast();
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseModel | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseModel | null>(null);

  const isDefault = !filters.category && !filters.dateFrom && !filters.dateTo;
  const key = useMemo(() => buildQuery(filters), [filters]);
  const { data: expenses, mutate } = useSWR<ExpenseModel[]>(key, fetcher, {
    fallbackData: isDefault ? initialExpenses : undefined,
  });

  const activeCount = (filters.category ? 1 : 0) + (filters.dateFrom ? 1 : 0) + (filters.dateTo ? 1 : 0);
  const total = (expenses ?? []).reduce((sum, e) => sum + e.amount, 0);

  async function handleCreate(values: ExpenseFormValues) {
    const created = await postJson<ExpenseModel>("/api/expenses", {
      ...values,
      amount: Number(values.amount),
    });
    await mutate((current) => [created, ...(current ?? [])], { revalidate: false });
    showToast("Expense added");
    setFormOpen(false);
  }

  async function handleUpdate(expense: ExpenseModel, values: ExpenseFormValues) {
    const updated = await patchJson<ExpenseModel>(`/api/expenses/${expense.id}`, {
      ...values,
      amount: Number(values.amount),
    });
    await mutate((current) => (current ?? []).map((e) => (e.id === expense.id ? updated : e)), {
      revalidate: false,
    });
    showToast("Expense updated");
    setEditing(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteJson(`/api/expenses/${deleteTarget.id}`);
    await mutate((current) => (current ?? []).filter((e) => e.id !== deleteTarget.id), { revalidate: false });
    showToast("Expense deleted");
    setDeleteTarget(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Expenses</h1>
          <p className="text-sm text-muted">Track rent, salaries, utilities, and other outgoings.</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>Add Expense</Button>
      </div>

      <FilterPanel
        value={filters}
        defaultValue={defaultFilters}
        activeCount={activeCount}
        onApply={setFilters}
        renderFields={(draft, setDraft) => (
          <>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-foreground">Category</span>
              <div className="flex flex-wrap gap-2">
                {expenseCategories.map((c) => (
                  <Chip
                    key={c}
                    active={draft.category === c}
                    onClick={() => setDraft({ category: draft.category === c ? null : c })}
                  >
                    {formatExpenseCategory(c)}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-foreground">From</span>
                <input
                  type="date"
                  value={draft.dateFrom}
                  onChange={(e) => setDraft({ dateFrom: e.target.value })}
                  className="h-11 rounded-lg border border-border bg-surface px-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-foreground">To</span>
                <input
                  type="date"
                  value={draft.dateTo}
                  onChange={(e) => setDraft({ dateTo: e.target.value })}
                  className="h-11 rounded-lg border border-border bg-surface px-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
            </div>
          </>
        )}
      />

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Total (filtered)</span>
          <span className="text-lg font-semibold text-foreground">{formatPrice(total)}</span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Notes</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(expenses ?? []).map((expense) => (
              <tr key={expense.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-sm text-muted">{formatDate(expense.date)}</td>
                <td className="px-4 py-3 text-sm text-foreground">
                  {formatExpenseCategory(expense.category as ExpenseCategoryValue)}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-foreground">{formatPrice(expense.amount)}</td>
                <td className="px-4 py-3 text-sm text-muted">{expense.notes ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setEditing(expense)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleteTarget(expense)}>
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {(expenses ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted">
                  No expenses match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Add Expense">
        {formOpen && <ExpenseForm onSubmit={handleCreate} onCancel={() => setFormOpen(false)} />}
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Expense">
        {editing && (
          <ExpenseForm expense={editing} onSubmit={(values) => handleUpdate(editing, values)} onCancel={() => setEditing(null)} />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Expense"
        description="This will permanently remove this expense entry."
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
