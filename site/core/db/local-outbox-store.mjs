// Node-only, D1-shaped local binding for tests and local previews (node:sqlite, Node >= 22.5).
// Never imported by the hosted worker. Production schema is applied by the host
// (wrangler d1 migrations apply / Sites-managed), not at runtime.
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");

export function openLocalOutbox(filename) {
  const sqlite = new DatabaseSync(filename);
  sqlite.exec("PRAGMA journal_mode = WAL");
  sqlite.exec("PRAGMA busy_timeout = 5000");
  return {
    sqlite,
    close: () => sqlite.close(),
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      const bound = (args) => ({
        bind: (...values) => bound(values),
        first: async () => statement.get(...args) ?? null,
        all: async () => ({ results: statement.all(...args), success: true }),
        run: async () => ({
          success: true,
          meta: { changes: Number(statement.run(...args).changes) },
        }),
      });
      return bound([]);
    },
  };
}

/** Applies migrations/*.sql in name order, once each (same ordering wrangler d1 uses). */
export function migrateLocalOutbox(store, dir = MIGRATIONS_DIR) {
  store.sqlite.exec("CREATE TABLE IF NOT EXISTS local_outbox_migrations (tag TEXT PRIMARY KEY)");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const tag = file.replace(/\.sql$/, "");
    if (store.sqlite.prepare("SELECT tag FROM local_outbox_migrations WHERE tag = ?").get(tag)) continue;
    const sql = readFileSync(path.join(dir, file), "utf8");
    store.sqlite.exec("BEGIN IMMEDIATE");
    try {
      store.sqlite.exec(sql);
      store.sqlite.prepare("INSERT INTO local_outbox_migrations (tag) VALUES (?)").run(tag);
      store.sqlite.exec("COMMIT");
    } catch (err) {
      store.sqlite.exec("ROLLBACK");
      throw err;
    }
  }
}
