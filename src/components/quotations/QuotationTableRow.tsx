import Link from "next/link";
import type { QuotationModel } from "@/types";
import { formatQuotationNumber } from "@/lib/billing/billDisplay";
import { formatPrice } from "@/lib/stock/stockDisplay";
import { formatDate } from "@/lib/formatDate";
import { QuotationStatusBadge } from "./QuotationStatusBadge";
import { Button } from "@/components/ui/Button";

export interface QuotationTableRowProps {
  quotation: QuotationModel;
  onDelete: () => void;
  onConvert: () => void;
}

export function QuotationTableRow({ quotation, onDelete, onConvert }: QuotationTableRowProps) {
  const editable = quotation.status !== "CONVERTED";

  return (
    <tr data-quotation-id={quotation.id} className="border-b border-border last:border-0">
      <td className="py-3 pl-4 pr-4 text-sm font-medium text-foreground">
        <Link href={`/quotations/${quotation.id}`} className="hover:text-primary">
          {formatQuotationNumber(quotation.quotationNumber)}
        </Link>
      </td>
      <td className="py-3 pr-4 text-sm text-foreground">{quotation.customerName}</td>
      <td className="py-3 pr-4 text-sm text-foreground">{formatPrice(quotation.customerAmount)}</td>
      <td className="py-3 pr-4">
        <QuotationStatusBadge status={quotation.status} />
      </td>
      <td className="py-3 pr-4 text-sm text-muted">{formatDate(quotation.createdAt)}</td>
      <td className="py-3 pr-4">
        <div className="flex flex-wrap justify-end gap-2">
          <Link href={`/quotations/${quotation.id}/print`}>
            <Button variant="secondary" size="sm">
              Print
            </Button>
          </Link>
          {editable && (
            <Link href={`/quotations/${quotation.id}/edit`}>
              <Button variant="secondary" size="sm">
                Edit
              </Button>
            </Link>
          )}
          {editable && (
            <Button variant="primary" size="sm" onClick={onConvert}>
              Convert
            </Button>
          )}
          {editable && (
            <Button variant="danger" size="sm" onClick={onDelete}>
              Delete
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
