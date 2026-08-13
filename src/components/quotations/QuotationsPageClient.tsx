"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import type { QuotationModel } from "@/types";
import { fetcher, deleteJson } from "@/lib/fetcher";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { QuotationFilters, type QuotationFilterState } from "./QuotationFilters";
import { QuotationList } from "./QuotationList";
import { ConvertQuotationModal } from "./ConvertQuotationModal";

export interface QuotationsPageClientProps {
  initialQuotations: QuotationModel[];
}

const defaultFilters: QuotationFilterState = {
  customerName: "",
  status: null,
  dateFrom: "",
  dateTo: "",
};

function buildQuery(filters: QuotationFilterState): string {
  const params = new URLSearchParams();
  if (filters.customerName) params.set("customerName", filters.customerName);
  if (filters.status) params.set("status", filters.status);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  const qs = params.toString();
  return qs ? `/api/quotations?${qs}` : "/api/quotations";
}

export function QuotationsPageClient({ initialQuotations }: QuotationsPageClientProps) {
  const { showToast } = useToast();
  const [filters, setFilters] = useState<QuotationFilterState>(defaultFilters);
  const [deleteTarget, setDeleteTarget] = useState<QuotationModel | null>(null);
  const [convertTarget, setConvertTarget] = useState<QuotationModel | null>(null);

  const isDefault =
    !filters.customerName && !filters.status && !filters.dateFrom && !filters.dateTo;
  const key = useMemo(() => buildQuery(filters), [filters]);

  const { data: quotations, mutate } = useSWR<QuotationModel[]>(key, fetcher, {
    fallbackData: isDefault ? initialQuotations : undefined,
  });

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteJson(`/api/quotations/${deleteTarget.id}`);
      await mutate();
      showToast("Quotation deleted");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not delete quotation", "error");
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Quotations</h1>
          <p className="text-sm text-muted">Priced quotes — stock is untouched until converted to a bill.</p>
        </div>
        <Link href="/quotations/new">
          <Button>New Quotation</Button>
        </Link>
      </div>

      <QuotationFilters filters={filters} defaultFilters={defaultFilters} onChange={setFilters} />

      <QuotationList
        quotations={quotations ?? []}
        onDelete={setDeleteTarget}
        onConvert={setConvertTarget}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this quotation?"
        description="This quotation will be permanently removed. It has no stock or financial effect."
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConvertQuotationModal quotation={convertTarget} onClose={() => setConvertTarget(null)} />
    </div>
  );
}
