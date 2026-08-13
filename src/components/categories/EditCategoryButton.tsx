"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import type { CategoryModel } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export interface EditCategoryButtonProps {
  category: CategoryModel;
  parentOptions: CategoryModel[];
  onSave: (input: { name: string; parentId: string | null }) => Promise<void>;
}

export function EditCategoryButton({ category, parentOptions, onSave }: EditCategoryButtonProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(category.name);
  const [parentId, setParentId] = useState(category.parentId ?? "");
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  function openModal() {
    setValue(category.name);
    setParentId(category.parentId ?? "");
    setError(undefined);
    setOpen(true);
  }

  async function handleSave() {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      await onSave({ name: trimmed, parentId: parentId || null });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label={`Edit ${category.name}`}
        onClick={openModal}
        className="flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-black/5 dark:hover:bg-white/5"
      >
        <Pencil size={18} />
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Edit Category"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button fullWidth onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            label="Category Name"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            error={error}
          />
          {parentOptions.length > 0 && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-foreground">Parent Category</span>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="h-11 rounded-lg border border-border bg-surface px-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">None — top-level</option>
                {parentOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    Under &quot;{c.name}&quot;
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </Modal>
    </>
  );
}
