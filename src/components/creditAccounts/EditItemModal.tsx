"use client";

import { useState } from "react";
import type { CreditAccountWithRelations } from "@/types";
import type { CreditAccountListItem } from "./CreditAccountsPageClient";
import { patchJson } from "@/lib/fetcher";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatPrice } from "@/lib/stock/stockDisplay";
import { priceFieldForSaleKind } from "@/components/billing/lineDraft";
import { DiscountField } from "@/components/billing/DiscountField";
import type { DiscountType } from "@/lib/billing/pricing";

type CreditAccountItem = CreditAccountWithRelations["items"][number];

export interface EditItemModalProps {
  accountId: string;
  item: CreditAccountItem | null;
  percentageIncrease: number;
  onClose: () => void;
  onUpdated: (updated: CreditAccountListItem) => void;
}

export function EditItemModal({ accountId, item, percentageIncrease, onClose, onUpdated }: EditItemModalProps) {
  return (
    <Modal open={!!item} onClose={onClose} title={item ? `Edit — ${item.itemName}` : ""}>
      {item && (
        <EditItemForm
          key={item.id}
          accountId={accountId}
          item={item}
          percentageIncrease={percentageIncrease}
          onClose={onClose}
          onUpdated={onUpdated}
        />
      )}
    </Modal>
  );
}

function EditItemForm({
  accountId,
  item,
  percentageIncrease,
  onClose,
  onUpdated,
}: {
  accountId: string;
  item: CreditAccountItem;
  percentageIncrease: number;
  onClose: () => void;
  onUpdated: (updated: CreditAccountListItem) => void;
}) {
  const { showToast } = useToast();
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [rate, setRate] = useState(String(item.priceAtTimeTaken));
  const [rateLocked, setRateLocked] = useState(item.rateLocked);
  const [applyMarkup, setApplyMarkup] = useState(item.applyMarkup);
  const [discountType, setDiscountType] = useState<DiscountType | "">(item.discountType ?? "");
  const [discountValue, setDiscountValue] = useState(String(item.discountValue ?? 0));
  const [notes, setNotes] = useState(item.notes ?? "");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const isCustom = item.saleKind === "CUSTOM";
  const priceField = priceFieldForSaleKind(item.saleKind);
  const currentPrice = item.product && priceField ? item.product[priceField] : null;
  const priceSuggestions =
    item.product && priceField
      ? [
          ...(currentPrice != null ? [currentPrice] : []),
          ...Array.from(
            new Set(
              (item.product.priceHistory ?? [])
                .filter((h) => h.field === priceField && h.price !== currentPrice)
                .map((h) => h.price),
            ),
          ),
        ].slice(0, 3)
      : [];

  async function handleSubmit() {
    if (!quantity || Number(quantity) <= 0) {
      setError("Enter a valid quantity");
      return;
    }
    setError(undefined);
    setSubmitting(true);
    try {
      const updated = await patchJson<CreditAccountListItem>(`/api/credit-accounts/${accountId}/items/${item.id}`, {
        quantity,
        rate,
        rateLocked,
        applyMarkup: isCustom ? applyMarkup : undefined,
        discountType: discountType || undefined,
        discountValue,
        notes,
      });
      onUpdated(updated);
      showToast("Item updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!isCustom && (
        <p className="text-sm text-muted">
          Increasing quantity takes more stock; decreasing it puts stock back — logged either way.
        </p>
      )}
      <Input
        label={item.saleKind === "LENGTH_CUT" ? `Quantity (pieces at ${item.cutLength ?? 0})` : "Quantity"}
        type="number"
        inputMode="decimal"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        error={error}
      />

      <div>
        <Input
          label="Rate (₹)"
          type="number"
          step="0.01"
          inputMode="decimal"
          value={rate}
          onChange={(e) => {
            setRate(e.target.value);
            setRateLocked(true);
          }}
        />
        {!isCustom && (
          <p className="mt-1 text-xs text-muted">
            {rateLocked ? (
              <>
                Locked — won&apos;t re-price if the product&apos;s price changes.{" "}
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  onClick={() => {
                    setRateLocked(false);
                    if (currentPrice != null) setRate(String(currentPrice));
                  }}
                >
                  Reset to today&apos;s rate
                </button>
              </>
            ) : (
              "Live — follows the product's current price."
            )}
          </p>
        )}
        {priceSuggestions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {priceSuggestions.map((price) => (
              <button
                key={price}
                type="button"
                onClick={() => {
                  setRate(String(price));
                  setRateLocked(true);
                }}
                className="h-6 rounded-full border border-border px-2 text-[11px] text-muted hover:bg-black/5 dark:hover:bg-white/5"
              >
                {price === currentPrice ? `Current ${formatPrice(price)}` : formatPrice(price)}
              </button>
            ))}
          </div>
        )}
      </div>

      {isCustom && (
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={applyMarkup}
            onChange={(e) => setApplyMarkup(e.target.checked)}
          />
          <span className="text-sm text-foreground">Apply {percentageIncrease}% account markup</span>
        </label>
      )}

      <DiscountField
        discountType={discountType}
        onDiscountTypeChange={setDiscountType}
        discountValue={discountValue}
        onDiscountValueChange={setDiscountValue}
      />

      <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

      <div className="flex gap-2">
        <Button type="button" variant="secondary" fullWidth onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" fullWidth disabled={submitting} onClick={handleSubmit}>
          {submitting ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
