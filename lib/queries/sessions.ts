import { getDb, toRows, toRow } from '../db';
import { nanoid } from 'nanoid';
import type { Session, SessionStartResponse, TaskResult, TestResults, TaskStat, VariantStat, SessionTaskResult } from '@/types';

export async function createSession(testId: string, info: {
  tester_name?: string;
  tester_email?: string;
  viewport_w?: number;
  viewport_h?: number;
}): Promise<SessionStartResponse> {
  const db = await getDb();
  const now = Date.now();

  const testResult = await db.execute({ sql: 'SELECT * FROM tests WHERE id = ?', args: [testId] });
  const test = toRow<{ id: string; type: string; prototype_url: string | null }>(testResult);
  if (!test) throw new Error('Test not found');

  const variantsResult = await db.execute({ sql: 'SELECT * FROM variants WHERE test_id = ?', args: [testId] });
  const variants = toRows<{ id: string; url: string; weight: number }>(variantsResult);

  const tasksResult = await db.execute({ sql: 'SELECT * FROM tasks WHERE test_id = ? ORDER BY sort_order', args: [testId] });
  const tasks = toRows<{ id: string; sort_order: number; instruction: string; success_criteria: string | null }>(tasksResult);

  let variantId: string | null = null;
  let prototypeUrl = (test.prototype_url as string) ?? '';

  if (test.type === 'ab' && variants.length > 0) {
    const totalWeight = variants.reduce((s, v) => s + v.weight, 0);
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
  await db.execute({
    sql: `INSERT INTO sessions (id, test_id, variant_id, tester_name, tester_email, status, started_at, viewport_w, viewport_h)
          VALUES (?, ?, ?, ?, ?, 'in_progress', ?, ?, ?)`,
    args: [sessionId, testId, variantId, info.tester_name ?? null, info.tester_email ?? null, now, info.viewport_w ?? null, info.viewport_h ?? null],
  });

  return { sessionId, variantId, prototypeUrl, tasks: tasks as any[] };
}

export async function completeSession(sessionId: string, data: {
  notes?: string;
  recording_url?: string;
  taskResults?: { task_id: string; duration_ms: number; completed: boolean }[];
}): Promise<void> {
  const db = await getDb();
  const now = Date.now();

  const statements: { sql: string; args: (string | number | null)[] }[] = [
    {
      sql: `UPDATE sessions SET status = 'completed', completed_at = ?, notes = ? WHERE id = ?`,
      args: [now, data.notes ?? null, sessionId],
    },
  ];

  if (data.taskResults?.length) {
    for (const tr of data.taskResults) {
      statements.push({
        sql: `INSERT OR REPLACE INTO task_results (id, session_id, task_id, started_at, completed_at, duration_ms, completed)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [nanoid(), sessionId, tr.task_id, now - tr.duration_ms, now, tr.duration_ms, tr.completed ? 1 : 0],
      });
    }
  }

  await db.batch(statements, 'write');

  // Separate update so a missing recording_url column never breaks session completion
  if (data.recording_url) {
    try {
      await db.execute({
        sql: `UPDATE sessions SET recording_url = ? WHERE id = ?`,
        args: [data.recording_url, sessionId],
      });
    } catch (e) {
      console.error('[sessions] recording_url update failed:', e);
    }
  }
}

export async function getResults(testId: string): Promise<TestResults> {
  const db = await getDb();

  const testResult = await db.execute({ sql: 'SELECT * FROM tests WHERE id = ?', args: [testId] });
  const test = toRow<any>(testResult);

  const variantsResult = await db.execute({ sql: 'SELECT * FROM variants WHERE test_id = ?', args: [testId] });
  test.variants = toRows(variantsResult);

  const tasksResult = await db.execute({ sql: 'SELECT * FROM tasks WHERE test_id = ? ORDER BY sort_order', args: [testId] });
  test.tasks = toRows(tasksResult);

  // Fetch recording_url separately so a missing column never breaks the page
  let recordingUrlMap: Record<string, string | null> = {};
  try {
    const recResult = await db.execute({
      sql: `SELECT id, recording_url FROM sessions WHERE test_id = ?`,
      args: [testId],
    });
    for (const row of toRows<{ id: string; recording_url: string | null }>(recResult)) {
      recordingUrlMap[row.id] = row.recording_url;
    }
  } catch { /* column doesn't exist yet */ }

  const sessionsResult = await db.execute({
    sql: `SELECT s.id, s.test_id, s.variant_id, s.tester_name, s.tester_email, s.status,
                 s.started_at, s.completed_at, s.viewport_w, s.viewport_h, s.notes,
                 v.name as variant_name
          FROM sessions s
          LEFT JOIN variants v ON v.id = s.variant_id
          WHERE s.test_id = ?
          ORDER BY s.started_at DESC`,
    args: [testId],
  });
  const sessions = toRows<Session & { variant_name?: string }>(sessionsResult).map(s => ({
    ...s,
    recording_url: recordingUrlMap[s.id] ?? null,
  }));

  const taskStatsResult = await db.execute({
    sql: `SELECT ta.id as task_id, ta.instruction,
                 AVG(tr.duration_ms) as avg_duration_ms,
                 CAST(SUM(tr.completed) AS REAL) / NULLIF(COUNT(tr.id), 0) * 100 as completion_rate,
                 COUNT(tr.id) as total_sessions,
                 SUM(tr.completed) as completed_sessions
          FROM tasks ta
          LEFT JOIN task_results tr ON tr.task_id = ta.id
          WHERE ta.test_id = ?
          GROUP BY ta.id
          ORDER BY ta.sort_order`,
    args: [testId],
  });
  const taskStats = toRows<TaskStat>(taskStatsResult);

  const clickResult = await db.execute({
    sql: `SELECT e.id, e.session_id, e.task_id, e.type, e.x, e.y, e.timestamp, e.metadata
          FROM events e
          JOIN sessions s ON s.id = e.session_id
          WHERE s.test_id = ? AND e.type = 'click'
          LIMIT 5000`,
    args: [testId],
  });
  const clickEvents = toRows<any>(clickResult);

  let variantComparison: VariantStat[] | undefined;
  if (test.variants.length > 0) {
    const vcResult = await db.execute({
      sql: `SELECT v.id as variant_id, v.name as variant_name,
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
            GROUP BY v.id`,
      args: [testId],
    });
    variantComparison = toRows<VariantStat>(vcResult);
  }

  const sessionTaskResultsResult = await db.execute({
    sql: `SELECT tr.session_id, tr.task_id, ta.instruction, ta.sort_order,
                 tr.duration_ms, tr.completed
          FROM task_results tr
          JOIN tasks ta ON ta.id = tr.task_id
          JOIN sessions s ON s.id = tr.session_id
          WHERE s.test_id = ?
          ORDER BY tr.session_id, ta.sort_order`,
    args: [testId],
  });
  const sessionTaskResults = toRows<SessionTaskResult>(sessionTaskResultsResult);

  return { test, sessions, taskStats, clickEvents, variantComparison, sessionTaskResults };
}

export async function insertEvents(sessionId: string, events: {
  task_id?: string;
  type: string;
  x: number;
  y: number;
  timestamp: number;
  metadata?: string;
}[]): Promise<void> {
  const db = await getDb();
  const statements = events.map(e => ({
    sql: `INSERT INTO events (session_id, task_id, type, x, y, timestamp, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [sessionId, e.task_id ?? null, e.type, e.x, e.y, e.timestamp, e.metadata ?? null] as (string | number | null)[],
  }));
  await db.batch(statements, 'write');
}
