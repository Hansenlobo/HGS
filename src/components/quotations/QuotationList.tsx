import type { QuotationModel } from "@/types";
import { QuotationTableRow } from "./QuotationTableRow";

export interface QuotationListProps {
  quotations: QuotationModel[];
  onDelete: (quotation: QuotationModel) => void;
  onConvert: (quotation: QuotationModel) => void;
}

export function QuotationList({ quotations, onDelete, onConvert }: QuotationListProps) {
  if (quotations.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No quotations match your filters.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[720px] text-left">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3 font-medium">Quotation #</th>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Total</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {quotations.map((quotation) => (
            <QuotationTableRow
              key={quotation.id}
              quotation={quotation}
              onDelete={() => onDelete(quotation)}
              onConvert={() => onConvert(quotation)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
