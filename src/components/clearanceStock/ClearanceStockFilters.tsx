"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { FilterPanel } from "@/components/ui/FilterPanel";

export interface ClearanceStockFilterState {
  search: string;
  status: string | null;
  dateFrom: string;
  dateTo: string;
  minPrice: string;
  maxPrice: string;
}

export interface ClearanceStockFiltersProps {
  filters: ClearanceStockFilterState;
  defaultFilters: ClearanceStockFilterState;
  onChange: (filters: ClearanceStockFilterState) => void;
}

const statusOptions = [
  { value: "AVAILABLE", label: "Available" },
  { value: "SOLD", label: "Sold" },
];

export function ClearanceStockFilters({ filters, defaultFilters, onChange }: ClearanceStockFiltersProps) {
  const [text, setText] = useState(filters.search);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (text !== filters.search) onChange({ ...filters, search: text });
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const activeCount =
    (filters.status ? 1 : 0) +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0) +
    (filters.minPrice ? 1 : 0) +
    (filters.maxPrice ? 1 : 0);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          placeholder="Search by item name or description…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="h-11 w-full rounded-lg border border-border bg-surface pl-10 pr-3 text-base text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <FilterPanel
        value={filters}
        defaultValue={{ ...defaultFilters, search: filters.search }}
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
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-foreground">Min Price (₹)</span>
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={draft.minPrice}
                  onChange={(e) => setDraft({ minPrice: e.target.value })}
                  className="h-11 rounded-lg border border-border bg-surface px-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-foreground">Max Price (₹)</span>
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={draft.maxPrice}
                  onChange={(e) => setDraft({ maxPrice: e.target.value })}
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
