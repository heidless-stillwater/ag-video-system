import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getConfig, EnvironmentMode } from '@/lib/config/environment';
import { generateImage } from '@/lib/services/ai';
import { storageService } from '@/lib/services/storage';
import { getScript, updateScript, getProject } from '@/lib/services/firestore-admin';

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
        const envMode = cookieStore.get('x-env-mode')?.value as EnvironmentMode;

        // 2b. Get Project for Visual Style
        const project = await getProject(projectId);
        const visualStyle = project?.visualStyle || 'cinematic';

        console.log(`[Media Regeneration] Regenerating cue ${cueId} for section ${sectionId} (env: ${envMode}, style: ${visualStyle})`);

        // 3. Generate Image
        const imageResult = await generateImage(prompt, envMode, visualStyle);
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
