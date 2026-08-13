"use client";

import useSWR from "swr";
import type { CategoryModel } from "@/types";
import { fetcher, postJson, patchJson, deleteJson } from "@/lib/fetcher";
import { useToast } from "@/components/ui/Toast";
import { AddCategoryForm } from "./AddCategoryForm";
import { CategoryList } from "./CategoryList";

export interface CategoriesPageClientProps {
  initialCategories: CategoryModel[];
}

export function CategoriesPageClient({ initialCategories }: CategoriesPageClientProps) {
  const { showToast } = useToast();
  const { data: categories, mutate } = useSWR<CategoryModel[]>(
    "/api/categories",
    fetcher,
    { fallbackData: initialCategories },
  );

  async function handleAdd(name: string, parentId: string | null) {
    const created = await postJson<CategoryModel>("/api/categories", { name, parentId });
    await mutate((prev) => [...(prev ?? []), created].sort((a, b) => a.name.localeCompare(b.name)), {
      revalidate: false,
    });
    showToast(`Added "${created.name}"`);
  }

  async function handleDelete(id: string) {
    await deleteJson(`/api/categories/${id}`);
    // Deleting a parent cascades its subcategories too, so strip both the
    // deleted row and anything that pointed at it as a parent — otherwise
    // orphaned children linger in the cache until a natural revalidate.
    await mutate((prev) => (prev ?? []).filter((c) => c.id !== id && c.parentId !== id), { revalidate: false });
    showToast("Category deleted");
  }

  async function handleEdit(id: string, input: { name: string; parentId: string | null }) {
    const updated = await patchJson<CategoryModel>(`/api/categories/${id}`, input);
    await mutate(
      (prev) =>
        (prev ?? [])
          .map((c) => (c.id === id ? updated : c))
          .sort((a, b) => a.name.localeCompare(b.name)),
      { revalidate: false },
    );
    showToast("Category updated");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Categories</h1>
        <p className="text-sm text-muted">
          Tag products for filtering. Deleting a category only removes the tag — products stay.
        </p>
      </div>
      <AddCategoryForm categories={categories ?? []} onAdd={handleAdd} />
      <CategoryList categories={categories ?? []} onDelete={handleDelete} onEdit={handleEdit} />
    </div>
  );
}
