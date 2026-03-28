import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/roleMiddleware';
import { PromptToolBridgeService } from '@/lib/services/prompttool-bridge';

export const runtime = 'nodejs';

/**
 * Ensures an image (either VideoSystem-generated or from PT Library)
 * is archived within the specified PromptTool project set.
 */
export async function POST(req: NextRequest) {
    const ctx = await verifyAuth(req);
    if (!ctx) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { imageUrl, prompt, settings, targetSetId, targetSetName, sourceImageId } = await req.json();

        if (!imageUrl || !prompt || !targetSetId || !targetSetName) {
            return NextResponse.json({ success: false, error: 'Missing archiving metadata' }, { status: 400 });
        }

        // 1. If we have a sourceImageId, try to CLONE it (covers library variations)
        if (sourceImageId) {
            console.log(`[Archive API] Cloning source image ${sourceImageId} to set ${targetSetId}`);
            const cloneResult = await PromptToolBridgeService.cloneImage(ctx.userId, sourceImageId, targetSetId, targetSetName);
            if (cloneResult.success) return NextResponse.json(cloneResult);
            // Fallthrough to saving as new image if clone fails (e.g. if source was deleted)
        }

        // 2. Otherwise, SAVE as a new image (covers VideoSystem-generated images)
        console.log(`[Archive API] Saving new image to PromptTool set ${targetSetId}`);
        const saveResult = await PromptToolBridgeService.saveImage(ctx.userId, {
            userId: ctx.userId,
            prompt,
            imageUrl,
            storagePath: '', // Will be handled by PromptTool if ever downloaded, or left empty for external
            creditsCost: 0,
            settings: {
                modality: 'image',
                quality: 'standard',
                aspectRatio: settings?.aspectRatio || '16:9',
                prompt,
                promptSetID: targetSetId,
                promptSetName: targetSetName,
                ...settings
            },
            promptSetID: targetSetId,
            promptSetName: targetSetName,
            downloadCount: 0,
            status: 'completed'
        });

        return NextResponse.json(saveResult);
    } catch (err: any) {
        console.error('[Archive API] Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
