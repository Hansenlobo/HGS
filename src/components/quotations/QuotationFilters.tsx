"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { FilterPanel } from "@/components/ui/FilterPanel";

export interface QuotationFilterState {
  customerName: string;
  status: string | null;
  dateFrom: string;
  dateTo: string;
}

export interface QuotationFiltersProps {
  filters: QuotationFilterState;
  defaultFilters: QuotationFilterState;
  onChange: (filters: QuotationFilterState) => void;
}

const statusOptions = [
  { value: "DRAFT", label: "Draft" },
  { value: "PRINTED", label: "Printed" },
  { value: "CONVERTED", label: "Converted" },
];

export function QuotationFilters({ filters, defaultFilters, onChange }: QuotationFiltersProps) {
  const [text, setText] = useState(filters.customerName);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (text !== filters.customerName) onChange({ ...filters, customerName: text });
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const activeCount = (filters.status ? 1 : 0) + (filters.dateFrom ? 1 : 0) + (filters.dateTo ? 1 : 0);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          placeholder="Search by customer name…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="h-11 w-full rounded-lg border border-border bg-surface pl-10 pr-3 text-base text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <FilterPanel
        value={filters}
        defaultValue={{ ...defaultFilters, customerName: filters.customerName }}
        activeCount={activeCount}
        onApply={onChange}
        renderFields={(draft, setDraft) => (
          <>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-foreground">Status</span>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((s) => (
                  <Chip
                    key={s.value}
                    active={draft.status === s.value}
                    onClick={() => setDraft({ status: draft.status === s.value ? null : s.value })}
                  >
                    {s.label}
                  </Chip>
                ))}
              </div>
            </div>
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
    </div>
  );
}
