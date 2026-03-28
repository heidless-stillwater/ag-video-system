import { researchRegistry } from './ResearchEngineRegistry';
import { MockStrategy } from './strategies/MockStrategy';
import { GeminiStrategy } from './strategies/GeminiStrategy';
import { ResearchRequest, ResearchResult } from './types';

// Self-register built-in strategies
researchRegistry.register(new MockStrategy());
researchRegistry.register(new GeminiStrategy());

export class ResearchCoordinator {
    async startResearch(req: ResearchRequest, onProgress: (msg: string) => void): Promise<ResearchResult> {
        const engineId = req.persona?.engines?.[0] || 'mock-engine';
        const engine = researchRegistry.get(engineId);

        if (!engine) {
            throw new Error(`Research engine not found: ${engineId}`);
        }

        return await engine.execute(req, onProgress);
    }
}

export const researchCoordinator = new ResearchCoordinator();
