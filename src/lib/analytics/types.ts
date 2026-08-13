export interface AnalyticsData {
  sales: {
    totalRevenue: number;
    billCount: number;
    byType: Record<"NORMAL" | "PARTY", { revenue: number; count: number }>;
    byDay: { date: string; revenue: number }[];
  };
  products: { name: string; qtySold: number; revenue: number }[];
  customers: { name: string; revenue: number; billCount: number }[];
  expenses: { total: number; byCategory: { category: string; amount: number }[] };
  credits: { rows: { billId: string; billLabel: string; customerName: string; pending: number }[]; total: number };
  profit: { shopRevenue: number; marginRevenue: number; expenseTotal: number; netProfit: number };
}
