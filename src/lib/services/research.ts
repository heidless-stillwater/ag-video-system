import { ResearchSource, Fact } from '@/types';

export interface WikipediaResult {
    title: string;
    extract: string;
    url: string;
}

export const researchService = {
    /**
     * Searches Wikipedia for a given term and returns an extract
     */
    async searchWikipedia(query: string): Promise<WikipediaResult[]> {
        const endpoint = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts|info&exintro=1&explaintext=1&inprop=url&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=3&origin=*`;

        try {
            const response = await fetch(endpoint, {
                headers: {
                    'User-Agent': 'VideoSystemResearchBot/1.0 (https://github.com/heidless-ai/videosystem)'
                }
            });
            const data = await response.json();

            if (!data.query || !data.query.pages) {
                return [];
            }

            return Object.values(data.query.pages).map((page: any) => ({
                title: page.title,
                extract: page.extract,
                url: page.fullurl,
            }));
        } catch (error) {
            console.error('Wikipedia search error:', error);
            return [];
        }
    },

    /**
     * Orchestrates the research process for a project
     */
    async performAutomatedResearch(topicTitle: string, keywords: string[]): Promise<ResearchSource[]> {
        const allSources: ResearchSource[] = [];

        // Use the title and keywords for searching
        const searchTerms = [topicTitle, ...keywords.slice(0, 2)];

        for (const term of searchTerms) {
            const wikiResults = await this.searchWikipedia(term);
            wikiResults.forEach(res => {
                allSources.push({
                    id: Math.random().toString(36).substr(2, 9),
                    url: res.url,
                    title: res.title,
                    type: 'wikipedia',
                    credibilityScore: 95,
                    extractedContent: res.extract,
                    citations: [],
                });
            });
        }

        // De-duplicate sources by URL
        const uniqueSources = Array.from(new Map(allSources.map(s => [s.url, s])).values());

        return uniqueSources;
    }
};
