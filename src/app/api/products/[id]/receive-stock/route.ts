import { NextRequest, NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth/apiGuard";
import { receiveStockSchema } from "@/lib/validation/receiveStock.schema";
import { receiveStock } from "@/lib/stock/stockAdjustment.service";
import { logAudit } from "@/lib/audit/log";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUserApi();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const parsed = receiveStockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const product = await receiveStock({ productId: id, ...parsed.data });

  await logAudit({
    user: { id: auth.user.id, name: auth.user.name },
    module: "Products",
    action: "RECEIVE_STOCK",
    description: `${auth.user.name} received ${parsed.data.quantity} ${parsed.data.kind} stock for "${product.name}"`,
    entityType: "Product",
    entityId: id,
    detail: {
      kind: parsed.data.kind,
      quantity: parsed.data.quantity,
      costPrice: parsed.data.costPrice,
      supplierId: parsed.data.supplierId,
    },
  });

  return NextResponse.json(product);
}
