import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getConfig, EnvironmentMode } from '@/lib/config/environment';
import { generateVisualCues, generateImage } from '@/lib/services/ai';
import { storageService } from '@/lib/services/storage';
import { getScript, updateScript, updateProject } from '@/lib/services/firestore-admin';
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

        // 1. Get Script Details
        const script = await getScript(scriptId);
        if (!script) {
            return NextResponse.json({ error: 'Script not found' }, { status: 404 });
        }

        // 2. Initial Setup and Status Update
        console.log(`[Media API] Triggering background media generation for script: ${scriptId}`);

        // Set status and reset progress immediately so UI can react
        await updateProject(projectId, {
            status: 'generating_media',
            mediaProgress: 0,
            mediaMessage: 'Initializing Art Factory...'
        } as any);

        const cookieStore = await cookies();
        const envMode = cookieStore.get('x-env-mode')?.value as EnvironmentMode;
        const config = getConfig(envMode);

        // Define the background process
        const processMedia = async () => {
            try {
                // Count total cues for progress tracking
                let totalCues = 0;
                for (const section of script.sections) {
                    totalCues += (section.visualCues?.length || 4);
                }
                let completedCues = 0;

                // Process each section sequentially
                const updatedSections: any[] = [...script.sections];
                for (let sectionIndex = 0; sectionIndex < updatedSections.length; sectionIndex++) {
                    const section = updatedSections[sectionIndex];
                    let sectionCues = section.visualCues || [];

                    // In DEV/mock mode, we regenerate cues to ensure variety
                    // In STAGING/PROD with real models, we only generate if missing
                    const shouldRegenerateCues = (sectionCues.length === 0) || (config.ai.model === 'mock');

                    if (shouldRegenerateCues) {
                        console.log(`[Media API] ${config.ai.model === 'mock' ? 'MOCK MODE: Forcing' : 'Generating'} cues for section: ${section.title}`);
                        const rawCues = await generateVisualCues(section.title, section.content, envMode);
                        sectionCues = rawCues.map((c: any) => ({
                            ...c,
                            id: Math.random().toString(36).substr(2, 9),
                            status: 'pending' as const
                        }));
                    }

                    // Generate Images for each cue
                    const isRealMode = config.ai.model !== 'mock';
                    let updatedCues: VisualCue[] = [];

                    if (isRealMode) {
                        // Sequential processing with rate limiting for real AI
                        console.log(`[Media API] Using SEQUENTIAL image generation (rate limited for quota)`);
                        for (let i = 0; i < sectionCues.length; i++) {
                            const cue = sectionCues[i];
                            const isMockUrl = cue.url && cue.url.includes('images.unsplash.com');

                            if (cue.url && !isMockUrl) {
                                // Already has a real URL, skip
                                updatedCues.push(cue);
                                completedCues++;
                                continue;
                            }

                            console.log(`[Media API] Generating image ${i + 1}/${sectionCues.length} for cue: ${cue.description.substring(0, 30)}... (envMode: ${envMode}, model: ${config.ai.model})`);

                            try {
                                const imageResult = await generateImage(cue.description, envMode);
                                let finalUrl: string;
                                if (typeof imageResult === 'string' && imageResult.startsWith('http')) {
                                    finalUrl = imageResult;
                                } else if (Buffer.isBuffer(imageResult)) {
                                    const uploadedUrl = await storageService.uploadImage(script.projectId, cue.id, imageResult);
                                    finalUrl = uploadedUrl;
                                } else {
                                    throw new Error('Unexpected image result type');
                                }

                                updatedCues.push({ ...cue, url: finalUrl, status: 'completed' as const });
                                completedCues++;

                                // Incremental Update
                                const currentProgress = Math.round((completedCues / totalCues) * 100);
                                updatedSections[sectionIndex] = { ...section, visualCues: updatedCues };
                                await updateScript(scriptId, { sections: updatedSections });
                                await updateProject(projectId, {
                                    mediaProgress: currentProgress,
                                    mediaMessage: `Painting scene ${completedCues} of ${totalCues}...`
                                } as any);

                                // Add delay between requests (12 seconds + jitter = ~5 requests per minute max)
                                if (i < sectionCues.length - 1) {
                                    const delay = 12000 + (Math.random() * 2000);
                                    await updateProject(projectId, { mediaMessage: `Safety pause (${Math.round(delay / 1000)}s)...` } as any);
                                    console.log(`[Media API] Waiting ${Math.round(delay / 1000)} seconds before next image generation...`);
                                    await new Promise(resolve => setTimeout(resolve, delay));
                                }
                            } catch (error: any) {
                                console.error(`[Media API] Image generation failed for cue ${i + 1}:`, error.message);
                                completedCues++;
                                updatedCues.push({ ...cue, url: '', status: 'failed' as const, error: error.message });
                                updatedSections[sectionIndex] = { ...section, visualCues: updatedCues };
                                await updateScript(scriptId, { sections: updatedSections });
                            }
                        }
                    } else {
                        // Parallel processing for mock mode (fast, no quota limits)
                        console.log(`[Media API] Using PARALLEL image generation (mock mode)`);
                        updatedCues = await Promise.all(sectionCues.map(async (cue: any) => {
                            const isMockUrl = cue.url && cue.url.includes('images.unsplash.com');
                            if (cue.url && !isMockUrl) return cue;
                            console.log(`[Media API] Generating image for cue: ${cue.description.substring(0, 30)}... (envMode: ${envMode}, model: ${config.ai.model})`);
                            try {
                                const imageResult = await generateImage(cue.description, envMode);
                                let finalUrl = '';
                                if (typeof imageResult === 'string' && imageResult.startsWith('http')) {
                                    finalUrl = imageResult;
                                } else if (Buffer.isBuffer(imageResult)) {
                                    const uploadedUrl = await storageService.uploadImage(
                                        script.projectId,
                                        cue.id,
                                        imageResult
                                    );
                                    finalUrl = uploadedUrl;
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
                        completedCues += updatedCues.length;
                    }

                    updatedSections[sectionIndex] = { ...section, visualCues: updatedCues };

                    // Add a small delay between sections in real mode too, to be extra safe
                    if (config.ai.model !== 'mock' && sectionIndex < updatedSections.length - 1) {
                        const sectionDelay = 12000 + (Math.random() * 2000);
                        await updateProject(projectId, { mediaMessage: `Pacing Art Factory (${Math.round(sectionDelay / 1000)}s)...` } as any);
                        console.log(`[Media API] Waiting ${Math.round(sectionDelay / 1000)} seconds before processing next section...`);
                        await new Promise(resolve => setTimeout(resolve, sectionDelay));
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
