import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCategorySchema } from "@/lib/validation/category.schema";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const parentId = parsed.data.parentId || null;
  if (parentId) {
    if (parentId === id) {
      return NextResponse.json({ error: "A category can't be its own parent" }, { status: 400 });
    }
    const [parent, existing] = await Promise.all([
      prisma.category.findUnique({ where: { id: parentId } }),
      prisma.category.findUnique({ where: { id }, include: { children: { select: { id: true } } } }),
    ]);
    if (!parent) {
      return NextResponse.json({ error: "Parent category not found" }, { status: 404 });
    }
    if (parent.parentId) {
      return NextResponse.json(
        { error: "Subcategories can only be one level deep" },
        { status: 400 },
      );
    }
    if (existing && existing.children.length > 0) {
      return NextResponse.json(
        { error: "A category with subcategories can't become a subcategory itself" },
        { status: 400 },
      );
    }
  }

  try {
    const category = await prisma.category.update({
      where: { id },
      data: { name: parsed.data.name, parentId },
    });
    return NextResponse.json(category);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A category with this name already exists" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }
}
