/**
 * PromptToolBridgeService
 *
 * Server-side service (Admin SDK) that gives VideoSystem read access to
 * the PromptTool image / media library stored in `prompttool-db-0`.
 *
 * This implements Phase 3 of the RES_TOOL_1 cross-app integration plan.
 *
 * Collections accessed (all in prompttool-db-0):
 *   - `images`          GeneratedImage records
 *   - `communityEntries` Published/community images
 *   - `users`           PromptTool user profiles (for authorship info)
 *
 * Usage: Server-side only (API Routes, Server Components).
 *        Never import this in Client Components.
 */

import { promptToolDb } from '@/lib/firebase-prompttool-db';
import { resourcesDb } from '@/lib/firebase-resources-db';
import { FieldPath } from 'firebase-admin/firestore';

// ── Types mirrored from PromptTool's types.ts ──────────────────────────────

export type PTAspectRatio = '1:1' | '4:3' | '16:9' | '9:16' | '3:4';
export type PTImageQuality = 'standard' | 'high' | 'ultra';
export type PTMediaModality = 'image' | 'video';

export interface PTGenerationSettings {
    modality: PTMediaModality;
    quality: PTImageQuality | 'video';
    aspectRatio: PTAspectRatio;
    prompt: string;
    negativePrompt?: string;
    seed?: number;
    guidanceScale?: number;
    modelType?: 'standard' | 'pro';
    promptSetID?: string;
    promptSetName?: string;
    compiledPrompt?: string;
}

export interface PTImage {
    id: string;
    userId: string;
    prompt: string;
    settings: PTGenerationSettings;
    imageUrl: string;
    videoUrl?: string;
    storagePath: string;
    creditsCost: number;
    createdAt: FirebaseFirestore.Timestamp;
    downloadCount: number;
    collectionIds?: string[];
    publishedToCommunity?: boolean;
    communityEntryId?: string;
    tags?: string[];
    duration?: number;
    isExemplar?: boolean;
    status?: 'draft' | 'completed';
    promptSetName?: string;
    promptSetID?: string;
}

export interface PTUserProfile {
    uid: string;
    email: string;
    displayName: string | null;
    photoURL: string | null;
    role: 'member' | 'admin' | 'su';
    subscription: 'free' | 'standard' | 'pro';
}

// ── Resource Types (Mirrored from PromptResources) ─────────────────────────

export type PTResourceType = 'video' | 'article' | 'tool' | 'course' | 'book' | 'tutorial' | 'other';
export type PTMediaFormat = 'youtube' | 'webpage' | 'pdf' | 'image' | 'audio' | 'other';
export type PTResourceStatus = 'published' | 'draft' | 'pending' | 'suggested';

export interface PTResource {
    id: string;
    title: string;
    description: string;
    type: PTResourceType;
    mediaFormat: PTMediaFormat;
    url: string;
    thumbnailUrl?: string;
    categories: string[];
    tags: string[];
    addedBy: string; // The UID of the user who added it
    createdAt: FirebaseFirestore.Timestamp;
    updatedAt: FirebaseFirestore.Timestamp;
    status: PTResourceStatus;
    isFavorite?: boolean;
    youtubeVideoId?: string;
}

// ── Query option types ─────────────────────────────────────────────────────

export interface PTImageSearchOptions {
    /** Filter by specific PromptTool userId */
    userId?: string;
    /** Text-based tag match (exact) */
    tags?: string[];
    /** Only include images published to the community hub */
    onlyPublished?: boolean;
    /** Minimum quality level */
    quality?: PTImageQuality;
    /** Aspect ratio filter */
    aspectRatio?: PTAspectRatio;
    /** Limit results (default: 20, max: 100) */
    limit?: number;
    /** Order by field (default: createdAt desc) */
    orderBy?: 'createdAt' | 'downloadCount';
}

export interface PTBridgeResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    count?: number;
}

// ── Service ────────────────────────────────────────────────────────────────

export class PromptToolBridgeService {
    private static readonly IMAGES_COLLECTION = 'images';
    private static readonly USERS_COLLECTION = 'users';
    private static readonly COMMUNITY_COLLECTION = 'leagueEntries'; // Changed from 'communityEntries' to match PromptTool DB
    private static readonly RESOURCES_COLLECTION = 'resources';
    private static readonly DEFAULT_LIMIT = 20;
    private static readonly MAX_LIMIT = 100;

    /**
     * Fetch a single image by its Firestore document ID.
     */
    static async getImageById(imageId: string): Promise<PTBridgeResult<PTImage>> {
        try {
            const ref = promptToolDb.collection(this.IMAGES_COLLECTION).doc(imageId);
            const snap = await ref.get();

            if (!snap.exists) {
                return { success: false, error: `Image not found: ${imageId}` };
            }

            return {
                success: true,
                data: { id: snap.id, ...snap.data() } as PTImage,
            };
        } catch (err: any) {
            console.error('[PTBridge] getImageById error:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Fetch all images for a given PromptTool user UID.
     * Ordered by createdAt descending.
     */
    static async getImagesByUser(
        userId: string,
        limit = this.DEFAULT_LIMIT
    ): Promise<PTBridgeResult<PTImage[]>> {
        try {
            const safeLimit = Math.min(limit, this.MAX_LIMIT);
            const snap = await promptToolDb
                .collection('users').doc(userId).collection(this.IMAGES_COLLECTION)
                .orderBy('createdAt', 'desc')
                .limit(safeLimit)
                .get();

            const images = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as PTImage))
                .filter(img => img.status !== 'draft');
            return { success: true, data: images, count: images.length };
        } catch (err: any) {
            console.error('[PTBridge] getImagesByUser error:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Flexible image search with tag, quality, and aspect ratio filtering.
     * All filters are AND-combined.
     */
    static async searchImages(
        opts: PTImageSearchOptions
    ): Promise<PTBridgeResult<PTImage[]>> {
        try {
            const safeLimit = Math.min(opts.limit ?? this.DEFAULT_LIMIT, this.MAX_LIMIT);
            // Use collectionGroup for cross-user searches (requires index, but safe if query filters by userId)
            // or if userId is missing.
            let query: FirebaseFirestore.Query;
            
            if (opts.userId) {
                // More efficient direct sub-collection query if UID is known
                query = promptToolDb.collection('users').doc(opts.userId).collection(this.IMAGES_COLLECTION);
            } else {
                // Cross-user search requires collectionGroup
                query = promptToolDb.collectionGroup(this.IMAGES_COLLECTION);
            }
            if (opts.onlyPublished) {
                query = query.where('publishedToCommunity', '==', true);
            }
            if (opts.quality) {
                query = query.where('settings.quality', '==', opts.quality);
            }
            if (opts.aspectRatio) {
                query = query.where('settings.aspectRatio', '==', opts.aspectRatio);
            }
            if (opts.tags && opts.tags.length > 0) {
                // Firestore `array-contains-any` supports up to 10 values
                query = query.where('tags', 'array-contains-any', opts.tags.slice(0, 10));
            }

            const orderField = opts.orderBy ?? 'createdAt';
            query = query.orderBy(orderField, 'desc').limit(safeLimit);

            const snap = await query.get();
            const images = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as PTImage))
                .filter(img => img.status !== 'draft');
            return { success: true, data: images, count: images.length };
        } catch (err: any) {
            console.error('[PTBridge] searchImages error:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Fetch the most recent publicly-published community images.
     * Useful for VideoSystem's "Discover" or media-picker feature.
     */
    static async getCommunityHighlights(
        limit = this.DEFAULT_LIMIT
    ): Promise<PTBridgeResult<PTImage[]>> {
        try {
            const safeLimit = Math.min(limit, this.MAX_LIMIT);
            const snap = await promptToolDb
                .collection(this.COMMUNITY_COLLECTION)
                .orderBy('publishedAt', 'desc')
                .limit(safeLimit)
                .get();

            // CommunityEntry has the same imageUrl shape so we can cast
            const images = snap.docs.map(d => {
                const data = d.data();
                return {
                    id: d.id,
                    userId: data.originalUserId,
                    prompt: data.prompt,
                    settings: data.settings,
                    imageUrl: data.imageUrl,
                    videoUrl: data.videoUrl,
                    storagePath: '',
                    creditsCost: 0,
                    createdAt: data.publishedAt,
                    downloadCount: data.shareCount ?? 0,
                    publishedToCommunity: true,
                    tags: data.tags,
                } as PTImage;
            });

            return { success: true, data: images, count: images.length };
        } catch (err: any) {
            console.error('[PTBridge] getCommunityHighlights error:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Fetch a PromptTool user's profile by their UID.
     * Useful for attribution when displaying images from the bridge.
     */
    static async getUserProfile(uid: string): Promise<PTBridgeResult<PTUserProfile>> {
        try {
            const snap = await promptToolDb
                .collection(this.USERS_COLLECTION)
                .doc(uid)
                .get();

            if (!snap.exists) {
                return { success: false, error: `PromptTool profile not found for UID: ${uid}` };
            }

            return {
                success: true,
                data: { uid: snap.id, ...snap.data() } as PTUserProfile,
            };
        } catch (err: any) {
            console.error('[PTBridge] getUserProfile error:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Batch fetch images by a set of image IDs.
     * Used when a VideoSystem project has stored a list of PT image references.
     *
     * Firestore 'in' operator supports up to 30 values.
     */
    static async getImagesByIds(imageIds: string[]): Promise<PTBridgeResult<PTImage[]>> {
        if (!imageIds.length) return { success: true, data: [], count: 0 };

        try {
            const chunks: string[][] = [];
            for (let i = 0; i < imageIds.length; i += 30) {
                chunks.push(imageIds.slice(i, i + 30));
            }

            const allImages: PTImage[] = [];
            for (const chunk of chunks) {
                // Since we don't know the exact userId for each imageId, we must use collectionGroup
                const snap = await promptToolDb
                    .collectionGroup(this.IMAGES_COLLECTION)
                    .where(FieldPath.documentId(), 'in', chunk)
                    .get();
                snap.docs.forEach(d => allImages.push({ id: d.id, ...d.data() } as PTImage));
            }

            return { success: true, data: allImages, count: allImages.length };
        } catch (err: any) {
            console.error('[PTBridge] getImagesByIds error:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Fetch all prompt sets (grouped by promptSetID) for a given user.
     * Returns a map of promptSetID → images[].
     */
    static async getPromptSetsByUser(
        userId: string,
        limit = 10
    ): Promise<PTBridgeResult<Record<string, PTImage[]>>> {
        try {
            const snap = await promptToolDb
                .collection('users').doc(userId).collection(this.IMAGES_COLLECTION)
                .orderBy('createdAt', 'desc')
                .limit(100) // Fetch more to group
                .get();

            const grouped: Record<string, PTImage[]> = {};
            snap.docs.forEach(d => {
                const img = { id: d.id, ...d.data() } as PTImage;
                if (img.status === 'draft') return; // Skip drafts
                const setId = img.promptSetID ?? img.id; // Ungrouped images use their own ID
                if (!grouped[setId]) grouped[setId] = [];
                grouped[setId].push(img);
            });

            // Return only up to `limit` prompt sets
            const limited = Object.fromEntries(
                Object.entries(grouped).slice(0, limit)
            );

            return { success: true, data: limited, count: Object.keys(limited).length };
        } catch (err: any) {
            console.error('[PTBridge] getPromptSetsByUser error:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Save a generated image record into the PromptTool database.
     * This adds the image to the user's personal library in prompttool-db-0.
     */
    static async saveImage(userId: string, image: Omit<PTImage, 'id' | 'createdAt'>): Promise<PTBridgeResult<string>> {
        try {
            const userImagesRef = promptToolDb.collection(this.USERS_COLLECTION).doc(userId).collection(this.IMAGES_COLLECTION);
            const newDoc = userImagesRef.doc();
            
            const ptImageRecord = {
                ...image,
                createdAt: new Date(), // Firebase Admin SDK will convert Date to Timestamp
                status: image.status || 'completed',
                downloadCount: image.downloadCount || 0,
                publishedToCommunity: image.publishedToCommunity || false
            };

            await newDoc.set(ptImageRecord);
            return { success: true, data: newDoc.id };
        } catch (err: any) {
            console.error('[PTBridge] saveImage error:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Clone an existing library image into a specific project set for the user.
     */
    static async cloneImage(userId: string, sourceImageId: string, targetSetId: string, targetSetName: string): Promise<PTBridgeResult<string>> {
        try {
            // Find the source image first (use getImagesByIds logic for safety with sub-collections)
            const sourceResult = await this.getImagesByIds([sourceImageId]);
            if (!sourceResult.success || !sourceResult.data || sourceResult.data.length === 0) {
                return { success: false, error: 'Source image not found' };
            }

            const sourceImage = sourceResult.data[0];
            const { id, createdAt, ...imageData } = sourceImage;
            
            const clonedImage = {
                ...imageData,
                promptSetID: targetSetId,
                promptSetName: targetSetName,
                settings: {
                    ...imageData.settings,
                    promptSetID: targetSetId,
                    promptSetName: targetSetName
                }
            };

            return await this.saveImage(userId, clonedImage);
        } catch (err: any) {
            console.error('[PTBridge] cloneImage error:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Fetch all resources belonging to a PromptTool user.
     * Includes research papers, scripts, and other text artifacts.
     */
    static async getUserResources(uid: string, limit = 50): Promise<PTBridgeResult<PTResource[]>> {
        try {
            const snap = await resourcesDb
                .collection(this.RESOURCES_COLLECTION)
                .where('addedBy', '==', uid)
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();

            const resources = snap.docs.map(d => ({ id: d.id, ...d.data() } as PTResource));
            return { success: true, data: resources, count: resources.length };
        } catch (err: any) {
            console.error('[PTBridge] getUserResources error:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Fetch a single resource from the PromptTool database.
     */
    static async getResourceById(resourceId: string): Promise<PTBridgeResult<PTResource>> {
        try {
            const snap = await resourcesDb
                .collection(this.RESOURCES_COLLECTION)
                .doc(resourceId)
                .get();

            if (!snap.exists) {
                return { success: false, error: `Resource not found: ${resourceId}` };
            }

            return { success: true, data: { id: snap.id, ...snap.data() } as PTResource };
        } catch (err: any) {
            console.error('[PTBridge] getResourceById error:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Fetch the most recent publicly-published community resource artifacts.
     * Includes research, YouTube videos, and documentation.
     */
    static async getCommunityResources(
        limit = this.DEFAULT_LIMIT
    ): Promise<PTBridgeResult<PTResource[]>> {
        try {
            const safeLimit = Math.min(limit, this.MAX_LIMIT);
            const snap = await resourcesDb
                .collection(this.RESOURCES_COLLECTION)
                .where('status', '==', 'published')
                .limit(safeLimit)
                .get();

            const resources = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as PTResource))
                .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
                
            return { success: true, data: resources, count: resources.length };
        } catch (err: any) {
            console.error('[PTBridge] getCommunityResources error:', err);
            return { success: false, error: err.message };
        }
    }
}
