"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import type { ClearanceItemModel } from "@/types";
import { fetcher, postJson, patchJson, deleteJson } from "@/lib/fetcher";
import { useCurrentUser } from "@/components/auth/CurrentUserProvider";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ClearanceStockFilters, type ClearanceStockFilterState } from "./ClearanceStockFilters";
import { ClearanceStockList } from "./ClearanceStockList";
import { ClearanceItemForm, type ClearanceItemFormSubmitValues } from "./ClearanceItemForm";

export interface ClearanceStockPageClientProps {
  initialItems: ClearanceItemModel[];
}

const defaultFilters: ClearanceStockFilterState = {
  search: "",
  status: null,
  dateFrom: "",
  dateTo: "",
  minPrice: "",
  maxPrice: "",
};

function buildQuery(filters: ClearanceStockFilterState): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.minPrice) params.set("minPrice", filters.minPrice);
  if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
  const qs = params.toString();
  return qs ? `/api/clearance-stock?${qs}` : "/api/clearance-stock";
}

function toPayload(values: ClearanceItemFormSubmitValues, addedBy: string) {
  return {
    itemName: values.itemName,
    description: values.description,
    originalPrice: values.originalPrice || undefined,
    discountedPrice: values.discountedPrice,
    quantityAvailable: values.quantityAvailable || undefined,
    photoUrl: values.photoUrl,
    status: values.status,
    addedBy,
  };
}

export function ClearanceStockPageClient({ initialItems }: ClearanceStockPageClientProps) {
  const staffName = useCurrentUser().name;
  const { showToast } = useToast();
  const [filters, setFilters] = useState<ClearanceStockFilterState>(defaultFilters);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClearanceItemModel | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClearanceItemModel | null>(null);

  const isDefault =
    !filters.search &&
    !filters.status &&
    !filters.dateFrom &&
    !filters.dateTo &&
    !filters.minPrice &&
    !filters.maxPrice;
  const key = useMemo(() => buildQuery(filters), [filters]);

  const { data: items, mutate } = useSWR<ClearanceItemModel[]>(key, fetcher, {
    fallbackData: isDefault ? initialItems : undefined,
  });

  async function handleCreate(values: ClearanceItemFormSubmitValues) {
    const created = await postJson<ClearanceItemModel>("/api/clearance-stock", toPayload(values, staffName));
    await mutate((current) => [created, ...(current ?? [])], { revalidate: false });
    showToast("Clearance item added");
    setFormOpen(false);
  }

  async function handleUpdate(item: ClearanceItemModel, values: ClearanceItemFormSubmitValues) {
    const updated = await patchJson<ClearanceItemModel>(
      `/api/clearance-stock/${item.id}`,
      toPayload(values, staffName),
    );
    await mutate((current) => (current ?? []).map((i) => (i.id === item.id ? updated : i)), { revalidate: false });
    showToast("Clearance item updated");
    setEditing(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteJson(`/api/clearance-stock/${deleteTarget.id}`);
    await mutate((current) => (current ?? []).filter((i) => i.id !== deleteTarget.id), { revalidate: false });
    showToast("Clearance item deleted");
    setDeleteTarget(null);
  }

  async function handleMarkSold(item: ClearanceItemModel) {
    try {
      const updated = await patchJson<ClearanceItemModel>(`/api/clearance-stock/${item.id}`, { status: "SOLD" });
      await mutate((current) => (current ?? []).map((i) => (i.id === item.id ? updated : i)), { revalidate: false });
      showToast("Marked as sold");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not mark as sold", "error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Clearance Stock</h1>
          <p className="text-sm text-muted">
            Damaged or clearance items available at a discount. Reference only — not linked to product stock.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>Add Clearance Item</Button>
      </div>

      <ClearanceStockFilters filters={filters} defaultFilters={defaultFilters} onChange={setFilters} />

      <ClearanceStockList
        items={items ?? []}
        onEdit={setEditing}
        onDelete={setDeleteTarget}
        onMarkSold={handleMarkSold}
      />

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Add Clearance Item">
        {formOpen && <ClearanceItemForm onSubmit={handleCreate} onCancel={() => setFormOpen(false)} />}
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Clearance Item">
        {editing && (
          <ClearanceItemForm
            item={editing}
            onSubmit={(values) => handleUpdate(editing, values)}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this clearance item?"
        description="This will be permanently removed. It has no effect on product stock or billing."
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
