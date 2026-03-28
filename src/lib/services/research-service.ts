import { db } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { getEnvironmentMode } from '@/lib/config/environment';

export interface ResearchStep {
    id: string;
    description: string;
    agentId: string;
    personaName: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    findings?: string;
    error?: string;
    timestamp: Date;
}

export interface ResearchSession {
    id?: string;
    userId: string;
    topic: string;
    personaId: string;
    status: 'initializing' | 'in_progress' | 'completed' | 'failed';
    progress: number; // 0-100
    steps: ResearchStep[];
    summary?: string;
    createdAt: Date;
    updatedAt: Date;
}

export const researchService = {
    async startSession(userId: string, topic: string, personaId: string): Promise<string> {
        const session: ResearchSession = {
            userId,
            topic,
            personaId,
            status: 'initializing',
            progress: 0,
            steps: [
                {
                    id: 'step-1',
                    description: `Initial scan for ${topic}`,
                    agentId: personaId,
                    personaName: 'Selected Researcher',
                    status: 'pending',
                    timestamp: new Date()
                }
            ],
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const docRef = await db.collection('research_sessions').add({
            ...session,
            createdAt: Timestamp.fromDate(session.createdAt),
            updatedAt: Timestamp.fromDate(session.updatedAt)
        });
        
        return docRef.id;
    },

    async getSession(sessionId: string): Promise<ResearchSession | null> {
        const doc = await db.collection('research_sessions').doc(sessionId).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() } as ResearchSession;
    },

    async getUserSessions(userId: string): Promise<ResearchSession[]> {
        try {
            const snapshot = await db.collection('research_sessions')
                .where('userId', '==', userId)
                .get();
            
            const sessions = snapshot.docs
                .map((doc: any) => ({ id: doc.id, ...doc.data() }))
                .sort((a: any, b: any) => b.createdAt.toDate() - a.createdAt.toDate()) as unknown as ResearchSession[];
            
            if (sessions.length === 0 && getEnvironmentMode() !== 'PRODUCTION') {
                return this.getMockSessions(userId);
            }
            return sessions;
        } catch (error) {
            if (getEnvironmentMode() === 'PRODUCTION') {
                console.error('CRITICAL: Research service failure in production:', error);
                throw error;
            }
            console.warn('Firebase error, falling back to active telemetry mock:', error);
            return this.getMockSessions(userId);
        }
    },

    getMockSessions(userId: string): ResearchSession[] {
        return [
            {
                id: 'mock-session-active',
                userId,
                topic: 'Circadian Rhythms and Modern Lighting',
                personaId: 'anthropologist',
                status: 'in_progress',
                progress: 68,
                steps: [],
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];
    },

    async updateStep(sessionId: string, stepId: string, updates: Partial<ResearchStep>) {
        const sessionRef = db.collection('research_sessions').doc(sessionId);
        // This is simplified, usually we'd get the session, update the steps array, and save back
    }
};
