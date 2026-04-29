import { getDb, toRow, toRows } from '../db';
import { nanoid } from 'nanoid';
import type { Project } from '@/types';

export async function listProjects(): Promise<Project[]> {
  const db = await getDb();
  const result = await db.execute(`
    SELECT p.id, p.name, p.description, p.created_at, p.updated_at,
           COUNT(t.id) as test_count
    FROM projects p
    LEFT JOIN tests t ON t.project_id = p.id
    GROUP BY p.id
    ORDER BY p.updated_at DESC
  `);
  return toRows<Project>(result);
}

export async function getProject(id: string): Promise<Project | undefined> {
  const db = await getDb();
  const result = await db.execute({ sql: 'SELECT * FROM projects WHERE id = ?', args: [id] });
  return toRow<Project>(result);
}

export async function createProject(data: { name: string; description?: string }): Promise<Project> {
  const db = await getDb();
  const now = Date.now();
  const id = nanoid();
  await db.execute({
    sql: 'INSERT INTO projects (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    args: [id, data.name, data.description ?? null, now, now],
  });
  return (await getProject(id))!;
}

export async function updateProject(id: string, data: { name?: string; description?: string }): Promise<Project | undefined> {
  const db = await getDb();
  const now = Date.now();
  if (data.name !== undefined) {
    await db.execute({ sql: 'UPDATE projects SET name = ?, updated_at = ? WHERE id = ?', args: [data.name, now, id] });
  }
  if (data.description !== undefined) {
    await db.execute({ sql: 'UPDATE projects SET description = ?, updated_at = ? WHERE id = ?', args: [data.description, now, id] });
  }
  return getProject(id);
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: 'DELETE FROM projects WHERE id = ?', args: [id] });
}
