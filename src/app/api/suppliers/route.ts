import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth/apiGuard";
import { supplierSchema } from "@/lib/validation/supplier.schema";
import { supplierWithLedgerArgs } from "@/types";
import { computeSupplierBalance } from "@/lib/suppliers/supplierBalance";
import { logAudit } from "@/lib/audit/log";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();

  const suppliers = await prisma.supplier.findMany({
    where: search ? { name: { contains: search } } : undefined,
    orderBy: { name: "asc" },
    ...supplierWithLedgerArgs,
  });

  const withBalance = suppliers.map((s) => ({ ...s, balance: computeSupplierBalance(s) }));

  return NextResponse.json(withBalance);
}

export async function POST(request: NextRequest) {
  const auth = await requireUserApi();
  if ("response" in auth) return auth.response;

  const body = await request.json();
  const parsed = supplierSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supplier = await prisma.supplier.create({
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

  await logAudit({
    user: { id: auth.user.id, name: auth.user.name },
    module: "Suppliers",
    action: "CREATE",
    description: `${auth.user.name} added supplier "${supplier.name}"`,
    entityType: "Supplier",
    entityId: supplier.id,
  });

  return NextResponse.json({ ...supplier, balance: computeSupplierBalance(supplier) }, { status: 201 });
}
