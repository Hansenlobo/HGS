"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { CategoryModel } from "@/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ProductOrCustomPicker, type PickerResult } from "@/components/shared/ProductOrCustomPicker";
import { CreditAccountItemRow } from "./CreditAccountItemRow";
import {
  draftFromProduct,
  draftFromProductWithKind,
  draftFromCustomItem,
  type CreditAccountItemDraft,
} from "./creditAccountItemDraft";

export interface CreditAccountItemGridProps {
  categories: CategoryModel[];
  lines: CreditAccountItemDraft[];
  percentageIncrease: number;
  onLinesChange: (lines: CreditAccountItemDraft[]) => void;
}

export function CreditAccountItemGrid({
  categories,
  lines,
  percentageIncrease,
  onLinesChange,
}: CreditAccountItemGridProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  function handlePick(result: PickerResult) {
    const draft = "product" in result ? draftFromProduct(result.product) : draftFromCustomItem(result.customItemName);
    onLinesChange([...lines, draft]);
    setPickerOpen(false);
  }

  function updateLine(key: string, patch: Partial<CreditAccountItemDraft>) {
    onLinesChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: string) {
    onLinesChange(lines.filter((l) => l.key !== key));
  }

  function addVariant(afterKey: string, saleKind: CreditAccountItemDraft["saleKind"]) {
    const source = lines.find((l) => l.key === afterKey);
    if (!source?.product) return;
    const draft = draftFromProductWithKind(source.product, saleKind);
    const index = lines.findIndex((l) => l.key === afterKey);
    onLinesChange([...lines.slice(0, index + 1), draft, ...lines.slice(index + 1)]);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Items</h2>
        <Button type="button" size="sm" variant="secondary" onClick={() => setPickerOpen(true)}>
          <Plus size={16} /> Add Item
        </Button>
      </div>

      {lines.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted">
          No items yet — add at least one.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="py-3 pl-4 pr-3 font-medium">Item</th>
                <th className="py-3 pr-3 font-medium">Quantity</th>
                <th className="py-3 pr-3 font-medium">Rate</th>
                <th className="py-3 pr-3 font-medium">Discount</th>
                <th className="py-3 pr-3 font-medium">Est. Amount</th>
                <th className="py-3 pr-4 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <CreditAccountItemRow
                  key={line.key}
                  line={line}
                  percentageIncrease={percentageIncrease}
                  onChange={(patch) => updateLine(line.key, patch)}
                  onRemove={() => removeLine(line.key)}
                  onAddVariant={(saleKind) => addVariant(line.key, saleKind)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Add Item">
        {pickerOpen && <ProductOrCustomPicker categories={categories} onSelect={handlePick} />}
      </Modal>
    </div>
  );
}
