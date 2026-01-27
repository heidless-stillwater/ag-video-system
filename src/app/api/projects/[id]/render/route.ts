import { NextRequest, NextResponse } from 'next/server';
import { getScript, getProject, updateProject } from '@/lib/services/firestore-admin';
import { videoEngine } from '@/lib/services/video-engine';
import { renderEngine } from '@/lib/services/render-engine';
import { resourceGovernor } from '@/lib/services/resource-governor';

/**
 * API Route to render the final documentary project to an MP4 file.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;

    try {
        const { scriptId } = await req.json();

        if (!scriptId) {
            return NextResponse.json({ error: 'scriptId is required' }, { status: 400 });
        }

        // 0. Safety Check: Prevent overload in WSL / Low-resource environments
        const health = resourceGovernor.isSystemHealthy();
        if (!health.healthy) {
            return NextResponse.json({
                error: `System Overload: ${health.reason}. Please wait for other tasks to finish before rendering.`,
                retryAfter: 30
            }, { status: 503 }); // Service Unavailable / Busy
        }

        // 1. Get Project and Script
        const project = await getProject(projectId);
        const script = await getScript(scriptId);

        if (!project || !script) {
            return NextResponse.json({ error: 'Project or Script not found' }, { status: 404 });
        }

        // 2. Calculate Timeline
        const scenes = videoEngine.calculateTimeline(script);

        // 3. Trigger Render (Asynchronous for UX)
        console.log(`[Render API] Triggering render for project: ${projectId}`);

        // Update status to rendering and set initial progress
        await updateProject(projectId, {
            status: 'rendering',
            renderProgress: 0,
            renderMessage: 'Initializing render engine...'
        } as any);

        // Trigger the render without awaiting it so we can return quickly
        renderEngine.renderDocumentary(
            projectId,
            scenes,
            project.backgroundMusicUrl,
            project.backgroundMusicVolume || 0.2,
            project.ambianceUrl,
            project.ambianceVolume || 0.1,
            project.narrationVolume || 1.0,
            project.globalSfxVolume || 0.4,
            project.subtitlesEnabled || false,
            project.subtitleStyle || 'minimal',
            async (progress, message) => {
                await updateProject(projectId, {
                    renderProgress: progress,
                    renderMessage: message
                } as any);
            }
        ).then(async () => {
            const downloadUrl = `/renders/${projectId}.mp4`;
            await updateProject(projectId, {
                downloadUrl,
                status: 'ready',
                renderProgress: 100,
                renderMessage: 'Render complete!'
            } as any);
            console.log(`[Render API] Background render SUCCESS for: ${projectId}`);
        }).catch(async (error) => {
            console.error('[Render API] Background render failed:', error);
            await updateProject(projectId, {
                status: 'assembling',
                renderMessage: `Render failed: ${error.message}`
            } as any);
        });

        return NextResponse.json({
            success: true,
            message: 'Rendering started'
        });

    } catch (error: any) {
        console.error('[Render API] Fatal error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
