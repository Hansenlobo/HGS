import fs from "node:fs/promises";
import Database from "better-sqlite3";
import { createClient, type Client, type InValue } from "@libsql/client";

function tursoClient(): Client {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}

/** better-sqlite3 rejects unsafe (>2^53) integers unless bound as BigInt;
 * libsql returns BigInt for INTEGER columns by default. Every ID in this
 * schema is a TEXT cuid and every count/price fits in a safe integer, so
 * this just avoids a BigInt/Number type mismatch on bind, never a
 * precision loss. */
function normalize(value: unknown): InValue {
  if (typeof value === "bigint") return Number(value);
  return value as InValue;
}

/** Dumps the live Turso database — schema and every row — into a fresh
 * local SQLite file at `destPath`, overwriting whatever was there. Used
 * for both scheduled/manual backups and the safety snapshot taken right
 * before a reimport. */
export async function exportTursoToFile(destPath: string): Promise<void> {
  await fs.rm(destPath, { force: true });
  const remote = tursoClient();
  const local = new Database(destPath);
  try {
    const schema = await remote.execute(
      "SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY (type = 'table') DESC",
    );
    const tableRows = schema.rows.filter((r) => r.type === "table");
    const otherRows = schema.rows.filter((r) => r.type !== "table");

    local.pragma("foreign_keys = OFF");
    for (const row of tableRows) local.exec(row.sql as string);

    for (const row of tableRows) {
      const table = row.name as string;
      const data = await remote.execute(`SELECT * FROM "${table}"`);
      if (data.rows.length === 0) continue;
      const columns = data.columns;
      const insert = local.prepare(
        `INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
      );
      const insertMany = local.transaction((rows: typeof data.rows) => {
        for (const r of rows) insert.run(columns.map((c) => normalize(r[c])));
      });
      insertMany(data.rows);
    }

    for (const row of otherRows) local.exec(row.sql as string);
    local.pragma("foreign_keys = ON");
  } finally {
    local.close();
    remote.close();
  }
}

/** Reads a local SQLite file (a prior backup) and replaces the contents
 * of every table it contains in the live Turso database — schema on
 * Turso is left as-is, only data is replaced.
 *
 * Every statement is sent through a single `client.migrate()` call rather
 * than sequential `execute()` calls. A remote libsql connection doesn't
 * guarantee later `execute()` calls land on the same underlying session
 * as an earlier one — a `PRAGMA foreign_keys=OFF` set that way was
 * silently not applying to most of the later DELETE/INSERT statements,
 * so several tables restored empty with no visible error (each failed
 * insert was being caught and skipped as if it were harmless schema
 * drift). `migrate()` runs the whole batch as one atomic transaction on
 * one connection, with foreign_keys genuinely off for all of it — and if
 * any statement fails now, the entire restore rolls back and throws
 * instead of silently dropping the affected rows. */
export async function importFileToTurso(filePath: string): Promise<void> {
  const local = new Database(filePath, { readonly: true });
  const remote = tursoClient();
  try {
    const tables = local
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all() as { name: string }[];

    const statements: { sql: string; args: InValue[] }[] = [];
    for (const { name } of tables) {
      statements.push({ sql: `DELETE FROM "${name}"`, args: [] });
    }
    for (const { name } of tables) {
      const rows = local.prepare(`SELECT * FROM "${name}"`).all() as Record<string, unknown>[];
      if (rows.length === 0) continue;
      const columns = Object.keys(rows[0]);
      const sql = `INSERT INTO "${name}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`;
      for (const row of rows) {
        statements.push({ sql, args: columns.map((c) => normalize(row[c])) });
      }
    }

    await remote.migrate(statements);
  } finally {
    local.close();
    remote.close();
  }
}
