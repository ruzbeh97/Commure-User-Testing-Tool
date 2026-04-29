import { NextResponse } from 'next/server';
import { listProjects, createProject } from '@/lib/queries/projects';

export async function GET() {
  try {
    return NextResponse.json(await listProjects());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    const project = await createProject({ name: body.name.trim(), description: body.description });
    return NextResponse.json(project, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
