import { researchOrchestrator } from './ResearchOrchestrator';
import { getPersonas } from '../services/persona-service';

export interface ResearchLog {
    researcherId?: string;
    researcherName?: string;
    type?: string;
    stepId?: string;
    stepLabel?: string;
    event?: string;
    message?: string;
    [key: string]: any;
}

export interface ResearchCallbacks {
    onLog?: (log: ResearchLog) => void;
    onEvent?: (event: string, payload: any) => void;
}

export class StillwaterResearchService {
    async performResearch(topic: string, persona: string, callbacks?: ResearchCallbacks): Promise<any> {
        const { onLog, onEvent } = callbacks || {};

        const sendLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
            console.log(`[ResearchService] ${message}`);
            onLog?.({ message, type });
        };

        sendLog(`[SYSTEM] Initializing Research AI for: "${topic}"`, 'info');
        
        // Fetch dynamic personas
        const allPersonas = await getPersonas();
        const personaMap = new Map(allPersonas.map(p => [p.id, p]));

        // Define the team focused only on the selected persona
        const selectedId = persona === 'data-scientist' ? 'scientist' : persona;
        const mainPersona = personaMap.get(selectedId) || personaMap.get('standard') || allPersonas[0];

        // Only use the selected persona
        const finalTeamIds = [selectedId];
        const agents = [mainPersona];

        sendLog(`[SYSTEM] Persona cluster: ${agents.map(a => a.name.toUpperCase()).join(' | ')}`, 'info');

        // Phase 1: Interactive Agent Initialization
        agents.forEach(a => {
            onEvent?.('researcher_start', {
                researcherId: a.id,
                researcherName: a.name,
                type: a.id
            });
        });

        // Phase 2: Parallel Research Execution
        sendLog(`[STILLWATER] Dispatching multi-agent research team led by ${mainPersona?.name || 'Researcher'}...`, 'info');
        
        const results = await researchOrchestrator.conductResearch(
            topic, 
            'standard', // depth
            finalTeamIds, // Deploy the dynamic team
            (msg) => {
                // Update specific agent steps in UI
                const agentMatch = msg.match(/^\[(.*?)\] (.*)/);
                if (agentMatch) {
                    const agentName = agentMatch[1];
                    const stepLabel = agentMatch[2];
                    const agent = agents.find(a => a?.name === agentName);
                    if (agent) {
                        onEvent?.('researcher_step', {
                            researcherId: agent.id,
                            stepId: `step-${agent.id}-${Date.now()}`,
                            stepLabel
                        });
                    }
                }
                sendLog(msg, 'info');
            }
        );

        // Phase 3: Consolidation & De-duplication
        sendLog(`[STILLWATER] Consolidation engine processing ${results.length} research streams...`, 'info');
        
        // De-duplicate sources by URL
        const uniqueSourcesMap = new Map();
        results.forEach(r => {
            (r.sources || []).forEach(s => {
                if (!uniqueSourcesMap.has(s.url)) {
                    uniqueSourcesMap.set(s.url, { ...s, id: `source-${uniqueSourcesMap.size}` });
                }
            });
        });

        // De-duplicate facts by statement content
        const uniqueFactsMap = new Map();
        results.forEach(r => {
            (r.facts || []).forEach(f => {
                const key = f.statement.toLowerCase().trim();
                if (!uniqueFactsMap.has(key)) {
                    uniqueFactsMap.set(key, { ...f, id: `fact-${uniqueFactsMap.size}` });
                }
            });
        });

        // De-duplicate quotes by text
        const uniqueQuotesMap = new Map();
        results.forEach(r => {
            (r.quotes || []).forEach(q => {
                const key = q.text.toLowerCase().trim();
                if (!uniqueQuotesMap.has(key)) {
                    uniqueQuotesMap.set(key, q);
                }
            });
        });

        // De-duplicate outline items
        const uniqueOutline = Array.from(new Set(results.flatMap(r => r.outline || [])));

        const aggregated = {
            sources: Array.from(uniqueSourcesMap.values()),
            facts: Array.from(uniqueFactsMap.values()),
            quotes: Array.from(uniqueQuotesMap.values()),
            outline: uniqueOutline,
            summary: results.map(r => {
                const persona = personaMap.get(r.agent!);
                const engine = r.engine || 'standard-agent';
                return `### ${persona?.name || 'Researcher'} Perspective [via ${engine}]\n${r.summary || 'No summary provided.'}`;
            }).join('\n\n'),
            logs: Array.from(new Set(results.flatMap(r => r.logs || [])))
        };

        // Notify completion for each researcher UI element
        agents.forEach(a => {
            if (a) {
                onEvent?.('researcher_complete', { researcherId: a.id });
            }
        });

        sendLog(`[SYSTEM] Research synthesized successfully. ${aggregated.sources.length} sources and ${aggregated.facts.length} facts discovered.`, 'success');

        return aggregated;
    }
}

