"use client";

import { useState } from "react";
import type { ClearanceItemModel } from "@/types";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { ClearanceStockTableRow } from "./ClearanceStockTableRow";

export interface ClearanceStockListProps {
  items: ClearanceItemModel[];
  onEdit: (item: ClearanceItemModel) => void;
  onDelete: (item: ClearanceItemModel) => void;
  onMarkSold: (item: ClearanceItemModel) => void;
}

export function ClearanceStockList({ items, onEdit, onDelete, onMarkSold }: ClearanceStockListProps) {
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);

  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No clearance items match your filters.</p>;
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[840px] text-left">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Photo</th>
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Qty</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Added</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <ClearanceStockTableRow
                key={item.id}
                item={item}
                onEdit={() => onEdit(item)}
                onDelete={() => onDelete(item)}
                onMarkSold={() => onMarkSold(item)}
                onExpandPhoto={setExpandedPhoto}
              />
            ))}
          </tbody>
        </table>
      </div>

      <ImageLightbox src={expandedPhoto} alt="Clearance item" onClose={() => setExpandedPhoto(null)} />
    </>
  );
}
