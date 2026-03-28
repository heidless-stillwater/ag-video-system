import { NextRequest, NextResponse } from 'next/server';
import { getProject, updateProject } from '@/lib/services/firestore-admin';

/**
 * API Route to cancel/kill an active media generation process.
 * Used by the "Kill Process" button in the UI.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> } // Corrected: Params are a Promise in Next.js 15+
) {
    const { id: projectId } = await params; // Await the params

    try {
        const project = await getProject(projectId);
        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        // Only allow cancelling if currently generating media
        if (project.status === 'generating_media') {
            // Revert to 'scripting' or 'ready' based on whether we have a script
            // Safest is 'scripting' or a dedicated 'cancelled' state.
            // Let's use 'ready' effectively but with a message.

            await updateProject(projectId, {
                status: 'scripting', // Revert to scripting to allow retry
                mediaMessage: '🛑 Generation cancelled by user.'
            } as any);

            console.log(`[Media Cancel API] Cancelled generation for project: ${projectId}`);
        }

        return NextResponse.json({ success: true, message: 'Process termination signal sent.' });

    } catch (error: any) {
        console.error('[Media Cancel API] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
