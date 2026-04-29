import { NextResponse } from 'next/server';
import { listTests, createTest } from '@/lib/queries/tests';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  return NextResponse.json(await listTests(projectId));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.project_id || !body.name || !body.type) {
      return NextResponse.json({ error: 'project_id, name, type required' }, { status: 400 });
    }
    const test = await createTest(body);
    return NextResponse.json(test, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
