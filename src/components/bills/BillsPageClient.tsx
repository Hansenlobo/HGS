"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import type { BillListItem } from "@/types";
import { fetcher } from "@/lib/fetcher";
import { getBillStatus } from "@/lib/billing/billDisplay";
import { Button } from "@/components/ui/Button";
import { BillFilters, type BillFilterState } from "./BillFilters";
import { BillList } from "./BillList";

export interface BillsPageClientProps {
  initialBills: BillListItem[];
}

const defaultFilters: BillFilterState = {
  customerName: "",
  type: null,
  status: null,
  dateFrom: "",
  dateTo: "",
};

function buildQuery(filters: BillFilterState): string {
  const params = new URLSearchParams();
  if (filters.customerName) params.set("customerName", filters.customerName);
  if (filters.type) params.set("type", filters.type);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  const qs = params.toString();
  return qs ? `/api/bills?${qs}` : "/api/bills";
}

export function BillsPageClient({ initialBills }: BillsPageClientProps) {
  const [filters, setFilters] = useState<BillFilterState>(defaultFilters);

  const isDefault =
    !filters.customerName && !filters.type && !filters.status && !filters.dateFrom && !filters.dateTo;
  const key = useMemo(() => buildQuery(filters), [filters]);

  const { data: bills } = useSWR<BillListItem[]>(key, fetcher, {
    fallbackData: isDefault ? initialBills : undefined,
  });

  const filtered = useMemo(
    () => (bills ?? []).filter((b) => !filters.status || getBillStatus(b) === filters.status),
    [bills, filters.status],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Bills</h1>
          <p className="text-sm text-muted">All normal and party bills.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/billing/normal/new">
            <Button variant="secondary">New Normal Bill</Button>
          </Link>
          <Link href="/billing/party/new">
            <Button>New Party Bill</Button>
          </Link>
        </div>
      </div>

      <BillFilters filters={filters} defaultFilters={defaultFilters} onChange={setFilters} />

      <BillList bills={filtered} />
    </div>
  );
}
