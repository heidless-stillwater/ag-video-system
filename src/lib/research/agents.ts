import { ResearchDepth, ResearchRequest } from './types';

export interface ResearchAgent {
    id: string;
    name: string;
    emoji?: string;
    description: string;
    prompt: string;
    engines?: string[]; // IDs from ResearchEngineRegistry
}

export const RESEARCH_AGENTS: Record<string, ResearchAgent> = {
    standard: {
        id: 'standard',
        name: 'The Neutralist',
        emoji: '⚖️',
        description: 'Balanced, objective, and comprehensive summary.',
        prompt: `Focus on a high-level, objective overview. 
        - What are the core facts? 
        - What is the consensus? 
        - Give a balanced perspective on any controversies.
        - Provide a clear, neutral summary.`,
        engines: ['gemini-2.5-flash']
    },
    historian: {
        id: 'historian',
        name: 'The Historian',
        emoji: '📜',
        description: 'Specializes in origins, chronologies, and historical context.',
        prompt: `Focus on the historical lifecycle of the topic. 
        - When did it start? 
        - Who were the key figures? 
        - What are the major milestones? 
        - How has it evolved over decades/centuries?`,
        engines: ['perplexity-sonar']
    },
    scientist: {
        id: 'scientist',
        name: 'The Scientist',
        emoji: '🧪',
        description: 'Focuses on data, mechanisms, technical details, and academic findings.',
        prompt: `Focus on the underlying mechanisms and evidence. 
        - How does it work? 
        - What are the scientific principles? 
        - What does the latest research say? 
        - Provide statistics, technical specs, and verified data.`,
        engines: ['gemini-2.5-flash']
    },
    culture_scout: {
        id: 'culture_scout',
        name: 'The Culture Scout',
        emoji: '🌍',
        description: 'Finds interesting trivia, human stories, and cultural impact.',
        prompt: `Focus on the human element and cultural significance. 
        - Why does this matter to people? 
        - What are some unusual trivia or "Easter eggs"? 
        - How is it represented in media/art? 
        - Find compelling personal anecdotes or societal impacts.`,
        engines: ['tavily-search']
    },
    skeptic: {
        id: 'skeptic',
        name: 'The Skeptic',
        emoji: '🔍',
        description: 'Debunks myths, checks biases, and focuses on verified precision.',
        prompt: `Focus on critical analysis and verification. 
        - What are the common misconceptions? 
        - Are there any flawed studies or biased reports? 
        - What is definitely NOT true? 
        - Challenge the status quo and demand rigorous evidence.`,
        engines: ['perplexity-sonar']
    }
};
