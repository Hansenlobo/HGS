"use client";

import { ImageOff } from "lucide-react";
import type { ClearanceItemModel } from "@/types";
import { formatPrice } from "@/lib/stock/stockDisplay";
import { formatDate } from "@/lib/formatDate";
import { Button } from "@/components/ui/Button";
import { ClearanceStatusBadge } from "./ClearanceStatusBadge";

export interface ClearanceStockTableRowProps {
  item: ClearanceItemModel;
  onEdit: () => void;
  onDelete: () => void;
  onMarkSold: () => void;
  onExpandPhoto: (url: string) => void;
}

export function ClearanceStockTableRow({ item, onEdit, onDelete, onMarkSold, onExpandPhoto }: ClearanceStockTableRowProps) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-3 pl-4 pr-4">
        {item.photoUrl ? (
          <button
            type="button"
            aria-label="Expand photo"
            onClick={() => onExpandPhoto(item.photoUrl!)}
            className="block h-12 w-12 overflow-hidden rounded-md border border-border"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.photoUrl} alt={item.itemName} className="h-full w-full object-cover" />
          </button>
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-border text-muted">
            <ImageOff size={16} />
          </div>
        )}
      </td>
      <td className="py-3 pr-4 text-sm font-medium text-foreground">{item.itemName}</td>
      <td className="py-3 pr-4 text-sm text-muted">{item.description || "—"}</td>
      <td className="py-3 pr-4 text-sm text-foreground">
        {formatPrice(item.discountedPrice)}
        {item.originalPrice != null && (
          <span className="ml-1.5 text-xs text-muted line-through">{formatPrice(item.originalPrice)}</span>
        )}
      </td>
      <td className="py-3 pr-4 text-sm text-muted">{item.quantityAvailable ?? "—"}</td>
      <td className="py-3 pr-4">
        <ClearanceStatusBadge status={item.status} />
      </td>
      <td className="py-3 pr-4 text-sm text-muted">{formatDate(item.createdAt)}</td>
      <td className="py-3 pr-4">
        <div className="flex flex-wrap justify-end gap-2">
          {item.status === "AVAILABLE" && (
            <Button variant="primary" size="sm" onClick={onMarkSold}>
              Mark as Sold
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button variant="danger" size="sm" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </td>
    </tr>
  );
}
