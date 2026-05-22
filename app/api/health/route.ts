import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const env = {
    TURSO_DATABASE_URL: !!process.env.TURSO_DATABASE_URL,
    TURSO_AUTH_TOKEN: !!process.env.TURSO_AUTH_TOKEN,
    BLOB_READ_WRITE_TOKEN: !!process.env.BLOB_READ_WRITE_TOKEN,
    TURSO_URL_PREFIX: process.env.TURSO_DATABASE_URL?.slice(0, 25) ?? null,
  };

  // Try a minimal direct DB ping using a fresh client (no schema init, no caching)
  let db: { ok: boolean; error?: string; rowCount?: number } = { ok: false };
  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL ?? 'file:/tmp/app.db',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const result = await client.execute('SELECT 1 as ok');
    db = { ok: true, rowCount: result.rows.length };
    try { client.close(); } catch {}
  } catch (err) {
    db = { ok: false, error: String((err as Error)?.message ?? err) };
  }

  return NextResponse.json({ env, db, now: Date.now() }, { status: db.ok ? 200 : 503 });
}
