import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { productSchema, type ProductFormValues } from "@/lib/validation/product.schema";
import { productWithRelationsArgs, type ProductWithRelations } from "@/types";
import { isLowStock, isOutOfStock } from "@/lib/stock/stockMetrics";
import { expandCategoryIds } from "@/lib/categories/expandCategoryIds";
import type { Prisma } from "@/generated/prisma/client";

function toScalarData(
  data: ProductFormValues,
): Omit<Prisma.ProductUncheckedCreateInput, "categories"> {
  const common = {
    name: data.name,
    notes: data.notes ?? null,
    imageUrl: data.imageUrl ?? null,
    minStock: data.minStock,
    shelfLocation: data.shelfLocation ?? null,
    isActive: data.isActive,
    isPartyProduct: data.isPartyProduct,
    saleType: data.saleType,
  };

  if (data.saleType === "SIMPLE") {
    return {
      ...common,
      costPrice: data.costPrice ?? null,
      sellingPrice: data.sellingPrice,
      currentStock: data.currentStock,
    };
  }

  if (data.saleType === "LENGTH") {
    return {
      ...common,
      fullLengthValue: data.fullLengthValue,
      unitLabel: data.unitLabel,
      fullLengthCostPrice: data.fullLengthCostPrice ?? null,
      fullLengthPrice: data.fullLengthPrice,
      cutUnitCostPrice: data.cutUnitCostPrice ?? null,
      cutUnitPrice: data.cutUnitPrice,
      fullLengthCount: data.fullLengthCount,
    };
  }

  return {
    ...common,
    boxSize: data.boxSize,
    boxCostPrice: data.boxCostPrice ?? null,
    boxPrice: data.boxPrice,
    looseUnitCostPrice: data.looseUnitCostPrice ?? null,
    looseUnitPrice: data.looseUnitPrice,
    boxCount: data.boxCount,
    looseCount: data.looseCount,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const categoryIds = searchParams.getAll("categoryId").filter(Boolean);
  const outOfStock = searchParams.get("outOfStock") === "true";
  const lowStock = searchParams.get("lowStock") === "true";
  const inactive = searchParams.get("inactive") === "true";

  const where: Prisma.ProductWhereInput = {
    isActive: !inactive,
  };

  if (search) {
    // Match if ANY whitespace-separated word in the query appears in the
    // name or notes — a literal whole-phrase `contains` would miss almost
    // every multi-word search (e.g. "pipe cut" not matching "PVC Pipe",
    // since "cut" describes how it's sold, not text in its name/notes).
    const words = search.split(/\s+/).filter(Boolean);
    where.OR = words.flatMap((word) => [
      { name: { contains: word } },
      { notes: { contains: word } },
    ]);
  }

  if (categoryIds.length > 0) {
    const expandedIds = await expandCategoryIds(categoryIds);
    where.categories = { some: { categoryId: { in: expandedIds } } };
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: { name: "asc" },
    ...productWithRelationsArgs,
  });

  const filtered = products.filter((product: ProductWithRelations) => {
    if (outOfStock && !isOutOfStock(product)) return false;
    if (lowStock && !isLowStock(product)) return false;
    return true;
  });

  return NextResponse.json(filtered);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { categoryIds, ...rest } = parsed.data;
  const scalarData = toScalarData({ ...rest, categoryIds } as ProductFormValues);

  const product = await prisma.product.create({
    data: {
      ...scalarData,
      categories: {
        create: categoryIds.map((categoryId) => ({ categoryId })),
      },
    },
    ...productWithRelationsArgs,
  });

  return NextResponse.json(product, { status: 201 });
}
