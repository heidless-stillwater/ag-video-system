import { IResearchStrategy, ResearchRequest, ResearchResult } from '../types';
import { getEnvironmentMode } from '../../config/environment';

export class PerplexityStrategy implements IResearchStrategy {
    id = 'perplexity-sonar';
    name = 'Perplexity Sonar (Live Web)';

    async execute(req: ResearchRequest, onProgress: (message: string) => void): Promise<ResearchResult> {
        const apiKey = process.env.PERPLEXITY_API_KEY;
        const agentRole = req.persona?.name || 'Expert Researcher';
        onProgress(`Initiating Perplexity Sonar research for "${agentRole}"...`);

        if (!apiKey) {
            // Always throw so the orchestrator's fallback cascade can try gemini next
            throw new Error('PERPLEXITY_API_KEY is not configured. Falling back to primary engine.');
        }

        try {
            const agentPrompt = req.persona?.prompt || 'Perform deep discovery on the topic.';
            
            onProgress(`Querying Perplexity for real-time data on: ${req.topic}...`);
            
            const response = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'sonar',
                    messages: [
                        { role: 'system', content: `You are ${agentRole}. ${agentPrompt}. You must return a valid JSON object strictly following the research schema.` },
                        { role: 'user', content: `Perform research on: ${req.topic}. Output JSON only.` }
                    ],
                    response_format: { type: 'json_object' }
                })
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Perplexity API Error: ${error}`);
            }

            const data = await response.json();
            const text = data.choices[0].message.content;
            const parsed = JSON.parse(text);

            onProgress(`[${agentRole}] Perplexity analysis complete. Found ${parsed.sources?.length || 0} sources.`);

            return {
                summary: parsed.summary || '',
                sources: (parsed.sources || []).map((s: any) => ({ ...s, id: s.id || Math.random().toString(36).substr(2, 9) })),
                facts: (parsed.facts || []).map((f: any) => ({ ...f, id: f.id || Math.random().toString(36).substr(2, 9) })),
                quotes: parsed.quotes || [],
                outline: parsed.outline || [],
                logs: [...(parsed.logs || []), `Perplexity Sonar successfully analyzed ${req.topic}`]
            };

        } catch (error: any) {
            onProgress(`[${agentRole}] Perplexity execution failed: ${error.message}`);
            // If it's a JSON parse error or API error, fallback to mock in non-PRODUCTION
            if (getEnvironmentMode() === 'DEV') {
                return this.getMockResult(req);
            }
            throw error;
        }
    }

    private getMockResult(req: ResearchRequest): ResearchResult {
        return {
            summary: `Simulated Perplexity analysis for ${req.topic}. This represents a live-web lookup simulation.`,
            sources: [
                { id: 'p1', url: 'https://perplexity.ai/search', title: 'Perplexity Search Result', type: 'news', credibilityScore: 90, extractedContent: `Real-time data mock for ${req.topic}.` }
            ],
            facts: [
                { id: 'pf1', statement: `Perplexity simulation confirms high relevance of ${req.topic} in current discourse.`, sourceIds: ['p1'], confidence: 92, verified: true }
            ],
            outline: [`Current Trends in ${req.topic}`, `Real-time Analysis`],
            logs: ['Perplexity simulation used']
        };
    }
}
