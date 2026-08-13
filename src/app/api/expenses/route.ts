import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth/apiGuard";
import { expenseSchema } from "@/lib/validation/expense.schema";
import { logAudit } from "@/lib/audit/log";
import { ExpenseCategory, type Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const where: Prisma.ExpenseWhereInput = {};
  if (category && category in ExpenseCategory) where.category = category as ExpenseCategory;
  if (dateFrom || dateTo) {
    where.date = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  }

  const expenses = await prisma.expense.findMany({ where, orderBy: { date: "desc" } });
  return NextResponse.json(expenses);
}

export async function POST(request: NextRequest) {
  const auth = await requireUserApi();
  if ("response" in auth) return auth.response;

  const body = await request.json();
  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const expense = await prisma.expense.create({
    data: {
      date: new Date(parsed.data.date),
      category: parsed.data.category,
      amount: parsed.data.amount,
      notes: parsed.data.notes,
      createdBy: auth.user.name,
    },
  });

  await logAudit({
    user: { id: auth.user.id, name: auth.user.name },
    module: "Expenses",
    action: "CREATE",
    description: `${auth.user.name} logged a ${parsed.data.category} expense of ${parsed.data.amount}`,
    entityType: "Expense",
    entityId: expense.id,
  });

  return NextResponse.json(expense, { status: 201 });
}
