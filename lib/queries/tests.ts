import { getDb, toRow, toRows } from '../db';
import { nanoid } from 'nanoid';
import type { Test, Variant, Task, TestType } from '@/types';

export async function listTests(projectId: string): Promise<Test[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT t.id, t.project_id, t.name, t.type, t.status, t.prototype_url, t.screenshot_url,
                 t.description, t.created_at, t.updated_at, COUNT(s.id) as session_count
          FROM tests t
          LEFT JOIN sessions s ON s.test_id = t.id
          WHERE t.project_id = ?
          GROUP BY t.id
          ORDER BY t.updated_at DESC`,
    args: [projectId],
  });
  return toRows<Test>(result);
}

export async function getTest(id: string): Promise<Test | undefined> {
  const db = await getDb();
  const testResult = await db.execute({ sql: 'SELECT * FROM tests WHERE id = ?', args: [id] });
  const test = toRow<Test>(testResult);
  if (!test) return undefined;
  const variantsResult = await db.execute({ sql: 'SELECT * FROM variants WHERE test_id = ? ORDER BY name', args: [id] });
  const tasksResult = await db.execute({ sql: 'SELECT * FROM tasks WHERE test_id = ? ORDER BY sort_order', args: [id] });
  test.variants = toRows<Variant>(variantsResult);
  test.tasks = toRows<Task>(tasksResult);
  return test;
}

export async function createTest(data: {
  project_id: string;
  name: string;
  type: TestType;
  prototype_url?: string;
  description?: string;
  variants?: { name: string; url: string; weight?: number }[];
  tasks?: { instruction: string; success_criteria?: string }[];
}): Promise<Test> {
  const db = await getDb();
  const now = Date.now();
  const id = nanoid();

  const statements: { sql: string; args: (string | number | null)[] }[] = [
    {
      sql: `INSERT INTO tests (id, project_id, name, type, status, prototype_url, description, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?)`,
      args: [id, data.project_id, data.name, data.type, data.prototype_url ?? null, data.description ?? null, now, now],
    },
  ];

  if (data.variants?.length) {
    for (const v of data.variants) {
      statements.push({
        sql: 'INSERT INTO variants (id, test_id, name, url, weight) VALUES (?, ?, ?, ?, ?)',
        args: [nanoid(), id, v.name, v.url, v.weight ?? 0.5],
      });
    }
  }

  if (data.tasks?.length) {
    data.tasks.forEach((t, i) => {
      statements.push({
        sql: 'INSERT INTO tasks (id, test_id, sort_order, instruction, success_criteria) VALUES (?, ?, ?, ?, ?)',
        args: [nanoid(), id, i, t.instruction, t.success_criteria ?? null],
      });
    });
  }

  statements.push({
    sql: 'UPDATE projects SET updated_at = ? WHERE id = (SELECT project_id FROM tests WHERE id = ?)',
    args: [now, id],
  });

  await db.batch(statements, 'write');
  return (await getTest(id))!;
}

export async function updateTest(id: string, data: Partial<{
  name: string;
  type: TestType;
  status: 'draft' | 'active' | 'closed';
  prototype_url: string;
  screenshot_url: string;
  description: string;
  variants: { name: string; url: string; weight?: number }[];
  tasks: { instruction: string; success_criteria?: string }[];
}>): Promise<Test | undefined> {
  const db = await getDb();
  const now = Date.now();
  const statements: { sql: string; args: (string | number | null)[] }[] = [];

  const fields: string[] = ['updated_at = ?'];
  const values: (string | number | null)[] = [now];
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.prototype_url !== undefined) { fields.push('prototype_url = ?'); values.push(data.prototype_url); }
  if (data.screenshot_url !== undefined) { fields.push('screenshot_url = ?'); values.push(data.screenshot_url); }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }

  if (fields.length > 1) {
    statements.push({ sql: `UPDATE tests SET ${fields.join(', ')} WHERE id = ?`, args: [...values, id] });
  }

  if (data.variants !== undefined) {
    statements.push({ sql: 'DELETE FROM variants WHERE test_id = ?', args: [id] });
    for (const v of data.variants) {
      statements.push({ sql: 'INSERT INTO variants (id, test_id, name, url, weight) VALUES (?, ?, ?, ?, ?)', args: [nanoid(), id, v.name, v.url, v.weight ?? 0.5] });
    }
  }

  if (data.tasks !== undefined) {
    statements.push({ sql: 'DELETE FROM tasks WHERE test_id = ?', args: [id] });
    data.tasks.forEach((t, i) => {
      statements.push({ sql: 'INSERT INTO tasks (id, test_id, sort_order, instruction, success_criteria) VALUES (?, ?, ?, ?, ?)', args: [nanoid(), id, i, t.instruction, t.success_criteria ?? null] });
    });
  }

  if (statements.length) await db.batch(statements, 'write');
  return getTest(id);
}

export async function deleteTest(id: string): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: 'DELETE FROM tests WHERE id = ?', args: [id] });
}
