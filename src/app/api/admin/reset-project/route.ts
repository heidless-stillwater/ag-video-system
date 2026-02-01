import { NextRequest, NextResponse } from 'next/server';
import { updateProject } from '@/lib/services/firestore-admin';

/**
 * API endpoint to reset a stuck project's status.
 * Useful when renders hang or fail silently.
 */
export async function POST(req: NextRequest) {
    try {
        const { projectId } = await req.json();

        if (!projectId) {
            return NextResponse.json(
                { error: 'projectId is required' },
                { status: 400 }
            );
        }

        console.log(`[Reset Project API] Resetting project: ${projectId}`);

        // Reset project to assembling state
        await updateProject(projectId, {
            status: 'assembling',
            renderProgress: 0,
            renderMessage: 'Reset by admin - ready for new render'
        } as any);

        return NextResponse.json({
            success: true,
            message: `Project ${projectId} has been reset to assembling state`
        });
    } catch (error: any) {
        console.error('[Reset Project API] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to reset project' },
            { status: 500 }
        );
    }
}
