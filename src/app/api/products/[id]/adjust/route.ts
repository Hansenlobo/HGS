import { NextRequest, NextResponse } from "next/server";
import { adjustmentSchema } from "@/lib/validation/adjustment.schema";
import { adjustStock, InsufficientStockError } from "@/lib/stock/stockAdjustment.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = adjustmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const product = await adjustStock({
      productId: id,
      source: "MANUAL",
      ...parsed.data,
    });
    return NextResponse.json(product);
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
