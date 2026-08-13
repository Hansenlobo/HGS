import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth/apiGuard";
import { supplierBillSchema } from "@/lib/validation/supplierBill.schema";
import { supplierWithLedgerArgs } from "@/types";
import { computeSupplierBalance } from "@/lib/suppliers/supplierBalance";
import { logAudit } from "@/lib/audit/log";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserApi();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = supplierBillSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.supplierBill.create({
      data: {
        supplierId: id,
        amount: parsed.data.amount,
        reference: parsed.data.reference,
        date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
        notes: parsed.data.notes,
        createdBy: parsed.data.createdBy ?? auth.user.name,
      },
    });

    await logAudit(
      {
        user: { id: auth.user.id, name: auth.user.name },
        module: "Suppliers",
        action: "ADD_BILL",
        description: `${auth.user.name} recorded a bill of ${parsed.data.amount} for supplier "${existing.name}"`,
        entityType: "Supplier",
        entityId: id,
      },
      tx,
    );
  });

  const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id }, ...supplierWithLedgerArgs });
  return NextResponse.json({ ...supplier, balance: computeSupplierBalance(supplier) }, { status: 201 });
}
