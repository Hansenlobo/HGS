import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { runBackupNow } from "@/lib/backup/backupService";
import { importFileToTurso } from "@/lib/backup/tursoTransfer";

const SQLITE_MAGIC = "SQLite format 3\0";
const REQUIRED_TABLES = ["Product", "Bill", "AppSettings", "User"];

export interface ReimportResult {
  safetyBackupFile: string;
}

/**
 * Validates an uploaded .db file is really a SQLite database with the
 * tables this app expects, snapshots the CURRENT live database first (so
 * a bad import is always recoverable — via runBackupNow, which itself
 * exports from Turso), then replaces every table's data in Turso with
 * what's in the uploaded file.
 *
 * Unlike the old local-file version, this writes straight into the same
 * Turso database the running app's shared connection already points at —
 * there's no separate file to swap out from under the process, so no
 * restart is needed for the new data to show up.
 */
export async function validateAndSwapDatabase(fileBuffer: Buffer): Promise<ReimportResult> {
  const header = fileBuffer.subarray(0, SQLITE_MAGIC.length).toString("utf8");
  if (header !== SQLITE_MAGIC) {
    throw new Error("That file doesn't look like a SQLite database.");
  }

  const stagingPath = path.join(os.tmpdir(), `hgs-import-staging-${Date.now()}.db`);
  await fs.writeFile(stagingPath, fileBuffer);

  try {
    const staged = new Database(stagingPath, { readonly: true });
    try {
      const tables = staged
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all() as { name: string }[];
      const tableNames = new Set(tables.map((t) => t.name));
      const missing = REQUIRED_TABLES.filter((t) => !tableNames.has(t));
      if (missing.length > 0) {
        throw new Error(
          `This doesn't look like a Hardware Store CRM backup — missing table(s): ${missing.join(", ")}`,
        );
      }
    } finally {
      staged.close();
    }

    const safety = await runBackupNow();
    await importFileToTurso(stagingPath);

    return { safetyBackupFile: safety.fileName };
  } finally {
    await fs.rm(stagingPath, { force: true });
  }
}
