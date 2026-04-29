import getDb from '../db';
import { nanoid } from 'nanoid';
import type { Session, SessionStartResponse, TaskResult, TestResults, TaskStat, VariantStat } from '@/types';

export function createSession(testId: string, info: {
  tester_name?: string;
  tester_email?: string;
  viewport_w?: number;
  viewport_h?: number;
}): SessionStartResponse {
  const db = getDb();
  const now = Date.now();

  // Get test with variants and tasks
  const test = db.prepare('SELECT * FROM tests WHERE id = ?').get(testId) as { id: string; type: string; prototype_url: string | null } | undefined;
  if (!test) throw new Error('Test not found');

  const variants = db.prepare('SELECT * FROM variants WHERE test_id = ?').all(testId) as { id: string; url: string; weight: number }[];
  const tasks = db.prepare('SELECT * FROM tasks WHERE test_id = ? ORDER BY sort_order').all(testId) as { id: string; sort_order: number; instruction: string; success_criteria: string | null }[];

  // A/B: weighted random variant selection
  let variantId: string | null = null;
  let prototypeUrl = test.prototype_url ?? '';

  if (test.type === 'ab' && variants.length > 0) {
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    let rand = Math.random() * totalWeight;
    for (const v of variants) {
      rand -= v.weight;
      if (rand <= 0) { variantId = v.id; prototypeUrl = v.url; break; }
    }
    if (!variantId) { variantId = variants[0].id; prototypeUrl = variants[0].url; }
  } else if (variants.length > 0 && !prototypeUrl) {
    prototypeUrl = variants[0].url;
  }

  const sessionId = nanoid();
  db.prepare(`
    INSERT INTO sessions (id, test_id, variant_id, tester_name, tester_email, status, started_at, viewport_w, viewport_h)
    VALUES (?, ?, ?, ?, ?, 'in_progress', ?, ?, ?)
  `).run(sessionId, testId, variantId, info.tester_name ?? null, info.tester_email ?? null, now, info.viewport_w ?? null, info.viewport_h ?? null);

  return { sessionId, variantId, prototypeUrl, tasks: tasks as any[] };
}

export function completeSession(sessionId: string, data: {
  notes?: string;
  taskResults?: { task_id: string; duration_ms: number; completed: boolean }[];
}): void {
  const db = getDb();
  const now = Date.now();

  const finish = db.transaction(() => {
    db.prepare('UPDATE sessions SET status = ?, completed_at = ?, notes = ? WHERE id = ?')
      .run('completed', now, data.notes ?? null, sessionId);

    if (data.taskResults?.length) {
      const insert = db.prepare(`
        INSERT OR REPLACE INTO task_results (id, session_id, task_id, started_at, completed_at, duration_ms, completed)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const tr of data.taskResults) {
        insert.run(nanoid(), sessionId, tr.task_id, now - tr.duration_ms, now, tr.duration_ms, tr.completed ? 1 : 0);
      }
    }
  });

  finish();
}

export function getResults(testId: string): TestResults {
  const db = getDb();

  const test = db.prepare(`
    SELECT t.*, GROUP_CONCAT(v.id) as variant_ids
    FROM tests t
    LEFT JOIN variants v ON v.test_id = t.id
    WHERE t.id = ?
    GROUP BY t.id
  `).get(testId) as any;

  const sessions = db.prepare(`
    SELECT s.*, v.name as variant_name
    FROM sessions s
    LEFT JOIN variants v ON v.id = s.variant_id
    WHERE s.test_id = ?
    ORDER BY s.started_at DESC
  `).all(testId) as (Session & { variant_name?: string })[];

  const taskStats = db.prepare(`
    SELECT
      ta.id as task_id,
      ta.instruction,
      AVG(tr.duration_ms) as avg_duration_ms,
      CAST(SUM(tr.completed) AS REAL) / COUNT(tr.id) * 100 as completion_rate,
      COUNT(tr.id) as total_sessions,
      SUM(tr.completed) as completed_sessions
    FROM tasks ta
    LEFT JOIN task_results tr ON tr.task_id = ta.id
    WHERE ta.test_id = ?
    GROUP BY ta.id
    ORDER BY ta.sort_order
  `).all(testId) as TaskStat[];

  const clickEvents = db.prepare(`
    SELECT e.* FROM events e
    JOIN sessions s ON s.id = e.session_id
    WHERE s.test_id = ? AND e.type = 'click'
    LIMIT 5000
  `).all(testId) as any[];

  let variantComparison: VariantStat[] | undefined;
  const variants = db.prepare('SELECT * FROM variants WHERE test_id = ?').all(testId) as { id: string; name: string }[];
  if (variants.length > 0) {
    variantComparison = db.prepare(`
      SELECT
        v.id as variant_id,
        v.name as variant_name,
        COUNT(s.id) as session_count,
        AVG(tr_agg.completion_rate) as avg_completion_rate,
        AVG(tr_agg.avg_dur) as avg_duration_ms
      FROM variants v
      LEFT JOIN sessions s ON s.variant_id = v.id
      LEFT JOIN (
        SELECT session_id,
          AVG(CAST(completed AS REAL)) * 100 as completion_rate,
          AVG(duration_ms) as avg_dur
        FROM task_results GROUP BY session_id
      ) tr_agg ON tr_agg.session_id = s.id
      WHERE v.test_id = ?
      GROUP BY v.id
    `).all(testId) as VariantStat[];
  }

  const fullTest = db.prepare('SELECT * FROM tests WHERE id = ?').get(testId) as any;
  fullTest.variants = variants;
  fullTest.tasks = db.prepare('SELECT * FROM tasks WHERE test_id = ? ORDER BY sort_order').all(testId);

  return { test: fullTest, sessions, taskStats, clickEvents, variantComparison };
}

export function insertEvents(sessionId: string, events: {
  task_id?: string;
  type: string;
  x: number;
  y: number;
  timestamp: number;
  metadata?: string;
}[]): void {
  const db = getDb();
  const insert = db.prepare(`
    INSERT INTO events (session_id, task_id, type, x, y, timestamp, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((evts: typeof events) => {
    for (const e of evts) {
      insert.run(sessionId, e.task_id ?? null, e.type, e.x, e.y, e.timestamp, e.metadata ?? null);
    }
  });
  insertMany(events);
}
