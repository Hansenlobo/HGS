"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { CategoryModel } from "@/types";
import { groupCategories } from "@/lib/categories/categoryTree";
import { DeleteCategoryButton } from "./DeleteCategoryButton";
import { EditCategoryButton } from "./EditCategoryButton";

export interface CategoryListProps {
  categories: CategoryModel[];
  onDelete: (id: string) => Promise<void>;
  onEdit: (id: string, input: { name: string; parentId: string | null }) => Promise<void>;
}

export function CategoryList({ categories, onDelete, onEdit }: CategoryListProps) {
  const [collapsedIds, setCollapsedIds] = useState<string[]>([]);

  if (categories.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No categories yet.</p>;
  }

  const groups = groupCategories(categories);
  const allTopLevel = groups.map((g) => g.parent);

  function toggleCollapsed(id: string) {
    setCollapsedIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
      {groups.map(({ parent, children }) => {
        const collapsed = collapsedIds.includes(parent.id);
        return (
          <li key={parent.id}>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-1">
                {children.length > 0 ? (
                  <button
                    type="button"
                    aria-label={collapsed ? `Expand ${parent.name}` : `Collapse ${parent.name}`}
                    onClick={() => toggleCollapsed(parent.id)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                  </button>
                ) : (
                  <span className="w-7 shrink-0" aria-hidden />
                )}
                <span className="text-sm font-medium text-foreground">{parent.name}</span>
                {children.length > 0 && (
                  <span className="text-xs text-muted">({children.length})</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <EditCategoryButton
                  category={parent}
                  parentOptions={allTopLevel.filter((c) => c.id !== parent.id && children.length === 0)}
                  onSave={(input) => onEdit(parent.id, input)}
                />
                <DeleteCategoryButton
                  name={parent.name}
                  childCount={children.length}
                  onDelete={() => onDelete(parent.id)}
                />
              </div>
            </div>
            {children.length > 0 && !collapsed && (
              <ul className="divide-y divide-border border-t border-border bg-black/[0.02] dark:bg-white/[0.02]">
                {children.map((child) => (
                  <li key={child.id} className="flex items-center justify-between py-3 pr-4 pl-10">
                    <span className="text-sm text-foreground">{child.name}</span>
                    <div className="flex items-center gap-1">
                      <EditCategoryButton
                        category={child}
                        parentOptions={allTopLevel}
                        onSave={(input) => onEdit(child.id, input)}
                      />
                      <DeleteCategoryButton name={child.name} onDelete={() => onDelete(child.id)} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
