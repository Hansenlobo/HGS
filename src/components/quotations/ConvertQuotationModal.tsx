"use client";

import { useRouter } from "next/navigation";
import type { QuotationModel } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export interface ConvertQuotationModalProps {
  quotation: QuotationModel | null;
  onClose: () => void;
}

export function ConvertQuotationModal({ quotation, onClose }: ConvertQuotationModalProps) {
  const router = useRouter();

  function goTo(target: "normal" | "party") {
    if (!quotation) return;
    router.push(`/billing/${target}/new?fromQuotation=${quotation.id}`);
    onClose();
  }

  return (
    <Modal open={!!quotation} onClose={onClose} title="Convert Quotation">
      {quotation && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            Opens a new bill pre-filled with this quotation&apos;s items and rates. Stock is only taken
            once that bill is actually saved — the quotation is marked Converted at that point.
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
