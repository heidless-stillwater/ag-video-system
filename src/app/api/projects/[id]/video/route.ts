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
    const isDownload = searchParams.get('download') === 'true';

    try {
        const range = req.headers.get('range');

        // 1. Initial size check
        const { size: totalSize } = await storageService.getVideoStream(projectId, archiveId, fileName);

        let start = 0;
        let end = totalSize - 1;
        let isPartial = false;

        // 2. Parse Range Header (e.g., "bytes=0-1023")
        if (range && !isDownload) {
            const rangeMatch = range.match(/bytes=(\d*)-(\d*)/);
            if (rangeMatch) {
                const s = rangeMatch[1];
                const e = rangeMatch[2];
                if (s) start = parseInt(s, 10);
                if (e) end = parseInt(e, 10);

                // Validate bounds
                start = Math.max(0, start);
                end = Math.min(totalSize - 1, end);

                if (start <= end) {
                    isPartial = true;
                }
            }
        }

        const chunksize = (end - start) + 1;
        const { stream } = await storageService.getVideoStream(projectId, archiveId, fileName, start, end);

        // 3. Standard headers for video streaming
        const headers = new Headers({
            'Content-Type': 'video/mp4',
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize.toString(),
            'Content-Disposition': `${isDownload ? 'attachment' : 'inline'}; filename="${projectId}.mp4"`,
            'Cache-Control': isDownload ? 'no-cache' : 'public, max-age=3600'
        });

        if (isPartial) {
            headers.set('Content-Range', `bytes ${start}-${end}/${totalSize}`);
        }

        return new NextResponse(stream as any, {
            status: isPartial ? 206 : 200,
            headers,
        });

    } catch (error: any) {
        console.error('[Video Proxy API] Error streaming video:', error);
        const status = error.message.includes('not found') ? 404 : 500;
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status });
    }
}
