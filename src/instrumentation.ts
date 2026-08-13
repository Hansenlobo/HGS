/** Next.js calls `register()` once when the server process starts (both
 * `next dev` and `next start`). Used here to start the backup scheduler —
 * see src/lib/backup/backupService.ts for what actually runs. Guarded
 * against double-registration since dev-mode recompiles can re-import
 * this module. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const g = globalThis as unknown as { __hgsBackupSchedulerStarted?: boolean };
  if (g.__hgsBackupSchedulerStarted) return;
  g.__hgsBackupSchedulerStarted = true;

  const { maybeRunScheduledBackup } = await import("@/lib/backup/backupService");
  setInterval(() => {
    maybeRunScheduledBackup().catch((err) => console.error("[backup] scheduler tick failed:", err));
  }, 60_000);
}
