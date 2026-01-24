import { NextRequest, NextResponse } from 'next/server';
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

        console.log(`[Media API] Starting media generation for script: ${scriptId}`);

        // 2. Process each section
        const updatedSections = await Promise.all(script.sections.map(async (section: any) => {
            const isDev = process.env.NEXT_PUBLIC_ENV_MODE === 'DEV' || process.env.NODE_ENV === 'development';
            let sectionCues = section.visualCues || [];
            
            // In DEV mode, we always regenerate cues to ensure the user gets the latest mock variety
            if (sectionCues.length === 0 || isDev) {
                console.log(`[Media API] ${isDev ? 'DEV MODE: Forcing' : 'Generating'} cues for section: ${section.title}`);
                const rawCues = await generateVisualCues(section.title, section.content);
                sectionCues = rawCues.map((c: any) => ({
                    ...c,
                    id: Math.random().toString(36).substr(2, 9),
                    status: 'pending' as const
                }));
            }

            // 2b. Generate Images for each cue
            const updatedCues = await Promise.all(sectionCues.map(async (cue: any) => {
                if (cue.url) return cue; // Already done

                console.log(`[Media API] Generating image for cue: ${cue.description.substring(0, 30)}...`);
                try {
                    const imageResult = await generateImage(cue.description);

                    let finalUrl: string;
                    if (typeof imageResult === 'string' && imageResult.startsWith('http')) {
                        // It's already a URL (e.g. mock or unsplash fallback)
                        finalUrl = imageResult;
                    } else if (Buffer.isBuffer(imageResult)) {
                        // It's a buffer (production Imagen result), upload to storage
                        const cueId = Math.random().toString(36).substr(2, 9);
                        finalUrl = await storageService.uploadImage(projectId, cueId, imageResult);
                    } else {
                        throw new Error('Unsupported image result format');
                    }

                    return { ...cue, url: finalUrl, status: 'ready' as const };
                } catch (err) {
                    console.error(`[Media API] Image generation failed for cue`, err);
                    return { ...cue, status: 'failed' as const };
                }
            }));

            return { ...section, visualCues: updatedCues };
        }));

        // 3. Update Script in Firestore
        await updateScript(scriptId, { sections: updatedSections });

        // 4. Update Project Status
        await updateProject(projectId, { status: 'generating_media' });

        return NextResponse.json({ success: true, sections: updatedSections });

    } catch (error: any) {
        console.error('[Media API] Fatal error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
