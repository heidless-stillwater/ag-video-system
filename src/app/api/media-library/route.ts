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
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type') || undefined;
        const mode = searchParams.get('mode');
        const includePromptTool = searchParams.get('includePromptTool') !== 'false';

        // PUBLIC MODES: Community Highlights do not require auth
        if (mode === 'community') {
            if (type === 'article') {
                const result = await PromptToolBridgeService.getCommunityResources();
                const entries = (result.data || []).map((res: any) => mapPTResourceToEntry('public-user', res));
                return NextResponse.json({ success: true, data: entries });
            }
            
            // Default to images (highlights)
            const result = await PromptToolBridgeService.getCommunityHighlights();
            const entries = (result.data || []).map((img: any) => mapPTImageToEntry('public-user', img));
            return NextResponse.json({ success: true, data: entries });
        }

        // PRIVATE MODE: Requires Auth
        const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
        if (!idToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const decodedToken = await auth.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        // 1. Fetch local entries using SERVER SERVICE
        const localEntries = await mediaLibraryServerService.getUserEntries(userId, { type: type as any });

        // 2. Fetch PromptTool entries if requested
        let ptEntries: MediaLibraryEntry[] = [];
        if (includePromptTool) {
            // A. Fetch Images (default for 'all' or explicit 'image')
            if (!type || type === 'image') {
                const ptResult = await PromptToolBridgeService.getImagesByUser(userId, 50);
                if (ptResult.success && ptResult.data) {
                    const importedPTIds = new Set(localEntries
                        .filter(e => e.metadata?.ptOriginId)
                        .map(e => e.metadata?.ptOriginId)
                    );
                    
                    const images = ptResult.data
                        .filter(img => !importedPTIds.has(img.id))
                        .map(img => mapPTImageToEntry(userId, img));
                    ptEntries = [...ptEntries, ...images];
                }
            }

            // B. Fetch Resources (default for 'all' or explicit 'article')
            if (!type || type === 'article') {
                const resResult = await PromptToolBridgeService.getUserResources(userId, 50);
                if (resResult.success && resResult.data) {
                    const importedResIds = new Set(localEntries
                        .filter(e => e.metadata?.ptOriginId)
                        .map(e => e.metadata?.ptOriginId)
                    );

                    const resources = resResult.data
                        .filter(res => !importedResIds.has(res.id))
                        .map(res => mapPTResourceToEntry(userId, res));
                    ptEntries = [...ptEntries, ...resources];
                }
            }
        }

        // 3. Deduplicate by Title (Bridge results often contain multiple drafts)
        const uniqueByTitle = new Map<string, MediaLibraryEntry>();
        
        // We iterate through allEntries and keep the first one 
        // because we'll sort them by date in the next step.
        // Actually, let's sort FIRST, then deduplicate to keep the NEWEST.
        
        const mergedEntries = [...localEntries, ...ptEntries].sort((a, b) => {
            const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
            const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
            return dateB.getTime() - dateA.getTime();
        });

        const finalEntries: MediaLibraryEntry[] = [];
        const seenTitles = new Set<string>();

        for (const entry of mergedEntries) {
            const title = entry.prompt || entry.metadata?.title || entry.id;
            if (!seenTitles.has(title)) {
                seenTitles.add(title);
                finalEntries.push(entry);
            }
        }

        return NextResponse.json({ 
            success: true, 
            data: finalEntries,
            count: finalEntries.length 
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

/**
 * Maps a PromptResources PTResource to a VideoSystem MediaLibraryEntry.
 */
function mapPTResourceToEntry(userId: string, res: any): MediaLibraryEntry {
    // Auto-generate YouTube thumbnail if possible
    let thumbUrl = res.thumbnailUrl;
    if (!thumbUrl && res.mediaFormat === 'youtube' && res.youtubeVideoId) {
        thumbUrl = `https://img.youtube.com/vi/${res.youtubeVideoId}/mqdefault.jpg`;
    }

    return {
        id: `res-${res.id}`,
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
            type: res.type,
            ptOriginId: res.id,
            database: '(default)'
        },
        tags: res.tags || ['imported-from-promptresources'],
        isFavorite: false,
        createdAt: res.createdAt.toDate(),
        updatedAt: res.updatedAt.toDate()
    };
}
