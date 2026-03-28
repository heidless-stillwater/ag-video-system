import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp,
    limit as firestoreLimit
} from 'firebase/firestore';
import { db } from '../firebase';
import { MediaLibraryEntry } from '@/types';

/**
 * Safely converts a value to a Date object.
 */
function ensureDate(value: any): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    if (typeof value.toDate === 'function') return value.toDate();
    if (typeof value.seconds === 'number') {
        return new Timestamp(value.seconds, value.nanoseconds || 0).toDate();
    }
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
}

export const mediaLibraryService = {
    /**
     * Creates a new entry in the media library.
     */
    async addEntry(entryData: Omit<MediaLibraryEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const docRef = await addDoc(collection(db, 'mediaLibrary'), {
            ...entryData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return docRef.id;
    },

    /**
     * Retrieves all entries for a specific user.
     */
    async getUserEntries(userId: string, options?: { type?: string; limit?: number }): Promise<MediaLibraryEntry[]> {
        let q = query(
            collection(db, 'mediaLibrary'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );

        if (options?.type) {
            q = query(q, where('type', '==', options.type));
        }

        if (options?.limit) {
            q = query(q, firestoreLimit(options.limit));
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: ensureDate(doc.data().createdAt),
            updatedAt: ensureDate(doc.data().updatedAt),
        })) as MediaLibraryEntry[];
    },

    /**
     * Gets a single media library entry by ID.
     */
    async getEntry(entryId: string): Promise<MediaLibraryEntry | null> {
        const docRef = doc(db, 'mediaLibrary', entryId);
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) return null;
        const data = snapshot.data();
        return {
            id: snapshot.id,
            ...data,
            createdAt: ensureDate(data.createdAt),
            updatedAt: ensureDate(data.updatedAt),
        } as MediaLibraryEntry;
    },

    /**
     * Updates an existing media library entry.
     */
    async updateEntry(entryId: string, updates: Partial<MediaLibraryEntry>): Promise<void> {
        const docRef = doc(db, 'mediaLibrary', entryId);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp(),
        });
    },

    /**
     * Deletes a media library entry.
     */
    async deleteEntry(entryId: string): Promise<void> {
        const docRef = doc(db, 'mediaLibrary', entryId);
        await deleteDoc(docRef);
    },

    /**
     * Toggles the favorite status of a media entry.
     */
    async toggleFavorite(entryId: string, isFavorite: boolean): Promise<void> {
        await this.updateEntry(entryId, { isFavorite });
    }
};
