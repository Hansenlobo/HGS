"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CategoryModel } from "@/types";
import { billSchema } from "@/lib/validation/bill.schema";
import { computeBillTotals } from "@/lib/billing/pricing";
import { postJson } from "@/lib/fetcher";
import { useCurrentUser } from "@/components/auth/CurrentUserProvider";
import { useToast } from "@/components/ui/Toast";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { computeDraft, type LineDraft } from "./lineDraft";
import { BillItemGrid } from "./BillItemGrid";
import { PartySettingsFields } from "./PartySettingsFields";
import { BillSummary } from "./BillSummary";
import { DiscountField } from "./DiscountField";
import type { DiscountType } from "@/lib/billing/pricing";

export interface BillFormProps {
  billType: "NORMAL" | "PARTY";
  categories: CategoryModel[];
  initialLines?: LineDraft[];
  initialCustomer?: { customerName: string; customerPhone: string; customerNotes: string };
  sourceOrderId?: string;
  sourceQuotationId?: string;
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

export function BillForm({
  billType,
  categories,
  initialLines = [],
  initialCustomer,
  sourceOrderId,
  sourceQuotationId,
}: BillFormProps) {
  const router = useRouter();
  const staffName = useCurrentUser().name;
  const { showToast } = useToast();

  const [customerName, setCustomerName] = useState(initialCustomer?.customerName || "Walk-in");
  const [customerPhone, setCustomerPhone] = useState(initialCustomer?.customerPhone ?? "");
  const [customerNotes, setCustomerNotes] = useState(initialCustomer?.customerNotes ?? "");
  const [partyPercentage, setPartyPercentage] = useState("0");
  const [overallDiscountType, setOverallDiscountType] = useState<DiscountType | "">("");
  const [overallDiscountValue, setOverallDiscountValue] = useState("0");
  const [lines, setLines] = useState<LineDraft[]>(initialLines);
  const [errors, setErrors] = useState<{ customerName?: string; lines?: string; partyPercentage?: string; form?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const partyPct = billType === "PARTY" ? Number(partyPercentage) || 0 : 0;

  const totals = useMemo(
    () =>
      computeBillTotals(
        lines.map((l) => {
          const c = computeDraft(l, billType, partyPct);
          return { rate: Number(l.rate) || 0, unitsSold: c.unitsSold, shopAmount: c.shopAmount, amount: c.amount };
        }),
      ),
    [lines, billType, partyPct],
  );

  async function handleSubmit(printAfter: boolean) {
    setErrors({});
    const candidate = {
      type: billType,
      customerName,
      customerPhone,
      customerNotes,
      partyPercentage: billType === "PARTY" ? partyPercentage : undefined,
      overallDiscountType: overallDiscountType || undefined,
      overallDiscountValue: overallDiscountType ? overallDiscountValue : undefined,
      sourceOrderId,
      sourceQuotationId,
      createdBy: staffName,
      lines: lines.map(buildLinePayload),
    };
    const parsed = billSchema.safeParse(candidate);
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
      const bill = await postJson<{ id: string }>("/api/bills", parsed.data);
      showToast("Bill saved");
      if (printAfter) {
        router.push(`/bills/${bill.id}/print`);
      } else {
        router.push(`/bills/${bill.id}`);
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

      {billType === "PARTY" && (
        <PartySettingsFields
          partyPercentage={partyPercentage}
          onPartyPercentageChange={setPartyPercentage}
          error={errors.partyPercentage}
        />
      )}

      {errors.lines && <p className="text-sm text-danger">{errors.lines}</p>}
      <BillItemGrid
        categories={categories}
        lines={lines}
        onLinesChange={setLines}
        billType={billType}
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
        billType={billType}
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
            Save Bill
          </Button>
        </div>
        <Button type="button" fullWidth disabled={submitting} onClick={() => handleSubmit(true)}>
          {submitting ? "Saving…" : "Save & Print"}
        </Button>
      </div>
    </div>
  );
}
