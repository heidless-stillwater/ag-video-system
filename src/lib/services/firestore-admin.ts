import { db as dbAdmin } from '../firebase-admin';
import { Topic, Project, Script, User } from '@/types';

/**
 * Server-side Firestore service using Admin SDK.
 * Bypasses security rules and allows access to named databases.
 */

/**
 * Safely converts a value to a Date object.
 * Handles Firestore Timestamps, JS Dates, and serialized timestamp objects.
 */
function ensureDate(value: any): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    if (typeof value.toDate === 'function') return value.toDate();
    if (typeof value.seconds === 'number') {
        const d = new Date(0);
        d.setUTCSeconds(value.seconds);
        if (value.nanoseconds) d.setMilliseconds(value.nanoseconds / 1000000);
        return d;
    }
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
}

// Projects
export async function getProject(projectId: string): Promise<Project | null> {
    const doc = await dbAdmin.collection('projects').doc(projectId).get();
    if (!doc.exists) return null;
    const data = doc.data()!;
    return {
        id: doc.id,
        ...data,
        createdAt: ensureDate(data.createdAt),
        updatedAt: ensureDate(data.updatedAt),
    } as Project;
}

export async function updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
    await dbAdmin.collection('projects').doc(projectId).update({
        ...updates,
        updatedAt: new Date(),
    });
}

export async function createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    // If duration is not set, use global defaults
    if (projectData.estimatedDuration === undefined || projectData.estimatedDuration === null || projectData.estimatedDuration === 0) {
        const config = await getSystemConfig();
        projectData.estimatedDuration = config.defaultDuration || 1;
    }

    const docRef = await dbAdmin.collection('projects').add({
        ...projectData,
        createdAt: new Date(),
        updatedAt: new Date(),
    });
    return docRef.id;
}

export async function deleteProject(projectId: string): Promise<void> {
    await dbAdmin.collection('projects').doc(projectId).delete();
}

export async function getUserProjects(userId: string): Promise<Project[]> {
    const snapshot = await dbAdmin.collection('projects')
        .where('userId', '==', userId)
        .orderBy('updatedAt', 'desc')
        .get();

    return snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: ensureDate(data.createdAt),
            updatedAt: ensureDate(data.updatedAt),
        } as Project;
    });
}

export async function getAllProjects(): Promise<Project[]> {
    const snapshot = await dbAdmin.collection('projects')
        .orderBy('updatedAt', 'desc')
        .get();

    return snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            createdAt: ensureDate(data.createdAt),
            updatedAt: ensureDate(data.updatedAt),
        } as Project;
    });
}

// Topics
export async function getTopic(topicId: string): Promise<Topic | null> {
    const doc = await dbAdmin.collection('topics').doc(topicId).get();
    if (!doc.exists) return null;
    const data = doc.data()!;
    return {
        id: doc.id,
        ...data,
        createdAt: ensureDate(data.createdAt),
        updatedAt: ensureDate(data.updatedAt),
    } as Topic;
}

export async function createTopic(topicData: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await dbAdmin.collection('topics').add({
        ...topicData,
        createdAt: new Date(),
        updatedAt: new Date(),
    });
    return docRef.id;
}

// Scripts
export async function saveScript(scriptData: Omit<Script, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await dbAdmin.collection('scripts').add({
        ...scriptData,
        createdAt: new Date(),
        updatedAt: new Date(),
    });
    return docRef.id;
}

export async function getScript(scriptId: string): Promise<Script | null> {
    const doc = await dbAdmin.collection('scripts').doc(scriptId).get();
    if (!doc.exists) return null;
    const data = doc.data()!;
    return {
        id: doc.id,
        ...data,
        createdAt: ensureDate(data.createdAt),
        updatedAt: ensureDate(data.updatedAt),
    } as Script;
}

export async function updateScript(scriptId: string, updates: Partial<Script>): Promise<void> {
    await dbAdmin.collection('scripts').doc(scriptId).update({
        ...updates,
        updatedAt: new Date(),
    });
}

// Users
export async function getUser(userId: string): Promise<User | null> {
    const doc = await dbAdmin.collection('users').doc(userId).get();
    if (!doc.exists) return null;
    const data = doc.data()!;
    return {
        id: doc.id,
        ...data,
        createdAt: ensureDate(data.createdAt),
    } as User;
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<void> {
    await dbAdmin.collection('users').doc(userId).update({
        ...updates,
        updatedAt: new Date(),
    });
}

// Global System Config
export interface SystemConfig {
    defaultDuration: number;
    updatedAt?: Date;
}

export async function getSystemConfig(): Promise<SystemConfig> {
    const doc = await dbAdmin.collection('config').doc('system').get();
    if (!doc.exists) {
        return { defaultDuration: 120 };
    }
    const data = doc.data()!;
    return {
        defaultDuration: data.defaultDuration || 120,
        updatedAt: data.updatedAt,
    } as SystemConfig;
}

export async function updateSystemConfig(updates: Partial<SystemConfig>): Promise<void> {
    await dbAdmin.collection('config').doc('system').set({
        ...updates,
        updatedAt: new Date(),
    }, { merge: true });
}

// Keep the object export for backward compatibility if needed, 
// but encourage using named exports
export const firestoreAdmin = {
    getProject,
    updateProject,
    createProject,
    deleteProject,
    getUserProjects,
    getTopic,
    createTopic,
    saveScript,
    getScript,
    updateScript,
    getUser,
    updateUser,
    getSystemConfig,
    updateSystemConfig,
};
