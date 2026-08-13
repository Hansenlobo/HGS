"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { CategoryModel } from "@/types";
import { groupCategories } from "@/lib/categories/categoryTree";
import { Chip } from "@/components/ui/Chip";

export interface CategoryMultiSelectProps {
  label?: string;
  categories: CategoryModel[];
  selected: string[];
  onChange: (selected: string[]) => void;
  emptyHint?: string;
}

/** Tags a product with any combination of categories and subcategories —
 * unlike filtering (toggleCategoryFilter), selecting a parent and one of
 * its subcategories at the same time is perfectly valid here, so this is
 * a plain independent multi-select, just tree-aware and collapsible so a
 * growing category tree doesn't turn into a wall of chips. */
export function CategoryMultiSelect({
  label,
  categories,
  selected,
  onChange,
  emptyHint = "No categories yet",
}: CategoryMultiSelectProps) {
  const groups = groupCategories(categories);
  const [expandedIds, setExpandedIds] = useState<string[]>(() =>
    groups.filter((g) => g.children.some((c) => selected.includes(c.id))).map((g) => g.parent.id),
  );

  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-sm font-medium text-foreground">{label}</span>}
      {groups.length === 0 ? (
        <p className="text-sm text-muted">{emptyHint}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {groups.map(({ parent, children }) => (
              <span key={parent.id} className="flex items-center gap-0.5">
                <Chip active={selected.includes(parent.id)} onClick={() => toggle(parent.id)}>
                  {parent.name}
                </Chip>
                {children.length > 0 && (
                  <button
                    type="button"
                    aria-label={
                      expandedIds.includes(parent.id)
                        ? `Collapse ${parent.name}`
                        : `Show ${parent.name} subcategories`
                    }
                    onClick={() => toggleExpanded(parent.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    {expandedIds.includes(parent.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                )}
              </span>
            ))}
          </div>
          {groups.map(
            ({ parent, children }) =>
              children.length > 0 &&
              expandedIds.includes(parent.id) && (
                <div key={`${parent.id}-children`} className="flex flex-wrap gap-2 pl-4">
                  {children.map((child) => (
                    <Chip key={child.id} active={selected.includes(child.id)} onClick={() => toggle(child.id)}>
                      {child.name}
                    </Chip>
                  ))}
                </div>
              ),
          )}
        </div>
      )}
    </div>
  );
}
