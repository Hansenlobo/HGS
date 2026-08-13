import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth/apiGuard";
import { logAudit } from "@/lib/audit/log";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserApi();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const account = await prisma.creditAccount.findUnique({ where: { id } });
  if (!account) {
    return NextResponse.json({ error: "Credit account not found" }, { status: 404 });
  }

  await logAudit({
    user: { id: auth.user.id, name: auth.user.name },
    module: "CreditAccounts",
    action: "PRINT_STATEMENT",
    description: `${auth.user.name} printed a statement for credit account "${account.name}"`,
    entityType: "CreditAccount",
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}
