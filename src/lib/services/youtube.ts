import { TopicSuggestion } from '@/types';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeTrendResult {
    title: string;
    description: string;
    viewCount: string;
    publishedAt: string;
    thumbnails: {
        default: { url: string };
        medium: { url: string };
        high: { url: string };
    };
}

export async function searchYouTubeTrends(query: string): Promise<YouTubeTrendResult[]> {
    if (!YOUTUBE_API_KEY) {
        throw new Error('YOUTUBE_API_KEY is not configured');
    }

    const response = await fetch(
        `${YOUTUBE_API_URL}/search?part=snippet&q=${encodeURIComponent(
            query + ' documentary'
        )}&type=video&videoDuration=long&maxResults=10&key=${YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`YouTube API error: ${error.error.message}`);
    }

    const data = await response.json();

    // For each video, get statistics to see view count
    const videoIds = data.items.map((item: any) => item.id.videoId).join(',');
    const statsResponse = await fetch(
        `${YOUTUBE_API_URL}/videos?part=statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`
    );

    const statsData = await statsResponse.json();
    const viewCounts: Record<string, string> = {};
    statsData.items.forEach((item: any) => {
        viewCounts[item.id] = item.statistics.viewCount;
    });

    return data.items.map((item: any) => ({
        title: item.snippet.title,
        description: item.snippet.description,
        viewCount: viewCounts[item.id.videoId] || '0',
        publishedAt: item.snippet.publishedAt,
        thumbnails: item.snippet.thumbnails,
    }));
}

/**
 * Uses Gemini (via Vertex AI) to analyze trends and suggest specific topics
 */
export async function generateTopicSuggestions(broadTopic: string): Promise<TopicSuggestion[]> {
    // In DEV mode, return mock suggestions
    if (process.env.NEXT_PUBLIC_ENV_MODE === 'DEV') {
        return [
            {
                title: `${broadTopic}: The Forgotten Empire`,
                description: `A deep dive into the mysterious rise and fall of the ${broadTopic} civilization.`,
                seoScore: 85,
                reasoning: 'High search volume with low competition for long-form content.',
                keywords: [broadTopic, 'history', 'documentary', 'ancient'],
                estimatedViews: '50k - 200k',
            },
            {
                title: `Echoes of ${broadTopic}: Nature's Last Frontier`,
                description: `Exploring the untouched wilderness and hidden secrets of the ${broadTopic} ecosystem.`,
                seoScore: 78,
                reasoning: 'Trending interest in environmental documentaries.',
                keywords: [broadTopic, 'nature', 'wildlife', 'exploration'],
                estimatedViews: '30k - 150k',
            }
        ];
    }

    // TODO: Implement Vertex AI logic for STAGING/PRODUCTION
    // For now, return mock even in other modes until Vertex is wired up
    return [];
}
