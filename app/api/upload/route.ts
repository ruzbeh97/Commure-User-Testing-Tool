import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ blobTokenSet: !!process.env.BLOB_READ_WRITE_TOKEN });
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'BLOB_READ_WRITE_TOKEN is not set in environment variables' },
      { status: 500 },
    );
  }
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['video/webm', 'video/mp4'],
        maximumSizeInBytes: 500 * 1024 * 1024,
      }),
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (err) {
    console.error('[upload] handleUpload error:', err);
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
