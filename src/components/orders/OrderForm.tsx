"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
import type { CategoryModel, OrderWithRelations, ProductWithRelations } from "@/types";
import { orderSchema } from "@/lib/validation/order.schema";
import { postJson, patchJson } from "@/lib/fetcher";
import { useCurrentUser } from "@/components/auth/CurrentUserProvider";
import { useToast } from "@/components/ui/Toast";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ProductOrCustomPicker, type PickerResult } from "@/components/shared/ProductOrCustomPicker";
import { defaultSaleKind, counterpartSaleKind, saleKindLabel, type SaleKind } from "@/components/billing/lineDraft";
import { SimpleSaleFields } from "@/components/billing/saleEntryFields/SimpleSaleFields";
import { LengthSaleFields } from "@/components/billing/saleEntryFields/LengthSaleFields";
import { BoxSaleFields } from "@/components/billing/saleEntryFields/BoxSaleFields";

type OrderProductRef = Pick<ProductWithRelations, "id" | "name" | "saleType" | "unitLabel">;

interface ItemDraft {
  key: string;
  product?: OrderProductRef;
  displayName: string;
  saleKind: SaleKind;
  quantity: string;
  cutLength: string;
  unit: string;
  remarks: string;
}

function draftFromOrder(order: OrderWithRelations): ItemDraft[] {
  return order.items.map((item) => ({
    key: item.id,
    product: item.product ?? undefined,
    displayName: item.product?.name ?? item.customItemName ?? "",
    saleKind: item.saleKind ?? (item.product ? defaultSaleKind(item.product) : "CUSTOM"),
    quantity: String(item.quantity),
    cutLength: item.cutLength != null ? String(item.cutLength) : "",
    unit: item.unit ?? "",
    remarks: item.remarks ?? "",
  }));
}

export interface OrderFormProps {
  mode: "create" | "edit";
  order?: OrderWithRelations;
  categories: CategoryModel[];
}

export function OrderForm({ mode, order, categories }: OrderFormProps) {
  const router = useRouter();
  const staffName = useCurrentUser().name;
  const { showToast } = useToast();

  const [customerName, setCustomerName] = useState(order?.customerName ?? "");
  const [customerPhone, setCustomerPhone] = useState(order?.customerPhone ?? "");
  const [customerNotes, setCustomerNotes] = useState(order?.customerNotes ?? "");
  const [items, setItems] = useState<ItemDraft[]>(order ? draftFromOrder(order) : []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [errors, setErrors] = useState<{ customerName?: string; items?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  function handlePick(result: PickerResult) {
    setItems((prev) => [
      ...prev,
      "product" in result
        ? {
            key: `${Date.now()}-${Math.random()}`,
            product: result.product,
            displayName: result.product.name,
            saleKind: defaultSaleKind(result.product),
            quantity: "1",
            cutLength: "",
            unit: "",
            remarks: "",
          }
        : {
            key: `${Date.now()}-${Math.random()}`,
            displayName: result.customItemName,
            saleKind: "CUSTOM",
            quantity: "1",
            cutLength: "",
            unit: "",
            remarks: "",
          },
    ]);
    setPickerOpen(false);
  }

  function updateItem(key: string, patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }

  function addVariant(afterKey: string, saleKind: SaleKind) {
    setItems((prev) => {
      const index = prev.findIndex((it) => it.key === afterKey);
      const source = prev[index];
      if (!source?.product) return prev;
      const draft: ItemDraft = {
        key: `${Date.now()}-${Math.random()}`,
        product: source.product,
        displayName: source.product.name,
        saleKind,
        quantity: "1",
        cutLength: "",
        unit: "",
        remarks: "",
      };
      return [...prev.slice(0, index + 1), draft, ...prev.slice(index + 1)];
    });
  }

  async function handleSubmit() {
    setErrors({});
    const candidate = {
      customerName,
      customerPhone,
      customerNotes,
      createdBy: staffName,
      items: items.map((it) => ({
        productId: it.product?.id,
        customItemName: it.product ? undefined : it.displayName,
        saleKind: it.product ? it.saleKind : undefined,
        quantity: it.quantity,
        cutLength: it.saleKind === "LENGTH_CUT" ? it.cutLength : undefined,
        unit: it.unit,
        remarks: it.remarks,
      })),
    };
    const parsed = orderSchema.safeParse(candidate);
    if (!parsed.success) {
      const next: { customerName?: string; items?: string } = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "customerName") next.customerName = issue.message;
        else if (issue.path[0] === "items") next.items = issue.message;
      }
      setErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "create") {
        const created = await postJson<OrderWithRelations>("/api/orders", parsed.data);
        showToast("Order saved");
        router.push(`/orders`);
        router.refresh();
        void created;
      } else if (order) {
        await patchJson(`/api/orders/${order.id}`, parsed.data);
        showToast("Order updated");
        router.push(`/orders`);
        router.refresh();
      }
    } catch (err) {
      setErrors({ items: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Customer Name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          error={errors.customerName}
        />
        <Input
          label="Phone Number"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
        />
      </div>
      <Textarea
        label="Notes"
        rows={2}
        value={customerNotes}
        onChange={(e) => setCustomerNotes(e.target.value)}
      />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Items</h2>
          <Button type="button" size="sm" variant="secondary" onClick={() => setPickerOpen(true)}>
            <Plus size={16} /> Add Item
          </Button>
        </div>

        {errors.items && <p className="text-sm text-danger">{errors.items}</p>}

        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted">
            No items yet — add at least one.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => {
              const counterpart = item.product ? counterpartSaleKind(item.saleKind) : null;
              return (
              <div key={item.key} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-foreground">{item.displayName}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${item.displayName}`}
                    onClick={() => removeItem(item.key)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-danger hover:bg-danger-bg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {item.product ? (
                    <>
                      {item.saleKind === "SIMPLE" && (
                        <SimpleSaleFields
                          quantity={item.quantity}
                          onQuantityChange={(v) => updateItem(item.key, { quantity: v })}
                        />
                      )}
                      {(item.saleKind === "LENGTH_FULL" || item.saleKind === "LENGTH_CUT") && (
                        <div className="flex flex-col gap-1">
                          <LengthSaleFields
                            saleKind={item.saleKind}
                            onSaleKindChange={(kind) => updateItem(item.key, { saleKind: kind })}
                            quantity={item.quantity}
                            onQuantityChange={(v) => updateItem(item.key, { quantity: v })}
                            cutLength={item.cutLength}
                            onCutLengthChange={(v) => updateItem(item.key, { cutLength: v })}
                            unitLabel={item.product.unitLabel}
                          />
                          {counterpart && (
                            <button
                              type="button"
                              onClick={() => addVariant(item.key, counterpart)}
                              className="text-left text-xs font-medium text-primary hover:underline"
                            >
                              + Add {saleKindLabel(counterpart)}
                            </button>
                          )}
                        </div>
                      )}
                      {(item.saleKind === "BOX_FULL" || item.saleKind === "BOX_LOOSE") && (
                        <div className="flex flex-col gap-1">
                          <BoxSaleFields
                            saleKind={item.saleKind}
                            onSaleKindChange={(kind) => updateItem(item.key, { saleKind: kind })}
                            quantity={item.quantity}
                            onQuantityChange={(v) => updateItem(item.key, { quantity: v })}
                          />
                          {counterpart && (
                            <button
                              type="button"
                              onClick={() => addVariant(item.key, counterpart)}
                              className="text-left text-xs font-medium text-primary hover:underline"
                            >
                              + Add {saleKindLabel(counterpart)}
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <Input
                        label="Quantity"
                        type="number"
                        inputMode="decimal"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.key, { quantity: e.target.value })}
                      />
                      <Input
                        label="Unit"
                        placeholder="pcs, ft…"
                        value={item.unit}
                        onChange={(e) => updateItem(item.key, { unit: e.target.value })}
                      />
                    </>
                  )}
                  <Input
                    label="Remarks"
                    value={item.remarks}
                    onChange={(e) => updateItem(item.key, { remarks: e.target.value })}
                  />
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-border bg-surface px-4 pr-16 py-3 sm:static sm:mx-0 sm:border-0 sm:px-0 sm:pt-0">
        <Button type="button" variant="secondary" fullWidth onClick={() => router.push("/orders")}>
          Cancel
        </Button>
        <Button type="button" fullWidth onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving…" : "Save Draft"}
        </Button>
      </div>

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Add Item">
        {pickerOpen && <ProductOrCustomPicker categories={categories} onSelect={handlePick} />}
      </Modal>
    </div>
  );
}
