"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import type { BillWithRelations, PaymentModel } from "@/types";
import { addPaymentSchema, editPaymentSchema } from "@/lib/validation/payment.schema";
import { postJson, patchJson, deleteJson } from "@/lib/fetcher";
import { useCurrentUser } from "@/components/auth/CurrentUserProvider";
import { useToast } from "@/components/ui/Toast";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { PinPrompt } from "@/components/ui/PinPrompt";
import { formatPrice } from "@/lib/stock/stockDisplay";
import { formatDateTime } from "@/lib/formatDate";

const paymentMethods = [
  { value: "CASH" as const, label: "Cash" },
  { value: "UPI" as const, label: "UPI" },
  { value: "CARD" as const, label: "Card" },
  { value: "OTHER" as const, label: "Other" },
];

const paymentMethodLabels: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  OTHER: "Other",
};

export interface PaymentsModalProps {
  bill: BillWithRelations | null;
  onClose: () => void;
  onUpdated: (bill: BillWithRelations) => void;
}

export function PaymentsModal({ bill, onClose, onUpdated }: PaymentsModalProps) {
  return (
    <Modal open={!!bill} onClose={onClose} title="Payments">
      {bill && <PaymentsModalBody bill={bill} onUpdated={onUpdated} />}
    </Modal>
  );
}

function PaymentsModalBody({
  bill,
  onUpdated,
}: {
  bill: BillWithRelations;
  onUpdated: (bill: BillWithRelations) => void;
}) {
  const staffName = useCurrentUser().name;
  const { showToast } = useToast();

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"CASH" | "UPI" | "CARD" | "OTHER">("CASH");
  const [notes, setNotes] = useState("");
  const [addError, setAddError] = useState<string | undefined>();
  const [adding, setAdding] = useState(false);

  const [editTarget, setEditTarget] = useState<PaymentModel | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editMethod, setEditMethod] = useState<"CASH" | "UPI" | "CARD" | "OTHER">("CASH");
  const [editNotes, setEditNotes] = useState("");
  const [pinAction, setPinAction] = useState<{ kind: "edit" | "delete"; payment: PaymentModel } | null>(null);

  async function handleAdd() {
    setAddError(undefined);
    const parsed = addPaymentSchema.safeParse({ amount, method, notes, enteredBy: staffName });
    if (!parsed.success) {
      setAddError(parsed.error.issues[0]?.message ?? "Invalid amount");
      return;
    }
    setAdding(true);
    try {
      const updated = await postJson<BillWithRelations>(`/api/bills/${bill.id}/payments`, parsed.data);
      onUpdated(updated);
      setAmount("");
      setMethod("CASH");
      setNotes("");
      showToast("Payment added");
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAdding(false);
    }
  }

  function startEdit(payment: PaymentModel) {
    setEditTarget(payment);
    setEditAmount(String(payment.amount));
    setEditMethod(payment.method as "CASH" | "UPI" | "CARD" | "OTHER");
    setEditNotes(payment.notes ?? "");
  }

  async function confirmPin(pin: string) {
    if (!pinAction) return;
    if (pinAction.kind === "delete") {
      await deleteJson(`/api/bills/${bill.id}/payments/${pinAction.payment.id}`, { pin });
      const updated = await fetch(`/api/bills/${bill.id}`).then((r) => r.json());
      onUpdated(updated);
      showToast("Payment deleted");
      setPinAction(null);
    } else {
      const parsed = editPaymentSchema.safeParse({ pin, amount: editAmount, method: editMethod, notes: editNotes });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Invalid amount");
      }
      const updated = await patchJson<BillWithRelations>(
        `/api/bills/${bill.id}/payments/${pinAction.payment.id}`,
        parsed.data,
      );
      onUpdated(updated);
      showToast("Payment updated");
      setPinAction(null);
      setEditTarget(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        {bill.payments.length === 0 ? (
          <p className="text-sm text-muted">No payments yet.</p>
        ) : (
          bill.payments.map((payment) => (
            <div
              key={payment.id}
              className={clsx(
                "flex flex-col gap-1 rounded-lg border border-border p-3",
                payment.isDeleted && "opacity-50",
              )}
            >
              <div className="flex items-center justify-between">
                <span className={clsx("font-medium text-foreground", payment.isDeleted && "line-through")}>
                  {formatPrice(payment.amount)}{" "}
                  <span className="text-xs font-normal text-muted">({paymentMethodLabels[payment.method]})</span>
                </span>
                <span className="text-xs text-muted">
                  {formatDateTime(payment.createdAt)}
                </span>
              </div>
              {payment.notes && <p className="text-sm text-muted">{payment.notes}</p>}
              <p className="text-xs text-muted">By {payment.enteredBy || "—"}</p>
              {!payment.isDeleted && (
                <div className="flex gap-2 pt-1">
                  <Button variant="secondary" size="sm" onClick={() => startEdit(payment)}>
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPinAction({ kind: "delete", payment })}
                  >
                    Delete
                  </Button>
                  <Link href={`/bills/${bill.id}/payments/${payment.id}/print`}>
                    <Button variant="secondary" size="sm">
                      Receipt
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-foreground">Add Payment</h3>
        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Amount (₹)"
            type="number"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={addError}
          />
          <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {paymentMethods.map((m) => (
            <Chip key={m.value} active={method === m.value} onClick={() => setMethod(m.value)}>
              {m.label}
            </Chip>
          ))}
        </div>
        <Button onClick={handleAdd} disabled={adding}>
          {adding ? "Adding…" : "Add Payment"}
        </Button>
      </div>

      {editTarget && (
        <Modal open onClose={() => setEditTarget(null)} title="Edit Payment">
          <div className="flex flex-col gap-4">
            <Input
              label="Amount (₹)"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
            />
            <Input label="Notes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              {paymentMethods.map((m) => (
                <Chip key={m.value} active={editMethod === m.value} onClick={() => setEditMethod(m.value)}>
                  {m.label}
                </Chip>
              ))}
            </div>
            <Button
              onClick={() => {
                setPinAction({ kind: "edit", payment: editTarget });
              }}
            >
              Confirm Edit (PIN required)
            </Button>
          </div>
        </Modal>
      )}

      <PinPrompt
        open={!!pinAction}
        title={pinAction?.kind === "delete" ? "Confirm Deletion" : "Confirm Edit"}
        description="This changes financial records and is logged."
        onConfirm={confirmPin}
        onCancel={() => setPinAction(null)}
      />
    </div>
  );
}
