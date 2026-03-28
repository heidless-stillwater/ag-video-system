import { NextRequest, NextResponse } from 'next/server';
import { getProject, getScript, updateProject } from '@/lib/services/firestore-admin';
import { videoEngine } from '@/lib/services/video-engine';
import { renderEngine } from '@/lib/services/render-engine';
import { resourceGovernor } from '@/lib/services/resource-governor';
import { ViralClip } from '@/types';

/**
 * API Route to render a specific viral Short as a vertical MP4.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;

    try {
        const { scriptId, clipId } = await req.json();

        if (!scriptId || !clipId) {
            return NextResponse.json({ error: 'scriptId and clipId are required' }, { status: 400 });
        }

        // 0. Safety Check
        const health = resourceGovernor.isSystemHealthy({ bypassIfDelegated: true });
        if (!health.healthy) {
            return NextResponse.json({
                error: `System Overload: ${health.reason}. Please wait for other tasks to finish.`,
                retryAfter: 30
            }, { status: 503 });
        }

        // 1. Get Project and Script
        const project = await getProject(projectId);
        const script = await getScript(scriptId);

        if (!project || !script) {
            return NextResponse.json({ error: 'Project or Script not found' }, { status: 404 });
        }

        // 2. Find the Clip Candidate
        const clipIdx = project.shorts?.findIndex(s => s.id === clipId);
        if (clipIdx === undefined || clipIdx === -1) {
            return NextResponse.json({ error: 'Short candidate not found' }, { status: 404 });
        }

        const clip = project.shorts![clipIdx];

        // 3. Prepare Scenes for the Short
        // Slicing the scenes based on the indices provided by AI
        const fullScenes = videoEngine.calculateTimeline(script);

        console.log(`[Shorts Render DEBUG] Clip Indices: ${clip.startSceneIndex}-${clip.endSceneIndex}`);
        console.log(`[Shorts Render DEBUG] Full Timeline Length: ${fullScenes.length}`);
        console.log(`[Shorts Render DEBUG] Script Sections: ${script.sections.length}`);
        if (fullScenes.length > 0) {
            console.log(`[Shorts Render DEBUG] First Scene Section: ${fullScenes[0].sectionId}`);
            console.log(`[Shorts Render DEBUG] Last Scene Section: ${fullScenes[fullScenes.length - 1].sectionId}`);
        }

        const shortScenes = fullScenes.slice(clip.startSceneIndex, clip.endSceneIndex + 1);

        if (shortScenes.length === 0) {
            console.error(`[Shorts Render] Invalid scene range: ${clip.startSceneIndex}-${clip.endSceneIndex} (Total scenes: ${fullScenes.length})`);
            return NextResponse.json({ error: 'Selected scenes invalid or out of range' }, { status: 400 });
        }

        // Normalize start times for the short (start at 0)
        const offset = shortScenes[0].startTime;
        const normalizedScenes = shortScenes.map(s => ({
            ...s,
            startTime: s.startTime - offset
        }));

        // 4. Trigger Render (Vertical)
        console.log(`[Shorts Render] Triggering vertical render for clip: ${clipId} (${clip.title})`);

        // Update clip status in project
        const updatedShorts = [...project.shorts!];
        updatedShorts[clipIdx] = {
            ...clip,
            status: 'rendering',
            renderProgress: 0
        };
        await updateProject(projectId, { shorts: updatedShorts } as any);

        const customFileName = `short-${projectId}-${clipId}.mp4`;

        try {
            await renderEngine.renderDocumentary(
                projectId,
                normalizedScenes,
                project.backgroundMusicUrl,
                project.backgroundMusicVolume ?? 0.2,
                project.ambianceUrl,
                project.ambianceVolume ?? 0.1,
                project.narrationVolume ?? 1.0,
                project.globalSfxVolume ?? 0.4,
                project.subtitlesEnabled || true, // Always enable for shorts
                'bold', // Force bold high-impact subtitles for shorts
                '9:16', // Vertical aspect ratio
                customFileName,
                { mode: 'standard' }, // Performance Profile
                async (progressValue: number, message: string) => {
                    // Start progress
                    const projectNow = await getProject(projectId);
                    if (projectNow && projectNow.shorts) {
                        const idx = projectNow.shorts.findIndex(s => s.id === clipId);
                        if (idx !== -1) {
                            projectNow.shorts[idx].renderProgress = progressValue;
                            await updateProject(projectId, { shorts: projectNow.shorts } as any);
                        }
                    }
                },
                clipId // Pass clipId to the worker so it tracks correctly
            );

            return NextResponse.json({
                success: true,
                message: 'Short render job accepted by worker',
                clipId
            });
        } catch (error: any) {
            console.error('[Shorts Render] Failed to delegate to worker:', error);
            const projectNow = await getProject(projectId);
            if (projectNow && projectNow.shorts) {
                const idx = projectNow.shorts.findIndex(s => s.id === clipId);
                if (idx !== -1) {
                    projectNow.shorts[idx].status = 'failed';
                    await updateProject(projectId, { shorts: projectNow.shorts } as any);
                }
            }
            return NextResponse.json({ error: 'Render delegation failed' }, { status: 500 });
        }

    } catch (error: any) {
        console.error('[Shorts Render API] Fatal error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
