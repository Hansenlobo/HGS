"use client";

import { useState } from "react";
import type { ProductWithRelations, SupplierWithProducts } from "@/types";
import { Input, Textarea } from "@/components/ui/Input";
import { MultiSelectChips } from "@/components/ui/MultiSelectChips";
import { Button } from "@/components/ui/Button";

export interface SupplierFormSubmitValues {
  name: string;
  phone: string;
  address: string;
  gstNumber: string;
  notes: string;
  outstandingBalance: string;
  productIds: string[];
}

export interface SupplierFormProps {
  supplier?: SupplierWithProducts;
  products: ProductWithRelations[];
  onSubmit: (values: SupplierFormSubmitValues) => Promise<void>;
  onCancel: () => void;
}

export function SupplierForm({ supplier, products, onSubmit, onCancel }: SupplierFormProps) {
  const [name, setName] = useState(supplier?.name ?? "");
  const [phone, setPhone] = useState(supplier?.phone ?? "");
  const [address, setAddress] = useState(supplier?.address ?? "");
  const [gstNumber, setGstNumber] = useState(supplier?.gstNumber ?? "");
  const [notes, setNotes] = useState(supplier?.notes ?? "");
  const [outstandingBalance, setOutstandingBalance] = useState(
    supplier ? String(supplier.outstandingBalance) : "0",
  );
  const [productIds, setProductIds] = useState<string[]>(
    supplier?.products.map((p) => p.productId) ?? [],
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Name is required");
    setError(undefined);
    setSubmitting(true);
    try {
      await onSubmit({ name, phone, address, gstNumber, notes, outstandingBalance, productIds });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
      <Input label="Supplier Name" value={name} onChange={(e) => setName(e.target.value)} />
      <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <Textarea label="Address" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
      <Input label="GST Number" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
      <Input
        label="Opening Balance (₹)"
        type="number"
        step="0.01"
        inputMode="decimal"
        value={outstandingBalance}
        onChange={(e) => setOutstandingBalance(e.target.value)}
        hint="Starting balance before any bills or payments are logged — the ledger on the supplier's page builds on top of this."
      />
      <Textarea label="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />

      <MultiSelectChips
        label="Products Supplied"
        options={products.map((p) => ({ id: p.id, label: p.name }))}
        selected={productIds}
        onChange={setProductIds}
        emptyHint="No products yet"
      />

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="sticky bottom-0 -mx-1 flex gap-2 bg-surface px-1 pt-2">
        <Button type="button" variant="secondary" fullWidth onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" fullWidth disabled={submitting}>
          {submitting ? "Saving…" : "Save Supplier"}
        </Button>
      </div>
    </form>
  );
}
