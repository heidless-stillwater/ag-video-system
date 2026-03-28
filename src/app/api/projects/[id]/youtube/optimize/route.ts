import { NextRequest, NextResponse } from 'next/server';
import { getScript } from '@/lib/services/firestore-admin';
import { youtubeService } from '@/lib/services/youtube';
import { cookies } from 'next/headers';
import { EnvironmentMode, getEnvironmentMode } from '@/lib/config/environment';

/**
 * API Route to optimize YouTube metadata for a project.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;
    
    try {
        const { metadata: currentMetadata, scriptId } = await req.json();

        if (!scriptId || !currentMetadata) {
            return NextResponse.json({ error: 'scriptId and metadata are required' }, { status: 400 });
        }

        const script = await getScript(scriptId);
        if (!script) {
            return NextResponse.json({ error: 'Script not found' }, { status: 404 });
        }

        const cookieStore = await cookies();
        const envMode = (cookieStore.get('x-env-mode')?.value as EnvironmentMode) || getEnvironmentMode();

        const optimizedMetadata = await youtubeService.optimizeMetadata(currentMetadata, script, envMode);

        return NextResponse.json({
            success: true,
            metadata: optimizedMetadata,
            rateLimited: optimizedMetadata.isHeuristic
        });

    } catch (error: any) {
        console.error('[YouTube Optimize API] Viral optimization failed:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
