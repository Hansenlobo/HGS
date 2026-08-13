"use client";

import { useState } from "react";
import type { ProductWithRelations } from "@/types";
import { formatPricingSummary } from "@/lib/stock/stockDisplay";
import { StockDisplay } from "./StockDisplay";
import { StockBadge } from "./StockBadge";
import { Button } from "@/components/ui/Button";
import { ImageLightbox } from "@/components/ui/ImageLightbox";

export interface ProductCardProps {
  product: ProductWithRelations;
  onEdit: () => void;
  onAdjust: () => void;
  onReceive: () => void;
  onToggleActive: () => void;
}

export function ProductCard({ product, onEdit, onAdjust, onReceive, onToggleActive }: ProductCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
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
                className="h-12 w-12 rounded-lg border border-border object-cover"
              />
            </button>
          )}
          <div className="flex flex-col gap-1">
            <span className="font-medium text-foreground">{product.name}</span>
            {(product.categories.length > 0 || product.isPartyProduct) && (
              <div className="flex flex-wrap gap-1">
                {product.categories.map((pc) => (
                  <span
                    key={pc.categoryId}
                    className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-muted dark:bg-white/10"
                  >
                    {pc.category.name}
                  </span>
                ))}
                {product.isPartyProduct && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    Party
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        {!product.isActive && (
          <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-xs text-muted dark:bg-white/10">
            Inactive
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <StockDisplay product={product} />
        <StockBadge product={product} />
      </div>

      <div className="flex justify-between text-sm text-muted">
        <span>{formatPricingSummary(product)}</span>
        {product.shelfLocation && <span>Shelf {product.shelfLocation}</span>}
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="secondary" size="sm" fullWidth onClick={onEdit}>
          Edit
        </Button>
        <Button variant="secondary" size="sm" fullWidth onClick={onReceive}>
          Receive Stock
        </Button>
        <Button variant="secondary" size="sm" fullWidth onClick={onAdjust}>
          Adjust Stock
        </Button>
      </div>
      <button
        type="button"
        onClick={onToggleActive}
        className="text-left text-xs text-muted underline-offset-2 hover:underline"
      >
        {product.isActive ? "Mark Inactive" : "Mark Active"}
      </button>

      <ImageLightbox
        src={expanded ? (product.imageUrl ?? null) : null}
        alt={product.name}
        onClose={() => setExpanded(false)}
      />
    </div>
  );
}
