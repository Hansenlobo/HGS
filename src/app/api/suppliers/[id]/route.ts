import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth/apiGuard";
import { supplierSchema } from "@/lib/validation/supplier.schema";
import { supplierWithLedgerArgs } from "@/types";
import { computeSupplierBalance } from "@/lib/suppliers/supplierBalance";
import { logAudit } from "@/lib/audit/log";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({ where: { id }, ...supplierWithLedgerArgs });
  if (!supplier) {
    return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  }
  return NextResponse.json({ ...supplier, balance: computeSupplierBalance(supplier) });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserApi();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const parsed = supplierSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  }

  const supplier = await prisma.$transaction(async (tx) => {
    await tx.productSupplier.deleteMany({ where: { supplierId: id } });
    return tx.supplier.update({
      where: { id },
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        address: parsed.data.address,
        gstNumber: parsed.data.gstNumber,
        notes: parsed.data.notes,
        outstandingBalance: parsed.data.outstandingBalance,
        products: {
          create: parsed.data.productIds.map((productId) => ({ productId })),
        },
      },
      ...supplierWithLedgerArgs,
    });
  });

  await logAudit({
    user: { id: auth.user.id, name: auth.user.name },
    module: "Suppliers",
    action: "UPDATE",
    description: `${auth.user.name} updated supplier "${supplier.name}"`,
    entityType: "Supplier",
    entityId: id,
  });

  return NextResponse.json({ ...supplier, balance: computeSupplierBalance(supplier) });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserApi();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
  }

  await prisma.supplier.delete({ where: { id } });

  await logAudit({
    user: { id: auth.user.id, name: auth.user.name },
    module: "Suppliers",
    action: "DELETE",
    description: `${auth.user.name} deleted supplier "${existing.name}"`,
    entityType: "Supplier",
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}
