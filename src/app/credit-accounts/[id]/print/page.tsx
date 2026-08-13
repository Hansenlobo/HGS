import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { creditAccountWithRelationsArgs } from "@/types";
import { computeAccountBalance } from "@/lib/creditAccounts/accountBalance";
import { CreditAccountPrintView } from "@/components/creditAccounts/CreditAccountPrintView";

export default async function CreditAccountPrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const account = await prisma.creditAccount.findUnique({ where: { id }, ...creditAccountWithRelationsArgs });
  if (!account) notFound();

  return <CreditAccountPrintView account={account} balance={computeAccountBalance(account)} />;
}
