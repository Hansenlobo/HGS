import clsx from "clsx";
import type { QuotationWithRelations } from "@/types";

const labels: Record<QuotationWithRelations["status"], string> = {
  DRAFT: "Draft",
  PRINTED: "Printed",
  CONVERTED: "Converted",
};

const toneClasses: Record<QuotationWithRelations["status"], string> = {
  DRAFT: "bg-black/5 text-muted dark:bg-white/10",
  PRINTED: "bg-warning-bg text-warning",
  CONVERTED: "bg-success-bg text-primary",
};

export function QuotationStatusBadge({ status }: { status: QuotationWithRelations["status"] }) {
  return (
    <span className={clsx("inline-flex h-6 w-fit items-center rounded-full px-2.5 text-xs font-medium", toneClasses[status])}>
      {labels[status]}
    </span>
  );
}
