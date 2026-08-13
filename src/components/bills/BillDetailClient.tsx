"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import type { BillWithRelations } from "@/types";
import { fetcher, patchJson } from "@/lib/fetcher";
import { formatBillNumber, getPaidTotal, getPendingAmount } from "@/lib/billing/billDisplay";
import { formatPrice, formatNumber } from "@/lib/stock/stockDisplay";
import { formatDateTime } from "@/lib/formatDate";
import { useCurrentUser } from "@/components/auth/CurrentUserProvider";
import { useAppSettings } from "@/components/settings/AppSettingsProvider";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { PinPrompt } from "@/components/ui/PinPrompt";
import { postJson } from "@/lib/fetcher";
import { BillStatusBadge } from "./BillStatusBadge";
import { PaymentsModal } from "./PaymentsModal";
import { AuditTimeline } from "./AuditTimeline";

export function BillDetailClient({ initialBill }: { initialBill: BillWithRelations }) {
  const currentUser = useCurrentUser();
  const staffName = currentUser.name;
  const { invoicePrefix } = useAppSettings();
  const { showToast } = useToast();
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [markPaidAmount, setMarkPaidAmount] = useState("");
  const [markPaidError, setMarkPaidError] = useState<string | undefined>();
  const [markingPaid, setMarkingPaid] = useState(false);

  const { data: bill, mutate } = useSWR<BillWithRelations>(`/api/bills/${initialBill.id}`, fetcher, {
    fallbackData: initialBill,
  });

  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [pinMode, setPinMode] = useState<"edit" | "cancel" | null>(null);

  if (!bill) return null;

  const paid = getPaidTotal(bill.payments);
  const pending = getPendingAmount(bill.customerAmount, paid);
  const overallDiscountAmount = bill.shopAmount + bill.marginAmount - bill.customerAmount;

  function openEdit() {
    setEditName(bill!.customerName);
    setEditPhone(bill!.customerPhone ?? "");
    setEditNotes(bill!.customerNotes ?? "");
    setEditOpen(true);
  }

  async function confirmPin(pin: string) {
    if (pinMode === "edit") {
      const updated = await patchJson<BillWithRelations>(`/api/bills/${bill!.id}`, {
        pin,
        editedBy: staffName,
        customerName: editName,
        customerPhone: editPhone,
        customerNotes: editNotes,
      });
      await mutate(updated, { revalidate: false });
      showToast("Bill updated");
      setEditOpen(false);
    } else if (pinMode === "cancel") {
      const res = await fetch(`/api/bills/${bill!.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, reason: cancelReason, cancelledBy: staffName }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Could not cancel bill");
      }
      const updated = await res.json();
      await mutate(updated, { revalidate: false });
      showToast("Bill cancelled, stock restored");
    }
    setPinMode(null);
  }

  function openMarkPaid() {
    setMarkPaidAmount(String(pending));
    setMarkPaidError(undefined);
    setMarkPaidOpen(true);
  }

  async function handleMarkPaid() {
    setMarkPaidError(undefined);
    const amount = Number(markPaidAmount);
    if (!amount || amount <= 0) {
      setMarkPaidError("Enter an amount");
      return;
    }
    if (amount > pending) {
      setMarkPaidError(`Can't exceed pending amount (${formatPrice(pending)})`);
      return;
    }
    setMarkingPaid(true);
    try {
      const updated = await postJson<BillWithRelations>(`/api/bills/${bill!.id}/mark-paid`, { amount });
      await mutate(updated, { revalidate: false });
      showToast("Bill marked as paid");
      setMarkPaidOpen(false);
    } catch (err) {
      setMarkPaidError(err instanceof Error ? err.message : "Could not mark bill as paid");
    } finally {
      setMarkingPaid(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground">
            {formatBillNumber(bill.billNumber, invoicePrefix)}
          </h1>
          <p className="text-sm text-muted">{formatDateTime(bill.createdAt)}</p>
          <BillStatusBadge bill={bill} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/bills/${bill.id}/print`}>
            <Button variant="secondary" size="sm">
              Print
            </Button>
          </Link>
          <Link href={`/billing/${bill.type === "NORMAL" ? "normal" : "party"}/new?fromBill=${bill.id}`}>
            <Button variant="secondary" size="sm">
              Duplicate
            </Button>
          </Link>
          {!bill.isCancelled && (
            <>
              <Button variant="secondary" size="sm" onClick={openEdit}>
                Edit
              </Button>
              <Button variant="danger" size="sm" onClick={() => setCancelOpen(true)}>
                Cancel Bill
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-4">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Customer</h2>
          <p className="text-sm text-foreground">{bill.customerName}</p>
          {bill.customerPhone && <p className="text-sm text-muted">{bill.customerPhone}</p>}
          {bill.customerNotes && <p className="text-sm text-muted">{bill.customerNotes}</p>}
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Payments</h2>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Paid</span>
            <span className="text-foreground">{formatPrice(paid)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted">Pending</span>
            <span className="text-foreground">{formatPrice(pending)}</span>
          </div>
          <Button size="sm" className="mt-2" fullWidth onClick={() => setPaymentsOpen(true)}>
            Manage Payments
          </Button>
          {currentUser.role === "ADMIN" && !bill.isCancelled && pending > 0 && (
            <Button size="sm" variant="secondary" className="mt-2" fullWidth onClick={openMarkPaid}>
              Mark as Paid
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">Items</h2>
        <div className="flex flex-col gap-2">
          {bill.lineItems.map((line) => (
            <div key={line.id} className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3 text-sm">
              <div className="flex justify-between">
                <span className="font-medium text-foreground">{line.itemName}</span>
                <span className="text-foreground">{formatPrice(line.amount)}</span>
              </div>
              <p className="text-muted">
                {formatNumber(line.quantity)} {line.saleKind === "LENGTH_CUT" ? `× ${formatNumber(line.cutLength ?? 0)}` : ""}
                {" · "}
                Rate {formatPrice(line.rate)}
                {bill.type === "PARTY" && line.isPartyProduct ? ` · Party Rate ${formatPrice(line.partyRate)}` : ""}
              </p>
              {line.note && <p className="italic text-muted">Note: {line.note}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        {bill.type === "PARTY" ? (
          <>
            <SummaryRow label="Shop Amount" value={bill.shopAmount} />
            <SummaryRow label="Margin Amount" value={bill.marginAmount} />
            {bill.overallDiscountType && <SummaryRow label="Overall Discount" value={overallDiscountAmount} />}
            <SummaryRow label="Customer Amount" value={bill.customerAmount} strong />
          </>
        ) : (
          <>
            <SummaryRow label="Subtotal" value={bill.subtotal} />
            <SummaryRow label="Discount Total" value={bill.discountTotal} />
            {bill.overallDiscountType && <SummaryRow label="Overall Discount" value={overallDiscountAmount} />}
            <SummaryRow label="Grand Total" value={bill.customerAmount} strong />
          </>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">History</h2>
        <AuditTimeline bill={bill} />
      </div>

      <PaymentsModal
        bill={paymentsOpen ? bill : null}
        onClose={() => setPaymentsOpen(false)}
        onUpdated={(updated) => mutate(updated, { revalidate: false })}
      />

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Bill">
        {editOpen && (
          <div className="flex flex-col gap-4">
            <Input label="Customer Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            <Input label="Phone Number" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            <Textarea label="Notes" rows={2} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
            <p className="text-xs text-muted">Line items can&apos;t be edited — cancel and re-bill instead.</p>
            <Button
              onClick={() => {
                setEditOpen(false);
                setPinMode("edit");
              }}
            >
              Confirm Edit (PIN required)
            </Button>
          </div>
        )}
      </Modal>

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel Bill">
        {cancelOpen && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">This restores the stock this bill took. Requires the Admin PIN.</p>
            <Input label="Reason (optional)" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
            <Button
              onClick={() => {
                setCancelOpen(false);
                setPinMode("cancel");
              }}
            >
              Continue to PIN
            </Button>
          </div>
        )}
      </Modal>

      <PinPrompt
        open={!!pinMode}
        title={pinMode === "cancel" ? "Confirm Cancellation" : "Confirm Edit"}
        onConfirm={confirmPin}
        onCancel={() => setPinMode(null)}
      />

      <Modal open={markPaidOpen} onClose={() => setMarkPaidOpen(false)} title="Mark as Paid">
        {markPaidOpen && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">
              Pending balance is {formatPrice(pending)}. Enter the amount actually received — any remaining
              balance is written off and the bill is marked Paid. Admin action, logged in the audit trail.
            </p>
            <Input
              label="Amount Paid (₹)"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={markPaidAmount}
              onChange={(e) => setMarkPaidAmount(e.target.value)}
              error={markPaidError}
            />
            <Button onClick={handleMarkPaid} disabled={markingPaid}>
              {markingPaid ? "Saving…" : "Mark as Paid"}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? "font-semibold text-foreground" : "text-sm text-muted"}>{label}</span>
      <span className={strong ? "text-lg font-semibold text-foreground" : "text-sm text-foreground"}>
        {formatPrice(value)}
      </span>
    </div>
  );
}
