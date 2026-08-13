import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const printedBy: string | undefined = typeof body?.printedBy === "string" ? body.printedBy : undefined;

  const bill = await prisma.bill.findUnique({ where: { id } });
  if (!bill) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  }

  await prisma.billPrintLog.create({ data: { billId: id, kind: "BILL", printedBy } });
  return NextResponse.json({ ok: true });
}
