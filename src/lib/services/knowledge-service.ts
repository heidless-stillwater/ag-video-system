import { db } from '@/lib/firebase/config';
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { getEnvironmentMode } from '@/lib/config/environment';

export interface ResearchArtifact {
    id?: string;
    userId: string;
    sessionId: string;
    topic: string;
    personaName: string;
    content: string; // The full markdown/text report
    summary: string;
    keyFindings: string[];
    sources: string[];
    category: string;
    createdAt: Date;
}

export const knowledgeService = {
    async storeArtifact(artifact: ResearchArtifact) {
        return await addDoc(collection(db, 'knowledge_vault'), {
            ...artifact,
            createdAt: Timestamp.fromDate(artifact.createdAt)
        });
    },

    async getUserArtifacts(userId: string): Promise<ResearchArtifact[]> {
        try {
            const q = query(
                collection(db, 'knowledge_vault'),
                where('userId', '==', userId),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            const artifacts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as unknown as ResearchArtifact[];
            
            if (artifacts.length === 0 && getEnvironmentMode() !== 'PRODUCTION') {
                return this.getMockArtifacts(userId);
            }
            return artifacts;
        } catch (error) {
            if (getEnvironmentMode() === 'PRODUCTION') {
                console.error('CRITICAL: Firebase failure in production:', error);
                throw error; // In production, we want to know if it's broken
            }
            console.warn('Firebase error, falling back to mock intelligence:', error);
            return this.getMockArtifacts(userId);
        }
    },

    getMockArtifacts(userId: string): ResearchArtifact[] {
        return [
            {
                id: 'mock-1',
                userId,
                sessionId: 'session-001',
                topic: 'The Neurobiology of Deep Sleep',
                personaName: 'Dr. Aris Thorne (Neuroscientist)',
                category: 'Science',
                summary: 'Investigation into the glymphatic system and its role in metabolic waste clearance during slow-wave sleep.',
                content: '# Content...',
                keyFindings: ['Finding 1', 'Finding 2'],
                sources: ['Source 1'],
                createdAt: new Date()
            },
            {
                id: 'mock-2',
                userId,
                sessionId: 'session-002',
                topic: 'Dream Incubation in Ancient Cultures',
                personaName: 'Elias Vance (Investigative Historian)',
                category: 'History',
                summary: 'Analysis of Asklepion temples in Ancient Greece and the ritualistic use of "temple sleep" for psychic healing.',
                content: '# Content...',
                keyFindings: ['Finding 1', 'Finding 2'],
                sources: ['Source 1'],
                createdAt: new Date(Date.now() - 86400000)
            }
        ];
    },

    async getArtifact(id: string): Promise<ResearchArtifact | null> {
        // ...
        return null; 
    }
};
