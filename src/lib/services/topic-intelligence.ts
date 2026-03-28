import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, Timestamp, orderBy, limit } from 'firebase/firestore';

export interface TopicIntelligence {
    topic: string;
    scores: {
        educational: number; // 1-100
        viralPotential: number; // 1-100
        evergreen: number; // 1-100
        complexity: number; // 1-100
    };
    keywords: string[];
    sentiment: 'positive' | 'neutral' | 'negative' | 'mystery';
    searchVolume: 'low' | 'medium' | 'high';
    competition: number; // 1-100
    suggestedFormat: 'mystery' | 'educational' | 'biography' | 'science';
    createdAt: Date;
}

export const topicIntelligenceService = {
    async analyzeTopic(topic: string, researcherPersonaId: string = 'general-researcher'): Promise<TopicIntelligence> {
        // In a real implementation, this would involve LLM calls through the TARE engine
        // and potentially Google Search / Trends APIs via MCP tools.
        
        // Mock analysis for now
        const scores = {
            educational: Math.floor(Math.random() * 40) + 60,
            viralPotential: Math.floor(Math.random() * 50) + 40,
            evergreen: Math.floor(Math.random() * 30) + 70,
            complexity: Math.floor(Math.random() * 60) + 20
        };

        const analysis: TopicIntelligence = {
            topic,
            scores,
            keywords: [topic, 'documentary', 'sleep science', 'history'],
            sentiment: 'neutral',
            searchVolume: 'medium',
            competition: 45,
            suggestedFormat: scores.viralPotential > 70 ? 'mystery' : 'educational',
            createdAt: new Date()
        };

        return analysis;
    },

    async saveAnalysis(userId: string, analysis: TopicIntelligence) {
        return await addDoc(collection(db, 'topic_intelligence'), {
            ...analysis,
            userId,
            createdAt: Timestamp.now()
        });
    },

    async getRecentAnalyses(count: number = 10) {
        const q = query(
            collection(db, 'topic_intelligence'),
            orderBy('createdAt', 'desc'),
            limit(count)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
};
