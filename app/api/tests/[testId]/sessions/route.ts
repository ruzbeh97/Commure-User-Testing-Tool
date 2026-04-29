import { NextResponse } from 'next/server';
import { createSession } from '@/lib/queries/sessions';
import { getDb, toRows } from '@/lib/db';
import type { Session } from '@/types';

export async function GET(_: Request, { params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params;
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT s.*, v.name as variant_name
          FROM sessions s
          LEFT JOIN variants v ON v.id = s.variant_id
          WHERE s.test_id = ?
          ORDER BY s.started_at DESC`,
    args: [testId],
  });
  const sessions = toRows<Session & { variant_name?: string }>(result);
  return NextResponse.json(sessions);
}

export async function POST(req: Request, { params }: { params: Promise<{ testId: string }> }) {
  try {
    const { testId } = await params;
    const body = await req.json().catch(() => ({}));
    const result = await createSession(testId, {
      tester_name: body.tester_name,
      tester_email: body.tester_email,
      viewport_w: body.viewport_w,
      viewport_h: body.viewport_h,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
