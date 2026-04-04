import path from "node:path";

const DB_PATH = path.join(process.cwd(), "data", "app.db");

// Typed to match the bun:sqlite interface we use
type SQLiteStatement = {
  all: (...params: unknown[]) => unknown[];
  get: (...params: unknown[]) => unknown;
  run: (...params: unknown[]) => void;
};

type SQLiteDB = {
  prepare: (sql: string) => SQLiteStatement;
  exec: (sql: string) => void;
};

let _db: SQLiteDB | null = null;

// Lazy initialization: deferred until first request so the module can be
// imported by Next.js build (Node.js context) without failing on bun:sqlite.
async function getDb(): Promise<SQLiteDB> {
  if (!_db) {
    const { Database } = await import("bun:sqlite");
    const db = new Database(DB_PATH, { create: true });
    db.exec("PRAGMA journal_mode=WAL;");
    db.exec("PRAGMA foreign_keys=ON;");
    _db = db as unknown as SQLiteDB;
  }
  return _db;
}

export async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  return (params ? stmt.all(...params) : stmt.all()) as T[];
}

export async function get<T>(sql: string, params?: unknown[]): Promise<T | undefined> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  return (params ? stmt.get(...params) : stmt.get()) as T | undefined;
}

export async function run(sql: string, params?: unknown[]): Promise<void> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  if (params) {
    stmt.run(...params);
  } else {
    stmt.run();
  }
}
