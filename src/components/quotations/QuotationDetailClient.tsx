"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import type { QuotationWithRelations } from "@/types";
import { fetcher, deleteJson } from "@/lib/fetcher";
import { formatQuotationNumber, formatBillNumber } from "@/lib/billing/billDisplay";
import { formatPrice, formatNumber } from "@/lib/stock/stockDisplay";
import { formatDateTime } from "@/lib/formatDate";
import { useAppSettings } from "@/components/settings/AppSettingsProvider";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { QuotationStatusBadge } from "./QuotationStatusBadge";
import { ConvertQuotationModal } from "./ConvertQuotationModal";

export function QuotationDetailClient({ initialQuotation }: { initialQuotation: QuotationWithRelations }) {
  const router = useRouter();
  const { invoicePrefix } = useAppSettings();
  const { showToast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: quotation } = useSWR<QuotationWithRelations>(`/api/quotations/${initialQuotation.id}`, fetcher, {
    fallbackData: initialQuotation,
  });

  if (!quotation) return null;
  const editable = quotation.status !== "CONVERTED";
  const overallDiscountAmount = quotation.shopAmount + quotation.marginAmount - quotation.customerAmount;

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteJson(`/api/quotations/${quotation!.id}`);
      showToast("Quotation deleted");
      router.push("/quotations");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not delete quotation", "error");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground">
            {formatQuotationNumber(quotation.quotationNumber)}
          </h1>
          <p className="text-sm text-muted">{formatDateTime(quotation.createdAt)}</p>
          <QuotationStatusBadge status={quotation.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          {quotation.convertedBill && (
            <Link href={`/bills/${quotation.convertedBill.id}`}>
              <Button variant="secondary" size="sm">
                View Bill ({formatBillNumber(quotation.convertedBill.billNumber, invoicePrefix)})
              </Button>
            </Link>
          )}
          <Link href={`/quotations/${quotation.id}/print`}>
            <Button variant="secondary" size="sm">
              Print
            </Button>
          </Link>
          {editable && (
            <>
              <Link href={`/quotations/${quotation.id}/edit`}>
                <Button variant="secondary" size="sm">
                  Edit
                </Button>
              </Link>
              <Button size="sm" onClick={() => setConvertOpen(true)}>
                Convert to Bill
              </Button>
              <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold text-foreground">Customer</h2>
        <p className="text-sm text-foreground">{quotation.customerName}</p>
        {quotation.customerPhone && <p className="text-sm text-muted">{quotation.customerPhone}</p>}
        {quotation.customerNotes && <p className="text-sm text-muted">{quotation.customerNotes}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">Items</h2>
        <div className="flex flex-col gap-2">
          {quotation.lineItems.map((line) => (
            <div key={line.id} className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3 text-sm">
              <div className="flex justify-between">
                <span className="font-medium text-foreground">{line.itemName}</span>
                <span className="text-foreground">{formatPrice(line.amount)}</span>
              </div>
              <p className="text-muted">
                {formatNumber(line.quantity)} {line.saleKind === "LENGTH_CUT" ? `× ${formatNumber(line.cutLength ?? 0)}` : ""}
                {" · "}
                Rate {formatPrice(line.rate)}
                {line.isPartyProduct ? ` · Party Rate ${formatPrice(line.partyRate)}` : ""}
              </p>
              {line.note && <p className="italic text-muted">Note: {line.note}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <SummaryRow label="Shop Amount" value={quotation.shopAmount} />
        <SummaryRow label="Margin Amount" value={quotation.marginAmount} />
        {quotation.overallDiscountType && <SummaryRow label="Overall Discount" value={overallDiscountAmount} />}
        <SummaryRow label="Customer Amount" value={quotation.customerAmount} strong />
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this quotation?"
        description="This quotation will be permanently removed. It has no stock or financial effect."
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      <ConvertQuotationModal quotation={convertOpen ? quotation : null} onClose={() => setConvertOpen(false)} />
    </div>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? "font-semibold text-foreground" : "text-sm text-muted"}>{label}</span>
      <span className={strong ? "text-lg font-semibold text-foreground" : "text-sm text-foreground"}>
        {formatPrice(value)}
      </span>
    </div>
  );
}
