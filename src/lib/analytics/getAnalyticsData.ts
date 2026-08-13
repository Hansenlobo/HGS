import { prisma } from "@/lib/prisma";
import { formatBillNumber, getPaidTotal, getPendingAmount } from "@/lib/billing/billDisplay";
import { getOrCreateAppSettings } from "@/lib/settings/getSettings";
import type { AnalyticsData } from "./types";

export async function getAnalyticsData(params: {
  dateFrom?: string | null;
  dateTo?: string | null;
}): Promise<AnalyticsData> {
  const { dateFrom, dateTo } = params;

  const createdAt =
    dateFrom || dateTo
      ? {
          ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
          ...(dateTo ? { lte: new Date(dateTo) } : {}),
        }
      : undefined;

  const [bills, expenses, settings] = await Promise.all([
    prisma.bill.findMany({
      where: { isCancelled: false, ...(createdAt ? { createdAt } : {}) },
      include: { lineItems: true, payments: { where: { isDeleted: false } } },
    }),
    prisma.expense.findMany({
      where: dateFrom || dateTo ? { date: createdAt } : undefined,
    }),
    getOrCreateAppSettings(),
  ]);

  const totalRevenue = bills.reduce((sum, b) => sum + b.customerAmount, 0);
  const byType: AnalyticsData["sales"]["byType"] = {
    NORMAL: { revenue: 0, count: 0 },
    PARTY: { revenue: 0, count: 0 },
  };
  for (const b of bills) {
    byType[b.type].revenue += b.customerAmount;
    byType[b.type].count += 1;
  }
  const byDayMap = new Map<string, number>();
  for (const b of bills) {
    const day = b.createdAt.toISOString().slice(0, 10);
    byDayMap.set(day, (byDayMap.get(day) ?? 0) + b.customerAmount);
  }
  const byDay = Array.from(byDayMap.entries())
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const productMap = new Map<string, { name: string; qtySold: number; revenue: number }>();
  for (const b of bills) {
    for (const li of b.lineItems) {
      const key = li.productId ?? `custom:${li.itemName}`;
      const entry = productMap.get(key) ?? { name: li.itemName, qtySold: 0, revenue: 0 };
      entry.qtySold += li.unitsSold;
      entry.revenue += li.amount;
      productMap.set(key, entry);
    }
  }
  const products = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue);

  const customerMap = new Map<string, { name: string; revenue: number; billCount: number }>();
  for (const b of bills) {
    const entry = customerMap.get(b.customerName) ?? { name: b.customerName, revenue: 0, billCount: 0 };
    entry.revenue += b.customerAmount;
    entry.billCount += 1;
    customerMap.set(b.customerName, entry);
  }
  const customers = Array.from(customerMap.values()).sort((a, b) => b.revenue - a.revenue);

  const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const expenseByCategoryMap = new Map<string, number>();
  for (const e of expenses) {
    expenseByCategoryMap.set(e.category, (expenseByCategoryMap.get(e.category) ?? 0) + e.amount);
  }
  const expensesByCategory = Array.from(expenseByCategoryMap.entries()).map(([category, amount]) => ({
    category,
    amount,
  }));

  const credits = bills
    .map((b) => {
      const paid = getPaidTotal(b.payments);
      const pending = getPendingAmount(b.customerAmount, paid);
      return {
        billId: b.id,
        billLabel: formatBillNumber(b.billNumber, settings.invoicePrefix),
        customerName: b.customerName,
        pending,
      };
    })
    .filter((c) => c.pending > 0)
    .sort((a, b) => b.pending - a.pending);
  const totalCredits = credits.reduce((sum, c) => sum + c.pending, 0);

  const shopRevenue = bills.reduce((sum, b) => sum + b.shopAmount, 0);
  const marginRevenue = bills.reduce((sum, b) => sum + b.marginAmount, 0);
  const netProfit = totalRevenue - expenseTotal;

  return {
    sales: { totalRevenue, billCount: bills.length, byType, byDay },
    products,
    customers,
    expenses: { total: expenseTotal, byCategory: expensesByCategory },
    credits: { rows: credits, total: totalCredits },
    profit: { shopRevenue, marginRevenue, expenseTotal, netProfit },
  };
}
