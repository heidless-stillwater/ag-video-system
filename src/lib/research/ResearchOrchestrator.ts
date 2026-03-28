import { ResearchRequest, ResearchResult, IResearchStrategy } from './types';
import { researchRegistry } from './ResearchEngineRegistry';
import { getPersonas } from '../services/persona-service';
import { getEnvironmentMode, getConfig } from '../config/environment';

export class ResearchOrchestrator {
    constructor() {
        // Strategies are handled by the global researchRegistry singleton
    }

    async conductResearch(
        topic: string, 
        depth: 'glance' | 'standard' | 'deep' = 'standard',
        agentIds: string[] = ['historian', 'scientist', 'culture_scout'],
        onProgress: (message: string) => void
    ): Promise<ResearchResult[]> {
        onProgress(`Starting multi-agent research on: ${topic}...`);

        const config = getConfig();
        const mode = config.mode;
        
        let defaultStrategyId = 'mock-engine';
        if (config.ai.model.startsWith('gemini')) {
            defaultStrategyId = 'gemini-2.5-flash';
        } else if (mode === 'STAGING' || mode === 'PRODUCTION') {
            defaultStrategyId = 'gemini-2.5-flash';
        }

        const defaultStrategy = researchRegistry.get(defaultStrategyId) || researchRegistry.get('mock-engine')!;
        onProgress(`Default infrastructure: ${defaultStrategy.name}${mode === 'DEV' ? ' (DEVELOPMENT)' : ''}`);

        onProgress(`Deploying ${agentIds.length} specialized agents...`);
        
        const allPersonas = await getPersonas();
        const personaMap = new Map(allPersonas.map(p => [p.id, p]));

        const researchPromises = agentIds.map(async (key) => {
            const persona = personaMap.get(key);
            
            // Determine engine for this specific agent
            let agentStrategyId = defaultStrategyId;
            if (persona?.engines && persona.engines.length > 0) {
                for (const eId of persona.engines) {
                    if (researchRegistry.get(eId)) {
                        agentStrategyId = eId;
                        break;
                    }
                }
            }

            if (mode === 'DEV' && process.env.NEXT_PUBLIC_FORCE_MOCK_AI === 'true') {
                agentStrategyId = 'mock-engine';
            }

            const agentStrategy = researchRegistry.get(agentStrategyId) || defaultStrategy;
            
            const request: ResearchRequest = {
                topic,
                depth: depth as any,
                language: 'English',
                persona: {
                    id: key,
                    name: persona?.name || 'Researcher',
                    prompt: persona?.prompt || 'Conduct objective research.'
                }
            };

            try {
                const result = await agentStrategy.execute(request, (msg: string) => {
                    onProgress(`[${persona?.name || 'Researcher'}] ${msg}`);
                });
                return {
                    agent: key,
                    engine: agentStrategy.id,
                    ...result
                };
            } catch (primaryError: any) {
                onProgress(`[${persona?.name || 'Researcher'}] Primary engine (${agentStrategy.name}) failed: ${primaryError.message}`);

                // Fallback cascade: try gemini-2.5-flash if primary engine was different
                if (agentStrategyId !== defaultStrategyId && defaultStrategy) {
                    try {
                        onProgress(`[${persona?.name || 'Researcher'}] Switching to fallback engine: ${defaultStrategy.name}...`);
                        const result = await defaultStrategy.execute(request, (msg: string) => {
                            onProgress(`[${persona?.name || 'Researcher'}] ${msg}`);
                        });
                        return {
                            agent: key,
                            engine: defaultStrategy.id,
                            ...result
                        };
                    } catch (fallbackError: any) {
                        onProgress(`[${persona?.name || 'Researcher'}] Fallback engine also failed: ${fallbackError.message}`);
                    }
                }

                // Total failure — return empty (non-polluting) result
                return await this.getFallbackResult(key, topic, agentStrategy.id);
            }
        });

        const results = await Promise.all(researchPromises);
        onProgress('Research phase completed. Synthesizing final report...');

        return results as any;
    }

    private async getFallbackResult(agentId: string, topic: string, engineId?: string): Promise<any> {
        const personas = await getPersonas();
        const persona = personas.find(p => p.id === agentId);
        const name = persona?.name || 'Researcher';
        const displayName = name.toLowerCase().startsWith('the ') ? name : `The ${name}`;
        
        return {
            agent: agentId,
            engine: engineId || 'fallback',
            sources: [],
            facts: [{ 
                id: `err-${agentId}`, 
                statement: `${displayName} agent encountered a synthesis error while researching. Essential context for "${topic}" will be inferred during the scripting mission.`, 
                sourceIds: [], 
                confidence: 0, 
                verified: false 
            }],
            quotes: [],
            outline: [`${topic} — Awaiting deeper analysis`],
            summary: `${displayName} was unable to complete deep research for "${topic}" due to a connectivity issue with ${engineId}. The mission will proceed with safety-fallback intelligence.`,
            logs: [`[FATAL] ${name} agent failed using engine ${engineId}. Fallback intelligence injected.`]
        };
    }
}

// Export singleton instance
export const researchOrchestrator = new ResearchOrchestrator();
