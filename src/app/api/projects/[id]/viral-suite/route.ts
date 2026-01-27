import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getProject, getScript, updateProject } from '@/lib/services/firestore-admin';
import { generateThumbnailPrompt, generateImage, generateSEOMetadata } from '@/lib/services/ai';
import { storageService } from '@/lib/services/storage';
import { EnvironmentMode } from '@/lib/config/environment';

/**
 * API Route to generate "Viral Suite" assets (Thumbnail + SEO Metadata).
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

        // 1. Get Project and Script
        console.log(`[Viral Suite API] Fetching project ${projectId} and script ${scriptId}...`);
        const project = await getProject(projectId);
        const script = await getScript(scriptId);

        if (!project || !script) {
            console.error(`[Viral Suite API] Project or Script not found: project=${!!project}, script=${!!script}`);
            return NextResponse.json({ error: 'Project or Script not found' }, { status: 404 });
        }

        const cookieStore = await cookies();
        const envMode = (cookieStore.get('x-env-mode')?.value as EnvironmentMode) || 'DEV';

        console.log(`[Viral Suite API] Starting generation for project: ${projectId} in mode: ${envMode}`);

        // 2. Generate SEO Metadata (Gemini)
        console.log(`[Viral Suite API] Generating SEO Metadata...`);
        const seoMetadata = await generateSEOMetadata(script, envMode);
        console.log(`[Viral Suite API] SEO Metadata generated: ${seoMetadata.titles[0]}`);

        // 3. Generate Thumbnail Prompt (Gemini)
        console.log(`[Viral Suite API] Generating Thumbnail Prompt...`);
        const thumbPrompt = await generateThumbnailPrompt(script, envMode);
        console.log(`[Viral Suite API] Thumbnail Prompt: ${thumbPrompt.substring(0, 50)}...`);

        // 4. Generate Thumbnail Image (Imagen 3.0)
        let thumbnailUrl = project.thumbnailUrl || '';

        console.log(`[Viral Suite API] Generating Thumbnail Image...`);
        const imageResult = await generateImage(thumbPrompt, envMode);

        if (typeof imageResult === 'string' && imageResult.startsWith('http')) {
            console.log(`[Viral Suite API] Mock thumbnail generated: ${imageResult}`);
            thumbnailUrl = imageResult;
        } else if (Buffer.isBuffer(imageResult)) {
            console.log(`[Viral Suite API] Real thumbnail synthesized. Uploading to Storage...`);
            const fileName = `thumbnail_${Date.now()}`;
            try {
                const uploadedUrl = await storageService.uploadImage(projectId, fileName, imageResult);
                thumbnailUrl = uploadedUrl;
                console.log(`[Viral Suite API] Real thumbnail uploaded: ${thumbnailUrl}`);
            } catch (storageErr: any) {
                console.error(`[Viral Suite API] Storage upload failed:`, storageErr.message);
                // We can't proceed without a URL if it was a buffer
                throw new Error(`Failed to upload generated thumbnail: ${storageErr.message}`);
            }
        } else {
            console.error(`[Viral Suite API] Unexpected image generation result type: ${typeof imageResult}`);
        }

        // 5. Persist to Firestore
        console.log(`[Viral Suite API] Persisting to Firestore...`);
        await updateProject(projectId, {
            thumbnailUrl,
            seoMetadata: {
                ...seoMetadata,
                selectedTitle: seoMetadata.titles[0] // Default to first option
            }
        } as any);

        console.log(`[Viral Suite API] Generation SUCCESS for: ${projectId}`);

        return NextResponse.json({
            success: true,
            thumbnailUrl,
            seoMetadata
        });

    } catch (error: any) {
        console.error('[Viral Suite API] Fatal error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
