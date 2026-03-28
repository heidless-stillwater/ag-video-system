import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getConfig, EnvironmentMode, getEnvironmentMode } from '@/lib/config/environment';
import { generateVisualCues, generateImage } from '@/lib/services/ai';
import { storageService } from '@/lib/services/storage';
import { getScript, updateScript, updateProject, getProject } from '@/lib/services/firestore-admin';
import { resourceGovernor } from '@/lib/services/resource-governor';
import { mediaLibraryServerService } from '@/lib/services/media-library-server';
import { PromptToolBridgeService } from '@/lib/services/prompttool-bridge';
import { VisualCue } from '@/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * API Route for generating visual assets (cues and images) for a script.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;

    try {
        const { scriptId, config: visualConfig } = await req.json();

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

        // Create a merged configuration for the generation process
        const runtimeConfig = {
            style: visualConfig?.style || project.visualStyle || 'cinematic',
            aspectRatio: visualConfig?.aspectRatio || project.aspectRatio || '16:9',
            palette: visualConfig?.palette || project.palette,
            motionIntensity: visualConfig?.motionIntensity || project.motionIntensity,
            atmosphericCues: visualConfig?.atmosphericCues || project.atmosphericCues,
            engine: visualConfig?.engine || project.synthesisEngine || 'nanobanana-2',
            userId: project.userId,
            projectId: project.id
        };

        // Apply new visual identity configuration if provided
        if (visualConfig) {
            console.log(`[Media API] Applying new Visual Identity Config (Engine: ${runtimeConfig.engine}):`, visualConfig);
            await updateProject(projectId, {
                visualStyle: runtimeConfig.style,
                aspectRatio: runtimeConfig.aspectRatio,
                palette: runtimeConfig.palette,
                motionIntensity: runtimeConfig.motionIntensity,
                atmosphericCues: runtimeConfig.atmosphericCues,
                synthesisEngine: runtimeConfig.engine,
                imagesPerSection: visualConfig?.imagesPerSection || 4,
                optimizationStrategy: visualConfig?.optimizationStrategy || 'thematic'
            } as any);
        }

        const visualStyle = runtimeConfig.style;
        const atmosphericCues = runtimeConfig.atmosphericCues || '';

        // 1b. Credit Check & Deduction
        try {
            const { creditService } = await import('@/lib/services/credit-service');
            const MEDIA_COST = 1; // 1 credit for full media synthesis
            await creditService.deductCredits(project.userId, MEDIA_COST);
            console.log(`[Media API] Deducted ${MEDIA_COST} credit from user: ${project.userId}`);
        } catch (creditError: any) {
            console.warn(`[Media API] Credit Check Failed: ${creditError.message}`);
            return NextResponse.json({
                error: creditError.message,
                requiresCredits: true
            }, { status: 402 }); // Payment Required
        }

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
            // Helper for robust Firestore updates
            const retryUpdateScript = async (scriptId: string, data: any, retries = 3) => {
                for (let i = 0; i < retries; i++) {
                    try {
                        await updateScript(scriptId, data);
                        return;
                    } catch (e) {
                        console.warn(`[Media API] Script update failed (attempt ${i + 1}):`, e);
                        if (i === retries - 1) throw e;
                        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
                    }
                }
            };

            try {
                // Count total cues for progress tracking
                // Step 1: CLEAR CANVAS (The user's requested "delete images" step)
                // This ensures the UI updates to show "empty" state before generating new ones.
                const clearedSections: any[] = JSON.parse(JSON.stringify(script.sections));
                let totalCues = 0;
                const targetCuesPerSection = visualConfig?.imagesPerSection || 4;

                for (const section of clearedSections) {
                    totalCues += targetCuesPerSection;
                    // Wipe cues entirely to force "Regenerate Cues" logic to run with NEW style
                    section.visualCues = [];
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
                        const rawCues = await generateVisualCues(
                            section.title, 
                            section.content, 
                            envMode, 
                            visualStyle, 
                            atmosphericCues,
                            visualConfig?.imagesPerSection,
                            visualConfig?.optimizationStrategy
                        );
                        sectionCues = rawCues.map((c: any) => ({
                            ...c,
                            id: Math.random().toString(36).substr(2, 9),
                            status: 'pending' as const
                        }));

                        // SAVE CUES IMMEDIATELY so UI shows them as pending
                        updatedSections[sectionIndex] = { ...section, visualCues: sectionCues };
                        await updateScript(scriptId, { sections: updatedSections });
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
                            // Sequential processing inside batch to eliminate parallel execution
                            const batchResults = [];
                            for (const cue of currentBatch) {
                                const isMockUrl = cue.url && cue.url.includes('images.unsplash.com');
                                if (cue.url && !isMockUrl) {
                                    batchResults.push(cue);
                                    continue;
                                }

                                try {
                                    const imageResult = await generateImage(cue.description, envMode, visualStyle, {
                                        ...runtimeConfig,
                                        sectionId: section.id
                                    });
                                    let finalUrl: string;
                                    if (typeof imageResult === 'string' && imageResult.startsWith('http')) {
                                        finalUrl = imageResult;
                                    } else if (Buffer.isBuffer(imageResult)) {
                                        const uploadedUrl = await storageService.uploadImage(script.projectId, cue.id, imageResult);
                                        finalUrl = `${uploadedUrl}?t=${Date.now()}`;
                                    } else {
                                        throw new Error('Unexpected image result type');
                                    }
                                    batchResults.push({ ...cue, url: finalUrl, status: 'completed' as const });
                                    
                                    // ── AUTO-PUBLISH (Unified Logging) ──
                                    try {
                                        await mediaLibraryServerService.logGeneratedAsset({
                                            userId: project.userId,
                                            type: 'image',
                                            url: finalUrl,
                                            prompt: cue.description,
                                            source: 'video-system',
                                            projectId: project.id,
                                            sectionId: section.id,
                                            metadata: {
                                                aspectRatio: runtimeConfig.aspectRatio,
                                                style: visualStyle,
                                                engine: runtimeConfig.engine
                                            }
                                        });

                                        await PromptToolBridgeService.saveImage(project.userId, {
                                            userId: project.userId,
                                            prompt: cue.description,
                                            imageUrl: finalUrl,
                                            storagePath: `generated/${uuidv4()}.jpg`,
                                            creditsCost: 0, 
                                            downloadCount: 0,
                                            settings: {
                                                modality: 'image',
                                                quality: 'standard',
                                                aspectRatio: (runtimeConfig.aspectRatio as any) || '16:9',
                                                prompt: cue.description,
                                                modelType: runtimeConfig.engine === 'nanobanana-pro' ? 'pro' : 'standard'
                                            }
                                        });
                                    } catch (logErr) {
                                        console.warn('[Media API] Auto-publish failed (Batch):', logErr);
                                    }
                                } catch (err: any) {
                                    batchResults.push({ ...cue, url: '', status: 'failed' as const, error: err.message });
                                }
                            }

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
                                    const imageResult = await generateImage(cue.description, envMode, visualStyle, runtimeConfig);
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

                                    // ── AUTO-PUBLISH (Unified Logging) ──
                                    try {
                                        await mediaLibraryServerService.logGeneratedAsset({
                                            userId: project.userId,
                                            type: 'image',
                                            url: finalUrl,
                                            prompt: cue.description,
                                            source: 'video-system',
                                            projectId: project.id,
                                            sectionId: section.id,
                                            metadata: {
                                                aspectRatio: runtimeConfig.aspectRatio,
                                                style: visualStyle,
                                                engine: runtimeConfig.engine
                                            }
                                        });

                                        await PromptToolBridgeService.saveImage(project.userId, {
                                            userId: project.userId,
                                            prompt: cue.description,
                                            imageUrl: finalUrl,
                                            storagePath: `generated/${uuidv4()}.jpg`,
                                            creditsCost: 0, 
                                            downloadCount: 0,
                                            settings: {
                                                modality: 'image',
                                                quality: 'standard',
                                                aspectRatio: (runtimeConfig.aspectRatio as any) || '16:9',
                                                prompt: cue.description,
                                                modelType: runtimeConfig.engine === 'nanobanana-pro' ? 'pro' : 'standard'
                                            }
                                        });
                                    } catch (logErr) {
                                        console.warn('[Media API] Auto-publish failed (Sequential):', logErr);
                                    }

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
                                    await retryUpdateScript(scriptId, { sections: updatedSections });
                                }
                            }
                        }
                    } else {
                        // SEQUENTIAL PROCESSING (Even in Mock Mode) to prevent race conditions
                        console.log(`[Media API] Using SEQUENTIAL image generation (mock mode compatible)`);
                        updatedCues = [];
                        for (const cue of sectionCues) {
                            // ALWAYS REGENERATE if failed or missing URL
                            const hasValidUrl = cue.url && cue.url.length > 10;
                            const shouldRegenerate = !hasValidUrl || cue.status === 'failed';

                            if (!shouldRegenerate) {
                                // Has valid URL and not failed - keep it
                                console.log(`[Media API] Skipping cue (already valid): ${cue.description.substring(0, 30)}...`);
                                updatedCues.push({ ...cue, status: 'completed' as const });
                                continue;
                            }

                            console.log(`[Media API] Generating image for cue: ${cue.description.substring(0, 30)}... (Reason: ${!hasValidUrl ? 'missing URL' : 'failed status'})`);

                            // Mock progress update
                            const truncatedDesc = cue.description.length > 40 ? cue.description.substring(0, 40) + '...' : cue.description;
                            await updateProject(projectId, {
                                mediaMessage: `Quick Painting: "${truncatedDesc}"`
                            } as any).catch(() => { }); // Ignore project update errors to keep moving

                            try {
                                const imageResult = await generateImage(cue.description, envMode, visualStyle, {
                                    ...runtimeConfig,
                                    sectionId: section.id
                                });
                                let finalUrl = '';
                                if (typeof imageResult === 'string' && imageResult.startsWith('http')) {
                                    finalUrl = imageResult;
                                } else if (Buffer.isBuffer(imageResult)) {
                                    const uploadedUrl = await storageService.uploadImage(script.projectId, cue.id, imageResult);
                                    finalUrl = `${uploadedUrl}?t=${Date.now()}`;
                                } else {
                                    throw new Error('Unexpected image result type');
                                }
                                // Omit error field for successful cues (Firestore doesn't accept undefined)
                                const { error, ...cueWithoutError } = cue;
                                updatedCues.push({ ...cueWithoutError, url: finalUrl, status: 'completed' as const });

                                // ── AUTO-PUBLISH (Unified Logging - MOCK MODE) ──
                                try {
                                    await mediaLibraryServerService.logGeneratedAsset({
                                        userId: project.userId,
                                        type: 'image',
                                        url: finalUrl,
                                        prompt: cue.description,
                                        source: 'video-system',
                                        projectId: project.id,
                                        sectionId: section.id,
                                        metadata: {
                                            aspectRatio: runtimeConfig.aspectRatio,
                                            style: visualStyle,
                                            engine: 'mock'
                                        }
                                    });
                                } catch (logErr) {
                                    console.warn('[Media API] Auto-publish failed (Mock):', logErr);
                                }
                            } catch (error: any) {
                                console.error(`[Media API] ❌ Image generation FAILED for cue:`, {
                                    description: cue.description,
                                    id: cue.id,
                                    error: error.message,
                                    stack: error.stack
                                });
                                updatedCues.push({ ...cue, url: '', status: 'failed' as const, error: error.message || 'Unknown error' });
                            }
                        }

                        // CHECK FOR CANCELLATION
                        const currentProject = await getProject(projectId);
                        if (!currentProject || currentProject.status !== 'generating_media') {
                            console.log('[Media API] Process cancelled by user request (Mock Mode).');
                            return;
                        }

                        completedCues += updatedCues.length;

                        // Update progress after batch with RETRY
                        const currentProgress = Math.round((completedCues / totalCues) * 100);
                        updatedSections[sectionIndex] = { ...section, visualCues: updatedCues };

                        await retryUpdateScript(scriptId, { sections: updatedSections });

                        await updateProject(projectId, {
                            mediaProgress: currentProgress,
                            mediaMessage: `Section ${sectionIndex + 1} visualized.`
                        } as any).catch(console.warn);
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
