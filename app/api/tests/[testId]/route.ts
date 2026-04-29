import { NextResponse } from 'next/server';
import { getTest, updateTest, deleteTest } from '@/lib/queries/tests';

export async function GET(_: Request, { params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params;
  const test = await getTest(testId);
  if (!test) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(test);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params;
  const body = await req.json();
  const updated = await updateTest(testId, body);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params;
  await deleteTest(testId);
  return NextResponse.json({ ok: true });
}
