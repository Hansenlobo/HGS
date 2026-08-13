import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/apiGuard";
import { runBackupNow } from "@/lib/backup/backupService";
import { logAudit } from "@/lib/audit/log";

export async function POST() {
  const auth = await requireAdminApi();
  if ("response" in auth) return auth.response;

  try {
    const result = await runBackupNow();

    await logAudit({
      user: { id: auth.user.id, name: auth.user.name },
      module: "Settings",
      action: "BACKUP",
      description: `${auth.user.name} ran a manual backup (${result.fileName})`,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Backup failed" }, { status: 400 });
  }
}
