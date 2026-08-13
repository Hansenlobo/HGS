"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import useSWR from "swr";
import clsx from "clsx";
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  Package,
  ClipboardList,
  Receipt,
  FileText,
  Tags,
  PackagePlus,
  AlertTriangle,
  Undo2,
  Truck,
  Wallet,
  Percent,
  HandCoins,
  BarChart3,
  History,
  Users,
  Settings as SettingsIcon,
  type LucideIcon,
} from "lucide-react";
import { fetcher, postJson } from "@/lib/fetcher";
import type { CurrentUser } from "@/lib/auth/session";
import type { ProductWithRelations } from "@/types";
import { useAppSettings } from "@/components/settings/AppSettingsProvider";

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

const primaryLinks: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/quotations", label: "Quotations", icon: FileText },
  { href: "/bills", label: "Bills", icon: Receipt },
];

const creditAccountsLink: NavLink = { href: "/credit-accounts", label: "Credit Accounts", icon: HandCoins };

const secondaryLinks: NavLink[] = [
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/custom-items", label: "Custom Items", icon: PackagePlus },
  { href: "/low-stock", label: "Low Stock", icon: AlertTriangle },
  { href: "/returns", label: "Returns", icon: Undo2 },
  { href: "/clearance-stock", label: "Clearance Stock", icon: Percent },
  { href: "/suppliers", label: "Suppliers", icon: Truck },
  { href: "/expenses", label: "Expenses", icon: Wallet },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

const adminLinks: NavLink[] = [
  { href: "/audit-logs", label: "Audit Logs", icon: History },
  { href: "/users", label: "Users", icon: Users },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

function SidebarNavLinks({
  links,
  pathname,
  lowStockCount,
  onNavigate,
}: {
  links: NavLink[];
  pathname: string | null;
  lowStockCount: number;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
      {links.map((link) => {
        const Icon = link.icon;
        const active = pathname?.startsWith(link.href) ?? false;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={clsx(
              "flex items-center justify-between gap-2 rounded-[3px] px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary font-semibold text-primary-foreground"
                : "font-medium text-foreground hover:bg-black/5 dark:hover:bg-white/5",
            )}
          >
            <span className="flex items-center gap-2">
              <Icon size={16} />
              {link.label}
            </span>
            {link.href === "/low-stock" && lowStockCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-danger px-1 text-xs font-semibold text-white">
                {lowStockCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ user }: { user: CurrentUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { enableCreditAccounts, storeName } = useAppSettings();
  const brandName = storeName || "Hardware Store CRM";
  const { data: lowStockProducts } = useSWR<ProductWithRelations[]>("/api/products/low-stock", fetcher, {
    refreshInterval: 60_000,
  });
  const lowStockCount = lowStockProducts?.length ?? 0;

  async function handleLogout() {
    await postJson("/api/auth/logout", {});
    router.push("/login");
    router.refresh();
  }

  const middleLinks = enableCreditAccounts ? [...secondaryLinks, creditAccountsLink] : secondaryLinks;
  const links = user.role === "ADMIN" ? [...primaryLinks, ...middleLinks, ...adminLinks] : [...primaryLinks, ...middleLinks];

  return (
    <>
      <header className="no-print sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-4 md:hidden">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-black/5 dark:hover:bg-white/5"
        >
          <Menu size={20} />
        </button>
        <span className="flex-1 font-display text-sm font-semibold text-foreground">{brandName}</span>
        {lowStockCount > 0 && (
          <span className="h-2 w-2 rounded-full bg-danger" aria-label={`${lowStockCount} items low on stock`} />
        )}
        <button
          type="button"
          aria-label="Log out"
          onClick={handleLogout}
          className="flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-black/5 dark:hover:bg-white/5"
        >
          <LogOut size={16} />
        </button>
      </header>

      {open && (
        <div className="no-print fixed inset-0 z-[60] md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-surface shadow-xl">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
              <span className="font-display text-sm font-semibold text-foreground">{brandName}</span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-black/5 dark:hover:bg-white/5"
              >
                <X size={18} />
              </button>
            </div>
            <SidebarNavLinks
              links={links}
              pathname={pathname}
              lowStockCount={lowStockCount}
              onNavigate={() => setOpen(false)}
            />
            <div className="shrink-0 border-t border-border px-4 py-3">
              <p className="mb-2 truncate text-sm text-muted">{user.name}</p>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-black/5 dark:hover:bg-white/5"
              >
                <LogOut size={16} /> Log out
              </button>
            </div>
          </div>
        </div>
      )}

      <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="relative flex h-14 shrink-0 items-center border-b border-border px-4">
          <div className="absolute -top-px left-4 h-1 w-7 bg-accent" />
          <span className="font-display text-sm font-semibold text-foreground">{brandName}</span>
        </div>
        <SidebarNavLinks links={links} pathname={pathname} lowStockCount={lowStockCount} />
        <div className="shrink-0 border-t border-border px-4 py-3">
          <p className="mb-2 truncate text-sm text-muted">{user.name}</p>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-black/5 dark:hover:bg-white/5"
          >
            <LogOut size={16} /> Log out
          </button>
        </div>
      </aside>
    </>
  );
}
