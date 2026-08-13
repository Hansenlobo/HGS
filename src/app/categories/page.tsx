import { prisma } from "@/lib/prisma";
import { CategoriesPageClient } from "@/components/categories/CategoriesPageClient";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return <CategoriesPageClient initialCategories={categories} />;
}
