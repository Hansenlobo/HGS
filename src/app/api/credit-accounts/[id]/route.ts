import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth/apiGuard";
import { creditAccountSchema } from "@/lib/validation/creditAccount.schema";
import { creditAccountWithRelationsArgs } from "@/types";
import { computeAccountBalance } from "@/lib/creditAccounts/accountBalance";
import { logAudit } from "@/lib/audit/log";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await prisma.creditAccount.findUnique({ where: { id }, ...creditAccountWithRelationsArgs });
  if (!account) {
    return NextResponse.json({ error: "Credit account not found" }, { status: 404 });
  }
  return NextResponse.json({ ...account, balance: computeAccountBalance(account) });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserApi();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const parsed = creditAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.creditAccount.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Credit account not found" }, { status: 404 });
  }
  if (existing.status === "CLOSED") {
    return NextResponse.json({ error: "This account is closed — its final bill has already been generated" }, { status: 409 });
  }

  await prisma.creditAccount.update({
    where: { id },
    data: {
      name: parsed.data.name,
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      percentageIncrease: parsed.data.percentageIncrease,
      notes: parsed.data.notes,
    },
  });

  await logAudit({
    user: { id: auth.user.id, name: auth.user.name },
    module: "CreditAccounts",
    action: "UPDATE",
    description: `${auth.user.name} updated credit account "${parsed.data.name}"`,
    entityType: "CreditAccount",
    entityId: id,
  });

  const account = await prisma.creditAccount.findUniqueOrThrow({ where: { id }, ...creditAccountWithRelationsArgs });
  return NextResponse.json({ ...account, balance: computeAccountBalance(account) });
}
