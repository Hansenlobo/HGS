import Link from "next/link";
import clsx from "clsx";
import { Plus, Receipt, PackagePlus, Wallet } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/dashboard/getDashboardData";
import { formatPrice } from "@/lib/stock/stockDisplay";
import { formatDateTime } from "@/lib/formatDate";
import { Button } from "@/components/ui/Button";

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-2.5 flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] text-muted uppercase">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
          Today&apos;s overview
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted">Welcome back, {user.name}. Here&apos;s today at a glance.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Today's Sales"
          value={formatPrice(data.today.revenue)}
          sub={`${data.today.billCount} bill${data.today.billCount === 1 ? "" : "s"}`}
        />
        <SummaryCard label="Today's Expenses" value={formatPrice(data.today.expenses)} />
        <SummaryCard
          label="Low / Out of Stock"
          value={`${data.lowStockCount + data.outOfStockCount}`}
          sub={`${data.outOfStockCount} out, ${data.lowStockCount} low`}
          tone={data.lowStockCount + data.outOfStockCount > 0 ? "warning" : undefined}
        />
        <SummaryCard
          label="Outstanding Credits"
          value={formatPrice(data.credits.total)}
          sub={`${data.credits.count} bill${data.credits.count === 1 ? "" : "s"} pending`}
          tone={data.credits.total > 0 ? "danger" : undefined}
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Link href="/billing/normal/new">
            <Button fullWidth variant="secondary">
              <Plus size={16} /> New Bill
            </Button>
          </Link>
          <Link href="/billing/party/new">
            <Button fullWidth variant="secondary">
              <Receipt size={16} /> Party Bill
            </Button>
          </Link>
          <Link href="/products">
            <Button fullWidth variant="secondary">
              <PackagePlus size={16} /> Receive Stock
            </Button>
          </Link>
          <Link href="/expenses">
            <Button fullWidth variant="secondary">
              <Wallet size={16} /> Add Expense
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Recent Bills</h2>
            <Link href="/bills" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto rounded border border-border bg-surface">
            <table className="w-full min-w-[380px] text-left">
              <tbody>
                {data.recentBills.map((b) => (
                  <tr key={b.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/bills/${b.id}`}
                        className="font-mono text-sm font-medium text-foreground hover:text-primary"
                      >
                        {b.label}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted">{b.customerName}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                      {formatPrice(b.amount)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-[11px] text-muted/70">
                      {formatDateTime(b.createdAt)}
                    </td>
                  </tr>
                ))}
                {data.recentBills.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm text-muted">No bills yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-foreground">Top Sellers Today</h2>
          <div className="overflow-x-auto rounded border border-border bg-surface">
            <table className="w-full min-w-[380px] text-left">
              <tbody>
                {data.topProductsToday.map((p) => (
                  <tr key={p.name} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{p.name}</td>
                    <td className="px-4 py-3 text-right text-sm text-muted">Qty {p.qtySold}</td>
                    <td className="px-4 py-3 text-right text-sm text-foreground">{formatPrice(p.revenue)}</td>
                  </tr>
                ))}
                {data.topProductsToday.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm text-muted">No sales yet today.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "warning" | "danger";
}) {
  return (
    <div className="relative rounded border border-border bg-surface p-4.5 pt-4">
      <div className={clsx("absolute -top-px left-4.5 h-1 w-6.5", tone ? "bg-accent" : "bg-primary")} />
      <p className="mb-2.5 font-mono text-[10.5px] tracking-wide text-muted uppercase">{label}</p>
      <p
        className={clsx(
          "font-display text-2xl font-semibold",
          tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "text-foreground",
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-1.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}
