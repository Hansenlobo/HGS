"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BillWithRelations, CategoryModel, ProductWithRelations } from "@/types";
import { returnSchema } from "@/lib/validation/return.schema";
import { fetcher, postJson } from "@/lib/fetcher";
import { formatBillNumber } from "@/lib/billing/billDisplay";
import { formatPrice } from "@/lib/stock/stockDisplay";
import { useCurrentUser } from "@/components/auth/CurrentUserProvider";
import { useAppSettings } from "@/components/settings/AppSettingsProvider";
import { useToast } from "@/components/ui/Toast";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { ReturnItemGrid } from "./ReturnItemGrid";
import { computeReturnLineAmount, type ReturnLineDraft } from "./returnLineDraft";

export interface ReturnFormProps {
  categories: CategoryModel[];
  products: ProductWithRelations[];
}

const refundMethods = [
  { value: "CASH" as const, label: "Cash" },
  { value: "UPI" as const, label: "UPI" },
  { value: "CARD" as const, label: "Card" },
  { value: "STORE_CREDIT" as const, label: "Store Credit" },
];

function buildLinePayload(line: ReturnLineDraft): unknown {
  switch (line.saleKind) {
    case "SIMPLE":
    case "LENGTH_FULL":
    case "BOX_FULL":
    case "BOX_LOOSE":
      return { saleKind: line.saleKind, productId: line.product!.id, quantity: line.quantity, rate: line.rate };
    case "LENGTH_CUT":
      return {
        saleKind: "LENGTH_CUT",
        productId: line.product!.id,
        cutLength: line.cutLength,
        quantity: line.quantity,
        rate: line.rate,
      };
    case "CUSTOM":
      return {
        saleKind: "CUSTOM",
        customItemName: line.customItemName ?? line.itemName,
        quantity: line.quantity,
        rate: line.rate,
      };
  }
}

export function ReturnForm({ categories, products }: ReturnFormProps) {
  const router = useRouter();
  const staffName = useCurrentUser().name;
  const { invoicePrefix } = useAppSettings();
  const { showToast } = useToast();

  const [billNumberInput, setBillNumberInput] = useState("");
  const [loadedBill, setLoadedBill] = useState<BillWithRelations | null>(null);
  const [lookupError, setLookupError] = useState<string | undefined>();
  const [lookingUp, setLookingUp] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [refundMethod, setRefundMethod] = useState<"CASH" | "UPI" | "CARD" | "STORE_CREDIT">("CASH");
  const [reason, setReason] = useState("");
  const [lines, setLines] = useState<ReturnLineDraft[]>([]);
  const [errors, setErrors] = useState<{ customerName?: string; lines?: string; form?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const total = useMemo(() => lines.reduce((sum, l) => sum + computeReturnLineAmount(l), 0), [lines]);

  async function lookupBill() {
    if (!billNumberInput.trim()) return;
    setLookupError(undefined);
    setLookingUp(true);
    try {
      const bill = await fetcher<BillWithRelations>(`/api/bills/by-number/${billNumberInput.trim()}`);
      setLoadedBill(bill);
      setCustomerName(bill.customerName);
      const newLines: ReturnLineDraft[] = bill.lineItems.map((li) => {
        const product = li.productId ? products.find((p) => p.id === li.productId) : undefined;
        return {
          key: `${li.id}-${Math.random()}`,
          product,
          customItemName: product ? undefined : li.itemName,
          itemName: li.itemName,
          saleKind: li.saleKind,
          quantity: String(li.quantity),
          cutLength: li.cutLength != null ? String(li.cutLength) : "",
          rate: String(li.rate),
        };
      });
      setLines(newLines);
    } catch (err) {
      setLoadedBill(null);
      setLookupError(err instanceof Error ? err.message : "Bill not found");
    } finally {
      setLookingUp(false);
    }
  }

  function clearBill() {
    setLoadedBill(null);
    setBillNumberInput("");
    setLines([]);
    setCustomerName("");
  }

  async function handleSubmit() {
    setErrors({});
    const candidate = {
      billId: loadedBill?.id,
      customerName,
      refundMethod,
      reason,
      createdBy: staffName,
      lines: lines.map(buildLinePayload),
    };
    const parsed = returnSchema.safeParse(candidate);
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "customerName") next.customerName = issue.message;
        else if (field === "lines") next.lines = issue.message;
        else next.form = issue.message;
      }
      setErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      await postJson<{ id: string }>("/api/returns", parsed.data);
      showToast("Return recorded, stock restored");
      router.push(`/returns`);
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-28">
      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold text-foreground">Link to a Bill (optional)</h2>
        {loadedBill ? (
          <div className="flex items-center justify-between">
            <p className="text-sm text-foreground">
              Linked to {formatBillNumber(loadedBill.billNumber, invoicePrefix)} — {loadedBill.customerName}
            </p>
            <Button size="sm" variant="secondary" onClick={clearBill}>
              Unlink
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Input
              label="Bill Number"
              placeholder="e.g. 12"
              value={billNumberInput}
              onChange={(e) => setBillNumberInput(e.target.value)}
              error={lookupError}
            />
            <Button type="button" variant="secondary" disabled={lookingUp} onClick={lookupBill}>
              {lookingUp ? "Looking up…" : "Load Bill"}
            </Button>
          </div>
        )}
      </div>

      <Input
        label="Customer Name"
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
        error={errors.customerName}
      />

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">Refund Method</span>
        <div className="flex flex-wrap gap-2">
          {refundMethods.map((m) => (
            <Chip key={m.value} active={refundMethod === m.value} onClick={() => setRefundMethod(m.value)}>
              {m.label}
            </Chip>
          ))}
        </div>
      </div>

      <Textarea label="Reason (optional)" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />

      {errors.lines && <p className="text-sm text-danger">{errors.lines}</p>}
      <ReturnItemGrid categories={categories} lines={lines} onLinesChange={setLines} />

      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-foreground">Refund Total</span>
          <span className="text-lg font-semibold text-foreground">{formatPrice(total)}</span>
        </div>
      </div>

      {errors.form && <p className="text-sm text-danger">{errors.form}</p>}

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-border bg-surface px-4 pr-16 py-3 sm:static sm:mx-0 sm:border-0 sm:px-0 sm:pt-0">
        <div className="flex gap-2">
          <Button type="button" variant="secondary" fullWidth onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="button" fullWidth disabled={submitting} onClick={handleSubmit}>
            {submitting ? "Saving…" : "Record Return"}
          </Button>
        </div>
      </div>
    </div>
  );
}
