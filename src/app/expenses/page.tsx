import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { ExpensesPageClient } from "@/components/expenses/ExpensesPageClient";

export default async function ExpensesPage() {
  await requireUser();

  const expenses = await prisma.expense.findMany({ orderBy: { date: "desc" } });

  return <ExpensesPageClient initialExpenses={expenses} />;
}
