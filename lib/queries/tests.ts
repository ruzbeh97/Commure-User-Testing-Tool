import getDb from '../db';
import { nanoid } from 'nanoid';
import type { Test, Variant, Task, TestType } from '@/types';

export function listTests(projectId: string): Test[] {
  const db = getDb();
  const tests = db.prepare(`
    SELECT t.*, COUNT(s.id) as session_count
    FROM tests t
    LEFT JOIN sessions s ON s.test_id = t.id
    WHERE t.project_id = ?
    GROUP BY t.id
    ORDER BY t.updated_at DESC
  `).all(projectId) as Test[];
  return tests;
}

export function getTest(id: string): Test | undefined {
  const db = getDb();
  const test = db.prepare('SELECT * FROM tests WHERE id = ?').get(id) as Test | undefined;
  if (!test) return undefined;
  test.variants = db.prepare('SELECT * FROM variants WHERE test_id = ? ORDER BY name').all(id) as Variant[];
  test.tasks = db.prepare('SELECT * FROM tasks WHERE test_id = ? ORDER BY sort_order').all(id) as Task[];
  return test;
}

export function createTest(data: {
  project_id: string;
  name: string;
  type: TestType;
  prototype_url?: string;
  description?: string;
  variants?: { name: string; url: string; weight?: number }[];
  tasks?: { instruction: string; success_criteria?: string }[];
}): Test {
  const db = getDb();
  const now = Date.now();
  const id = nanoid();

  const insertTest = db.transaction(() => {
    db.prepare(`
      INSERT INTO tests (id, project_id, name, type, status, prototype_url, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?)
    `).run(id, data.project_id, data.name, data.type, data.prototype_url ?? null, data.description ?? null, now, now);

    if (data.variants?.length) {
      const insertVariant = db.prepare('INSERT INTO variants (id, test_id, name, url, weight) VALUES (?, ?, ?, ?, ?)');
      for (const v of data.variants) {
        insertVariant.run(nanoid(), id, v.name, v.url, v.weight ?? 0.5);
      }
    }

    if (data.tasks?.length) {
      const insertTask = db.prepare('INSERT INTO tasks (id, test_id, sort_order, instruction, success_criteria) VALUES (?, ?, ?, ?, ?)');
      data.tasks.forEach((t, i) => {
        insertTask.run(nanoid(), id, i, t.instruction, t.success_criteria ?? null);
      });
    }

    // Update project updated_at
    db.prepare('UPDATE projects SET updated_at = ? WHERE id = (SELECT project_id FROM tests WHERE id = ?)').run(now, id);
  });

  insertTest();
  return getTest(id)!;
}

export function updateTest(id: string, data: Partial<{
  name: string;
  type: TestType;
  status: 'draft' | 'active' | 'closed';
  prototype_url: string;
  screenshot_url: string;
  description: string;
  variants: { name: string; url: string; weight?: number }[];
  tasks: { instruction: string; success_criteria?: string }[];
}>): Test | undefined {
  const db = getDb();
  const now = Date.now();

  const update = db.transaction(() => {
    const fields: string[] = ['updated_at = ?'];
    const values: (string | number | null)[] = [now];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    if (data.prototype_url !== undefined) { fields.push('prototype_url = ?'); values.push(data.prototype_url); }
    if (data.screenshot_url !== undefined) { fields.push('screenshot_url = ?'); values.push(data.screenshot_url); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }

    if (fields.length > 1) {
      db.prepare(`UPDATE tests SET ${fields.join(', ')} WHERE id = ?`).run(...values, id);
    }

    if (data.variants !== undefined) {
      db.prepare('DELETE FROM variants WHERE test_id = ?').run(id);
      const insertVariant = db.prepare('INSERT INTO variants (id, test_id, name, url, weight) VALUES (?, ?, ?, ?, ?)');
      for (const v of data.variants) {
        insertVariant.run(nanoid(), id, v.name, v.url, v.weight ?? 0.5);
      }
    }

    if (data.tasks !== undefined) {
      db.prepare('DELETE FROM tasks WHERE test_id = ?').run(id);
      const insertTask = db.prepare('INSERT INTO tasks (id, test_id, sort_order, instruction, success_criteria) VALUES (?, ?, ?, ?, ?)');
      data.tasks.forEach((t, i) => {
        insertTask.run(nanoid(), id, i, t.instruction, t.success_criteria ?? null);
      });
    }
  });

  update();
  return getTest(id);
}

export function deleteTest(id: string): void {
  getDb().prepare('DELETE FROM tests WHERE id = ?').run(id);
}
