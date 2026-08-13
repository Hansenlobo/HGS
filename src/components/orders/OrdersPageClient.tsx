"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import type { OrderWithRelations } from "@/types";
import { fetcher, deleteJson } from "@/lib/fetcher";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { OrderFilters, type OrderFilterState } from "./OrderFilters";
import { OrderList } from "./OrderList";
import { ConvertOrderModal } from "./ConvertOrderModal";

export interface OrdersPageClientProps {
  initialOrders: OrderWithRelations[];
}

const defaultFilters: OrderFilterState = {
  customerName: "",
  status: null,
  dateFrom: "",
  dateTo: "",
};

function buildQuery(filters: OrderFilterState): string {
  const params = new URLSearchParams();
  if (filters.customerName) params.set("customerName", filters.customerName);
  if (filters.status) params.set("status", filters.status);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  const qs = params.toString();
  return qs ? `/api/orders?${qs}` : "/api/orders";
}

export function OrdersPageClient({ initialOrders }: OrdersPageClientProps) {
  const { showToast } = useToast();
  const [filters, setFilters] = useState<OrderFilterState>(defaultFilters);
  const [deleteTarget, setDeleteTarget] = useState<OrderWithRelations | null>(null);
  const [convertTarget, setConvertTarget] = useState<OrderWithRelations | null>(null);

  const isDefault =
    !filters.customerName && !filters.status && !filters.dateFrom && !filters.dateTo;
  const key = useMemo(() => buildQuery(filters), [filters]);

  const { data: orders, mutate } = useSWR<OrderWithRelations[]>(key, fetcher, {
    fallbackData: isDefault ? initialOrders : undefined,
  });

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteJson(`/api/orders/${deleteTarget.id}`);
      await mutate();
      showToast("Order deleted");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not delete order", "error");
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Temporary Orders</h1>
          <p className="text-sm text-muted">Picking slips — stock is untouched until converted.</p>
        </div>
        <Link href="/orders/new">
          <Button>New Order</Button>
        </Link>
      </div>

      <OrderFilters filters={filters} defaultFilters={defaultFilters} onChange={setFilters} />

      <OrderList
        orders={orders ?? []}
        onDelete={setDeleteTarget}
        onConvert={setConvertTarget}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this order?"
        description="This picking slip will be permanently removed. It has no stock or financial effect."
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConvertOrderModal order={convertTarget} onClose={() => setConvertTarget(null)} />
    </div>
  );
}
