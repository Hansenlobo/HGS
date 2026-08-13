import clsx from "clsx";
import type { OrderWithRelations } from "@/types";

const labels: Record<OrderWithRelations["status"], string> = {
  DRAFT: "Draft",
  PRINTED: "Printed",
  CONVERTED: "Converted",
  CANCELLED: "Cancelled",
};

const toneClasses: Record<OrderWithRelations["status"], string> = {
  DRAFT: "bg-black/5 text-muted dark:bg-white/10",
  PRINTED: "bg-warning-bg text-warning",
  CONVERTED: "bg-success-bg text-primary",
  CANCELLED: "bg-danger-bg text-danger",
};

export function OrderStatusBadge({ status }: { status: OrderWithRelations["status"] }) {
  return (
    <span className={clsx("inline-flex h-6 w-fit items-center rounded-full px-2.5 text-xs font-medium", toneClasses[status])}>
      {labels[status]}
    </span>
  );
}
