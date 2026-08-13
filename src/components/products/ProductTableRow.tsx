"use client";

import { useState } from "react";
import type { ProductWithRelations } from "@/types";
import { formatPricingSummary } from "@/lib/stock/stockDisplay";
import { StockDisplay } from "./StockDisplay";
import { StockBadge } from "./StockBadge";
import { Button } from "@/components/ui/Button";
import { ImageLightbox } from "@/components/ui/ImageLightbox";

export interface ProductTableRowProps {
  product: ProductWithRelations;
  onEdit: () => void;
  onAdjust: () => void;
  onReceive: () => void;
  onToggleActive: () => void;
}

export function ProductTableRow({ product, onEdit, onAdjust, onReceive, onToggleActive }: ProductTableRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-3 pl-4 pr-4">
        <div className="flex items-center gap-3">
          {product.imageUrl && (
            <button
              type="button"
              aria-label={`Expand photo of ${product.name}`}
              onClick={() => setExpanded(true)}
              className="shrink-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-10 w-10 rounded-lg border border-border object-cover"
              />
            </button>
          )}
          <div className="flex flex-col gap-1">
            <span className="font-medium text-foreground">{product.name}</span>
            <div className="flex flex-wrap gap-1">
              {!product.isActive && (
                <span className="w-fit rounded-full bg-black/5 px-2 py-0.5 text-xs text-muted dark:bg-white/10">
                  Inactive
                </span>
              )}
              {product.isPartyProduct && (
                <span className="w-fit rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  Party
                </span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="py-3 pr-4">
        <div className="flex flex-wrap gap-1">
          {product.categories.map((pc) => (
            <span
              key={pc.categoryId}
              className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-muted dark:bg-white/10"
            >
              {pc.category.name}
            </span>
          ))}
        </div>
      </td>
      <td className="py-3 pr-4">
        <div className="flex flex-col gap-1">
          <StockDisplay product={product} />
          <StockBadge product={product} />
        </div>
      </td>
      <td className="py-3 pr-4 text-sm text-foreground">{formatPricingSummary(product)}</td>
      <td className="py-3 pr-4 text-sm text-muted">{product.shelfLocation ?? "—"}</td>
      <td className="py-3 pr-4">
        <div className="flex flex-col items-end gap-1">
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button variant="secondary" size="sm" onClick={onReceive}>
              Receive
            </Button>
            <Button variant="secondary" size="sm" onClick={onAdjust}>
              Adjust
            </Button>
          </div>
          <button
            type="button"
            onClick={onToggleActive}
            className="text-xs text-muted underline-offset-2 hover:underline"
          >
            {product.isActive ? "Mark Inactive" : "Mark Active"}
          </button>
        </div>
      </td>

      <ImageLightbox
        src={expanded ? (product.imageUrl ?? null) : null}
        alt={product.name}
        onClose={() => setExpanded(false)}
      />
    </tr>
  );
}
