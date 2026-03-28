export type ResearchDepth = 'glance' | 'standard' | 'deep' | 'academic';

export interface ResearchSource {
    id: string;
    url: string;
    title: string;
    type: 'article' | 'wikipedia' | 'video' | 'academic' | 'book' | 'news';
    credibilityScore: number; // 0-100
    extractedContent: string;
    citations?: string[];
}

export interface ResearchFact {
    id: string;
    statement: string;
    sourceIds: string[];
    confidence: number;
    verified: boolean;
}

export interface ResearchQuote {
    author: string;
    text: string;
    context?: string;
}

export interface ResearchResult {
    agent?: string;
    engine?: string;
    sources: ResearchSource[];
    facts: ResearchFact[];
    quotes?: ResearchQuote[];
    outline: string[];
    summary?: string;
    logs: string[];
}

export interface ResearchRequest {
    topic: string;
    depth: ResearchDepth;
    language: string;
    persona?: any; // To be defined
    customParameters?: {
        useSearch?: boolean;
        model?: string;
        region?: string;
    };
}

export interface IResearchStrategy {
    id: string;
    name: string;
    execute(req: ResearchRequest, onProgress: (message: string) => void): Promise<ResearchResult>;
}
