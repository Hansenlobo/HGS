import type { CategoryModel } from "@/types";

export interface CategoryGroup {
  parent: CategoryModel;
  children: CategoryModel[];
}

/** Buckets a flat category list (as returned by GET /api/categories) into
 * top-level categories each paired with their direct subcategories.
 * Nesting is exactly one level, so this is the only grouping shape needed. */
export function groupCategories(categories: CategoryModel[]): CategoryGroup[] {
  const parents = categories.filter((c) => !c.parentId);
  return parents.map((parent) => ({
    parent,
    children: categories.filter((c) => c.parentId === parent.id),
  }));
}

export interface FlatCategoryOption {
  id: string;
  label: string;
  depth: number;
}

/** Parent immediately followed by its children, for feeding a flat
 * options list (e.g. MultiSelectChips) while still conveying hierarchy
 * via `depth`. */
export function flattenForSelect(categories: CategoryModel[]): FlatCategoryOption[] {
  const result: FlatCategoryOption[] = [];
  for (const { parent, children } of groupCategories(categories)) {
    result.push({ id: parent.id, label: parent.name, depth: 0 });
    for (const child of children) {
      result.push({ id: child.id, label: child.name, depth: 1 });
    }
  }
  return result;
}

/** Toggles `id` in/out of a multi-select category filter, keeping a
 * parent's own selection and any single one of its subcategories mutually
 * exclusive within that one parent's group (selecting a subcategory only
 * "narrows" if its parent isn't also selected, since a selected parent's
 * filter already expands to cover every one of its subcategories server-side —
 * see expandCategoryIds). Other parent groups keep OR-ing normally. */
export function toggleCategoryFilter(selected: string[], id: string, categories: CategoryModel[]): string[] {
  if (selected.includes(id)) {
    return selected.filter((s) => s !== id);
  }

  const target = categories.find((c) => c.id === id);
  if (!target) return [...selected, id];

  if (target.parentId) {
    return [...selected.filter((s) => s !== target.parentId), id];
  }

  const childIds = new Set(categories.filter((c) => c.parentId === id).map((c) => c.id));
  return [...selected.filter((s) => !childIds.has(s)), id];
}
