export interface ResearchGlobalConfig {
    maxRecursiveDepth: number;     // How many levels of follows-up research allowed
    diversityIndex: number;        // 1-10, controls how much agents must deviate from each other
    modelFallbacks: string[];      // Ordered list of engines to try if primary fails
    defaultDepth: 'glance' | 'standard' | 'deep';
    maxSourcesPerAgent: number;
    enableLiveWebGrounding: boolean;
}

export const DEFAULT_RESEARCH_CONFIG: ResearchGlobalConfig = {
    maxRecursiveDepth: 3,
    diversityIndex: 7,
    modelFallbacks: ['gemini-2.5-flash', 'mock-engine'], // 'gemini-2.5-flash' is the GeminiStrategy registry ID
    defaultDepth: 'standard',
    maxSourcesPerAgent: 10,
    enableLiveWebGrounding: true
};

export interface PersonaConfig {
    id: string;
    isEnabled: boolean;
    weight: number; // Importance in final synthesis
}
