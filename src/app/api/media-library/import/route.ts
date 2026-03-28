import { NextRequest, NextResponse } from 'next/server';
import { mediaLibraryServerService } from '@/lib/services/media-library-server';
import { PromptToolBridgeService } from '@/lib/services/prompttool-bridge';
import { MediaLibraryEntry, MediaAssetType } from '@/types';
import { auth } from '@/lib/firebase-admin';

/**
 * POST /api/media-library/import
 * 
 * Takes a source image ID from PromptTool and imports it into VideoSystem's local media library.
 */
export async function POST(req: NextRequest) {
    try {
        const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
        if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const decodedToken = await auth.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const body = await req.json();
        const { ptImageId } = body;
        
        if (!ptImageId) return NextResponse.json({ error: 'PromptTool Image ID required' }, { status: 400 });

        // 1. Fetch from PromptTool
        const ptResult = await PromptToolBridgeService.getImageById(ptImageId);
        if (!ptResult.success || !ptResult.data) {
            return NextResponse.json({ error: ptResult.error || 'Source image not found in PromptTool' }, { status: 404 });
        }

        const img = ptResult.data;

        // 2. Prepare local entry
        const entry: Omit<MediaLibraryEntry, 'id' | 'createdAt' | 'updatedAt'> = {
            userId,
            type: (img.settings.modality as MediaAssetType) || 'image',
            source: 'prompt-tool',
            url: img.imageUrl,
            thumbnailUrl: img.imageUrl,
            prompt: img.prompt,
            projectId: img.promptSetID,
            sectionId: undefined,
            metadata: {
                aspectRatio: img.settings.aspectRatio,
                style: img.settings.promptSetName,
                engine: img.settings.modelType || 'standard',
                ptOriginId: img.id
            },
            tags: img.tags || ['imported-from-prompttool'],
            isFavorite: false,
        };

        // 3. Save to VideoSystem using SERVER SERVICE
        const entryId = await mediaLibraryServerService.addEntry(entry);

        return NextResponse.json({ 
            success: true, 
            data: { id: entryId, ...entry } 
        });

    } catch (err: any) {
        console.error('[API] POST /api/media-library/import error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
