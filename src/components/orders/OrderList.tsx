import type { OrderWithRelations } from "@/types";
import { OrderTableRow } from "./OrderTableRow";

export interface OrderListProps {
  orders: OrderWithRelations[];
  onDelete: (order: OrderWithRelations) => void;
  onConvert: (order: OrderWithRelations) => void;
}

export function OrderList({ orders, onDelete, onConvert }: OrderListProps) {
  if (orders.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No orders match your filters.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[720px] text-left">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-3 font-medium">Order #</th>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Items</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <OrderTableRow
              key={order.id}
              order={order}
              onDelete={() => onDelete(order)}
              onConvert={() => onConvert(order)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
