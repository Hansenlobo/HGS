"use client";

import { useRouter } from "next/navigation";
import type { OrderWithRelations } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export interface ConvertOrderModalProps {
  order: OrderWithRelations | null;
  onClose: () => void;
}

export function ConvertOrderModal({ order, onClose }: ConvertOrderModalProps) {
  const router = useRouter();

  function goTo(target: "normal" | "party") {
    if (!order) return;
    router.push(`/billing/${target}/new?fromOrder=${order.id}`);
    onClose();
  }

  return (
    <Modal open={!!order} onClose={onClose} title="Convert Order">
      {order && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            Opens a new bill pre-filled with this order&apos;s items. The order is marked Converted
            once that bill is actually saved.
          </p>
          <div className="flex flex-col gap-2">
            <Button fullWidth onClick={() => goTo("normal")}>
              Convert to Normal Bill
            </Button>
            <Button fullWidth variant="secondary" onClick={() => goTo("party")}>
              Convert to Party Bill
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
