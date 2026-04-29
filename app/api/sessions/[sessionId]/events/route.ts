import { NextResponse } from 'next/server';
import { insertEvents } from '@/lib/queries/sessions';

export async function POST(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params;
    const body = await req.json();
    if (!Array.isArray(body.events) || body.events.length === 0) {
      return NextResponse.json({ ok: true });
    }
    const events = body.events.slice(0, 500);
    insertEvents(sessionId, events);
    return NextResponse.json({ ok: true, count: events.length });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
