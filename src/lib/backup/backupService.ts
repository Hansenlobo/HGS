import fs from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";
import { prisma } from "@/lib/prisma";
import { getOrCreateAppSettings } from "@/lib/settings/getSettings";
import { exportTursoToFile } from "./tursoTransfer";

function timestampedFilename(ext: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `hgs-backup-${stamp}.${ext}`;
}

export interface BackupResult {
  filePath: string;
  fileName: string;
  sqliteFilePath: string;
  sqliteFileName: string;
}

/**
 * Snapshots the LIVE data — Turso, not the local dev.db file, which no
 * longer receives writes now that the app runs against Turso — into
 * `backupPath` as two local files: a `.db` file (what Reimport accepts)
 * and a `.sqlite` sibling already converted to `journal_mode=WAL` (ready
 * to hand straight to Turso's own import if this backup is ever used to
 * seed a new database, the same requirement Turso's own upload enforces).
 */
export async function runBackupNow(): Promise<BackupResult> {
  const settings = await getOrCreateAppSettings();
  if (!settings.backupPath) {
    throw new Error("Set a Backup Path in Settings before running a backup");
  }

  await fs.mkdir(settings.backupPath, { recursive: true });
  const fileName = timestampedFilename("db");
  const filePath = path.join(settings.backupPath, fileName);
  await exportTursoToFile(filePath);

  const sqliteFileName = timestampedFilename("sqlite");
  const sqliteFilePath = path.join(settings.backupPath, sqliteFileName);
  await fs.copyFile(filePath, sqliteFilePath);
  const walDb = new Database(sqliteFilePath);
  try {
    walDb.pragma("journal_mode = WAL");
    walDb.pragma("wal_checkpoint(TRUNCATE)");
  } finally {
    walDb.close();
  }

  await prisma.appSettings.update({
    where: { id: "singleton" },
    data: { lastBackupAt: new Date() },
  });

  return { filePath, fileName, sqliteFilePath, sqliteFileName };
}

/** Called on a periodic timer (see instrumentation.ts). Decides whether a
 * scheduled backup is due right now and runs one if so — silent no-op
 * otherwise. Never throws; a misconfigured backup path shouldn't crash
 * the scheduler loop. */
export async function maybeRunScheduledBackup(): Promise<void> {
  const settings = await getOrCreateAppSettings();
  if (!settings.backupPath) return;

  const now = new Date();
  const last = settings.lastBackupAt;

  if (settings.backupFrequency === "EVERY_N_TRANSACTIONS") {
    // Handled inline where bills are created (src/app/api/bills/route.ts),
    // not on this timer — transaction counts don't tick with the clock.
    return;
  }

  if (settings.backupFrequency === "DAILY" || settings.backupFrequency === "WEEKLY") {
    const [hh, mm] = (settings.backupTime ?? "02:00").split(":").map(Number);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return;

    const dueToday = now.getHours() > hh || (now.getHours() === hh && now.getMinutes() >= mm);
    if (!dueToday) return;

    const msSinceLast = last ? now.getTime() - last.getTime() : Infinity;
    const intervalMs = (settings.backupFrequency === "DAILY" ? 1 : 7) * 24 * 60 * 60 * 1000;
    // Leave an hour of slack below the nominal interval so a backup that
    // runs a few minutes late one day doesn't get skipped the next.
    if (msSinceLast < intervalMs - 60 * 60 * 1000) return;

    try {
      await runBackupNow();
    } catch (err) {
      console.error("[backup] scheduled backup failed:", err);
    }
  }
}

/** Fire-and-forget trigger for the EVERY_N_TRANSACTIONS mode — called
 * after a bill save. Never awaited by the caller, so a slow or failing
 * backup can't delay the customer's bill response. */
export function maybeRunTransactionCountBackup(): void {
  getOrCreateAppSettings()
    .then(async (settings) => {
      if (settings.backupFrequency !== "EVERY_N_TRANSACTIONS") return;
      if (!settings.backupPath) return;
      const threshold = settings.backupEveryNTransactions ?? 0;
      if (threshold <= 0) return;

      const since = settings.lastBackupAt ?? new Date(0);
      const count = await prisma.bill.count({ where: { createdAt: { gt: since } } });
      if (count >= threshold) {
        await runBackupNow();
      }
    })
    .catch((err) => console.error("[backup] transaction-count backup failed:", err));
}
