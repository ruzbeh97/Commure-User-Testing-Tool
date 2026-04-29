import { NextResponse } from 'next/server';
import { completeSession } from '@/lib/queries/sessions';

export async function PATCH(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params;
    const body = await req.json().catch(() => ({}));
    await completeSession(sessionId, {
      notes: body.notes,
      taskResults: body.taskResults,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
