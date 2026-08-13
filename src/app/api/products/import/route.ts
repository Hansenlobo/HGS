import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserApi } from "@/lib/auth/apiGuard";
import { productSchema } from "@/lib/validation/product.schema";
import { parseCsv } from "@/lib/csv";
import { rowsFromCsv, type ProductImportRow } from "@/lib/products/importCsv";
import { logAudit } from "@/lib/audit/log";

function parseBool(value: string, fallback: boolean): boolean {
  if (!value) return fallback;
  return ["true", "1", "yes", "y"].includes(value.toLowerCase());
}

function num(value: string): number | undefined {
  if (value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function buildCandidate(row: ProductImportRow): unknown {
  const r = row.raw;
  const common = {
    name: r.name,
    notes: r.notes || undefined,
    minStock: num(r.minStock) ?? 0,
    shelfLocation: r.shelfLocation || undefined,
    isActive: parseBool(r.isActive, true),
    isPartyProduct: parseBool(r.isPartyProduct, false),
    categoryIds: [] as string[],
  };

  const saleType = r.saleType.trim().toUpperCase();
  if (saleType === "SIMPLE") {
    return {
      ...common,
      saleType: "SIMPLE",
      costPrice: num(r.costPrice),
      sellingPrice: num(r.sellingPrice) ?? 0,
      currentStock: num(r.currentStock) ?? 0,
    };
  }
  if (saleType === "LENGTH") {
    return {
      ...common,
      saleType: "LENGTH",
      fullLengthValue: num(r.fullLengthValue) ?? 0,
      unitLabel: r.unitLabel,
      fullLengthCostPrice: num(r.fullLengthCostPrice),
      fullLengthPrice: num(r.fullLengthPrice) ?? 0,
      cutUnitCostPrice: num(r.cutUnitCostPrice),
      cutUnitPrice: num(r.cutUnitPrice) ?? 0,
      fullLengthCount: num(r.fullLengthCount) ?? 0,
    };
  }
  if (saleType === "BOX") {
    return {
      ...common,
      saleType: "BOX",
      boxSize: num(r.boxSize) ?? 0,
      boxCostPrice: num(r.boxCostPrice),
      boxPrice: num(r.boxPrice) ?? 0,
      looseUnitCostPrice: num(r.looseUnitCostPrice),
      looseUnitPrice: num(r.looseUnitPrice) ?? 0,
      boxCount: num(r.boxCount) ?? 0,
      looseCount: num(r.looseCount) ?? 0,
    };
  }
  return { ...common, saleType: saleType || "UNKNOWN" };
}

export async function POST(request: NextRequest) {
  const auth = await requireUserApi();
  if ("response" in auth) return auth.response;

  const body = await request.json();
  const csv = typeof body?.csv === "string" ? body.csv : "";
  if (!csv.trim()) {
    return NextResponse.json({ error: "No CSV content provided" }, { status: 400 });
  }

  const rows = rowsFromCsv(parseCsv(csv));
  if (rows.length === 0) {
    return NextResponse.json({ error: "No data rows found" }, { status: 400 });
  }
  if (rows.length > 2000) {
    return NextResponse.json({ error: "Import is limited to 2000 rows at a time" }, { status: 400 });
  }

  const categoryCache = new Map<string, string>();
  async function resolveCategoryIds(namesRaw: string): Promise<string[]> {
    const names = namesRaw
      .split(";")
      .map((n) => n.trim())
      .filter(Boolean);
    const ids: string[] = [];
    for (const name of names) {
      const key = name.toLowerCase();
      let id = categoryCache.get(key);
      if (!id) {
        const category = await prisma.category.upsert({
          where: { name },
          update: {},
          create: { name },
        });
        id = category.id;
        categoryCache.set(key, id);
      }
      ids.push(id);
    }
    return ids;
  }

  let created = 0;
  let updated = 0;
  const errors: { row: number; name: string; message: string }[] = [];

  for (const row of rows) {
    if (!row.raw.name) {
      errors.push({ row: row.rowNumber, name: "", message: "Missing name" });
      continue;
    }
    const categoryIds = await resolveCategoryIds(row.raw.categories);
    const candidate = buildCandidate(row);
    const parsed = productSchema.safeParse({ ...(candidate as object), categoryIds });
    if (!parsed.success) {
      errors.push({
        row: row.rowNumber,
        name: row.raw.name,
        message: parsed.error.issues.map((i) => i.message).join("; "),
      });
      continue;
    }

    const data = parsed.data;
    const scalarData =
      data.saleType === "SIMPLE"
        ? {
            saleType: "SIMPLE" as const,
            costPrice: data.costPrice ?? null,
            sellingPrice: data.sellingPrice,
            currentStock: data.currentStock,
          }
        : data.saleType === "LENGTH"
          ? {
              saleType: "LENGTH" as const,
              fullLengthValue: data.fullLengthValue,
              unitLabel: data.unitLabel,
              fullLengthCostPrice: data.fullLengthCostPrice ?? null,
              fullLengthPrice: data.fullLengthPrice,
              cutUnitCostPrice: data.cutUnitCostPrice ?? null,
              cutUnitPrice: data.cutUnitPrice,
              fullLengthCount: data.fullLengthCount,
            }
          : {
              saleType: "BOX" as const,
              boxSize: data.boxSize,
              boxCostPrice: data.boxCostPrice ?? null,
              boxPrice: data.boxPrice,
              looseUnitCostPrice: data.looseUnitCostPrice ?? null,
              looseUnitPrice: data.looseUnitPrice,
              boxCount: data.boxCount,
              looseCount: data.looseCount,
            };

    const existing = await prisma.product.findFirst({ where: { name: data.name } });

    try {
      if (existing) {
        await prisma.$transaction(async (tx) => {
          await tx.product.update({
            where: { id: existing.id },
            data: {
              notes: data.notes ?? null,
              minStock: data.minStock,
              shelfLocation: data.shelfLocation ?? null,
              isActive: data.isActive,
              isPartyProduct: data.isPartyProduct,
              ...scalarData,
            },
          });
          await tx.productCategory.deleteMany({ where: { productId: existing.id } });
          if (categoryIds.length > 0) {
            await tx.productCategory.createMany({
              data: categoryIds.map((categoryId) => ({ productId: existing.id, categoryId })),
            });
          }
        });
        updated++;
      } else {
        await prisma.product.create({
          data: {
            name: data.name,
            notes: data.notes ?? null,
            minStock: data.minStock,
            shelfLocation: data.shelfLocation ?? null,
            isActive: data.isActive,
            isPartyProduct: data.isPartyProduct,
            ...scalarData,
            categories: {
              create: categoryIds.map((categoryId) => ({ categoryId })),
            },
          },
        });
        created++;
      }
    } catch (err) {
      errors.push({
        row: row.rowNumber,
        name: row.raw.name,
        message: err instanceof Error ? err.message : "Failed to save",
      });
    }
  }

  await logAudit({
    user: { id: auth.user.id, name: auth.user.name },
    module: "Products",
    action: "IMPORT",
    description: `${auth.user.name} imported products: ${created} created, ${updated} updated, ${errors.length} failed`,
    detail: { created, updated, errorCount: errors.length },
  });

  return NextResponse.json({ created, updated, errors });
}
