import type { BillWithRelations } from "@/types";
import { formatDateTime } from "@/lib/formatDate";

const actionLabels: Record<string, string> = {
  BILL_CREATED: "Bill created",
  BILL_EDITED: "Bill edited",
  BILL_CANCELLED: "Bill cancelled",
  PAYMENT_ADDED: "Payment added",
  PAYMENT_EDITED: "Payment edited",
  PAYMENT_DELETED: "Payment deleted",
};

export function AuditTimeline({ bill }: { bill: BillWithRelations }) {
  if (bill.auditLogs.length === 0) {
    return <p className="text-sm text-muted">No history yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {bill.auditLogs.map((log) => (
        <li key={log.id} className="rounded-lg border border-border bg-surface p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">{actionLabels[log.action] ?? log.action}</span>
            <span className="text-xs text-muted">{formatDateTime(log.createdAt)}</span>
          </div>
          <p className="text-muted">{log.description}</p>
          {log.performedBy && <p className="text-xs text-muted">By {log.performedBy}</p>}
        </li>
      ))}
    </ul>
  );
}
