import { IResearchStrategy } from './types';
import { GeminiStrategy } from './strategies/GeminiStrategy';
import { MockStrategy } from './strategies/MockStrategy';
import { PerplexityStrategy } from './strategies/PerplexityStrategy';
import { TavilyStrategy } from './strategies/TavilyStrategy';

class ResearchEngineRegistry {
    private static instance: ResearchEngineRegistry;
    private strategies: Map<string, IResearchStrategy> = new Map();

    private constructor() {
        // Automatically register standard strategies
        this.register(new GeminiStrategy());
        this.register(new MockStrategy());
        this.register(new PerplexityStrategy());
        this.register(new TavilyStrategy());
    }

    public static getInstance(): ResearchEngineRegistry {
        if (!ResearchEngineRegistry.instance) {
            ResearchEngineRegistry.instance = new ResearchEngineRegistry();
        }
        return ResearchEngineRegistry.instance;
    }

    public register(strategy: IResearchStrategy) {
        this.strategies.set(strategy.id, strategy);
    }

    public get(id: string): IResearchStrategy | undefined {
        return this.strategies.get(id);
    }

    public getAllIds(): string[] {
        return Array.from(this.strategies.keys());
    }
}

export const researchRegistry = ResearchEngineRegistry.getInstance();
