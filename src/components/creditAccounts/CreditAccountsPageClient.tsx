"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import type { CreditAccountWithRelations } from "@/types";
import type { AccountBalance } from "@/lib/creditAccounts/accountBalance";
import { fetcher, postJson } from "@/lib/fetcher";
import { formatPrice } from "@/lib/stock/stockDisplay";
import { useCurrentUser } from "@/components/auth/CurrentUserProvider";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Modal } from "@/components/ui/Modal";
import { CreditAccountForm, type CreditAccountFormSubmitValues } from "./CreditAccountForm";

export type CreditAccountListItem = CreditAccountWithRelations & { balance: AccountBalance };

export interface CreditAccountsPageClientProps {
  initialAccounts: CreditAccountListItem[];
}

export function CreditAccountsPageClient({ initialAccounts }: CreditAccountsPageClientProps) {
  const staffName = useCurrentUser().name;
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState<"OPEN" | "CLOSED" | null>("OPEN");
  const [formOpen, setFormOpen] = useState(false);

  const key = statusFilter ? `/api/credit-accounts?status=${statusFilter}` : "/api/credit-accounts";
  const { data: accounts, mutate } = useSWR<CreditAccountListItem[]>(key, fetcher, {
    fallbackData: statusFilter === "OPEN" ? initialAccounts : undefined,
  });

  async function handleCreate(values: CreditAccountFormSubmitValues) {
    const created = await postJson<CreditAccountListItem>("/api/credit-accounts", {
      ...values,
      percentageIncrease: Number(values.percentageIncrease) || 0,
      createdBy: staffName,
    });
    await mutate((current) => [created, ...(current ?? [])], { revalidate: false });
    showToast("Credit account opened");
    setFormOpen(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Credit Accounts</h1>
          <p className="text-sm text-muted">Running tabs for sites/projects taking items on credit.</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>Open Account</Button>
      </div>

      <div className="flex gap-2">
        <Chip active={statusFilter === "OPEN"} onClick={() => setStatusFilter("OPEN")}>
          Open
        </Chip>
        <Chip active={statusFilter === "CLOSED"} onClick={() => setStatusFilter("CLOSED")}>
          Closed
        </Chip>
        <Chip active={statusFilter === null} onClick={() => setStatusFilter(null)}>
          All
        </Chip>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Site / Account</th>
              <th className="px-4 py-3 font-medium">Approx. Amount</th>
              <th className="px-4 py-3 font-medium">Approx. Paid</th>
              <th className="px-4 py-3 font-medium">Remaining</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(accounts ?? []).map((account) => (
              <tr key={account.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-foreground">{account.name}</p>
                  <p className="text-xs text-muted">
                    {account.customerName ?? "—"}
                    {account.status === "CLOSED" && (
                      <span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-xs text-muted dark:bg-white/10">
                        Closed
                      </span>
                    )}
                  </p>
                </td>
                <td className="px-4 py-3 text-sm text-foreground">{formatPrice(account.balance.approximateAmount)}</td>
                <td className="px-4 py-3 text-sm text-foreground">{formatPrice(account.balance.approximatePaid)}</td>
                <td className="px-4 py-3 text-sm font-semibold text-foreground">
                  {formatPrice(account.balance.remaining)}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/credit-accounts/${account.id}`}>
                    <Button variant="secondary" size="sm">
                      Open
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
            {(accounts ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted">
                  No credit accounts match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Open Credit Account">
        {formOpen && <CreditAccountForm onSubmit={handleCreate} onCancel={() => setFormOpen(false)} />}
      </Modal>
    </div>
  );
}
