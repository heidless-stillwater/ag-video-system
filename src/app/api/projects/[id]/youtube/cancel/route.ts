import { NextRequest, NextResponse } from 'next/server';
import { getProject, updateProject } from '@/lib/services/firestore-admin';

/**
 * API Route to cancel an ongoing YouTube upload.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;

    try {
        const project = await getProject(projectId);

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        // Signalling flag for background cancellation
        const updates: any = {
            _cancelUpload: true
        };

        // If it's currently publishing, reset it to ready
        if (project.status === 'publishing') {
            updates.status = 'ready';
            updates.publishMessage = 'Upload cancelled by user';
            updates.publishProgress = 0;
        }

        await updateProject(projectId, updates);

        return NextResponse.json({
            success: true,
            message: 'Upload cancellation initiated'
        });

    } catch (error: any) {
        console.error('[YouTube Cancel API] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
