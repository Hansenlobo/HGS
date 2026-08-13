import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export interface LogAuditParams {
  user: { id: string; name: string } | null;
  module: string;
  action: string;
  description: string;
  entityType?: string;
  entityId?: string;
  detail?: unknown;
}

/** Immutable, system-wide audit trail — never exposes update/delete
 * routes. Pass `tx` to log inside the same transaction as the mutation
 * it's recording, so the two can never land out of sync. */
export async function logAudit(
  params: LogAuditParams,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const client = tx ?? prisma;
  await client.auditLog.create({
    data: {
      userId: params.user?.id,
      userName: params.user?.name,
      module: params.module,
      action: params.action,
      description: params.description,
      entityType: params.entityType,
      entityId: params.entityId,
      detail: params.detail !== undefined ? JSON.stringify(params.detail) : undefined,
    },
  });
}
