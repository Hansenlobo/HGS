"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import type { CategoryModel, CreditAccountWithRelations } from "@/types";
import type { CreditAccountListItem } from "./CreditAccountsPageClient";
import { fetcher, patchJson, postJson, deleteJson } from "@/lib/fetcher";
import { formatPrice, formatNumber } from "@/lib/stock/stockDisplay";
import { formatDate, formatDateTime } from "@/lib/formatDate";
import { formatBillNumber } from "@/lib/billing/billDisplay";
import { finalRateFor } from "@/lib/creditAccounts/accountBalance";
import { useAppSettings } from "@/components/settings/AppSettingsProvider";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CreditAccountForm, type CreditAccountFormSubmitValues } from "./CreditAccountForm";
import { AddItemsModal } from "./AddItemsModal";
import { AddPaymentModal } from "./AddPaymentModal";
import { CreditAccountReturnModal } from "./CreditAccountReturnModal";
import { EditItemModal } from "./EditItemModal";

type CreditAccountItem = CreditAccountWithRelations["items"][number];

const paymentMethodLabels: Record<string, string> = { CASH: "Cash", UPI: "UPI", CARD: "Card", OTHER: "Other" };

function lineQtyDisplay(saleKind: string, quantity: number, cutLength: number | null, unitLabel?: string | null) {
  if (saleKind === "LENGTH_CUT") return `${formatNumber(quantity)} × ${formatNumber(cutLength ?? 0)}${unitLabel ?? ""}`;
  return formatNumber(quantity);
}

export function CreditAccountDetailClient({
  initialAccount,
  categories,
}: {
  initialAccount: CreditAccountListItem;
  categories: CategoryModel[];
}) {
  const router = useRouter();
  const { invoicePrefix } = useAppSettings();
  const { showToast } = useToast();

  const { data: account, mutate } = useSWR<CreditAccountListItem>(
    `/api/credit-accounts/${initialAccount.id}`,
    fetcher,
    { fallbackData: initialAccount },
  );

  const [editOpen, setEditOpen] = useState(false);
  const [addItemsOpen, setAddItemsOpen] = useState(false);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [generateConfirmOpen, setGenerateConfirmOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editItemTarget, setEditItemTarget] = useState<CreditAccountItem | null>(null);
  const [deleteItemTarget, setDeleteItemTarget] = useState<CreditAccountItem | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);

  if (!account) return null;
  const isOpen = account.status === "OPEN";

  async function handleEditSave(values: CreditAccountFormSubmitValues) {
    const updated = await patchJson<CreditAccountListItem>(`/api/credit-accounts/${account!.id}`, {
      ...values,
      percentageIncrease: Number(values.percentageIncrease) || 0,
    });
    await mutate(updated, { revalidate: false });
    showToast("Account updated");
    setEditOpen(false);
  }

  async function handleDeleteItem() {
    if (!deleteItemTarget) return;
    setDeletingItem(true);
    try {
      await deleteJson(`/api/credit-accounts/${account!.id}/items/${deleteItemTarget.id}`);
      const updated: CreditAccountListItem = await fetcher(`/api/credit-accounts/${account!.id}`);
      await mutate(updated, { revalidate: false });
      showToast("Item removed, stock restored");
      setDeleteItemTarget(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not remove item", "error");
    } finally {
      setDeletingItem(false);
    }
  }

  async function handleGenerateBill() {
    setGenerating(true);
    try {
      const bill = await postJson<{ id: string }>(`/api/credit-accounts/${account!.id}/generate-bill`, {});
      showToast("Final bill generated");
      router.push(`/bills/${bill.id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not generate bill", "error");
      setGenerating(false);
      setGenerateConfirmOpen(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground">{account.name}</h1>
          <p className="text-sm text-muted">Opened {formatDate(account.createdAt)}</p>
          <span
            className={
              isOpen
                ? "w-fit rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                : "w-fit rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium text-muted dark:bg-white/10"
            }
          >
            {isOpen ? "Open" : "Closed"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {account.finalBill && (
            <Link href={`/bills/${account.finalBill.id}`}>
              <Button variant="secondary" size="sm">
                View Final Bill ({formatBillNumber(account.finalBill.billNumber, invoicePrefix)})
              </Button>
            </Link>
          )}
          <Link href={`/credit-accounts/${account.id}/print`}>
            <Button variant="secondary" size="sm">
              Print Statement
            </Button>
          </Link>
          {isOpen && (
            <>
              <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setAddItemsOpen(true)}>
                Add Products
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setAddPaymentOpen(true)}>
                Add Payment
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setReturnOpen(true)}>
                Return
              </Button>
              <Button size="sm" onClick={() => setGenerateConfirmOpen(true)}>
                Generate Final Bill
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-4">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Account Info</h2>
          <p className="text-sm text-foreground">{account.customerName || "—"}</p>
          {account.customerPhone && <p className="text-sm text-muted">{account.customerPhone}</p>}
          <p className="mt-1 text-sm text-muted">Percentage increase: {formatNumber(account.percentageIncrease)}%</p>
          {account.notes && <p className="mt-1 text-sm text-muted">{account.notes}</p>}
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Balance (approximate)</h2>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Amount</span>
            <span className="text-foreground">{formatPrice(account.balance.approximateAmount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Paid</span>
            <span className="text-foreground">{formatPrice(account.balance.approximatePaid)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-border pt-1 text-sm font-semibold">
            <span className="text-foreground">Remaining</span>
            <span className="text-foreground">{formatPrice(account.balance.remaining)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">Items Taken</h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Price</th>
                {isOpen && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {account.items.map((item) => {
                // Live price unless the item is rate-locked, with its own
                // discount AND the account's markup applied (when it
                // applies) — matches computeAccountBalance's basis exactly
                // so this never disagrees with the Balance card below it.
                const rate = finalRateFor(item, account.percentageIncrease);
                return (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-sm text-muted">{formatDate(item.dateTaken)}</td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {item.itemName}
                    {item.notes && <div className="text-xs text-muted">{item.notes}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {lineQtyDisplay(item.saleKind, item.quantity, item.cutLength, item.product?.unitLabel)}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{formatPrice(rate)}</td>
                  {isOpen && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => setEditItemTarget(item)}>
                          Edit
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => setDeleteItemTarget(item)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
                );
              })}
              {account.items.length === 0 && (
                <tr>
                  <td colSpan={isOpen ? 5 : 4} className="px-4 py-8 text-center text-sm text-muted">
                    No items taken yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">Payments</h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[480px] text-left">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {account.payments.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-sm text-muted">{formatDateTime(p.date)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{formatPrice(p.amount)}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{paymentMethodLabels[p.method]}</td>
                  <td className="px-4 py-3 text-sm text-muted">{p.notes ?? "—"}</td>
                </tr>
              ))}
              {account.payments.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted">
                    No payments recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {account.returns.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-foreground">Returns</h2>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-[480px] text-left">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Items</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {account.returns.map((ret) => (
                  <tr key={ret.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-sm text-muted">{formatDateTime(ret.createdAt)}</td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {ret.lineItems.map((l) => l.itemName).join(", ")}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">{ret.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Account">
        {editOpen && <CreditAccountForm account={account} onSubmit={handleEditSave} onCancel={() => setEditOpen(false)} />}
      </Modal>

      <AddItemsModal
        accountId={account.id}
        categories={categories}
        percentageIncrease={account.percentageIncrease}
        open={addItemsOpen}
        onClose={() => setAddItemsOpen(false)}
        onAdded={(updated) => {
          mutate(updated, { revalidate: false });
          setAddItemsOpen(false);
        }}
      />

      <AddPaymentModal
        accountId={account.id}
        open={addPaymentOpen}
        onClose={() => setAddPaymentOpen(false)}
        onAdded={(updated) => {
          mutate(updated, { revalidate: false });
          setAddPaymentOpen(false);
        }}
      />

      <CreditAccountReturnModal
        accountId={account.id}
        accountName={account.name}
        customerName={account.customerName ?? ""}
        categories={categories}
        open={returnOpen}
        onClose={() => setReturnOpen(false)}
        onReturned={(updated) => {
          mutate(updated, { revalidate: false });
          setReturnOpen(false);
        }}
      />

      <EditItemModal
        accountId={account.id}
        item={editItemTarget}
        percentageIncrease={account.percentageIncrease}
        onClose={() => setEditItemTarget(null)}
        onUpdated={(updated) => {
          mutate(updated, { revalidate: false });
          setEditItemTarget(null);
        }}
      />

      <ConfirmDialog
        open={!!deleteItemTarget}
        title="Remove Item"
        description={
          deleteItemTarget
            ? `This removes "${deleteItemTarget.itemName}" from the account and puts its stock back.`
            : undefined
        }
        confirmLabel={deletingItem ? "Removing…" : "Remove"}
        danger
        onConfirm={handleDeleteItem}
        onCancel={() => setDeleteItemTarget(null)}
      />

      <ConfirmDialog
        open={generateConfirmOpen}
        title="Generate Final Bill"
        description={`This bills every item still outstanding on this account at today's prices — with the ${formatNumber(account.percentageIncrease)}% markup applied to party-flagged items and any custom items marked for it — carries over all payments already recorded, and closes the account. This can't be undone from here.`}
        confirmLabel={generating ? "Generating…" : "Generate Bill"}
        onConfirm={handleGenerateBill}
        onCancel={() => setGenerateConfirmOpen(false)}
      />
    </div>
  );
}
