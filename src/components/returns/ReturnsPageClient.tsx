"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import type { ReturnWithRelations } from "@/types";
import { fetcher } from "@/lib/fetcher";
import { formatBillNumber } from "@/lib/billing/billDisplay";
import { formatPrice } from "@/lib/stock/stockDisplay";
import { formatDateTime } from "@/lib/formatDate";
import { useAppSettings } from "@/components/settings/AppSettingsProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FilterPanel } from "@/components/ui/FilterPanel";
import { Modal } from "@/components/ui/Modal";

export interface ReturnsPageClientProps {
  initialReturns: ReturnWithRelations[];
}

interface FilterState {
  customerName: string;
  dateFrom: string;
  dateTo: string;
}

const defaultFilters: FilterState = { customerName: "", dateFrom: "", dateTo: "" };

const refundMethodLabels: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  STORE_CREDIT: "Store Credit",
};

function buildQuery(filters: FilterState): string {
  const params = new URLSearchParams();
  if (filters.customerName) params.set("customerName", filters.customerName);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  const qs = params.toString();
  return qs ? `/api/returns?${qs}` : "/api/returns";
}

export function ReturnsPageClient({ initialReturns }: ReturnsPageClientProps) {
  const { invoicePrefix } = useAppSettings();
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [detail, setDetail] = useState<ReturnWithRelations | null>(null);

  const isDefault = !filters.customerName && !filters.dateFrom && !filters.dateTo;
  const key = useMemo(() => buildQuery(filters), [filters]);
  const { data: returns } = useSWR<ReturnWithRelations[]>(key, fetcher, {
    fallbackData: isDefault ? initialReturns : undefined,
  });

  const activeCount = (filters.customerName ? 1 : 0) + (filters.dateFrom ? 1 : 0) + (filters.dateTo ? 1 : 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Returns</h1>
          <p className="text-sm text-muted">Customer returns and the stock/refunds they generated.</p>
        </div>
        <Link href="/returns/new">
          <Button>New Return</Button>
        </Link>
      </div>

      <FilterPanel
        value={filters}
        defaultValue={defaultFilters}
        activeCount={activeCount}
        onApply={setFilters}
        renderFields={(draft, setDraft) => (
          <>
            <Input
              label="Customer Name"
              value={draft.customerName}
              onChange={(e) => setDraft({ customerName: e.target.value })}
            />
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

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Return #</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Bill</th>
              <th className="px-4 py-3 font-medium">Refund</th>
              <th className="px-4 py-3 font-medium">Method</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {(returns ?? []).map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-sm font-medium text-foreground">RT-{String(r.returnNumber).padStart(4, "0")}</td>
                <td className="px-4 py-3 text-sm text-muted">{formatDateTime(r.createdAt)}</td>
                <td className="px-4 py-3 text-sm text-foreground">{r.customerName}</td>
                <td className="px-4 py-3 text-sm text-muted">
                  {r.bill ? formatBillNumber(r.bill.billNumber, invoicePrefix) : "—"}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-foreground">{formatPrice(r.refundAmount)}</td>
                <td className="px-4 py-3 text-sm text-foreground">{refundMethodLabels[r.refundMethod]}</td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="secondary" onClick={() => setDetail(r)}>
                    View
                  </Button>
                </td>
              </tr>
            ))}
            {(returns ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted">
                  No returns match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `RT-${String(detail.returnNumber).padStart(4, "0")}` : ""}>
        {detail && (
          <div className="flex flex-col gap-3 text-sm">
            <p>
              <strong>Customer:</strong> {detail.customerName}
            </p>
            {detail.bill && (
              <p>
                <strong>Original Bill:</strong> {formatBillNumber(detail.bill.billNumber, invoicePrefix)}
              </p>
            )}
            {detail.reason && (
              <p>
                <strong>Reason:</strong> {detail.reason}
              </p>
            )}
            <div className="flex flex-col gap-2">
              {detail.lineItems.map((line) => (
                <div key={line.id} className="flex justify-between rounded-lg border border-border p-2">
                  <span>{line.itemName}</span>
                  <span>{formatPrice(line.amount)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold text-foreground">
              <span>Refund Total ({refundMethodLabels[detail.refundMethod]})</span>
              <span>{formatPrice(detail.refundAmount)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
