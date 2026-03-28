import { NextRequest, NextResponse } from 'next/server';
import { renderEngine } from '@/lib/services/render-engine';

/**
 * Emergency API endpoint to kill all running render processes.
 * Use this when renders are hung or consuming too many resources.
 */
export async function POST(req: NextRequest) {
    try {
        console.log('[Kill Renders API] Emergency stop requested');

        await renderEngine.killAllProcesses();

        return NextResponse.json({
            success: true,
            message: 'All render processes have been terminated'
        });
    } catch (error: any) {
        console.error('[Kill Renders API] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to kill processes' },
            { status: 500 }
        );
    }
}
