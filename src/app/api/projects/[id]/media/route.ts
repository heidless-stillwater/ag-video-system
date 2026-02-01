import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getConfig, EnvironmentMode, getEnvironmentMode } from '@/lib/config/environment';
import { generateVisualCues, generateImage } from '@/lib/services/ai';
import { storageService } from '@/lib/services/storage';
import { getScript, updateScript, updateProject, getProject } from '@/lib/services/firestore-admin';
import { resourceGovernor } from '@/lib/services/resource-governor';
import { VisualCue } from '@/types';

/**
 * API Route for generating visual assets (cues and images) for a script.
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

        // 0. Safety Check
        const health = resourceGovernor.isSystemHealthy();
        if (!health.healthy) {
            return NextResponse.json({
                error: `System Overload: ${health.reason}. Please wait for other tasks to finish.`
            }, { status: 503 });
        }

        // 1. Get Project and Script Details
        const project = await getProject(projectId);
        const script = await getScript(scriptId);

        if (!project || !script) {
            return NextResponse.json({ error: 'Project or Script not found' }, { status: 404 });
        }

        const visualStyle = project.visualStyle || 'cinematic';

        // 2. Initial Setup and Status Update
        console.log(`[Media API] Triggering background media generation for script: ${scriptId} with style: ${visualStyle}`);

        // Set status and reset progress immediately so UI can react
        await updateProject(projectId, {
            status: 'generating_media',
            mediaProgress: 0,
            mediaMessage: 'Initializing Art Factory...'
        } as any);

        const cookieStore = await cookies();
        const envMode = (cookieStore.get('x-env-mode')?.value as EnvironmentMode) || getEnvironmentMode();
        const config = getConfig(envMode);

        // Define the background process
        const processMedia = async () => {
            try {
                // Count total cues for progress tracking
                // Step 1: CLEAR CANVAS (The user's requested "delete images" step)
                // This ensures the UI updates to show "empty" state before generating new ones.
                const clearedSections: any[] = JSON.parse(JSON.stringify(script.sections));
                let totalCues = 0;

                for (const section of clearedSections) {
                    if (section.visualCues) {
                        totalCues += section.visualCues.length;
                        // Wipe cues entirely to force "Regenerate Cues" logic to run with NEW style
                        section.visualCues = [];
                    } else {
                        totalCues += 4; // Assumption for missing cues
                    }
                }

                // Push the "Cleared" state to DB
                await updateScript(scriptId, { sections: clearedSections });
                await updateProject(projectId, {
                    mediaMessage: 'Deep cleaning canvas...'
                } as any);

                // Short pause to ensure UI catches the "Cleared" state
                await new Promise(resolve => setTimeout(resolve, 1500));

                let completedCues = 0;

                // Process each section sequentially (using the cleared sections as base)
                const updatedSections: any[] = clearedSections;
                for (let sectionIndex = 0; sectionIndex < updatedSections.length; sectionIndex++) {
                    const section = updatedSections[sectionIndex];
                    let sectionCues = section.visualCues || [];

                    // In DEV/mock mode, we regenerate cues to ensure variety
                    // In STAGING/PROD with real models, we only generate if missing
                    const shouldRegenerateCues = (sectionCues.length === 0) || (config.ai.model === 'mock');

                    if (shouldRegenerateCues) {
                        console.log(`[Media API] ${config.ai.model === 'mock' ? 'MOCK MODE: Forcing' : 'Generating'} cues for section: ${section.title} using style: ${visualStyle}`);
                        const rawCues = await generateVisualCues(section.title, section.content, envMode, visualStyle);
                        sectionCues = rawCues.map((c: any) => ({
                            ...c,
                            id: Math.random().toString(36).substr(2, 9),
                            status: 'pending' as const
                        }));
                    }

                    // Generate Images for each cue
                    const isRealMode = config.ai.model !== 'mock';
                    let updatedCues: VisualCue[] = [];

                    const performance = project.performanceProfile || {
                        mode: 'standard',
                        concurrency: 1,
                        imageSynthesisDelay: 12000,
                        parallelSynthesis: false
                    };

                    if (isRealMode) {
                        if (performance.parallelSynthesis) {
                            console.log(`[Media API] TURBO MODE: Using PARALLEL image generation (concurrency: ${performance.concurrency || 3})`);

                            // Batch processing with limited concurrency
                            const batchSize = performance.concurrency || 3;
                            for (let i = 0; i < sectionCues.length; i += batchSize) {
                                const currentBatch = sectionCues.slice(i, i + batchSize);
                                const batchResults = await Promise.all(currentBatch.map(async (cue: any) => {
                                    const isMockUrl = cue.url && cue.url.includes('images.unsplash.com');
                                    if (cue.url && !isMockUrl) return cue;

                                    try {
                                        const imageResult = await generateImage(cue.description, envMode, visualStyle);
                                        let finalUrl: string;
                                        if (typeof imageResult === 'string' && imageResult.startsWith('http')) {
                                            finalUrl = imageResult;
                                        } else if (Buffer.isBuffer(imageResult)) {
                                            const uploadedUrl = await storageService.uploadImage(script.projectId, cue.id, imageResult);
                                            finalUrl = `${uploadedUrl}?t=${Date.now()}`;
                                        } else {
                                            throw new Error('Unexpected image result type');
                                        }
                                        return { ...cue, url: finalUrl, status: 'completed' as const };
                                    } catch (err: any) {
                                        return { ...cue, url: '', status: 'failed' as const, error: err.message };
                                    }
                                }));

                                updatedCues.push(...batchResults as VisualCue[]);
                                completedCues += batchResults.length;

                                // Update progress after batch
                                const currentProgress = Math.round((completedCues / totalCues) * 100);
                                updatedSections[sectionIndex] = { ...section, visualCues: updatedCues };
                                await updateScript(scriptId, { sections: updatedSections });
                                await updateProject(projectId, {
                                    mediaProgress: currentProgress,
                                    mediaMessage: `Turbo Synthesis: ${completedCues}/${totalCues} painted...`
                                } as any);

                                if (i + batchSize < sectionCues.length) {
                                    const delay = performance.imageSynthesisDelay || 2000;
                                    await new Promise(resolve => setTimeout(resolve, delay));
                                }
                            }
                        } else {
                            // Sequential processing with rate limiting for real AI
                            console.log(`[Media API] Using SEQUENTIAL image generation (Delay: ${performance.imageSynthesisDelay}ms)`);
                            for (let i = 0; i < sectionCues.length; i++) {
                                const cue = sectionCues[i];
                                const isMockUrl = cue.url && cue.url.includes('images.unsplash.com');

                                if (cue.url && !isMockUrl) {
                                    // Already has a real URL, skip
                                    updatedCues.push(cue);
                                    completedCues++;
                                    continue;
                                }

                                console.log(`[Media API] Generating image ${i + 1}/${sectionCues.length} for cue: ${cue.description.substring(0, 30)}... (Style: ${visualStyle})`);

                                try {
                                    const imageResult = await generateImage(cue.description, envMode, visualStyle);
                                    let finalUrl: string;
                                    if (typeof imageResult === 'string' && imageResult.startsWith('http')) {
                                        finalUrl = imageResult;
                                    } else if (Buffer.isBuffer(imageResult)) {
                                        const uploadedUrl = await storageService.uploadImage(script.projectId, cue.id, imageResult);
                                        finalUrl = `${uploadedUrl}?t=${Date.now()}`;
                                    } else {
                                        throw new Error('Unexpected image result type');
                                    }

                                    updatedCues.push({ ...cue, url: finalUrl, status: 'completed' as const });
                                    completedCues++;

                                    // CHECK FOR CANCELLATION (Every image - Real AI Mode)
                                    const currentProject = await getProject(projectId);
                                    if (!currentProject || currentProject.status !== 'generating_media') {
                                        console.log('[Media API] Process cancelled by user request (Real Mode).');
                                        return; // EXIT THE PROCESS
                                    }

                                    // Incremental Update
                                    const currentProgress = Math.round((completedCues / totalCues) * 100);
                                    const truncatedDesc = cue.description.length > 40 ? cue.description.substring(0, 40) + '...' : cue.description;
                                    updatedSections[sectionIndex] = { ...section, visualCues: updatedCues };
                                    await updateScript(scriptId, { sections: updatedSections });
                                    await updateProject(projectId, {
                                        mediaProgress: currentProgress,
                                        mediaMessage: `Painting scene ${completedCues} of ${totalCues}: "${truncatedDesc}"`
                                    } as any);

                                    // Add delay between requests
                                    if (i < sectionCues.length - 1) {
                                        const delay = performance.imageSynthesisDelay || 12000;
                                        const jitter = performance.mode === 'turbo' ? 500 : 2000;
                                        const finalDelay = delay + (Math.random() * jitter);

                                        if (finalDelay > 1000) {
                                            await updateProject(projectId, { mediaMessage: `Pacing (${Math.round(finalDelay / 1000)}s)...` } as any);
                                            await new Promise(resolve => setTimeout(resolve, finalDelay));
                                        }
                                    }
                                } catch (error: any) {
                                    console.error(`[Media API] Image generation failed for cue ${i + 1}:`, error.message);
                                    completedCues++;
                                    updatedCues.push({ ...cue, url: '', status: 'failed' as const, error: error.message });
                                    updatedSections[sectionIndex] = { ...section, visualCues: updatedCues };
                                    await updateScript(scriptId, { sections: updatedSections });
                                }
                            }
                        }
                    } else {
                        // Parallel processing for mock mode (fast, no quota limits)
                        console.log(`[Media API] Using PARALLEL image generation (mock mode)`);
                        updatedCues = await Promise.all(sectionCues.map(async (cue: any) => {
                            const isMockUrl = cue.url && cue.url.includes('images.unsplash.com');
                            if (cue.url && !isMockUrl) return cue;
                            console.log(`[Media API] Generating image for cue: ${cue.description.substring(0, 30)}... (Style: ${visualStyle}, model: ${config.ai.model})`);

                            // Mock progress update for parallel mode (optional, might be too fast to see)
                            const truncatedDesc = cue.description.length > 40 ? cue.description.substring(0, 40) + '...' : cue.description;
                            await updateProject(projectId, {
                                mediaMessage: `Quick Painting: "${truncatedDesc}"`
                            } as any);
                            try {
                                const imageResult = await generateImage(cue.description, envMode, visualStyle);
                                let finalUrl = '';
                                if (typeof imageResult === 'string' && imageResult.startsWith('http')) {
                                    finalUrl = imageResult;
                                } else if (Buffer.isBuffer(imageResult)) {
                                    const uploadedUrl = await storageService.uploadImage(
                                        script.projectId,
                                        cue.id,
                                        imageResult
                                    );
                                    finalUrl = `${uploadedUrl}?t=${Date.now()}`;
                                } else {
                                    throw new Error('Unexpected image result type');
                                }
                                return { ...cue, url: finalUrl, status: 'completed' as const };
                            } catch (error: any) {
                                console.error(`[Media API] Image generation failed:`, error.message);
                                // Clear URL on failure for consistency
                                return { ...cue, url: '', status: 'failed' as const, error: error.message };
                            }
                        }));

                        // CHECK FOR CANCELLATION (After section parallel batch)
                        const currentProject = await getProject(projectId);
                        if (!currentProject || currentProject.status !== 'generating_media') {
                            console.log('[Media API] Process cancelled by user request (Mock Mode).');
                            return; // EXIT THE PROCESS
                        }

                        completedCues += updatedCues.length;
                    }

                    updatedSections[sectionIndex] = { ...section, visualCues: updatedCues };

                    // Add a small delay between sections in real mode too, to be extra safe
                    if (config.ai.model !== 'mock' && sectionIndex < updatedSections.length - 1) {
                        const sectionDelay = performance.mode === 'turbo' ? 2000 : 12000;
                        if (sectionDelay > 0) {
                            await updateProject(projectId, { mediaMessage: `Section break (${Math.round(sectionDelay / 1000)}s)...` } as any);
                            await new Promise(resolve => setTimeout(resolve, sectionDelay));
                        }
                    }
                }

                // Final Update
                await updateProject(projectId, {
                    status: 'assembling',
                    mediaProgress: 100,
                    mediaMessage: 'Gallery complete!'
                } as any);
                console.log(`[Media API] Background synthesis SUCCESS for: ${projectId}`);

            } catch (backgroundError: any) {
                console.error('[Media API] Background synthesis failed:', backgroundError);
                await updateProject(projectId, {
                    status: 'scripting', // Revert to scripting or a failed state
                    mediaMessage: `Synthesis failed: ${backgroundError.message}`
                } as any);
            }
        };

        // Start the background process WITHOUT awaiting it
        processMedia();

        return NextResponse.json({
            success: true,
            message: 'Synthesis started in background'
        });

    } catch (error: any) {
        console.error('[Media API] Fatal initialization error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
