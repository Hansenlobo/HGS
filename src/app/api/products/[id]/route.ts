import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validation/product.schema";
import { productWithRelationsArgs } from "@/types";
import { verifyPin } from "@/lib/adminPin";
import { getCurrentUser } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit/log";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    ...productWithRelationsArgs,
  });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  return NextResponse.json(product);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  // Mark Inactive / Mark Active toggle: a minimal { isActive, pin? } body.
  // Marking a product INACTIVE requires the Admin PIN; re-activating does not.
  if (
    typeof body === "object" &&
    body !== null &&
    "isActive" in body &&
    typeof body.isActive === "boolean" &&
    Object.keys(body).every((k) => k === "isActive" || k === "pin")
  ) {
    if (body.isActive === false && !(await verifyPin(body.pin))) {
      return NextResponse.json({ error: "Incorrect PIN" }, { status: 403 });
    }
    try {
      const product = await prisma.product.update({
        where: { id },
        data: { isActive: body.isActive },
        ...productWithRelationsArgs,
      });
      if (body.isActive === false) {
        const user = await getCurrentUser();
        await logAudit({
          user,
          module: "Products",
          action: "DEACTIVATE",
          description: `Marked "${product.name}" inactive`,
          entityType: "Product",
          entityId: product.id,
        });
      }
      return NextResponse.json(product);
    } catch {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
  }

  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { categoryIds, saleType, ...rest } = parsed.data;

  const common = {
    name: rest.name,
    notes: rest.notes ?? null,
    imageUrl: rest.imageUrl ?? null,
    minStock: rest.minStock,
    shelfLocation: rest.shelfLocation ?? null,
    isActive: rest.isActive,
    isPartyProduct: rest.isPartyProduct,
    saleType,
    // Clear every sale-type-specific field, then only the active
    // branch below repopulates its own fields, so switching a
    // product's sale type never leaves stale data behind.
    costPrice: null,
    sellingPrice: null,
    currentStock: null,
    fullLengthValue: null,
    unitLabel: null,
    fullLengthCostPrice: null,
    fullLengthPrice: null,
    cutUnitCostPrice: null,
    cutUnitPrice: null,
    fullLengthCount: null,
    boxSize: null,
    boxCostPrice: null,
    boxPrice: null,
    looseUnitCostPrice: null,
    looseUnitPrice: null,
    boxCount: null,
    looseCount: null,
  } satisfies Prisma.ProductUncheckedUpdateInput;

  let scalarData: Prisma.ProductUncheckedUpdateInput;
  if (parsed.data.saleType === "SIMPLE") {
    scalarData = {
      ...common,
      costPrice: parsed.data.costPrice ?? null,
      sellingPrice: parsed.data.sellingPrice,
      currentStock: parsed.data.currentStock,
    };
  } else if (parsed.data.saleType === "LENGTH") {
    scalarData = {
      ...common,
      fullLengthValue: parsed.data.fullLengthValue,
      unitLabel: parsed.data.unitLabel,
      fullLengthCostPrice: parsed.data.fullLengthCostPrice ?? null,
      fullLengthPrice: parsed.data.fullLengthPrice,
      cutUnitCostPrice: parsed.data.cutUnitCostPrice ?? null,
      cutUnitPrice: parsed.data.cutUnitPrice,
      fullLengthCount: parsed.data.fullLengthCount,
    };
  } else {
    scalarData = {
      ...common,
      boxSize: parsed.data.boxSize,
      boxCostPrice: parsed.data.boxCostPrice ?? null,
      boxPrice: parsed.data.boxPrice,
      looseUnitCostPrice: parsed.data.looseUnitCostPrice ?? null,
      looseUnitPrice: parsed.data.looseUnitPrice,
      boxCount: parsed.data.boxCount,
      looseCount: parsed.data.looseCount,
    };
  }

  const priceFields = ["sellingPrice", "fullLengthPrice", "cutUnitPrice", "boxPrice", "looseUnitPrice"] as const;

  try {
    const product = await prisma.$transaction(async (tx) => {
      const existing = await tx.product.findUniqueOrThrow({ where: { id } });
      const historyRows = priceFields
        .filter((field) => {
          const newValue = scalarData[field];
          const oldValue = existing[field];
          return newValue != null && oldValue != null && newValue !== oldValue;
        })
        .map((field) => ({ productId: id, field, price: existing[field] as number }));
      if (historyRows.length > 0) {
        await tx.productPriceHistory.createMany({ data: historyRows });
      }

      await tx.product.update({ where: { id }, data: scalarData });
      await tx.productCategory.deleteMany({ where: { productId: id } });
      if (categoryIds.length > 0) {
        await tx.productCategory.createMany({
          data: categoryIds.map((categoryId) => ({ productId: id, categoryId })),
        });
      }
      return tx.product.findUniqueOrThrow({
        where: { id },
        ...productWithRelationsArgs,
      });
    });
    return NextResponse.json(product);
  } catch {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
}
