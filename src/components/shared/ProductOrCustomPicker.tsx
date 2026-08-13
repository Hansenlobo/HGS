"use client";

import { useState } from "react";
import useSWR from "swr";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import type { ProductWithRelations, CategoryModel } from "@/types";
import { fetcher } from "@/lib/fetcher";
import { groupCategories, toggleCategoryFilter } from "@/lib/categories/categoryTree";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";

export type PickerResult = { product: ProductWithRelations } | { customItemName: string };

export interface ProductOrCustomPickerProps {
  categories: CategoryModel[];
  onSelect: (result: PickerResult) => void;
}

/** Search/select a catalog product, or switch to a "Custom Item" tab and
 * type a free name. Shared identically across Temporary Orders, Normal
 * Billing, Party Billing, Credit-Account "Add Products", and Returns —
 * knows nothing about pricing or sale types, it only ever hands back a
 * product reference or a custom item name. Product search only ever
 * returns active products, matching the rule that inactive products are
 * hidden from billing/selection lists. */
export function ProductOrCustomPicker({ categories, onSelect }: ProductOrCustomPickerProps) {
  const [mode, setMode] = useState<"product" | "custom">("product");
  const [search, setSearch] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [expandedParentIds, setExpandedParentIds] = useState<string[]>([]);
  const [customName, setCustomName] = useState("");

  const qs = new URLSearchParams();
  if (search) qs.set("search", search);
  for (const id of categoryIds) qs.append("categoryId", id);
  const { data: products } = useSWR<ProductWithRelations[]>(
    `/api/products?${qs.toString()}`,
    fetcher,
  );

  const groups = groupCategories(categories);

  function toggleCategory(id: string) {
    setCategoryIds((prev) => toggleCategoryFilter(prev, id, categories));
  }

  function toggleExpanded(id: string) {
    setExpandedParentIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        options={[
          { value: "product" as const, label: "Catalog Product" },
          { value: "custom" as const, label: "Custom Item" },
        ]}
        value={mode}
        onChange={setMode}
      />

      {mode === "product" ? (
        <>
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-base text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {groups.length > 0 && (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {groups.map(({ parent, children }) => (
                <span key={parent.id} className="flex items-center gap-0.5">
                  <Chip
                    active={categoryIds.includes(parent.id)}
                    onClick={() => {
                      if (!categoryIds.includes(parent.id) && !expandedParentIds.includes(parent.id)) {
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
                      aria-label={
                        expandedParentIds.includes(parent.id)
                          ? `Collapse ${parent.name}`
                          : `Show ${parent.name} subcategories`
                      }
                      onClick={() => toggleExpanded(parent.id)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      {expandedParentIds.includes(parent.id) ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
          {groups.map(
            ({ parent, children }) =>
              children.length > 0 &&
              expandedParentIds.includes(parent.id) && (
                <div key={`${parent.id}-children`} className="-mx-1 flex gap-2 overflow-x-auto pl-4 px-1 pb-1">
                  {children.map((child) => (
                    <Chip
                      key={child.id}
                      active={categoryIds.includes(child.id)}
                      onClick={() => toggleCategory(child.id)}
                    >
                      {child.name}
                    </Chip>
                  ))}
                </div>
              ),
          )}
          <div className="flex max-h-64 flex-col overflow-y-auto rounded-lg border border-border">
            {(products ?? []).length === 0 && (
              <p className="p-4 text-center text-sm text-muted">No products found.</p>
            )}
            {(products ?? []).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect({ product: p })}
                className="flex items-center justify-between border-b border-border px-3 py-2 text-left last:border-0 hover:bg-black/5 dark:hover:bg-white/5"
              >
                <span className="text-sm font-medium text-foreground">{p.name}</span>
                <span className="text-xs text-muted">{p.saleType}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Custom item name"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
            />
          </div>
          <Button
            type="button"
            onClick={() => {
              const trimmed = customName.trim();
              if (!trimmed) return;
              onSelect({ customItemName: trimmed });
              setCustomName("");
            }}
          >
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
