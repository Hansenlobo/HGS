"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import type { CustomItemWithCount } from "@/types";
import { fetcher, patchJson } from "@/lib/fetcher";
import { formatPrice } from "@/lib/stock/stockDisplay";
import { formatDate } from "@/lib/formatDate";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { FilterPanel } from "@/components/ui/FilterPanel";

export interface CustomItemsPageClientProps {
  initialItems: CustomItemWithCount[];
}

type StatusFilter = "PENDING" | "IGNORED" | "ADDED" | null;

interface FilterState {
  status: StatusFilter;
}

const defaultFilters: FilterState = { status: "PENDING" };

const statusLabels: Record<"PENDING" | "IGNORED" | "ADDED", string> = {
  PENDING: "Pending Review",
  IGNORED: "Ignored",
  ADDED: "Added to Catalog",
};

function buildQuery(filters: FilterState): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  const qs = params.toString();
  return qs ? `/api/custom-items?${qs}` : "/api/custom-items";
}

export function CustomItemsPageClient({ initialItems }: CustomItemsPageClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const isDefault = filters.status === defaultFilters.status;
  const key = useMemo(() => buildQuery(filters), [filters]);
  const { data: items, mutate } = useSWR<CustomItemWithCount[]>(key, fetcher, {
    fallbackData: isDefault ? initialItems : undefined,
  });

  const activeCount = filters.status !== defaultFilters.status ? 1 : 0;

  async function setStatus(item: CustomItemWithCount, status: "PENDING" | "IGNORED" | "ADDED") {
    const updated = await patchJson<CustomItemWithCount>(`/api/custom-items/${item.id}`, { status });
    await mutate((current) => (current ?? []).map((i) => (i.id === item.id ? { ...i, ...updated } : i)), {
      revalidate: false,
    });
    showToast(status === "PENDING" ? "Moved back to pending" : `Marked as ${statusLabels[status]}`);
  }

  async function addToCatalog(item: CustomItemWithCount) {
    await setStatus(item, "ADDED");
    router.push(`/products?newItem=${encodeURIComponent(item.name)}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Custom Items Review</h1>
        <p className="text-sm text-muted">
          Ad-hoc items staff typed into bills that aren&apos;t in the product catalog yet. Add worthwhile
          ones to the catalog, or ignore one-offs.
        </p>
      </div>

      <FilterPanel
        value={filters}
        defaultValue={defaultFilters}
        activeCount={activeCount}
        onApply={setFilters}
        renderFields={(draft, setDraft) => (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">Status</span>
            <div className="flex flex-wrap gap-2">
              {(["PENDING", "IGNORED", "ADDED"] as const).map((s) => (
                <Chip key={s} active={draft.status === s} onClick={() => setDraft({ status: draft.status === s ? null : s })}>
                  {statusLabels[s]}
                </Chip>
              ))}
            </div>
          </div>
        )}
      />

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Last Rate</th>
              <th className="px-4 py-3 font-medium">Times Used</th>
              <th className="px-4 py-3 font-medium">First Seen</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map((item) => (
              <tr key={item.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-sm font-medium text-foreground">{item.name}</td>
                <td className="px-4 py-3 text-sm text-foreground">
                  {item.lastRate != null ? formatPrice(item.lastRate) : "—"}
                </td>
                <td className="px-4 py-3 text-sm text-foreground">{item._count.billLineItems}</td>
                <td className="px-4 py-3 text-sm text-muted">{formatDate(item.createdAt)}</td>
                <td className="px-4 py-3 text-sm text-foreground">{statusLabels[item.status]}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {item.status !== "ADDED" && (
                      <Button size="sm" onClick={() => addToCatalog(item)}>
                        Add to Catalog
                      </Button>
                    )}
                    {item.status !== "IGNORED" && (
                      <Button size="sm" variant="secondary" onClick={() => setStatus(item, "IGNORED")}>
                        Ignore
                      </Button>
                    )}
                    {item.status !== "PENDING" && (
                      <Button size="sm" variant="secondary" onClick={() => setStatus(item, "PENDING")}>
                        Reopen
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {(items ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">
                  No custom items match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
