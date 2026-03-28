
import { ResearchLog, ResearchCallbacks } from './StillwaterResearchService';

/**
 * Stillwater Discovery Provider
 * Manages the multi-agent discovery and refinement phases of the research process.
 * This provider handles the parallel execution of specialized research agents.
 */

export interface Researcher {
    id: string;
    name: string;
    type: string;
}

export class ResearchDiscoveryProvider {
    private researchers: Researcher[] = [
        { id: 'hist-01', name: 'Stillwater Historian', type: 'historical' },
        { id: 'tech-01', name: 'Stillwater Technical Explorer', type: 'technical' },
        { id: 'cult-01', name: 'Stillwater Cultural Analyst', type: 'cultural' }
    ];

    /**
     * Executes the initial discovery phase with multiple agents.
     */
    async runDiscovery(topic: string, callbacks?: ResearchCallbacks): Promise<void> {
        const { onEvent } = callbacks || {};

        // Notify that researchers have started
        this.researchers.forEach(r => {
            onEvent?.('researcher_start', {
                researcherId: r.id,
                researcherName: r.name,
                type: r.type
            });
        });

        // Parallel Phase 1: Discovery Steps
        await Promise.all([
            this.executeStep('hist-01', { id: 'h1', label: 'Archival Deep Dive' }, 1500, callbacks),
            this.executeStep('tech-01', { id: 't1', label: 'Protocol Analysis' }, 1200, callbacks),
            this.executeStep('cult-01', { id: 'c1', label: 'Social Sentiment Mapping' }, 1800, callbacks)
        ]);
    }

    /**
     * Executes the post-engine refinement phase.
     */
    async runRefinement(topic: string, callbacks?: ResearchCallbacks): Promise<void> {
        const { onEvent } = callbacks || {};

        // Parallel Phase 2: Refinement Steps
        await Promise.all([
            this.executeStep('hist-01', { id: 'h2', label: 'Historical Timeline Synthesis' }, 1000, callbacks),
            this.executeStep('tech-01', { id: 't2', label: 'Technical Fact Verification' }, 800, callbacks),
            this.executeStep('cult-01', { id: 'c2', label: 'Narrative Framing Review' }, 1100, callbacks)
        ]);

        // Signal completion for all researchers
        this.researchers.forEach(r => {
            onEvent?.('researcher_complete', { researcherId: r.id });
        });
    }

    /**
     * Internal helper to simulate a research step with logs and events.
     */
    private async executeStep(
        researcherId: string, 
        step: { id: string, label: string }, 
        duration: number, 
        callbacks?: ResearchCallbacks
    ) {
        const { onLog, onEvent } = callbacks || {};
        const researcher = this.researchers.find(r => r.id === researcherId)!;
        
        onLog?.({
            researcherId,
            researcherName: researcher.name,
            type: researcher.type,
            stepId: step.id,
            stepLabel: step.label,
            event: 'researcher_step'
        });
        
        // Simulating processing time
        await new Promise(resolve => setTimeout(resolve, duration));
        
        onEvent?.('researcher_step_complete', {
            researcherId,
            stepId: step.id
        });
    }

    /**
     * Returns the list of active researchers managed by this provider.
     */
    getResearchers(): Researcher[] {
        return this.researchers;
    }
}
