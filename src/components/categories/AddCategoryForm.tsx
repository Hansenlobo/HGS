"use client";

import { useState } from "react";
import type { CategoryModel } from "@/types";
import { groupCategories } from "@/lib/categories/categoryTree";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export interface AddCategoryFormProps {
  categories: CategoryModel[];
  onAdd: (name: string, parentId: string | null) => Promise<void>;
}

export function AddCategoryForm({ categories, onAdd }: AddCategoryFormProps) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const topLevel = groupCategories(categories).map((g) => g.parent);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }
    setSubmitting(true);
    setError(undefined);
    try {
      await onAdd(trimmed, parentId || null);
      setName("");
      setParentId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="flex-1">
        <Input
          name="categoryName"
          aria-label="New category name"
          placeholder="New category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error}
        />
      </div>
      <select
        aria-label="Parent category"
        value={parentId}
        onChange={(e) => setParentId(e.target.value)}
        className="h-11 rounded-lg border border-border bg-surface px-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">None — top-level</option>
        {topLevel.map((c) => (
          <option key={c.id} value={c.id}>
            Under &quot;{c.name}&quot;
          </option>
        ))}
      </select>
      <Button type="submit" disabled={submitting} className="sm:mt-0">
        Add Category
      </Button>
    </form>
  );
}
