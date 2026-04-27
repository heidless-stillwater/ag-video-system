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
        const { ptImageId, ptResourceId } = body;
        
        if (!ptImageId && !ptResourceId) {
            return NextResponse.json({ error: 'Source ID (image or resource) required' }, { status: 400 });
        }

        let entry: Omit<MediaLibraryEntry, 'id' | 'createdAt' | 'updatedAt'>;

        if (ptImageId) {
            // --- Import IMAGE ---
            const ptResult = await PromptToolBridgeService.getImageById(ptImageId);
            if (!ptResult.success || !ptResult.data) {
                return NextResponse.json({ error: ptResult.error || 'Source image not found in PromptTool' }, { status: 404 });
            }

            const img = ptResult.data;
            entry = {
                userId,
                type: (img.settings.modality as MediaAssetType) || 'image',
                source: 'prompt-tool',
                url: img.imageUrl,
                thumbnailUrl: img.imageUrl,
                prompt: img.prompt,
                projectId: img.promptSetID,
                metadata: {
                    aspectRatio: img.settings.aspectRatio,
                    style: img.settings.promptSetName,
                    engine: img.settings.modelType || 'standard',
                    ptOriginId: img.id
                },
                tags: img.tags || ['imported-from-prompttool'],
                isFavorite: false,
            };
        } else {
            // --- Import RESOURCE ---
            const resResult = await PromptToolBridgeService.getResourceById(ptResourceId);
            if (!resResult.success || !resResult.data) {
                return NextResponse.json({ error: resResult.error || 'Source resource not found' }, { status: 404 });
            }

            const res = resResult.data;
            let thumbUrl = res.thumbnailUrl;
            if (!thumbUrl && res.mediaFormat === 'youtube' && res.youtubeVideoId) {
                thumbUrl = `https://img.youtube.com/vi/${res.youtubeVideoId}/mqdefault.jpg`;
            }

            entry = {
                userId,
                type: 'article',
                source: 'prompt-tool',
                url: res.url || '',
                thumbnailUrl: thumbUrl || '/placeholders/doc-thumbnail.svg',
                prompt: res.title,
                projectId: res.id,
                metadata: {
                    title: res.title,
                    description: res.description,
                    ptOriginId: res.id
                },
                tags: res.tags || ['imported-from-promptresources'],
                isFavorite: false,
            };
        }

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
