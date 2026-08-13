"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export interface DeleteCategoryButtonProps {
  name: string;
  childCount?: number;
  onDelete: () => Promise<void>;
}

export function DeleteCategoryButton({ name, childCount = 0, onDelete }: DeleteCategoryButtonProps) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    setDeleting(true);
    try {
      await onDelete();
      setOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  const description =
    childCount > 0
      ? `Products keep their other category tags and are not deleted. This also deletes its ${childCount} subcategor${childCount === 1 ? "y" : "ies"}.`
      : "Products keep their other category tags and are not deleted. This only removes the category itself.";

  return (
    <>
      <button
        type="button"
        aria-label={`Delete ${name}`}
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-full text-danger hover:bg-danger-bg"
      >
        <Trash2 size={18} />
      </button>
      <ConfirmDialog
        open={open}
        title={`Delete "${name}"?`}
        description={description}
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        danger
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
