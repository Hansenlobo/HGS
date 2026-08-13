import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { AuditLogsPageClient } from "@/components/audit/AuditLogsPageClient";

export default async function AuditLogsPage() {
  await requireAdmin();

  const [logs, moduleRows, actionRows, users] = await Promise.all([
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
    prisma.auditLog.findMany({ distinct: ["module"], select: { module: true } }),
    prisma.auditLog.findMany({ distinct: ["action"], select: { action: true } }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <AuditLogsPageClient
      initialLogs={logs}
      modules={moduleRows.map((m) => m.module)}
      actions={actionRows.map((a) => a.action)}
      users={users}
    />
  );
}
