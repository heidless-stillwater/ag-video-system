import {
    collection,
    addDoc,
    updateDoc,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { Script } from '@/types';

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

export const scriptService = {
    async saveScript(scriptData: Omit<Script, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const docRef = await addDoc(collection(db, 'scripts'), {
            ...scriptData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return docRef.id;
    },

    async getProjectScripts(projectId: string): Promise<Script[]> {
        const q = query(
            collection(db, 'scripts'),
            where('projectId', '==', projectId),
            orderBy('version', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: ensureDate(doc.data().createdAt),
            updatedAt: ensureDate(doc.data().updatedAt),
        })) as Script[];
    },

    async getScript(scriptId: string): Promise<Script | null> {
        const docRef = doc(db, 'scripts', scriptId);
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) return null;
        const data = snapshot.data();
        return {
            id: snapshot.id,
            ...data,
            createdAt: ensureDate(data.createdAt),
            updatedAt: ensureDate(data.updatedAt),
        } as Script;
    },

    async updateScript(scriptId: string, updates: Partial<Script>): Promise<void> {
        const docRef = doc(db, 'scripts', scriptId);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp(),
        });
    }
};
