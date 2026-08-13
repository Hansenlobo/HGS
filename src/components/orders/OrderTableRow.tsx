import Link from "next/link";
import type { OrderWithRelations } from "@/types";
import { formatOrderNumber } from "@/lib/billing/billDisplay";
import { formatDate } from "@/lib/formatDate";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { Button } from "@/components/ui/Button";

export interface OrderTableRowProps {
  order: OrderWithRelations;
  onDelete: () => void;
  onConvert: () => void;
}

export function OrderTableRow({ order, onDelete, onConvert }: OrderTableRowProps) {
  const editable = order.status !== "CONVERTED";
  const convertible = order.status !== "CONVERTED" && order.status !== "CANCELLED";

  return (
    <tr data-order-id={order.id} className="border-b border-border last:border-0">
      <td className="py-3 pl-4 pr-4 text-sm font-medium text-foreground">
        {formatOrderNumber(order.orderNumber)}
      </td>
      <td className="py-3 pr-4 text-sm text-foreground">{order.customerName}</td>
      <td className="py-3 pr-4 text-sm text-muted">{order.items.length}</td>
      <td className="py-3 pr-4">
        <OrderStatusBadge status={order.status} />
      </td>
      <td className="py-3 pr-4 text-sm text-muted">{formatDate(order.createdAt)}</td>
      <td className="py-3 pr-4">
        <div className="flex flex-wrap justify-end gap-2">
          <Link href={`/orders/${order.id}/print`}>
            <Button variant="secondary" size="sm">
              Print
            </Button>
          </Link>
          {editable && (
            <Link href={`/orders/${order.id}/edit`}>
              <Button variant="secondary" size="sm">
                Edit
              </Button>
            </Link>
          )}
          {convertible && (
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
