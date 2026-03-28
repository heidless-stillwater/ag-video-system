// Background job service

import { db } from '../firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type JobType = 'backup' | 'restore' | 'migration';

export interface Job {
    id: string;
    type: JobType;
    status: JobStatus;
    progress: number;
    details: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    result?: any;
    error?: string;
}

/**
 * Job Service
 * Managing long-running background tasks
 */

export async function createJob(type: JobType, userId: string): Promise<string> {
    const docRef = await db.collection('jobs').add({
        type,
        status: 'pending',
        progress: 0,
        details: 'Job queued',
        userId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });
    return docRef.id;
}

export async function updateJob(jobId: string, updates: Partial<Omit<Job, 'id' | 'createdAt'>>): Promise<void> {
    await db.collection('jobs').doc(jobId).update({
        ...updates,
        updatedAt: FieldValue.serverTimestamp(),
    });
}

export async function completeJob(jobId: string, result?: any): Promise<void> {
    await updateJob(jobId, {
        status: 'completed',
        progress: 100,
        details: 'Completed successfully',
        result
    });
}

export async function failJob(jobId: string, error: string): Promise<void> {
    await updateJob(jobId, {
        status: 'failed',
        details: 'Failed: ' + error,
        error
    });
}

export async function getJob(jobId: string): Promise<Job | null> {
    const doc = await db.collection('jobs').doc(jobId).get();
    if (!doc.exists) return null;
    const data = doc.data();
    if (!data) return null;

    return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
    } as Job;
}
