import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const printedBy: string | undefined = typeof body?.printedBy === "string" ? body.printedBy : undefined;

  const quotation = await prisma.quotation.findUnique({ where: { id } });
  if (!quotation) {
    return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.quotationPrintLog.create({ data: { quotationId: id, printedBy } });
    if (quotation.status === "DRAFT") {
      await tx.quotation.update({ where: { id }, data: { status: "PRINTED" } });
    }
  });

  return NextResponse.json({ ok: true });
}
