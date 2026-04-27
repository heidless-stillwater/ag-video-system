import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getConfig, EnvironmentMode, getEnvironmentMode } from '@/lib/config/environment';
import { generateImage } from '@/lib/services/ai';
import { storageService } from '@/lib/services/storage';
import { getScript, updateScript, getProject } from '@/lib/services/firestore-admin';
import { mediaLibraryServerService } from '@/lib/services/media-library-server';
import { PromptToolBridgeService } from '@/lib/services/prompttool-bridge';
import { v4 as uuidv4 } from 'uuid';

/**
 * API Route for regenerating a single visual cue image.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;

    try {
        const { scriptId, sectionId, cueId, prompt } = await req.json();

        if (!scriptId || !sectionId || !cueId || !prompt) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // 1. Get Script Details
        const script = await getScript(scriptId);
        if (!script) {
            return NextResponse.json({ error: 'Script not found' }, { status: 404 });
        }

        // 2. Identify Environment Mode
        const cookieStore = await cookies();
        const envMode = (cookieStore.get('x-env-mode')?.value as EnvironmentMode) || getEnvironmentMode();

        // 2b. Get Project for Visual Style
        const project = await getProject(projectId);
        const visualStyle = project?.visualStyle || 'cinematic';

        console.log(`[Media Regeneration] Regenerating cue ${cueId} for section ${sectionId} (env: ${envMode}, style: ${visualStyle})`);

        // 3. Generate Image with project's full visual configuration
        const visualConfig = {
            style: project?.visualStyle || 'cinematic',
            aspectRatio: project?.aspectRatio || '16:9',
            palette: project?.palette,
            motionIntensity: project?.motionIntensity,
            atmosphericCues: project?.atmosphericCues,
            engine: project?.synthesisEngine || 'nanobanana-2',
            userId: project?.userId,
            projectId,
            sectionId
        };

        const imageResult = await generateImage(prompt, envMode, visualStyle, visualConfig);
        let finalUrl: string;

        if (typeof imageResult === 'string' && imageResult.startsWith('http')) {
            finalUrl = imageResult;
        } else if (Buffer.isBuffer(imageResult)) {
            // 4. Upload to Storage
            finalUrl = await storageService.uploadImage(projectId, cueId, imageResult);
            // Append timestamp to force cache bust on client side
            finalUrl += `?t=${Date.now()}`;
        } else {
            throw new Error('Unexpected image result type from AI service');
        }

        // 4b. AUTO-PUBLISH (Unified Logging)
        try {
            if (project?.userId) {
                await mediaLibraryServerService.logGeneratedAsset({
                    userId: project.userId,
                    type: 'image',
                    url: finalUrl,
                    prompt: prompt,
                    source: 'video-system',
                    projectId,
                    sectionId,
                    metadata: {
                        aspectRatio: project.aspectRatio,
                        style: visualStyle,
                        engine: project.synthesisEngine,
                        isRegeneration: true
                    }
                });

                await PromptToolBridgeService.saveImage(project.userId, {
                    userId: project.userId,
                    prompt: prompt,
                    imageUrl: finalUrl,
                    storagePath: `regenerated/${uuidv4()}.jpg`,
                    creditsCost: 0,
                    downloadCount: 0,
                    settings: {
                        modality: 'image',
                        quality: 'standard',
                        aspectRatio: (project.aspectRatio as any) || '16:9',
                        prompt: prompt,
                        modelType: project.synthesisEngine === 'nanobanana-pro' ? 'pro' : 'standard'
                    }
                });
            }
        } catch (logErr) {
            console.warn('[Media Regeneration] Auto-publish failed:', logErr);
        }

        // 5. Update Script in Firestore
        const updatedSections = script.sections.map(s => {
            if (s.id === sectionId && s.visualCues) {
                return {
                    ...s,
                    visualCues: s.visualCues.map(c =>
                        c.id === cueId ? { ...c, url: finalUrl, status: 'ready' as const } : c
                    )
                };
            }
            return s;
        });

        await updateScript(scriptId, { sections: updatedSections });

        return NextResponse.json({
            success: true,
            url: finalUrl,
            scriptId
        });

    } catch (error: any) {
        console.error('[Media Regeneration API] Fatal error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
