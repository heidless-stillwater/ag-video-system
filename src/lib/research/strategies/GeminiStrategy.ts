import { VertexAI, HarmCategory, HarmBlockThreshold, FinishReason } from '@google-cloud/vertexai';
import { IResearchStrategy, ResearchRequest, ResearchResult } from '../types';
import path from 'path';
import fs from 'fs';
import { getConfig } from '../../config/environment';

export class GeminiStrategy implements IResearchStrategy {
    id = 'gemini-2.5-flash';
    name = 'Gemini 2.5 Flash (Grounded)';

    private vertexAI: VertexAI | null = null;

    private getClient(): VertexAI {
        if (this.vertexAI) return this.vertexAI;

        const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'heidless-apps-0';
        const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

        // 1. Safely resolve key file path
        let hasKeyFile = false;
        let rootSaPath = '';
        try {
            const cwd = process.cwd();
            if (cwd && typeof cwd === 'string') {
                rootSaPath = path.resolve(cwd, 'service-account.json');
                hasKeyFile = fs.existsSync(rootSaPath);
            }
        } catch (pathError: any) {
            console.warn(`[GeminiStrategy] Path resolution error: ${pathError.message}`);
            hasKeyFile = false;
        }

        console.log(`[GeminiStrategy] Initializing VertexAI (hasKeyFile=${hasKeyFile})`);
        
        // 2. Wrap constructor in try/catch to catch "illegal path" or auth failures
        try {
            this.vertexAI = new VertexAI({
                project: projectId,
                location: location,
                googleAuthOptions: hasKeyFile ? {
                    keyFile: rootSaPath,
                    scopes: ['https://www.googleapis.com/auth/cloud-platform']
                } : {
                    scopes: ['https://www.googleapis.com/auth/cloud-platform']
                }
            });
        } catch (initError: any) {
            console.error(`[GeminiStrategy] Initialization with keyFile failed: ${initError.message}. Falling back to default.`);
            // Final fallback: initialize without explicit keyFile
            this.vertexAI = new VertexAI({
                project: projectId,
                location: location,
                googleAuthOptions: {
                    scopes: ['https://www.googleapis.com/auth/cloud-platform']
                }
            });
        }

        return this.vertexAI;
    }

    async execute(req: ResearchRequest, onProgress: (message: string) => void): Promise<ResearchResult> {
        const agentRole = req.persona?.name || 'Expert Researcher';
        onProgress(`Initiating ${agentRole}...`);
        
        const config = getConfig();
        const client = this.getClient();
        
        // Only gemini-2.5-flash and gemini-2.5-pro are available (March 2026)
        // All 2.0 and 1.5 models have been retired
        const modelsToTry = [
            req.customParameters?.model || 'gemini-2.5-flash',
            'gemini-2.5-pro',
        ];

        let lastError: any = null;

        for (const modelName of modelsToTry) {
            try {
                return await this.executeWithModel(modelName, req, onProgress, client, config);
            } catch (error: any) {
                lastError = error;
                const errStr = error.message?.toLowerCase() || '';
                
                if (errStr.includes('blocked_by_policy')) {
                    onProgress(`[${agentRole}] Model ${modelName} blocked by policy. Trying fallback...`);
                    continue;
                }

                if (errStr.includes('json_parse_error')) {
                    onProgress(`[${agentRole}] JSON error with ${modelName}. Trying fallback...`);
                    continue;
                }

                const isRetryable = errStr.includes('404') || errStr.includes('500') || errStr.includes('429') || errStr.includes('unavailable') || errStr.includes('deadline');
                
                if (isRetryable) {
                    onProgress(`[${agentRole}] ${modelName} unavailable. Trying fallback...`);
                    continue; 
                }

                break; 
            }
        }

        if (config.mode === 'DEV') {
            onProgress(`[${agentRole}] DEV FALLBACK: Generating simulated intelligence for "${req.topic}"...`);
            return this.getMockResult(req);
        }
        
        throw lastError || new Error(`Research failed for agent ${agentRole}`);
    }

    private async executeWithModel(modelName: string, req: ResearchRequest, onProgress: (message: string) => void, client: VertexAI, config: any): Promise<ResearchResult> {
        const agentRole = req.persona?.name || 'Expert Researcher';
        const tools: any[] = [];
        
        if (req.customParameters?.useSearch !== false && config.mode !== 'DEV') {
            tools.push({ googleSearch: {} });
        }

        const useSearch = tools.length > 0;

        const model = client.getGenerativeModel({
            model: modelName,
            tools: useSearch ? tools : undefined,
            generationConfig: {
                temperature: (req.customParameters as any)?.temperature || 0.2,
                // Gemini 2.5 does NOT support controlled generation (responseMimeType)
                // with the Search tool. Only use JSON mode when search is disabled.
                ...(useSearch ? {} : { responseMimeType: 'application/json' as const }),
                maxOutputTokens: 8192,
            },
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
            ]
        });

        const agentPrompt = req.persona?.prompt || 'Perform deep discovery on the topic.';

        const prompt = `
            ROLE: ${agentRole}
            SPECIALIZATION: ${agentPrompt}
            
            TASK: Perform an in-depth research on "${req.topic}".
            
            RESEARCH DEPTH: ${req.depth}
            LANGUAGE: ${req.language}
            
            INSTRUCTIONS:
            1. Use search tools to find verified facts, historical details, and interesting anecdotes.
            2. Populate 'sources' with ACTUAL URLs from search.
            3. Extract notable quotes.
            4. Create a logical outline for a documentary.
            5. Reword findings in your unique voice.
            
            OUTPUT FORMAT: You MUST return a VALID JSON object. No markdown wrapping.
            {
              "summary": "string",
              "sources": [{ "id": "string", "url": "string", "title": "string", "type": "string", "credibilityScore": 0-100, "extractedContent": "string" }],
              "facts": [{ "id": "string", "statement": "string", "sourceIds": ["string"], "confidence": 0-100, "verified": true }],
              "quotes": [{ "author": "string", "text": "string", "context": "string" }],
              "outline": ["string"],
              "logs": ["string"]
            }
        `;

        onProgress(`Agent ${req.persona?.name || ''} is analyzing ${req.topic} using ${modelName}...`);
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        if (!text) {
            const safetyReason = response.candidates?.[0]?.finishReason;
            
            if (safetyReason === FinishReason.RECITATION || safetyReason === FinishReason.SAFETY) {
                throw new Error(`BLOCKED_BY_POLICY: ${safetyReason}`);
            }
            
            throw new Error(`Empty response. FinishReason: ${safetyReason}`);
        }

        let parsed;
        let cleanJson = this.extractJson(text);
        
        try {
            parsed = JSON.parse(cleanJson);
        } catch (parseError: any) {
            onProgress(`[${agentRole}] JSON parse failed. Attempting advanced repair...`);
            try {
                parsed = JSON.parse(this.repairJson(cleanJson));
            } catch (repairError: any) {
                if (cleanJson.trim().startsWith('{') && !cleanJson.trim().endsWith('}')) {
                    try {
                        parsed = JSON.parse(cleanJson.trim() + '}');
                    } catch (e: any) {
                         throw new Error(`JSON_PARSE_ERROR: ${parseError.message}`);
                    }
                } else {
                    throw new Error(`JSON_PARSE_ERROR: ${(parseError as any).message}`);
                }
            }
        }
        
        const groundingChunks = (response.candidates?.[0] as any)?.groundingMetadata?.groundingChunks || [];
        const discoveredSources: any[] = groundingChunks
            .filter((chunk: any) => chunk.web && chunk.web.uri)
            .map((chunk: any, i: number) => ({
                id: `grounding-${i}`,
                url: chunk.web.uri,
                title: chunk.web.title || `Source ${i + 1}`,
                type: 'article',
                credibilityScore: 90,
                extractedContent: 'Retrieved via live Google Search grounding.'
            }));

        const mergedSources = [...(parsed.sources || [])];
        for (const ds of discoveredSources) {
            if (!mergedSources.some(s => s.url === ds.url)) {
                mergedSources.push(ds);
            }
        }

        return {
            sources: mergedSources,
            facts: parsed.facts || [],
            quotes: parsed.quotes || [],
            outline: parsed.outline || [],
            summary: parsed.summary || '',
            logs: [...(parsed.logs || []), `${agentRole} research successful using ${modelName}`]
        };
    }

    private getMockResult(req: ResearchRequest): ResearchResult {
        return {
            summary: `Simulated analysis of ${req.topic} focusing on key parameters. Initial findings suggest that ${req.topic} has significant implications for local dynamics and historical context.`,
            sources: [
                { id: 'm1', url: 'https://archive.stillwater.ai/discovery', title: 'Stillwater Historical Archive', type: 'academic', credibilityScore: 98, extractedContent: `Archived data regarding ${req.topic}.` },
                { id: 'm2', url: 'https://wikipedia.org/wiki/Special:Search', title: 'Global Knowledge Base', type: 'wikipedia', credibilityScore: 85, extractedContent: `Baseline definitions for ${req.topic}.` }
            ],
            facts: [
                { id: 'f1', statement: `Foundational research indicates ${req.topic} is a multi-faceted subject.`, sourceIds: ['m2'], confidence: 95, verified: true },
                { id: 'f2', statement: `Internal Stillwater databases confirm recurring patterns related to ${req.topic}.`, sourceIds: ['m1'], confidence: 88, verified: true }
            ],
            quotes: [
                { author: "Expert System", text: `"${req.topic} represents a unique intersection of data and narrative."`, context: "Simulated synthesis" }
            ],
            outline: [`History of ${req.topic}`, `Modern Context`, `Future Projections`],
            logs: ['Connection interrupted', 'Simulated intelligence activated', 'Local knowledge synthesis complete']
        };
    }

    private extractJson(text: string): string {
        const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonBlockMatch) {
            return jsonBlockMatch[1].trim();
        }

        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            return text.substring(firstBrace, lastBrace + 1).trim();
        }

        return text.trim();
    }

    private repairJson(json: string): string {
        let repaired = json.replace(/,\s*\]/g, ']');
        repaired = repaired.replace(/,\s*\}/g, '}');
        return repaired;
    }
}
