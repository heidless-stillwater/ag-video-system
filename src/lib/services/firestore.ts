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
    Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { Topic, Project, User } from '@/types';

/**
 * Safely converts a value to a Date object.
 * Handles Firestore Timestamps, JS Dates, and serialized timestamp objects.
 */
function ensureDate(value: any): Date | undefined {
    if (!value) return undefined;

    // If it's already a Date
    if (value instanceof Date) return value;

    // If it's a Firestore Timestamp (client-side)
    if (typeof value.toDate === 'function') return value.toDate();

    // If it's a serialized Timestamp object {seconds, nanoseconds}
    if (typeof value.seconds === 'number') {
        return new Timestamp(value.seconds, value.nanoseconds || 0).toDate();
    }

    // Fallback for strings or numbers
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
}

export const topicService = {
    async createTopic(topicData: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const docRef = await addDoc(collection(db, 'topics'), {
            ...topicData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return docRef.id;
    },

    async getUserTopics(userId: string): Promise<Topic[]> {
        const q = query(
            collection(db, 'topics'),
            where('userId', '==', userId),
            orderBy('updatedAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: ensureDate(doc.data().createdAt),
            updatedAt: ensureDate(doc.data().updatedAt),
        })) as Topic[];
    },

    async getTopic(topicId: string): Promise<Topic | null> {
        const docRef = doc(db, 'topics', topicId);
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) return null;
        const data = snapshot.data();
        return {
            id: snapshot.id,
            ...data,
            createdAt: ensureDate(data.createdAt),
            updatedAt: ensureDate(data.updatedAt),
        } as Topic;
    }
};

export const projectService = {
    async createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const docRef = await addDoc(collection(db, 'projects'), {
            ...projectData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        return docRef.id;
    },

    async getProject(projectId: string): Promise<Project | null> {
        const docRef = doc(db, 'projects', projectId);
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) return null;
        const data = snapshot.data();
        return {
            id: snapshot.id,
            ...data,
            createdAt: ensureDate(data.createdAt),
            updatedAt: ensureDate(data.updatedAt),
        } as Project;
    },

    async getUserProjects(userId: string): Promise<Project[]> {
        const q = query(
            collection(db, 'projects'),
            where('userId', '==', userId),
            orderBy('updatedAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: ensureDate(doc.data().createdAt),
            updatedAt: ensureDate(doc.data().updatedAt),
        })) as Project[];
    },

    async updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
        const docRef = doc(db, 'projects', projectId);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp(),
        });
    },

    async deleteProject(projectId: string): Promise<void> {
        const docRef = doc(db, 'projects', projectId);
        await deleteDoc(docRef);
    }
};

export const userService = {
    async getOrCreateUser(userData: Partial<User> & { id: string }): Promise<User> {
        const docRef = doc(db, 'users', userData.id);
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
            return {
                id: snapshot.id,
                ...snapshot.data(),
                createdAt: ensureDate(snapshot.data().createdAt),
            } as User;
        }

        const { id, ...rest } = userData;
        const newUser: User = {
            id,
            email: rest.email || '',
            displayName: rest.displayName || 'User',
            photoURL: rest.photoURL || '',
            createdAt: new Date(),
            settings: {
                defaultMode: 'DEV',
                notifications: true,
                autoSave: true,
                youtubeConnected: false,
                ...(rest.settings || {})
            },
            roles: rest.roles || ['user'],
            plan: rest.plan || 'standard',
            creditBalance: rest.creditBalance || 0,
            ...rest,
        };

        await updateDoc(docRef, {
            ...newUser,
            createdAt: serverTimestamp(),
        });

        return newUser;
    },

    async getUser(userId: string): Promise<User | null> {
        const docRef = doc(db, 'users', userId);
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) return null;
        return {
            id: snapshot.id,
            ...snapshot.data(),
            createdAt: ensureDate(snapshot.data().createdAt),
        } as User;
    },

    async updateUser(userId: string, updates: Partial<User>): Promise<void> {
        const docRef = doc(db, 'users', userId);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp(),
        });
    },

    async getAllUsers(): Promise<User[]> {
        const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: ensureDate(doc.data().createdAt),
        })) as User[];
    }
};
