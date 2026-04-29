import getDb from '../db';
import { nanoid } from 'nanoid';
import type { Project } from '@/types';

export function listProjects(): Project[] {
  const db = getDb();
  return db.prepare(`
    SELECT p.*, COUNT(t.id) as test_count
    FROM projects p
    LEFT JOIN tests t ON t.project_id = p.id
    GROUP BY p.id
    ORDER BY p.updated_at DESC
  `).all() as Project[];
}

export function getProject(id: string): Project | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project | undefined;
}

export function createProject(data: { name: string; description?: string }): Project {
  const db = getDb();
  const now = Date.now();
  const id = nanoid();
  db.prepare('INSERT INTO projects (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, data.name, data.description ?? null, now, now);
  return getProject(id)!;
}

export function updateProject(id: string, data: { name?: string; description?: string }): Project | undefined {
  const db = getDb();
  const now = Date.now();
  if (data.name !== undefined) {
    db.prepare('UPDATE projects SET name = ?, updated_at = ? WHERE id = ?').run(data.name, now, id);
  }
  if (data.description !== undefined) {
    db.prepare('UPDATE projects SET description = ?, updated_at = ? WHERE id = ?').run(data.description, now, id);
  }
  return getProject(id);
}

export function deleteProject(id: string): void {
  getDb().prepare('DELETE FROM projects WHERE id = ?').run(id);
}
