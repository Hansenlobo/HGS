"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import type { AnalyticsData } from "@/lib/analytics/types";
import { fetcher } from "@/lib/fetcher";
import { formatPrice } from "@/lib/stock/stockDisplay";
import { formatDate } from "@/lib/formatDate";
import { formatExpenseCategory, type ExpenseCategoryValue } from "@/lib/expenses/expenseDisplay";
import { toCsv, downloadCsv } from "@/lib/csv";
import { Button } from "@/components/ui/Button";
import { FilterPanel } from "@/components/ui/FilterPanel";

export interface AnalyticsPageClientProps {
  initialData: AnalyticsData;
}

interface FilterState {
  dateFrom: string;
  dateTo: string;
}

const defaultFilters: FilterState = { dateFrom: "", dateTo: "" };

function buildQuery(filters: FilterState): string {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  const qs = params.toString();
  return qs ? `/api/analytics?${qs}` : "/api/analytics";
}

export function AnalyticsPageClient({ initialData }: AnalyticsPageClientProps) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const isDefault = !filters.dateFrom && !filters.dateTo;
  const key = useMemo(() => buildQuery(filters), [filters]);
  const { data } = useSWR<AnalyticsData>(key, fetcher, {
    fallbackData: isDefault ? initialData : undefined,
  });

  const activeCount = (filters.dateFrom ? 1 : 0) + (filters.dateTo ? 1 : 0);
  const d = data ?? initialData;

  function exportAll() {
    const sections: string[] = [];
    sections.push(
      "SALES BY DAY\r\n" + toCsv([{ key: "date", label: "Date" }, { key: "revenue", label: "Revenue" }], d.sales.byDay),
    );
    sections.push(
      "TOP PRODUCTS\r\n" +
        toCsv(
          [
            { key: "name", label: "Product" },
            { key: "qtySold", label: "Qty Sold" },
            { key: "revenue", label: "Revenue" },
          ],
          d.products,
        ),
    );
    sections.push(
      "TOP CUSTOMERS\r\n" +
        toCsv(
          [
            { key: "name", label: "Customer" },
            { key: "billCount", label: "Bills" },
            { key: "revenue", label: "Revenue" },
          ],
          d.customers,
        ),
    );
    sections.push(
      "EXPENSES BY CATEGORY\r\n" +
        toCsv([{ key: "category", label: "Category" }, { key: "amount", label: "Amount" }], d.expenses.byCategory),
    );
    sections.push(
      "OUTSTANDING CREDITS\r\n" +
        toCsv(
          [
            { key: "billLabel", label: "Bill" },
            { key: "customerName", label: "Customer" },
            { key: "pending", label: "Pending" },
          ],
          d.credits.rows,
        ),
    );
    downloadCsv(`analytics-${new Date().toISOString().slice(0, 10)}.csv`, sections.join("\r\n\r\n"));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="no-print flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
          <p className="text-sm text-muted">Sales, products, customers, expenses, credits, and profit.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={exportAll}>
            Export CSV
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            Print
          </Button>
        </div>
      </div>

      <div className="no-print">
        <FilterPanel
          value={filters}
          defaultValue={defaultFilters}
          activeCount={activeCount}
          onApply={setFilters}
          renderFields={(draft, setDraft) => (
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
          )}
        />
      </div>

      <div className="print-sheet grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total Revenue" value={formatPrice(d.sales.totalRevenue)} />
        <SummaryCard label="Bills" value={String(d.sales.billCount)} />
        <SummaryCard label="Total Expenses" value={formatPrice(d.expenses.total)} />
        <SummaryCard label="Net Profit" value={formatPrice(d.profit.netProfit)} />
      </div>

      <Section title="Sales">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SummaryCard label="Normal Bills" value={`${d.sales.byType.NORMAL.count} · ${formatPrice(d.sales.byType.NORMAL.revenue)}`} />
          <SummaryCard label="Party Bills" value={`${d.sales.byType.PARTY.count} · ${formatPrice(d.sales.byType.PARTY.revenue)}`} />
        </div>
        <Table
          columns={["Date", "Revenue"]}
          rows={d.sales.byDay.map((r) => [formatDate(r.date), formatPrice(r.revenue)])}
          emptyLabel="No sales in this range."
        />
      </Section>

      <Section title="Top Products">
        <Table
          columns={["Product", "Qty Sold", "Revenue"]}
          rows={d.products.slice(0, 15).map((p) => [p.name, String(p.qtySold), formatPrice(p.revenue)])}
          emptyLabel="No sales in this range."
        />
      </Section>

      <Section title="Top Customers">
        <Table
          columns={["Customer", "Bills", "Revenue"]}
          rows={d.customers.slice(0, 15).map((c) => [c.name, String(c.billCount), formatPrice(c.revenue)])}
          emptyLabel="No sales in this range."
        />
      </Section>

      <Section title="Expenses">
        <Table
          columns={["Category", "Amount"]}
          rows={d.expenses.byCategory.map((e) => [
            formatExpenseCategory(e.category as ExpenseCategoryValue),
            formatPrice(e.amount),
          ])}
          emptyLabel="No expenses in this range."
        />
      </Section>

      <Section title={`Outstanding Credits (${formatPrice(d.credits.total)})`}>
        <Table
          columns={["Bill", "Customer", "Pending"]}
          rows={d.credits.rows.map((c) => [c.billLabel, c.customerName, formatPrice(c.pending)])}
          emptyLabel="No outstanding balances."
        />
      </Section>

      <Section title="Profit">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Shop Revenue" value={formatPrice(d.profit.shopRevenue)} />
          <SummaryCard label="Party Margin" value={formatPrice(d.profit.marginRevenue)} />
          <SummaryCard label="Expenses" value={formatPrice(d.profit.expenseTotal)} />
          <SummaryCard label="Net Profit" value={formatPrice(d.profit.netProfit)} />
        </div>
        <p className="mt-2 text-xs text-muted">
          Net Profit = Total Revenue − Logged Expenses. This is a simplified figure since per-item cost of
          goods isn&apos;t tracked separately from the selling price.
        </p>
      </Section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}

function Table({ columns, rows, emptyLabel }: { columns: string[]; rows: string[][]; emptyLabel: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[480px] text-left">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
            {columns.map((c) => (
              <th key={c} className="px-4 py-3 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-3 text-sm text-foreground">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-muted">
                {emptyLabel}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
