import { NextResponse } from 'next/server';
import { getProject, updateProject, deleteProject } from '@/lib/queries/projects';

export async function GET(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = getProject(projectId);
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(project);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const body = await req.json();
  const updated = updateProject(projectId, body);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  deleteProject(projectId);
  return NextResponse.json({ ok: true });
}
