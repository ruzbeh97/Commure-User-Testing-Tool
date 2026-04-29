import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.VERCEL
  ? '/tmp/app.db'
  : path.join(process.cwd(), 'database', 'app.db');

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT,
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tests (
      id             TEXT PRIMARY KEY,
      project_id     TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name           TEXT NOT NULL,
      type           TEXT NOT NULL CHECK(type IN ('ab','usability','prototype')),
      status         TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','closed')),
      prototype_url  TEXT,
      screenshot_url TEXT,
      description    TEXT,
      created_at     INTEGER NOT NULL,
      updated_at     INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS variants (
      id       TEXT PRIMARY KEY,
      test_id  TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
      name     TEXT NOT NULL,
      url      TEXT NOT NULL,
      weight   REAL NOT NULL DEFAULT 0.5
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id               TEXT PRIMARY KEY,
      test_id          TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
      sort_order       INTEGER NOT NULL,
      instruction      TEXT NOT NULL,
      success_criteria TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id            TEXT PRIMARY KEY,
      test_id       TEXT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
      variant_id    TEXT REFERENCES variants(id),
      tester_name   TEXT,
      tester_email  TEXT,
      status        TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress','completed','abandoned')),
      started_at    INTEGER NOT NULL,
      completed_at  INTEGER,
      viewport_w    INTEGER,
      viewport_h    INTEGER,
      notes         TEXT
    );

    CREATE TABLE IF NOT EXISTS task_results (
      id           TEXT PRIMARY KEY,
      session_id   TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      task_id      TEXT NOT NULL REFERENCES tasks(id),
      started_at   INTEGER NOT NULL,
      completed_at INTEGER,
      duration_ms  INTEGER,
      completed    INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      task_id     TEXT REFERENCES tasks(id),
      type        TEXT NOT NULL CHECK(type IN ('click','mousemove','scroll')),
      x           REAL NOT NULL,
      y           REAL NOT NULL,
      timestamp   INTEGER NOT NULL,
      metadata    TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
    CREATE INDEX IF NOT EXISTS idx_events_type    ON events(session_id, type);
    CREATE INDEX IF NOT EXISTS idx_sessions_test  ON sessions(test_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_test     ON tasks(test_id);
    CREATE INDEX IF NOT EXISTS idx_tests_project  ON tests(project_id);
  `);
}

export default getDb;
