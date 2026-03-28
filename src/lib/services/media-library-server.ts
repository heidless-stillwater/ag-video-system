import { db } from '@/lib/firebase-admin';
import { MediaLibraryEntry, MediaSource, MediaAssetType } from '@/types';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

/**
 * MediaLibraryServerService
 * 
 * Server-side service using Firebase Admin SDK for managing the Media Library.
 * Used by API routes and background services (like AI generation).
 */
export const mediaLibraryServerService = {
    /**
     * Creates a new entry in the media library.
     */
    async addEntry(entryData: Omit<MediaLibraryEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const coll = db.collection('mediaLibrary');
        const docRef = await coll.add({
            ...entryData,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        return docRef.id;
    },

    /**
     * Retrieves all entries for a specific user.
     */
    async getUserEntries(userId: string, options?: { type?: string; limit?: number }): Promise<MediaLibraryEntry[]> {
        let q = db.collection('mediaLibrary')
            .where('userId', '==', userId);

        if (options?.type) {
            q = q.where('type', '==', options.type);
        }

        if (options?.limit) {
            q = q.limit(options.limit);
        }

        const snapshot = await q.get();
        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
                updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt || Date.now()),
            } as MediaLibraryEntry;
        });
    },

    /**
     * Automatically log a generated asset to the media library.
     */
    async logGeneratedAsset(params: {
        userId: string;
        type: MediaAssetType;
        url: string;
        prompt: string;
        source: MediaSource;
        projectId?: string;
        sectionId?: string;
        metadata?: Record<string, any>;
        tags?: string[];
    }): Promise<string> {
        return await this.addEntry({
            userId: params.userId,
            type: params.type,
            source: params.source,
            url: params.url,
            thumbnailUrl: params.url,
            prompt: params.prompt,
            projectId: params.projectId,
            sectionId: params.sectionId,
            metadata: params.metadata || {},
            tags: params.tags || ['generated', params.source],
            isFavorite: false
        });
    },

    /**
     * Updates an existing entry.
     */
    async updateEntry(userId: string, entryId: string, updates: Partial<MediaLibraryEntry>): Promise<void> {
        const docRef = db.collection('mediaLibrary').doc(entryId);
        const doc = await docRef.get();
        if (!doc.exists || doc.data()?.userId !== userId) {
            throw new Error('Entry not found or unauthorized');
        }
        await docRef.update({
            ...updates,
            updatedAt: FieldValue.serverTimestamp(),
        });
    },

    /**
     * Deletes an entry.
     */
    async deleteEntry(userId: string, entryId: string): Promise<void> {
        const docRef = db.collection('mediaLibrary').doc(entryId);
        const doc = await docRef.get();
        if (!doc.exists || doc.data()?.userId !== userId) {
            throw new Error('Entry not found or unauthorized');
        }
        await docRef.delete();
    }
};
