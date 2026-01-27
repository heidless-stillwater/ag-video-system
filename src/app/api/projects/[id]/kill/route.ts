import { NextRequest, NextResponse } from 'next/server';
import { updateProject } from '@/lib/services/firestore-admin';
import { renderEngine } from '@/lib/services/render-engine';

/**
 * API Route to forcibly terminate all rendering processes and reset project status.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;

    try {
        console.warn(`[Kill API] PANIC STOP requested for project: ${projectId}`);

        // 1. Forcibly terminate system-level processes
        await renderEngine.killAllProcesses();

        // 2. Reset project status in Firestore
        await updateProject(projectId, {
            status: 'assembling',
            renderProgress: 0,
            renderMessage: 'Render terminated by user.',
            downloadUrl: null // Clear any partial/previous render
        } as any);

        console.log(`[Kill API] Project ${projectId} reset to ASSEMBLING.`);

        return NextResponse.json({
            success: true,
            message: 'All render processes terminated and project reset.'
        });

    } catch (error: any) {
        console.error('[Kill API] Fatal error during panic stop:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
