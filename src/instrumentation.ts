/** Next.js calls `register()` once when the server process starts (both
 * `next dev` and `next start`). Used here to start the backup scheduler —
 * see src/lib/backup/backupService.ts for what actually runs. Guarded
 * against double-registration since dev-mode recompiles can re-import
 * this module.
 *
 * Skipped entirely on Netlify (and any other serverless platform): each
 * request there runs in a short-lived function invocation, not a single
 * long-running process, so a setInterval registered on one invocation
 * has no reliable way to keep ticking — it would either never fire or
 * hold the invocation open pointlessly. Automatic scheduled backups only
 * make sense on a persistently-running server (e.g. `next start` on a
 * VPS); the manual "Backup Now" button in Settings still works anywhere.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NETLIFY) return;

  const g = globalThis as unknown as { __hgsBackupSchedulerStarted?: boolean };
  if (g.__hgsBackupSchedulerStarted) return;
  g.__hgsBackupSchedulerStarted = true;

  const { maybeRunScheduledBackup } = await import("@/lib/backup/backupService");
  setInterval(() => {
    maybeRunScheduledBackup().catch((err) => console.error("[backup] scheduler tick failed:", err));
  }, 60_000);
}
