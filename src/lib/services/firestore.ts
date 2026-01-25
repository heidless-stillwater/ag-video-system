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
            createdAt: (doc.data().createdAt as Timestamp)?.toDate(),
            updatedAt: (doc.data().updatedAt as Timestamp)?.toDate(),
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
            createdAt: (data.createdAt as Timestamp)?.toDate(),
            updatedAt: (data.updatedAt as Timestamp)?.toDate(),
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
            createdAt: (data.createdAt as Timestamp)?.toDate(),
            updatedAt: (data.updatedAt as Timestamp)?.toDate(),
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
            createdAt: (doc.data().createdAt as Timestamp)?.toDate(),
            updatedAt: (doc.data().updatedAt as Timestamp)?.toDate(),
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
                createdAt: (snapshot.data().createdAt as Timestamp)?.toDate(),
            } as User;
        }

        const newUser: User = {
            email: userData.email || '',
            displayName: userData.displayName || 'User',
            photoURL: userData.photoURL || '',
            createdAt: new Date(),
            settings: {
                defaultMode: 'DEV',
                notifications: true,
                autoSave: true,
                youtubeConnected: false,
            },
            ...userData,
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
            createdAt: (snapshot.data().createdAt as Timestamp)?.toDate(),
        } as User;
    },

    async updateUser(userId: string, updates: Partial<User>): Promise<void> {
        const docRef = doc(db, 'users', userId);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp(),
        });
    }
};
