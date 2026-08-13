"use client";

import { useEffect, useState } from "react";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import type { CategoryModel } from "@/types";
import { groupCategories, toggleCategoryFilter } from "@/lib/categories/categoryTree";
import { Chip } from "@/components/ui/Chip";

export interface ProductFilterState {
  search: string;
  categoryIds: string[];
  outOfStock: boolean;
  lowStock: boolean;
  inactive: boolean;
}

export interface ProductFiltersProps {
  categories: CategoryModel[];
  filters: ProductFilterState;
  onChange: (filters: ProductFilterState) => void;
}

export function ProductFilters({ categories, filters, onChange }: ProductFiltersProps) {
  const [searchText, setSearchText] = useState(filters.search);
  const [expandedParentIds, setExpandedParentIds] = useState<string[]>([]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchText !== filters.search) {
        onChange({ ...filters, search: searchText });
      }
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  function toggleCategory(id: string) {
    onChange({ ...filters, categoryIds: toggleCategoryFilter(filters.categoryIds, id, categories) });
  }

  function toggleExpanded(id: string) {
    setExpandedParentIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  const groups = groupCategories(categories);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          inputMode="search"
          aria-label="Search products by name or notes"
          placeholder="Search by name or notes…"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="h-11 w-full rounded-lg border border-border bg-surface pl-10 pr-3 text-base text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <Chip
          active={filters.outOfStock}
          tone="danger"
          onClick={() => onChange({ ...filters, outOfStock: !filters.outOfStock })}
        >
          Out of Stock
        </Chip>
        <Chip
          active={filters.lowStock}
          tone="warning"
          onClick={() => onChange({ ...filters, lowStock: !filters.lowStock })}
        >
          Low Stock
        </Chip>
        <Chip
          active={filters.inactive}
          onClick={() => onChange({ ...filters, inactive: !filters.inactive })}
        >
          Inactive
        </Chip>
        {groups.length > 0 && (
          <span className="mx-1 hidden h-10 w-px shrink-0 bg-border sm:block" aria-hidden />
        )}
        {groups.map(({ parent, children }) => (
          <span key={parent.id} className="flex items-center gap-0.5">
            <Chip
              active={filters.categoryIds.includes(parent.id)}
              onClick={() => {
                if (!filters.categoryIds.includes(parent.id) && !expandedParentIds.includes(parent.id)) {
                  setExpandedParentIds((prev) => [...prev, parent.id]);
                }
                toggleCategory(parent.id);
              }}
            >
              {parent.name}
            </Chip>
            {children.length > 0 && (
              <button
                type="button"
                aria-label={expandedParentIds.includes(parent.id) ? `Collapse ${parent.name}` : `Show ${parent.name} subcategories`}
                onClick={() => toggleExpanded(parent.id)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-black/5 dark:hover:bg-white/5"
              >
                {expandedParentIds.includes(parent.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            )}
          </span>
        ))}
      </div>

      {groups.map(
        ({ parent, children }) =>
          children.length > 0 &&
          expandedParentIds.includes(parent.id) && (
            <div
              key={`${parent.id}-children`}
              className="-mx-4 flex gap-2 overflow-x-auto pl-6 px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pl-8"
            >
              {children.map((child) => (
                <Chip key={child.id} active={filters.categoryIds.includes(child.id)} onClick={() => toggleCategory(child.id)}>
                  {child.name}
                </Chip>
              ))}
            </div>
          ),
      )}
    </div>
  );
}
