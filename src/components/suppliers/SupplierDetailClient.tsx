"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import type { ProductWithRelations, SupplierWithLedger } from "@/types";
import type { SupplierListItem } from "./SuppliersPageClient";
import { fetcher, patchJson, deleteJson } from "@/lib/fetcher";
import { formatPrice } from "@/lib/stock/stockDisplay";
import { formatDate } from "@/lib/formatDate";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SupplierForm, type SupplierFormSubmitValues } from "./SupplierForm";
import { SupplierBillModal } from "./SupplierBillModal";
import { SupplierPaymentModal } from "./SupplierPaymentModal";

type SupplierBill = SupplierWithLedger["bills"][number];
type SupplierPayment = SupplierWithLedger["payments"][number];

const paymentMethodLabels: Record<string, string> = { CASH: "Cash", UPI: "UPI", CARD: "Card", OTHER: "Other" };

export function SupplierDetailClient({
  initialSupplier,
  products,
}: {
  initialSupplier: SupplierListItem;
  products: ProductWithRelations[];
}) {
  const { showToast } = useToast();

  const { data: supplier, mutate } = useSWR<SupplierListItem>(
    `/api/suppliers/${initialSupplier.id}`,
    fetcher,
    { fallbackData: initialSupplier },
  );

  const [editOpen, setEditOpen] = useState(false);
  const [addBillOpen, setAddBillOpen] = useState(false);
  const [editBillTarget, setEditBillTarget] = useState<SupplierBill | null>(null);
  const [deleteBillTarget, setDeleteBillTarget] = useState<SupplierBill | null>(null);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [editPaymentTarget, setEditPaymentTarget] = useState<SupplierPayment | null>(null);
  const [deletePaymentTarget, setDeletePaymentTarget] = useState<SupplierPayment | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (!supplier) return null;

  async function handleEditSave(values: SupplierFormSubmitValues) {
    const updated = await patchJson<SupplierListItem>(`/api/suppliers/${supplier!.id}`, {
      ...values,
      outstandingBalance: Number(values.outstandingBalance),
    });
    await mutate(updated, { revalidate: false });
    showToast("Supplier updated");
    setEditOpen(false);
  }

  async function handleDeleteBill() {
    if (!deleteBillTarget) return;
    setDeleting(true);
    try {
      await deleteJson(`/api/suppliers/${supplier!.id}/bills/${deleteBillTarget.id}`);
      const updated = await fetcher<SupplierListItem>(`/api/suppliers/${supplier!.id}`);
      await mutate(updated, { revalidate: false });
      showToast("Bill removed");
      setDeleteBillTarget(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not remove bill", "error");
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeletePayment() {
    if (!deletePaymentTarget) return;
    setDeleting(true);
    try {
      await deleteJson(`/api/suppliers/${supplier!.id}/payments/${deletePaymentTarget.id}`);
      const updated = await fetcher<SupplierListItem>(`/api/suppliers/${supplier!.id}`);
      await mutate(updated, { revalidate: false });
      showToast("Payment removed");
      setDeletePaymentTarget(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not remove payment", "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/suppliers" className="text-sm text-muted hover:text-primary">
        ← Back to Suppliers
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground">{supplier.name}</h1>
          {supplier.phone && <p className="text-sm text-muted">{supplier.phone}</p>}
          {supplier.address && <p className="text-sm text-muted">{supplier.address}</p>}
          {supplier.gstNumber && <p className="text-sm text-muted">GST: {supplier.gstNumber}</p>}
          {supplier.notes && <p className="text-sm text-muted">{supplier.notes}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
            Edit Supplier
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setAddBillOpen(true)}>
            Add Bill
          </Button>
          <Button size="sm" onClick={() => setAddPaymentOpen(true)}>
            Add Payment
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold text-foreground">Balance</h2>
        <div className="flex justify-between text-sm">
          <span className="text-muted">Opening Balance</span>
          <span className="text-foreground">{formatPrice(supplier.balance.opening)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">Billed</span>
          <span className="text-foreground">{formatPrice(supplier.balance.billed)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">Paid</span>
          <span className="text-foreground">{formatPrice(supplier.balance.paid)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-border pt-1 text-sm font-semibold">
          <span className="text-foreground">Remaining</span>
          <span className={supplier.balance.remaining > 0 ? "text-danger" : "text-foreground"}>
            {formatPrice(supplier.balance.remaining)}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">Bills</h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Notes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {supplier.bills.map((bill) => (
                <tr key={bill.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-sm text-muted">{formatDate(bill.date)}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{bill.reference ?? "—"}</td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{formatPrice(bill.amount)}</td>
                  <td className="px-4 py-3 text-sm text-muted">{bill.notes ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setEditBillTarget(bill)}>
                        Edit
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setDeleteBillTarget(bill)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {supplier.bills.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted">
                    No bills recorded yet.
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
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Notes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {supplier.payments.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-sm text-muted">{formatDate(p.date)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{formatPrice(p.amount)}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{paymentMethodLabels[p.method]}</td>
                  <td className="px-4 py-3 text-sm text-muted">{p.notes ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setEditPaymentTarget(p)}>
                        Edit
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setDeletePaymentTarget(p)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {supplier.payments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted">
                    No payments recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Supplier">
        {editOpen && (
          <SupplierForm
            supplier={supplier}
            products={products}
            onSubmit={handleEditSave}
            onCancel={() => setEditOpen(false)}
          />
        )}
      </Modal>

      <SupplierBillModal
        supplierId={supplier.id}
        open={addBillOpen}
        onClose={() => setAddBillOpen(false)}
        onSaved={(updated) => {
          mutate(updated, { revalidate: false });
          setAddBillOpen(false);
        }}
      />
      <SupplierBillModal
        supplierId={supplier.id}
        bill={editBillTarget}
        open={!!editBillTarget}
        onClose={() => setEditBillTarget(null)}
        onSaved={(updated) => {
          mutate(updated, { revalidate: false });
          setEditBillTarget(null);
        }}
      />

      <SupplierPaymentModal
        supplierId={supplier.id}
        open={addPaymentOpen}
        onClose={() => setAddPaymentOpen(false)}
        onSaved={(updated) => {
          mutate(updated, { revalidate: false });
          setAddPaymentOpen(false);
        }}
      />
      <SupplierPaymentModal
        supplierId={supplier.id}
        payment={editPaymentTarget}
        open={!!editPaymentTarget}
        onClose={() => setEditPaymentTarget(null)}
        onSaved={(updated) => {
          mutate(updated, { revalidate: false });
          setEditPaymentTarget(null);
        }}
      />

      <ConfirmDialog
        open={!!deleteBillTarget}
        title="Remove Bill"
        description={
          deleteBillTarget ? `This removes the bill of ${formatPrice(deleteBillTarget.amount)} from the ledger.` : undefined
        }
        confirmLabel={deleting ? "Removing…" : "Remove"}
        danger
        onConfirm={handleDeleteBill}
        onCancel={() => setDeleteBillTarget(null)}
      />

      <ConfirmDialog
        open={!!deletePaymentTarget}
        title="Remove Payment"
        description={
          deletePaymentTarget
            ? `This removes the payment of ${formatPrice(deletePaymentTarget.amount)} from the ledger.`
            : undefined
        }
        confirmLabel={deleting ? "Removing…" : "Remove"}
        danger
        onConfirm={handleDeletePayment}
        onCancel={() => setDeletePaymentTarget(null)}
      />
    </div>
  );
}
