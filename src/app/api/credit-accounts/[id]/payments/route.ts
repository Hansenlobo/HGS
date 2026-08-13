import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth/apiGuard";
import { creditAccountPaymentSchema } from "@/lib/validation/creditAccountPayment.schema";
import { creditAccountWithRelationsArgs } from "@/types";
import { computeAccountBalance } from "@/lib/creditAccounts/accountBalance";
import { logAudit } from "@/lib/audit/log";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserApi();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const account = await prisma.creditAccount.findUnique({ where: { id } });
  if (!account) {
    return NextResponse.json({ error: "Credit account not found" }, { status: 404 });
  }
  if (account.status === "CLOSED") {
    return NextResponse.json({ error: "This account is closed" }, { status: 409 });
  }

  const body = await request.json();
  const parsed = creditAccountPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.creditAccountPayment.create({
      data: {
        accountId: id,
        amount: parsed.data.amount,
        method: parsed.data.method,
        date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
        notes: parsed.data.notes,
        enteredBy: parsed.data.enteredBy ?? auth.user.name,
      },
    });

    await logAudit(
      {
        user: { id: auth.user.id, name: auth.user.name },
        module: "CreditAccounts",
        action: "ADD_PAYMENT",
        description: `${auth.user.name} recorded a payment of ${parsed.data.amount} on credit account "${account.name}"`,
        entityType: "CreditAccount",
        entityId: id,
      },
      tx,
    );
  });

  const updated = await prisma.creditAccount.findUniqueOrThrow({ where: { id }, ...creditAccountWithRelationsArgs });
  return NextResponse.json({ ...updated, balance: computeAccountBalance(updated) }, { status: 201 });
}
