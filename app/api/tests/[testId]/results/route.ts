import { NextResponse } from 'next/server';
import { getResults } from '@/lib/queries/sessions';

export async function GET(_: Request, { params }: { params: Promise<{ testId: string }> }) {
  try {
    const { testId } = await params;
    return NextResponse.json(getResults(testId));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
