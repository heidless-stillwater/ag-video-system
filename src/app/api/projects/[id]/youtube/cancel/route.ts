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

        if (project.status !== 'publishing') {
            return NextResponse.json({ error: 'No active upload to cancel' }, { status: 400 });
        }

        console.log(`[YouTube Cancel] Cancelling upload for project: ${projectId}`);

        // Update project status to cancel the upload
        await updateProject(projectId, {
            status: 'ready',
            publishMessage: 'Upload cancelled by user',
            publishProgress: 0,
            _cancelUpload: true // Signal flag for the background process
        } as any);

        return NextResponse.json({
            success: true,
            message: 'Upload cancellation initiated'
        });

    } catch (error: any) {
        console.error('[YouTube Cancel API] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
