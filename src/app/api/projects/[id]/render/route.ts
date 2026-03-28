import { NextRequest, NextResponse } from 'next/server';
import { getScript, getProject, updateProject } from '@/lib/services/firestore-admin';
import { videoEngine } from '@/lib/services/video-engine';
import { renderEngine } from '@/lib/services/render-engine';
import { resourceGovernor } from '@/lib/services/resource-governor';
import { creditService } from '@/lib/services/credit-service';

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
        const health = resourceGovernor.isSystemHealthy({ bypassIfDelegated: true });
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

        // 1b. Credit Check & Deduction (Idempotent)
        const HAS_ALREADY_PAID = (project.creditsDeducted || 0) >= 1;
        
        if (!HAS_ALREADY_PAID) {
            try {
                const RENDER_COST = 1; // 1 credit per render
                await creditService.deductCredits(project.userId, RENDER_COST);
                console.log(`[Render API] Deducted 1 credit from user: ${project.userId}`);
                
                // Track deduction in project document to prevent double-charging
                await updateProject(projectId, {
                    creditsDeducted: RENDER_COST,
                    updatedAt: new Date(),
                });
            } catch (creditError: any) {
                console.warn(`[Render API] Credit Check Failed: ${creditError.message}`);
                return NextResponse.json({
                    error: creditError.message,
                    requiresCredits: true
                }, { status: 402 }); // Payment Required
            }
        } else {
            console.log(`[Render API] 💎 Project ${projectId} already paid for render. Skipping deduction.`);
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

        // Trigger worker API
        console.log(`[Render API] Handing off to render worker...`);
        
        try {
            await renderEngine.renderDocumentary(
                projectId,
                scenes,
                project.backgroundMusicUrl,
                project.backgroundMusicVolume ?? 0.2,
                project.ambianceUrl,
                project.ambianceVolume ?? 0.1,
                project.narrationVolume ?? 1.0,
                project.globalSfxVolume ?? 0.4,
                project.subtitlesEnabled ?? false,
                project.subtitleStyle ?? 'minimal',
                project.aspectRatio as any || '16:9', // Use project's actual aspect ratio
                undefined, // customFileName
                project.performanceProfile as any, // New argument: Performance Profile
                async (progress: number, message: string) => {
                    // Update initial progress
                    await updateProject(projectId, {
                        renderProgress: progress,
                        renderMessage: message
                    } as any);
                }
            );

            return NextResponse.json({
                success: true,
                message: 'Render job accepted by worker'
            });
        } catch (error: any) {
            console.error('[Render API] ❌ Worker transmission failed:', error);
            await updateProject(projectId, {
                status: 'error',
                renderMessage: `Render delegation failed: ${error.message}`,
                renderProgress: 0
            } as any);
            
            return NextResponse.json({ error: 'Render delegation failed' }, { status: 500 });
        }

    } catch (error: any) {
        console.error('[Render API] Fatal error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
