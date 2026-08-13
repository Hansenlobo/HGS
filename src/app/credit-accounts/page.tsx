import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { creditAccountWithRelationsArgs } from "@/types";
import { computeAccountBalance } from "@/lib/creditAccounts/accountBalance";
import { CreditAccountsPageClient } from "@/components/creditAccounts/CreditAccountsPageClient";

export default async function CreditAccountsPage() {
  await requireUser();

  const accounts = await prisma.creditAccount.findMany({
    orderBy: { createdAt: "desc" },
    ...creditAccountWithRelationsArgs,
  });

  const withBalance = accounts.map((account) => ({ ...account, balance: computeAccountBalance(account) }));

  return <CreditAccountsPageClient initialAccounts={withBalance} />;
}
