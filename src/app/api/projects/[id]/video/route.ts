import { NextRequest, NextResponse } from 'next/server';
import { storageService } from '@/lib/services/storage';

/**
 * API Route to stream a rendered video from Firebase Storage.
 * This proxy bypasses CORS issues and GCS public-access complexities for the browser player.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;
    const { searchParams } = new URL(req.url);
    const archiveId = searchParams.get('archiveId') || undefined;
    const fileName = searchParams.get('fileName') || undefined;

    try {
        const { stream, size } = await storageService.getVideoStream(projectId, archiveId, fileName);

        // Standard headers for video streaming
        const headers = new Headers({
            'Content-Type': 'video/mp4',
            'Content-Length': size.toString(),
            'Accept-Ranges': 'bytes', // Crucial for Safari and seeking
            'Content-Disposition': `inline; filename="${projectId}.mp4"`
        });

        // Convert the Node stream to a Web readable stream for Next.js response
        // @ts-ignore - ReadableStream conversion
        return new NextResponse(stream as any, {
            status: 200,
            headers,
        });

    } catch (error: any) {
        console.error('[Video Proxy API] Error streaming video:', error);
        const status = error.message.includes('not found') ? 404 : 500;
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status });
    }
}
