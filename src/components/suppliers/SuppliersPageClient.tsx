"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import type { ProductWithRelations, SupplierWithLedger } from "@/types";
import type { SupplierBalance } from "@/lib/suppliers/supplierBalance";
import { fetcher, postJson, patchJson, deleteJson } from "@/lib/fetcher";
import { formatPrice } from "@/lib/stock/stockDisplay";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { SupplierForm, type SupplierFormSubmitValues } from "./SupplierForm";

export type SupplierListItem = SupplierWithLedger & { balance: SupplierBalance };

export interface SuppliersPageClientProps {
  initialSuppliers: SupplierListItem[];
  products: ProductWithRelations[];
}

export function SuppliersPageClient({ initialSuppliers, products }: SuppliersPageClientProps) {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SupplierListItem | null>(null);

  const key = search ? `/api/suppliers?search=${encodeURIComponent(search)}` : "/api/suppliers";
  const { data: suppliers, mutate } = useSWR<SupplierListItem[]>(key, fetcher, {
    fallbackData: search ? undefined : initialSuppliers,
  });

  async function handleCreate(values: SupplierFormSubmitValues) {
    const created = await postJson<SupplierListItem>("/api/suppliers", {
      ...values,
      outstandingBalance: Number(values.outstandingBalance),
    });
    await mutate((current) => [...(current ?? []), created].sort((a, b) => a.name.localeCompare(b.name)), {
      revalidate: false,
    });
    showToast("Supplier added");
    setFormOpen(false);
  }

  async function handleUpdate(supplier: SupplierListItem, values: SupplierFormSubmitValues) {
    const updated = await patchJson<SupplierListItem>(`/api/suppliers/${supplier.id}`, {
      ...values,
      outstandingBalance: Number(values.outstandingBalance),
    });
    await mutate((current) => (current ?? []).map((s) => (s.id === supplier.id ? updated : s)), {
      revalidate: false,
    });
    showToast("Supplier updated");
    setEditing(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteJson(`/api/suppliers/${deleteTarget.id}`);
    await mutate((current) => (current ?? []).filter((s) => s.id !== deleteTarget.id), { revalidate: false });
    showToast("Supplier deleted");
    setDeleteTarget(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Suppliers</h1>
          <p className="text-sm text-muted">Manage suppliers and which products they provide.</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>Add Supplier</Button>
      </div>

      <Input placeholder="Search suppliers…" value={search} onChange={(e) => setSearch(e.target.value)} />

      {(suppliers ?? []).length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted">
          No suppliers yet.
        </p>
      ) : (
        <>
          {/* Mobile: stacked cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {(suppliers ?? []).map((supplier) => (
              <div key={supplier.id} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/suppliers/${supplier.id}`} className="font-semibold text-foreground hover:text-primary">
                    {supplier.name}
                  </Link>
                  {supplier.balance.remaining > 0 && (
                    <span className="shrink-0 rounded-full bg-danger-bg px-2 py-0.5 text-xs font-medium text-danger">
                      Owe {formatPrice(supplier.balance.remaining)}
                    </span>
                  )}
                </div>
                {supplier.phone && <p className="text-sm text-muted">{supplier.phone}</p>}
                {supplier.gstNumber && <p className="text-sm text-muted">GST: {supplier.gstNumber}</p>}
                <p className="text-sm text-muted">
                  {supplier.products.length} product{supplier.products.length === 1 ? "" : "s"} supplied
                </p>
                {supplier.products.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {supplier.products.slice(0, 6).map((ps) => (
                      <span
                        key={ps.productId}
                        className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-foreground dark:bg-white/10"
                      >
                        {ps.product.name}
                      </span>
                    ))}
                    {supplier.products.length > 6 && (
                      <span className="text-xs text-muted">+{supplier.products.length - 6} more</span>
                    )}
                  </div>
                )}
                <div className="mt-2 flex gap-2">
                  <Link href={`/suppliers/${supplier.id}`} className="flex-1">
                    <Button size="sm" variant="secondary" fullWidth>
                      Ledger
                    </Button>
                  </Link>
                  <Button size="sm" variant="secondary" fullWidth onClick={() => setEditing(supplier)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="danger" fullWidth onClick={() => setDeleteTarget(supplier)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table rows */}
          <div className="hidden overflow-x-auto rounded-lg border border-border bg-surface md:block">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Products Supplied</th>
                  <th className="px-4 py-3 font-medium">Balance</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {(suppliers ?? []).map((supplier) => (
                  <tr key={supplier.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/suppliers/${supplier.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {supplier.name}
                      </Link>
                      {supplier.gstNumber && <div className="text-xs text-muted">GST: {supplier.gstNumber}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">{supplier.phone ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {supplier.products.slice(0, 4).map((ps) => (
                          <span
                            key={ps.productId}
                            className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-foreground dark:bg-white/10"
                          >
                            {ps.product.name}
                          </span>
                        ))}
                        {supplier.products.length > 4 && (
                          <span className="text-xs text-muted">+{supplier.products.length - 4} more</span>
                        )}
                        {supplier.products.length === 0 && <span className="text-xs text-muted">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {supplier.balance.remaining > 0 ? (
                        <span className="font-medium text-danger">{formatPrice(supplier.balance.remaining)}</span>
                      ) : (
                        <span className="text-muted">{formatPrice(supplier.balance.remaining)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Link href={`/suppliers/${supplier.id}`}>
                          <Button size="sm" variant="secondary">
                            Ledger
                          </Button>
                        </Link>
                        <Button size="sm" variant="secondary" onClick={() => setEditing(supplier)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setDeleteTarget(supplier)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Add Supplier">
        {formOpen && <SupplierForm products={products} onSubmit={handleCreate} onCancel={() => setFormOpen(false)} />}
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Supplier">
        {editing && (
          <SupplierForm
            supplier={editing}
            products={products}
            onSubmit={(values) => handleUpdate(editing, values)}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Supplier"
        description="This will remove the supplier and its product links."
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
