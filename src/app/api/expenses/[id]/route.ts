import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth/apiGuard";
import { expenseSchema } from "@/lib/validation/expense.schema";
import { logAudit } from "@/lib/audit/log";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserApi();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  const updated = await prisma.expense.update({
    where: { id },
    data: {
      date: new Date(parsed.data.date),
      category: parsed.data.category,
      amount: parsed.data.amount,
      notes: parsed.data.notes,
    },
  });

  await logAudit({
    user: { id: auth.user.id, name: auth.user.name },
    module: "Expenses",
    action: "UPDATE",
    description: `${auth.user.name} updated an expense`,
    entityType: "Expense",
    entityId: id,
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserApi();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const existing = await prisma.expense.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  await prisma.expense.delete({ where: { id } });

  await logAudit({
    user: { id: auth.user.id, name: auth.user.name },
    module: "Expenses",
    action: "DELETE",
    description: `${auth.user.name} deleted a ${existing.category} expense of ${existing.amount}`,
    entityType: "Expense",
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}
