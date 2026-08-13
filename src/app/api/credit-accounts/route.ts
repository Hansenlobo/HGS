import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth/apiGuard";
import { creditAccountSchema } from "@/lib/validation/creditAccount.schema";
import { creditAccountWithRelationsArgs } from "@/types";
import { allocateSequenceNumber } from "@/lib/billing/sequence";
import { computeAccountBalance } from "@/lib/creditAccounts/accountBalance";
import { logAudit } from "@/lib/audit/log";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.trim();

  const where: Prisma.CreditAccountWhereInput = {};
  if (status === "OPEN" || status === "CLOSED") where.status = status;
  if (search) {
    where.OR = [{ name: { contains: search } }, { customerName: { contains: search } }];
  }

  const accounts = await prisma.creditAccount.findMany({
    where,
    orderBy: { createdAt: "desc" },
    ...creditAccountWithRelationsArgs,
  });

  const withBalance = accounts.map((account) => ({
    ...account,
    balance: computeAccountBalance(account),
  }));

  return NextResponse.json(withBalance);
}

export async function POST(request: NextRequest) {
  const auth = await requireUserApi();
  if ("response" in auth) return auth.response;

  const body = await request.json();
  const parsed = creditAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const account = await prisma.$transaction(async (tx) => {
    const accountNumber = await allocateSequenceNumber(tx, "creditAccount");
    const created = await tx.creditAccount.create({
      data: {
        accountNumber,
        name: parsed.data.name,
        customerName: parsed.data.customerName,
        customerPhone: parsed.data.customerPhone,
        percentageIncrease: parsed.data.percentageIncrease,
        notes: parsed.data.notes,
        createdBy: auth.user.name,
      },
    });

    await logAudit(
      {
        user: { id: auth.user.id, name: auth.user.name },
        module: "CreditAccounts",
        action: "CREATE",
        description: `${auth.user.name} opened credit account "${created.name}"`,
        entityType: "CreditAccount",
        entityId: created.id,
      },
      tx,
    );

    return tx.creditAccount.findUniqueOrThrow({ where: { id: created.id }, ...creditAccountWithRelationsArgs });
  });

  return NextResponse.json({ ...account, balance: computeAccountBalance(account) }, { status: 201 });
}
