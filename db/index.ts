import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

type SqlValue = string | number | bigint | Uint8Array | null;

class BoundStatement {
  constructor(private readonly database: DatabaseSync, private readonly sql: string, private readonly params: SqlValue[] = []) {}

  bind(...params: SqlValue[]) { return new BoundStatement(this.database, this.sql, params); }

  run() {
    const result = this.database.prepare(this.sql).run(...this.params);
    return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
  }

  first<T>() { return (this.database.prepare(this.sql).get(...this.params) as T | undefined) ?? null; }

  all<T>() { return { success: true, results: this.database.prepare(this.sql).all(...this.params) as T[] }; }
}

export class SQLiteDatabase {
  constructor(private readonly database: DatabaseSync) {}

  prepare(sql: string) { return new BoundStatement(this.database, sql); }

  batch(statements: BoundStatement[]) {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const results = statements.map((statement) => statement.run());
      this.database.exec("COMMIT");
      return results;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
}

declare global { var __airblueSqlite: SQLiteDatabase | undefined; }

export function getDatabase() {
  if (!globalThis.__airblueSqlite) {
    const path = process.env.SQLITE_PATH || resolve(process.cwd(), "data", "airblue.sqlite");
    mkdirSync(dirname(path), { recursive: true });
    const database = new DatabaseSync(path);
    database.exec("PRAGMA foreign_keys = ON");
    database.exec("PRAGMA busy_timeout = 5000");
    database.exec("PRAGMA journal_mode = DELETE");
    globalThis.__airblueSqlite = new SQLiteDatabase(database);
  }
  return globalThis.__airblueSqlite;
}
