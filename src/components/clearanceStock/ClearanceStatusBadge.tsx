import clsx from "clsx";
import type { ClearanceItemModel } from "@/types";

const labels: Record<ClearanceItemModel["status"], string> = {
  AVAILABLE: "Available",
  SOLD: "Sold",
};

const toneClasses: Record<ClearanceItemModel["status"], string> = {
  AVAILABLE: "bg-success-bg text-primary",
  SOLD: "bg-black/5 text-muted dark:bg-white/10",
};

export function ClearanceStatusBadge({ status }: { status: ClearanceItemModel["status"] }) {
  return (
    <span className={clsx("inline-flex h-6 w-fit items-center rounded-full px-2.5 text-xs font-medium", toneClasses[status])}>
      {labels[status]}
    </span>
  );
}
