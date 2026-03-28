/**
 * Engine ID to human-readable label mapping.
 */
export const ENGINE_LABELS: Record<string, string> = {
    'gemini-2.5-flash': 'Gemini 2.5 Flash',
    'gemini-2.5-pro': 'Gemini 2.5 Pro',
    'perplexity-sonar': 'Perplexity Sonar',
    'tavily-search': 'Tavily Search',
};

/**
 * Returns a human-readable label for a research engine ID.
 */
export function getEngineLabel(engineId: string): string {
    return ENGINE_LABELS[engineId] || engineId;
}

/**
 * Returns a list of human-readable labels for a list of engine IDs.
 */
export function getEngineLabels(engineIds: string[] = []): string[] {
    return engineIds.map(getEngineLabel);
}
