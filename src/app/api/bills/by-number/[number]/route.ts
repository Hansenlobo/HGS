import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { billWithRelationsArgs } from "@/types";

export async function GET(_request: Request, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const billNumber = Number(number);
  if (!Number.isFinite(billNumber)) {
    return NextResponse.json({ error: "Invalid bill number" }, { status: 400 });
  }

  const bill = await prisma.bill.findUnique({ where: { billNumber }, ...billWithRelationsArgs });
  if (!bill) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  }
  return NextResponse.json(bill);
}
