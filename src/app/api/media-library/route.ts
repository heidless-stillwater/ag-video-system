import { NextRequest, NextResponse } from 'next/server';
import { mediaLibraryServerService } from '@/lib/services/media-library-server';
import { PromptToolBridgeService, PTImage } from '@/lib/services/prompttool-bridge';
import { MediaLibraryEntry, MediaAssetType } from '@/types';
import { auth } from '@/lib/firebase-admin';

/**
 * GET /api/media-library
 * 
 * Merges local VideoSystem library entries with the user's PromptTool image library.
 */
export async function GET(req: NextRequest) {
    try {
        const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
        if (!idToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const decodedToken = await auth.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type') || undefined;
        const mode = searchParams.get('mode');
        const includePromptTool = searchParams.get('includePromptTool') !== 'false';

        if (mode === 'community') {
            const result = await PromptToolBridgeService.getCommunityHighlights(type as any);
            const entries = (result.data || []).map((img: any) => mapPTImageToEntry(userId, img));
            return NextResponse.json({ success: true, data: entries });
        }

        // 1. Fetch local entries using SERVER SERVICE
        const localEntries = await mediaLibraryServerService.getUserEntries(userId, { type: type as any });

        // 2. Fetch PromptTool entries if requested
        let ptEntries: MediaLibraryEntry[] = [];
        if (includePromptTool && (!type || type === 'image')) {
            const ptResult = await PromptToolBridgeService.getImagesByUser(userId, 50);
            if (ptResult.success && ptResult.data) {
                // Deduplicate: Don't show PT images that were already imported (logically replaced by local entry)
                const importedPTIds = new Set(localEntries
                    .filter(e => e.metadata?.ptOriginId)
                    .map(e => e.metadata?.ptOriginId)
                );
                
                ptEntries = ptResult.data
                    .filter(img => !importedPTIds.has(img.id))
                    .map(img => mapPTImageToEntry(userId, img));
            }
        }

        // 3. Merge and Sort
        const allEntries = [...localEntries, ...ptEntries].sort((a, b) => {
            const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
            const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
            return dateB.getTime() - dateA.getTime();
        });

        return NextResponse.json({ 
            success: true, 
            data: allEntries,
            count: allEntries.length 
        });

    } catch (err: any) {
        console.error('[API] GET /api/media-library error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * POST /api/media-library
 * 
 * Manually add a local entry to the media library.
 */
export async function POST(req: NextRequest) {
    try {
        const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
        if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const decodedToken = await auth.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const body = await req.json();
        const entryData: Omit<MediaLibraryEntry, 'id' | 'createdAt' | 'updatedAt'> = {
            ...body,
            userId,
            createdAt: new Date(),
            updatedAt: new Date(),
            isFavorite: body.isFavorite || false,
            tags: body.tags || [],
            source: body.source || 'manual-upload'
        };

        const id = await mediaLibraryServerService.addEntry(entryData);
        return NextResponse.json({ success: true, data: { id, ...entryData } });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * Maps a PromptTool PTImage to a VideoSystem MediaLibraryEntry.
 */
function mapPTImageToEntry(userId: string, img: PTImage): MediaLibraryEntry {
    return {
        id: `pt-${img.id}`, // Prefix to avoid collisions
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
        tags: img.tags || [],
        isFavorite: false,
        createdAt: img.createdAt.toDate(),
        updatedAt: img.createdAt.toDate()
    };
}
