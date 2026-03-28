import { NextRequest, NextResponse } from 'next/server';
import { getScript, getProject } from '@/lib/services/firestore-admin';
import { youtubeService } from '@/lib/services/youtube';
import { cookies } from 'next/headers';
import { EnvironmentMode, getEnvironmentMode } from '@/lib/config/environment';

/**
 * API Route to generate YouTube metadata for a project.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;
    const { searchParams } = new URL(req.url);
    const scriptId = searchParams.get('scriptId');

    if (!scriptId) {
        return NextResponse.json({ error: 'scriptId is required' }, { status: 400 });
    }

    try {
        const [script, project] = await Promise.all([
            getScript(scriptId),
            getProject(projectId)
        ]);
        if (!script) {
            return NextResponse.json({ error: 'Script not found' }, { status: 404 });
        }

        const cookieStore = await cookies();
        const envMode = (cookieStore.get('x-env-mode')?.value as EnvironmentMode) || getEnvironmentMode();

        const metadata = await youtubeService.generateMetadata(script, envMode);

        return NextResponse.json({
            success: true,
            metadata,
            rateLimited: metadata.isHeuristic
        });

    } catch (error: any) {
        console.error('[YouTube Metadata API] Generation failed:', error);

        // Ultimate last resort if even the heuristic fails
        const project = await getProject(projectId).catch(() => null);
        return NextResponse.json({
            success: true,
            rateLimited: true,
            metadata: {
                title: project?.title || 'Untitled Video',
                description: project?.description || '',
                tags: []
            }
        }, { status: 200 });
    }
}
