import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/session";
import { CustomItemsPageClient } from "@/components/customItems/CustomItemsPageClient";

export default async function CustomItemsPage() {
  await requireUser();

  const items = await prisma.customItem.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { billLineItems: true } } },
  });

  return <CustomItemsPageClient initialItems={items} />;
}
