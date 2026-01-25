import { TopicSuggestion, Script } from '@/types';
import { google, youtube_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { generateContent } from '@/lib/services/ai';
import { Readable } from 'stream';

const SCOPES = [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.readonly'
];

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
export async function generateTopicSuggestions(broadTopic: string, envMode?: any): Promise<TopicSuggestion[]> {
    const { getConfig } = require('../config/environment');
    const config = getConfig(envMode);

    if (config.ai.model === 'mock') {
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

    try {
        const prompt = `
            You are a YouTube trend analyst and documentary strategist.
            Analyze the broad topic: "${broadTopic}".
            Generate 3-5 specific, sleep-optimized documentary titles and descriptions.
            Focus on topics that are educational, calming, and have high SEO potential for long-form documentaries.
            
            For each suggestion, provide:
            1. title (Compelling and relaxing)
            2. description (Brief overview)
            3. seoScore (0-100)
            4. reasoning (Why this topic is trending or good)
            5. keywords (Array of related terms)
            6. estimatedViews (A realistic range based on the topic)

            Format as a JSON array of objects.
        `;

        const response = await generateContent(prompt, envMode);
        // Robust JSON extraction
        const jsonMatch = response.match(/\[[\s\S]*\]/) || response.match(/\{[\s\S]*\}/);
        const cleaned = jsonMatch ? jsonMatch[0] : response.replace(/```json|```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (error) {
        console.error('[YouTube Service] Failed to generate AI suggestions:', error);
        return [
            {
                title: `${broadTopic}: Deep Exploration`,
                description: `A comprehensive look at ${broadTopic}.`,
                seoScore: 70,
                reasoning: 'Reliable evergreen content.',
                keywords: [broadTopic, 'documentary'],
                estimatedViews: '10k - 50k',
            }
        ];
    }
}

export const youtubeService = {
    getOAuth2Client(): OAuth2Client {
        return new google.auth.OAuth2(
            process.env.YOUTUBE_CLIENT_ID,
            process.env.YOUTUBE_CLIENT_SECRET,
            process.env.NEXT_PUBLIC_YOUTUBE_REDIRECT_URI
        );
    },

    getAuthUrl(state?: string): string {
        const client = this.getOAuth2Client();
        return client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            prompt: 'consent select_account',
            state
        });
    },

    async getTokens(code: string) {
        const client = this.getOAuth2Client();
        const { tokens } = await client.getToken(code);
        return tokens;
    },

    async refreshAccessToken(refreshToken: string) {
        const client = this.getOAuth2Client();
        client.setCredentials({ refresh_token: refreshToken });
        const { credentials } = await client.refreshAccessToken();
        return credentials;
    },

    async generateMetadata(script: Script, envMode?: any) {
        const scriptText = script.sections.map(s => s.content).join('\n\n');
        const prompt = `
            You are a YouTube SEO expert specializing in calming, sleep-inducing documentaries.
            Based on the following documentary script, generate:
            1. A compelling, click-worthy Title (under 100 chars).
            2. A deep, relaxing Description (first 2 lines are most important).
            3. A list of 15 relevant SEO tags.

            SCRIPT CONTENT:
            ${scriptText.substring(0, 10000)}

            Output format: JSON with "title", "description", and "tags" (array).
        `;

        const text = await generateContent(prompt, envMode);
        const jsonStr = text.replace(/```json|```/g, '').trim();
        return JSON.parse(jsonStr) as { title: string; description: string; tags: string[] };
    },

    async getChannelInfo(accessToken: string) {
        const client = this.getOAuth2Client();
        client.setCredentials({ access_token: accessToken });
        const youtube = google.youtube({ version: 'v3', auth: client });

        const response = await youtube.channels.list({
            part: ['snippet', 'id'],
            mine: true
        });

        const channel = response.data.items?.[0];
        if (!channel) throw new Error('No YouTube channel found for this account.');

        return {
            id: channel.id!,
            title: channel.snippet?.title!,
            thumbnailUrl: channel.snippet?.thumbnails?.default?.url!
        };
    },

    async uploadVideo(
        accessToken: string,
        videoStream: Readable,
        metadata: { title: string; description: string; tags: string[] },
        privacy: 'public' | 'unlisted' | 'private' = 'unlisted',
        envMode?: any,
        onProgress?: (progress: number) => void
    ) {
        const { getConfig } = require('../config/environment');
        const config = getConfig(envMode);

        if (config.ai.model === 'mock') {
            console.log('[YouTube Service] Mocking upload (AI model is mock)');
            return {
                id: 'MOCK_VIDEO_ID_' + Math.random().toString(36).substring(7),
                snippet: { title: metadata.title }
            };
        }

        const client = this.getOAuth2Client();
        client.setCredentials({ access_token: accessToken });
        const youtube = google.youtube({ version: 'v3', auth: client });

        const response = await youtube.videos.insert({
            part: ['snippet', 'status'],
            requestBody: {
                snippet: {
                    title: metadata.title,
                    description: metadata.description,
                    tags: metadata.tags,
                    categoryId: '27'
                },
                status: {
                    privacyStatus: privacy,
                    selfDeclaredMadeForKids: false
                }
            },
            media: {
                body: videoStream
            }
        }, {
            onUploadProgress: (evt) => {
                const mbUploaded = (evt.bytesRead / 1024 / 1024).toFixed(2);
                console.log(`[YouTube Upload] Progress: ${mbUploaded} MB uploaded`);

                // If we can't calculate percentage easily without total size, 
                // we'll just pass a value that indicates it's moving
                if (onProgress) {
                    onProgress(evt.bytesRead);
                }
            }
        });

        return response.data;
    }
};
