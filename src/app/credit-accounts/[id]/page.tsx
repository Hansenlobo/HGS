import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { creditAccountWithRelationsArgs } from "@/types";
import { computeAccountBalance } from "@/lib/creditAccounts/accountBalance";
import { CreditAccountDetailClient } from "@/components/creditAccounts/CreditAccountDetailClient";

export default async function CreditAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const [account, categories] = await Promise.all([
    prisma.creditAccount.findUnique({ where: { id }, ...creditAccountWithRelationsArgs }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!account) notFound();

  return (
    <CreditAccountDetailClient
      initialAccount={{ ...account, balance: computeAccountBalance(account) }}
      categories={categories}
    />
  );
}
