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
            createdAt: (doc.data().createdAt as Timestamp)?.toDate(),
            updatedAt: (doc.data().updatedAt as Timestamp)?.toDate(),
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
            createdAt: (data.createdAt as Timestamp)?.toDate(),
            updatedAt: (data.updatedAt as Timestamp)?.toDate(),
        } as Script;
    }
};
