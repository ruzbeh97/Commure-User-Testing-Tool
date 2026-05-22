import { createClient, type Client, type ResultSet } from '@libsql/client';

let _client: Client | null = null;
let schemaInitialized = false;
let initPromise: Promise<void> | null = null;

function buildClient(): Client {
  return createClient({
    url: process.env.TURSO_DATABASE_URL ?? 'file:/tmp/app.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}

function getClient(): Client {
  if (!_client) _client = buildClient();
  return _client;
}

function resetClient() {
  try { _client?.close(); } catch { /* ignore */ }
  _client = null;
  schemaInitialized = false;
  initPromise = null;
}

function isTransientError(err: unknown): boolean {
  const msg = String((err as Error)?.message ?? err);
  return /fetch failed|socket disconnected|ECONNRESET|ETIMEDOUT|ENETUNREACH|network|stream/i.test(msg);
}

async function initSchema(client: Client) {
  await client.executeMultiple(`
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
      type           TEXT NOT NULL,
      status         TEXT NOT NULL DEFAULT 'draft',
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
      status        TEXT NOT NULL DEFAULT 'in_progress',
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
      type        TEXT NOT NULL,
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

  // Additive migrations — safe to retry; errors mean column already exists
  try {
    await client.execute('ALTER TABLE sessions ADD COLUMN recording_url TEXT');
  } catch { /* column already exists */ }
}

/**
 * Returns a libSQL client with schema ensured.
 *
 * Resilience:
 *  - If schema init fails (e.g. Turso unreachable), we clear initPromise so the
 *    next request retries instead of forever-rejecting the cached promise.
 *  - On transient network errors, we rebuild the client and try once more.
 */
export async function getDb(): Promise<Client> {
  if (schemaInitialized) return getClient();

  if (!initPromise) {
    initPromise = (async () => {
      try {
        await initSchema(getClient());
        schemaInitialized = true;
      } catch (err) {
        initPromise = null; // allow retry on next request
        if (isTransientError(err)) {
          // Rebuild client and try once
          resetClient();
          await initSchema(getClient());
          schemaInitialized = true;
          return;
        }
        throw err;
      }
    })();
  }

  await initPromise;
  return getClient();
}

/**
 * Wrap a DB query with a single retry on transient network errors.
 * The libSQL HTTP client can drop sockets between serverless invocations;
 * rebuilding the client recovers cleanly.
 */
export async function withRetry<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = await getDb();
  try {
    return await fn(client);
  } catch (err) {
    if (!isTransientError(err)) throw err;
    console.error('[db] transient error, retrying with fresh client:', err);
    resetClient();
    const fresh = await getDb();
    return await fn(fresh);
  }
}

export function toRows<T>(result: ResultSet): T[] {
  return result.rows.map(row =>
    Object.fromEntries(result.columns.map((col, i) => [col, row[i]]))
  ) as T[];
}

export function toRow<T>(result: ResultSet): T | undefined {
  return toRows<T>(result)[0];
}
