import { prisma } from "@/lib/prisma";

/** Expands a set of requested category filter ids so that a selected
 * parent category also matches products tagged only with one of its
 * subcategories. A selected subcategory id passes through unchanged. */
export async function expandCategoryIds(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return ids;

  const all = await prisma.category.findMany({ select: { id: true, parentId: true } });
  const childrenOf = new Map<string, string[]>();
  for (const c of all) {
    if (c.parentId) {
      const list = childrenOf.get(c.parentId) ?? [];
      list.push(c.id);
      childrenOf.set(c.parentId, list);
    }
  }

  const expanded = new Set<string>();
  for (const id of ids) {
    expanded.add(id);
    for (const childId of childrenOf.get(id) ?? []) expanded.add(childId);
  }
  return [...expanded];
}
