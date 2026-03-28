import { IResearchStrategy, ResearchRequest, ResearchResult } from '../types';
import { getEnvironmentMode } from '../../config/environment';

export class TavilyStrategy implements IResearchStrategy {
    id = 'tavily-search';
    name = 'Tavily AI Search (Grounding)';

    async execute(req: ResearchRequest, onProgress: (message: string) => void): Promise<ResearchResult> {
        const apiKey = process.env.TAVILY_API_KEY;
        const agentRole = req.persona?.name || 'Expert Researcher';
        onProgress(`Initiating Tavily dynamic search for "${agentRole}"...`);

        if (!apiKey) {
            // Always throw so the orchestrator's fallback cascade can try gemini next
            throw new Error('TAVILY_API_KEY is not configured. Falling back to primary engine.');
        }

        try {
            onProgress(`Querying Tavily for high-credibility sources on: ${req.topic}...`);
            
            const response = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    api_key: apiKey,
                    query: `${req.persona?.prompt || ''} Topic: ${req.topic}`,
                    search_depth: req.depth === 'deep' ? 'advanced' : 'basic',
                    include_answer: true,
                    max_results: 10
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Tavily API Error: ${error}`);
            }

            const data = await response.json();
            
            onProgress(`[${agentRole}] Tavily search complete. Found ${data.results?.length || 0} authoritative sources.`);

            // Tavily returns a direct answer if include_answer is true. 
            // We'll use this as the summary and the results as sources.
            return {
                summary: data.answer || `Authoritative search results for ${req.topic}.`,
                sources: (data.results || []).map((res: any, i: number) => ({
                    id: `tav-${i}`,
                    url: res.url,
                    title: res.title,
                    type: 'article',
                    credibilityScore: Math.round(res.score * 100) || 85,
                    extractedContent: res.content
                })),
                facts: (data.results || []).slice(0, 5).map((res: any, i: number) => ({
                    id: `tf-${i}`,
                    statement: res.content.substring(0, 200) + '...',
                    sourceIds: [`tav-${i}`],
                    confidence: 90,
                    verified: true
                })),
                outline: [`Overview: ${req.topic}`, `Key Findings from Tavily`],
                logs: [`Tavily search performed with depth: ${req.depth}`]
            };

        } catch (error: any) {
            onProgress(`[${agentRole}] Tavily execution failed: ${error.message}`);
            if (getEnvironmentMode() === 'DEV') {
                return this.getMockResult(req);
            }
            throw error;
        }
    }

    private getMockResult(req: ResearchRequest): ResearchResult {
        return {
            summary: `Simulated Tavily search results for ${req.topic}. Focuses on high-quality source retrieval.`,
            sources: [
                { id: 't1', url: 'https://tavily.com', title: 'Tavily Mock Result', type: 'article', credibilityScore: 95, extractedContent: `Simulated search content for ${req.topic}.` }
            ],
            facts: [
                { id: 'tf1', statement: `Tavily simulation identifies ${req.topic} as a primary research target.`, sourceIds: ['t1'], confidence: 95, verified: true }
            ],
            outline: [`Search Domain: ${req.topic}`, `Authoritative Sources`],
            logs: ['Tavily simulation activated']
        };
    }
}
