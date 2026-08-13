"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import type { AuditLogModel } from "@/types";
import { fetcher } from "@/lib/fetcher";
import { formatDate, formatDateTime } from "@/lib/formatDate";
import { FilterPanel } from "@/components/ui/FilterPanel";
import { Modal } from "@/components/ui/Modal";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";

export interface AuditLogsPageClientProps {
  initialLogs: AuditLogModel[];
  modules: string[];
  actions: string[];
  users: { id: string; name: string }[];
}

interface FilterState {
  userId: string | null;
  module: string | null;
  action: string | null;
  dateFrom: string;
  dateTo: string;
}

const defaultFilters: FilterState = {
  userId: null,
  module: null,
  action: null,
  dateFrom: "",
  dateTo: "",
};

function buildQuery(filters: FilterState): string {
  const params = new URLSearchParams();
  if (filters.userId) params.set("userId", filters.userId);
  if (filters.module) params.set("module", filters.module);
  if (filters.action) params.set("action", filters.action);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  const qs = params.toString();
  return qs ? `/api/audit-logs?${qs}` : "/api/audit-logs";
}

export function AuditLogsPageClient({ initialLogs, modules, actions, users }: AuditLogsPageClientProps) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [detailLog, setDetailLog] = useState<AuditLogModel | null>(null);

  const isDefault =
    !filters.userId && !filters.module && !filters.action && !filters.dateFrom && !filters.dateTo;
  const key = useMemo(() => buildQuery(filters), [filters]);
  const { data: logs } = useSWR<AuditLogModel[]>(key, fetcher, {
    fallbackData: isDefault ? initialLogs : undefined,
  });

  const activeCount =
    (filters.userId ? 1 : 0) + (filters.module ? 1 : 0) + (filters.action ? 1 : 0) +
    (filters.dateFrom ? 1 : 0) + (filters.dateTo ? 1 : 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Audit Logs</h1>
        <p className="text-sm text-muted">
          Immutable trail of critical actions across the system. Admin only.
        </p>
      </div>

      <FilterPanel
        value={filters}
        defaultValue={defaultFilters}
        activeCount={activeCount}
        onApply={setFilters}
        renderFields={(draft, setDraft) => (
          <>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-foreground">User</span>
              <div className="flex flex-wrap gap-2">
                {users.map((u) => (
                  <Chip
                    key={u.id}
                    active={draft.userId === u.id}
                    onClick={() => setDraft({ userId: draft.userId === u.id ? null : u.id })}
                  >
                    {u.name}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-foreground">Module</span>
              <div className="flex flex-wrap gap-2">
                {modules.map((m) => (
                  <Chip
                    key={m}
                    active={draft.module === m}
                    onClick={() => setDraft({ module: draft.module === m ? null : m })}
                  >
                    {m}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-foreground">Action</span>
              <div className="flex flex-wrap gap-2">
                {actions.map((a) => (
                  <Chip
                    key={a}
                    active={draft.action === a}
                    onClick={() => setDraft({ action: draft.action === a ? null : a })}
                  >
                    {a}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-foreground">From</span>
                <input
                  type="date"
                  value={draft.dateFrom}
                  onChange={(e) => setDraft({ dateFrom: e.target.value })}
                  className="h-11 rounded-lg border border-border bg-surface px-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-foreground">To</span>
                <input
                  type="date"
                  value={draft.dateTo}
                  onChange={(e) => setDraft({ dateTo: e.target.value })}
                  className="h-11 rounded-lg border border-border bg-surface px-3 text-base text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
            </div>
          </>
        )}
      />

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[860px] text-left">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Module</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((log) => (
              <tr key={log.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-sm text-muted">{formatDate(log.createdAt)}</td>
                <td className="px-4 py-3 text-sm text-muted">
                  {new Date(log.createdAt).toLocaleTimeString("en-IN")}
                </td>
                <td className="px-4 py-3 text-sm text-foreground">{log.userName ?? "—"}</td>
                <td className="px-4 py-3 text-sm text-foreground">{log.module}</td>
                <td className="px-4 py-3 text-sm text-foreground">{log.action}</td>
                <td className="px-4 py-3">
                  <Button variant="secondary" size="sm" onClick={() => setDetailLog(log)}>
                    View
                  </Button>
                </td>
              </tr>
            ))}
            {(logs ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted">
                  No audit log entries match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={!!detailLog} onClose={() => setDetailLog(null)} title="Audit Log Detail">
        {detailLog && (
          <div className="flex flex-col gap-3 text-sm">
            <Row label="Date/Time" value={formatDateTime(detailLog.createdAt)} />
            <Row label="User" value={detailLog.userName ?? "—"} />
            <Row label="Module" value={detailLog.module} />
            <Row label="Action" value={detailLog.action} />
            <Row label="Description" value={detailLog.description} />
            {detailLog.entityType && <Row label="Entity" value={`${detailLog.entityType} (${detailLog.entityId})`} />}
            {detailLog.detail && (
              <div>
                <span className="font-medium text-foreground">Detail</span>
                <pre className="mt-1 whitespace-pre-wrap break-words rounded-lg bg-black/5 p-3 text-xs dark:bg-white/10">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(detailLog.detail), null, 2);
                    } catch {
                      return detailLog.detail;
                    }
                  })()}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="font-medium text-foreground">{label}</span>
      <span className="text-right text-muted">{value}</span>
    </div>
  );
}
