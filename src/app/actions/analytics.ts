'use server';

import { db } from '@/lib/firebase-admin';
import { UsageLog } from '@/types';

/**
 * Fetch usage logs from Firestore using Admin SDK.
 * Admin SDK bypasses security rules, which is appropriate for server-side operations.
 */
export async function fetchUsageLogs(userId: string, limitCount: number = 100, projectId?: string): Promise<UsageLog[]> {
    try {
        let queryRef = db.collection('analytics_logs')
            .orderBy('timestamp', 'desc')
            .limit(limitCount);

        // Filter by projectId if provided
        if (projectId) {
            queryRef = db.collection('analytics_logs')
                .where('projectId', '==', projectId)
                .orderBy('timestamp', 'desc')
                .limit(limitCount);
        }

        const snapshot = await queryRef.get();

        return snapshot.docs.map((doc: any) => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Convert Firestore Timestamp to Date for serialization
                timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp),
            } as UsageLog;
        });
    } catch (error) {
        console.error('Error fetching usage logs:', error);
        return [];
    }
}

