"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CategoryModel, QuotationWithRelations } from "@/types";
import { quotationSchema } from "@/lib/validation/quotation.schema";
import { computeBillTotals } from "@/lib/billing/pricing";
import { postJson, patchJson } from "@/lib/fetcher";
import { useCurrentUser } from "@/components/auth/CurrentUserProvider";
import { useToast } from "@/components/ui/Toast";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { computeDraft, type LineDraft } from "@/components/billing/lineDraft";
import { BillItemGrid } from "@/components/billing/BillItemGrid";
import { PartySettingsFields } from "@/components/billing/PartySettingsFields";
import { BillSummary } from "@/components/billing/BillSummary";
import { DiscountField } from "@/components/billing/DiscountField";
import type { DiscountType } from "@/lib/billing/pricing";

export interface QuotationFormProps {
  mode: "create" | "edit";
  quotation?: QuotationWithRelations;
  categories: CategoryModel[];
}

function draftsFromQuotation(quotation: QuotationWithRelations): LineDraft[] {
  return quotation.lineItems.map((line) => ({
    key: `${line.id}-${Math.random()}`,
    product: line.product ?? undefined,
    customItemName: line.product ? undefined : line.itemName,
    itemName: line.itemName,
    saleKind: line.saleKind,
    quantity: String(line.quantity),
    cutLength: line.cutLength != null ? String(line.cutLength) : "",
    rate: String(line.rate),
    discountType: line.discountType ?? "",
    discountValue: String(line.discountValue),
    note: line.note ?? "",
    applyMarkup: line.product ? false : line.isPartyProduct,
  }));
}

function buildLinePayload(line: LineDraft): unknown {
  const base = {
    discountType: line.discountType || undefined,
    discountValue: line.discountValue,
    rate: line.rate,
    note: line.note || undefined,
  };
  switch (line.saleKind) {
    case "SIMPLE":
    case "LENGTH_FULL":
    case "BOX_FULL":
    case "BOX_LOOSE":
      return { ...base, saleKind: line.saleKind, productId: line.product!.id, quantity: line.quantity };
    case "LENGTH_CUT":
      return {
        ...base,
        saleKind: "LENGTH_CUT",
        productId: line.product!.id,
        cutLength: line.cutLength,
        quantity: line.quantity,
      };
    case "CUSTOM":
      return {
        ...base,
        saleKind: "CUSTOM",
        customItemName: line.customItemName ?? line.itemName,
        quantity: line.quantity,
        applyMarkup: line.applyMarkup,
      };
  }
}

export function QuotationForm({ mode, quotation, categories }: QuotationFormProps) {
  const router = useRouter();
  const staffName = useCurrentUser().name;
  const { showToast } = useToast();

  const [customerName, setCustomerName] = useState(quotation?.customerName || "Walk-in");
  const [customerPhone, setCustomerPhone] = useState(quotation?.customerPhone ?? "");
  const [customerNotes, setCustomerNotes] = useState(quotation?.customerNotes ?? "");
  const [partyPercentage, setPartyPercentage] = useState(String(quotation?.partyPercentage ?? 0));
  const [overallDiscountType, setOverallDiscountType] = useState<DiscountType | "">(
    quotation?.overallDiscountType ?? "",
  );
  const [overallDiscountValue, setOverallDiscountValue] = useState(String(quotation?.overallDiscountValue ?? 0));
  const [lines, setLines] = useState<LineDraft[]>(quotation ? draftsFromQuotation(quotation) : []);
  const [errors, setErrors] = useState<{ customerName?: string; lines?: string; partyPercentage?: string; form?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const partyPct = Number(partyPercentage) || 0;

  const totals = useMemo(
    () =>
      computeBillTotals(
        lines.map((l) => {
          const c = computeDraft(l, "PARTY", partyPct);
          return { rate: Number(l.rate) || 0, unitsSold: c.unitsSold, shopAmount: c.shopAmount, amount: c.amount };
        }),
      ),
    [lines, partyPct],
  );

  async function handleSubmit(printAfter: boolean) {
    setErrors({});
    const candidate = {
      customerName,
      customerPhone,
      customerNotes,
      partyPercentage,
      overallDiscountType: overallDiscountType || undefined,
      overallDiscountValue: overallDiscountType ? overallDiscountValue : undefined,
      createdBy: staffName,
      lines: lines.map(buildLinePayload),
    };
    const parsed = quotationSchema.safeParse(candidate);
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "customerName") next.customerName = issue.message;
        else if (field === "lines") next.lines = issue.message;
        else if (field === "partyPercentage") next.partyPercentage = issue.message;
        else next.form = issue.message;
      }
      setErrors(next);
      return;
    }

    setSubmitting(true);
    try {
      const saved =
        mode === "create"
          ? await postJson<{ id: string }>("/api/quotations", parsed.data)
          : await patchJson<{ id: string }>(`/api/quotations/${quotation!.id}`, parsed.data);
      showToast(mode === "create" ? "Quotation saved" : "Quotation updated");
      if (printAfter) {
        router.push(`/quotations/${saved.id}/print`);
      } else {
        router.push(`/quotations/${saved.id}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setErrors({ form: message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-28">
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

      <PartySettingsFields
        partyPercentage={partyPercentage}
        onPartyPercentageChange={setPartyPercentage}
        error={errors.partyPercentage}
      />

      {errors.lines && <p className="text-sm text-danger">{errors.lines}</p>}
      <BillItemGrid
        categories={categories}
        lines={lines}
        onLinesChange={setLines}
        billType="PARTY"
        partyPercentage={partyPct}
      />

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
        <h3 className="text-sm font-semibold text-foreground">Overall Discount (on final amount)</h3>
        <DiscountField
          discountType={overallDiscountType}
          onDiscountTypeChange={setOverallDiscountType}
          discountValue={overallDiscountValue}
          onDiscountValueChange={setOverallDiscountValue}
        />
      </div>

      <BillSummary
        billType="PARTY"
        totals={totals}
        overallDiscountType={overallDiscountType}
        overallDiscountValue={Number(overallDiscountValue) || 0}
      />

      {errors.form && <p className="text-sm text-danger">{errors.form}</p>}

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-border bg-surface px-4 pr-16 py-3 sm:static sm:mx-0 sm:border-0 sm:px-0 sm:pt-0">
        <div className="flex gap-2">
          <Button type="button" variant="secondary" fullWidth onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            fullWidth
            disabled={submitting}
            onClick={() => handleSubmit(false)}
          >
            Save Quotation
          </Button>
        </div>
        <Button type="button" fullWidth disabled={submitting} onClick={() => handleSubmit(true)}>
          {submitting ? "Saving…" : "Save & Print"}
        </Button>
      </div>
    </div>
  );
}
