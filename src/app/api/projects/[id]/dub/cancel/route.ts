import { NextRequest, NextResponse } from 'next/server';
import { getProject, updateProject } from '@/lib/services/firestore-admin';

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

        // Mark the current active session as cancelled
        await updateProject(projectId, {
            cancelledDubbingSessionId: project.activeDubbingSessionId,
            // Reset message
            publishMessage: 'Dubbing cancelled by user.'
        } as any);

        return NextResponse.json({ success: true, message: 'Cancellation signal sent.' });
    } catch (error: any) {
        console.error('[Dub Cancel API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
