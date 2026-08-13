import { prisma } from "@/lib/prisma";
import { productWithRelationsArgs, type ProductWithRelations } from "@/types";
import { isLowStock, isOutOfStock } from "@/lib/stock/stockMetrics";
import { formatBillNumber, getPaidTotal, getPendingAmount } from "@/lib/billing/billDisplay";
import { getOrCreateAppSettings } from "@/lib/settings/getSettings";

export interface DashboardData {
  today: {
    revenue: number;
    billCount: number;
    expenses: number;
  };
  lowStockCount: number;
  outOfStockCount: number;
  credits: { total: number; count: number };
  topProductsToday: { name: string; qtySold: number; revenue: number }[];
  recentBills: {
    id: string;
    label: string;
    customerName: string;
    amount: number;
    createdAt: Date;
  }[];
}

export async function getDashboardData(): Promise<DashboardData> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

  const [todaysBills, todaysExpenses, allActiveProducts, unpaidBills, recentBills, settings] = await Promise.all([
    prisma.bill.findMany({
      where: { isCancelled: false, createdAt: { gte: startOfToday, lt: startOfTomorrow } },
      include: { lineItems: true },
    }),
    prisma.expense.aggregate({
      where: { date: { gte: startOfToday, lt: startOfTomorrow } },
      _sum: { amount: true },
    }),
    prisma.product.findMany({ where: { isActive: true }, ...productWithRelationsArgs }),
    prisma.bill.findMany({
      where: { isCancelled: false },
      include: { payments: { where: { isDeleted: false } } },
    }),
    prisma.bill.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    getOrCreateAppSettings(),
  ]);

  const revenue = todaysBills.reduce((sum, b) => sum + b.customerAmount, 0);

  const productMap = new Map<string, { name: string; qtySold: number; revenue: number }>();
  for (const b of todaysBills) {
    for (const li of b.lineItems) {
      const key = li.productId ?? `custom:${li.itemName}`;
      const entry = productMap.get(key) ?? { name: li.itemName, qtySold: 0, revenue: 0 };
      entry.qtySold += li.unitsSold;
      entry.revenue += li.amount;
      productMap.set(key, entry);
    }
  }
  const topProductsToday = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const lowStockCount = allActiveProducts.filter(
    (p: ProductWithRelations) => isLowStock(p) && !isOutOfStock(p),
  ).length;
  const outOfStockCount = allActiveProducts.filter((p: ProductWithRelations) => isOutOfStock(p)).length;

  const creditRows = unpaidBills
    .map((b) => getPendingAmount(b.customerAmount, getPaidTotal(b.payments)))
    .filter((pending) => pending > 0);
  const credits = { total: creditRows.reduce((sum, p) => sum + p, 0), count: creditRows.length };

  return {
    today: { revenue, billCount: todaysBills.length, expenses: todaysExpenses._sum.amount ?? 0 },
    lowStockCount,
    outOfStockCount,
    credits,
    topProductsToday,
    recentBills: recentBills.map((b) => ({
      id: b.id,
      label: formatBillNumber(b.billNumber, settings.invoicePrefix),
      customerName: b.customerName,
      amount: b.customerAmount,
      createdAt: b.createdAt,
    })),
  };
}
