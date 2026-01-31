import { NextRequest, NextResponse } from 'next/server';
import { storageService } from '@/lib/services/storage';

/**
 * API Route to archive a rendered video file using Firebase Storage.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;

    try {
        const { label } = await req.json();

        console.log(`[Archive API] Archiving project: ${projectId} with label: ${label}`);
        const result = await storageService.archiveVideo(projectId, label || 'snapshot');
        const proxyUrl = `/api/projects/${projectId}/video?archiveId=${result.archiveId}`;

        return NextResponse.json({
            success: true,
            archiveUrl: proxyUrl,
            archiveId: result.archiveId
        });

    } catch (error: any) {
        console.error('[Archive API] Fatal error:', error);
        const status = error.message.includes('not found') ? 404 : 500;
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status });
    }
}
