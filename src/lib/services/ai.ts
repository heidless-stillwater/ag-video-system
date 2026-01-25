import { GoogleAuth } from 'google-auth-library';
import { VertexAI, GenerativeModel } from '@google-cloud/vertexai';
import { getConfig, getEnvironmentMode, EnvironmentMode } from '../config/environment';
import path from 'path';
import axios from 'axios';

let vertexAI: VertexAI | null = null;

// Helper to get Vertex AI client with specific config
function getVertexAI(envMode?: 'DEV' | 'STAGING' | 'PRODUCTION'): VertexAI {
    if (vertexAI) return vertexAI;

    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

    if (!projectId) {
        throw new Error('GOOGLE_CLOUD_PROJECT_ID is not set');
    }

    const path = require('path');
    const keyFile = path.resolve(process.cwd(), 'service-account.json');

    vertexAI = new VertexAI({
        project: projectId,
        location: 'us-central1',
        googleAuthOptions: {
            keyFile: keyFile,
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        }
    });

    return vertexAI;
}

// Helper to get an access token for direct REST calls (required for specialized models like Imagen 3)
async function getAccessToken(): Promise<string | null | undefined> {
    const keyFile = path.resolve(process.cwd(), 'service-account.json');
    const auth = new GoogleAuth({
        keyFile,
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    const client = await auth.getClient();
    const tokenRes = await client.getAccessToken();
    return tokenRes.token;
}

export async function generateContent(prompt: string, overrideMode?: EnvironmentMode): Promise<string> {
    const mode = overrideMode || getEnvironmentMode();
    const config = getConfig(mode);

    if (mode === 'DEV' || config.ai.model === 'mock') {
        const lowerPrompt = prompt.toLowerCase();
        const isJsonRequest = lowerPrompt.includes('format the output as a json') ||
            lowerPrompt.includes('json array') ||
            lowerPrompt.includes('output format: json') ||
            lowerPrompt.includes('metadata');

        if (isJsonRequest) {
            if (lowerPrompt.includes('sections')) {
                return JSON.stringify({
                    sections: [
                        { title: "Introduction", content: "The journey begins in silence and shadow. We invite you to drift into a world of celestial wonder, where time slows down and the mind finds peace. In this space, every breath is a soft sigh of the universe, and every thought is a drifting star in the vast, velvet night. Let go of the day as we embark on this quiet exploration of the cosmic unknown. The horizon is but a suggestion of a dream yet to be dreamed.", wordCount: 80 },
                        { title: "The Cosmic Drift", content: "Stars shimmer like distant memories in the velvet night. They are the eyes of the past, watching over the silent dance of gravity and light. Each constellation tells a story of eons passed, of nebulas forming in the deep dark, and of solar winds whispering across the void. We are but observers in this grand, slow-motion ballet of existence, drifting on the currents of infinity.", wordCount: 85 },
                        { title: "Gentle Awakening", content: "The first light of dawn touches the horizon. It is a soft, amber glow that speaks of renewal and the quiet promise of a new beginning. The world wakes in a hush, as the shadows retreat into the valleys and the mountaintops catch the first warmth of the sun. It is a moment of pure clarity and stillness, a gentle transition from dreams to the waking world, where everything is new again.", wordCount: 80 }
                    ]
                });
            }
            if (lowerPrompt.includes('visual "cues"') || lowerPrompt.includes('visual cues')) {
                const titleMatch = prompt.match(/SECTION TITLE: (.*)/);
                const title = titleMatch ? titleMatch[1] : 'Cinematic visualization';
                const transitionTypes: ('fade' | 'blur' | 'zoom' | 'slide')[] = ['fade', 'blur', 'zoom', 'slide'];
                const shiftedTypes = [...transitionTypes].sort(() => Math.random() - 0.5);

                if (config.ai.limitAI) {
                    return JSON.stringify([
                        {
                            timestamp: 0,
                            type: "image",
                            description: `${title}: cinematic atmospheric shot (${shiftedTypes[0]}).`,
                            transitionType: shiftedTypes[0],
                            transitionDuration: 1500
                        }
                    ]);
                }

                return JSON.stringify([
                    {
                        timestamp: 0,
                        type: "image",
                        description: `${title}: atmospheric establishment shot (${shiftedTypes[0]}).`,
                        transitionType: shiftedTypes[0],
                        transitionDuration: 1500
                    },
                    {
                        timestamp: 8,
                        type: "image",
                        description: `${title}: detailed cinematic close-up (${shiftedTypes[1]}).`,
                        transitionType: shiftedTypes[1],
                        transitionDuration: 1800
                    },
                    {
                        timestamp: 16,
                        type: "image",
                        description: `${title}: ethereal landscape (${shiftedTypes[2]}).`,
                        transitionType: shiftedTypes[2],
                        transitionDuration: 2000
                    },
                    {
                        timestamp: 24,
                        type: "image",
                        description: `${title}: dramatic motion shot (${shiftedTypes[3]}).`,
                        transitionType: shiftedTypes[3],
                        transitionDuration: 1800
                    }
                ]);
            }
            if (lowerPrompt.includes('youtube seo expert') || lowerPrompt.includes('title", "description", and "tags"')) {
                return JSON.stringify({
                    title: "Celestial Wonders: A Journey Through the Velvet Night",
                    description: "Embark on a calming exploration of the universe. In this episode, we drift through distant galaxies and witness the silent dance of stars. Perfect for deep relaxation and sleep.",
                    tags: ["sleep documentary", "space", "astronomy", "relaxation", "deep sleep", "calming", "celestial", "stars", "universe", "guided sleep", "meditation"]
                });
            }
        }

        return `[MOCK RESPONSE for mode ${mode}]
- The gentle ripples of a mountain lake reflect the starlight.
- Ancient forests hold secrets of time in their deep roots.
- The cosmic dance of galaxies unfolds over billions of years.
- Silver moonlight bathes the quiet valley in a soft glow.
- Rhythmic tides whisper to the shore in a timeless song.`;
    }

    try {
        const client = getVertexAI();
        const model = client.getGenerativeModel({
            model: config.ai.model,
            generationConfig: {
                maxOutputTokens: config.ai.maxTokens,
                temperature: 0.2, // Low temperature for factual consistency
            }
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (error) {
        console.error('Vertex AI error:', error);
        throw error;
    }
}

export async function generateDocumentaryScript(
    title: string,
    facts: string[],
    targetDurationMinutes: number = 10,
    envMode?: EnvironmentMode
): Promise<{ sections: { title: string; content: string; wordCount: number }[] }> {
    const prompt = `
        You are a world-class scriptwriter for a "Sleep Documentary" channel. 
        Your goal is to write a script that is deeply informative but also incredibly calming and sleep-inducing.

        TOPIC: ${title}
        RESEARCH FACTS:
        ${facts.map((f, i) => `${i + 1}. ${f}`).join('\n')}

        GUIDELINES FOR SLEEP OPTIMIZATION:
        1. Tone: Warm, steady, and low-arousal. Use "soft" words (e.g., "gentle," "vast," "drifting," "quiet").
        2. Pacing: Write for a slow delivery (approx. 130 words per minute). 
        3. Structure: 
           - Introduction (setting the scene, grounding the listener).
           - 3 to 4 Body Sections (exploring the facts in a narrative, non-jarring way).
           - Conclusion (gentle drift off).
        4. Avoiding "Hooks": Do not use cliffhangers or exciting language. Focus on the flow of information.
        5. Length: Target approximately ${targetDurationMinutes * 130} words total.

        Format the output as a JSON object with a "sections" array:
        {
          "sections": [
            { "title": "Section Title", "content": "The script content...", "wordCount": 123 }
          ]
        }
    `;

    const response = await generateContent(prompt, envMode);

    try {
        const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (error) {
        console.error('Failed to parse script JSON, returning raw content as single section');
        return {
            sections: [{
                title: 'Full Script',
                content: response,
                wordCount: response.split(/\s+/).length
            }]
        };
    }
}

export async function extractFacts(content: string, envMode?: EnvironmentMode): Promise<string[]> {
    const prompt = `
        You are a research assistant for a high-quality "sleep documentary" YouTube channel.
        Extract 10-15 interesting, factual, and calming points from the following content.
        Focus on historical details, natural phenomena, or scientific wonders.
        Avoid anything sensationalist, violent, or overly exciting.
        Format as a simple bulleted list.

        CONTENT:
        ${content}
    `;

    const response = await generateContent(prompt, envMode);
    return response
        .split('\n')
        .map(line => line.replace(/^[-*•]\s+/, '').trim())
        .filter(line => line.length > 0 && !line.toLowerCase().includes('here are'));
}

export async function generateVisualCues(
    sectionTitle: string,
    sectionContent: string,
    envMode?: EnvironmentMode
): Promise<{
    timestamp: number;
    type: 'image' | 'video';
    description: string;
    transitionType?: 'fade' | 'blur' | 'zoom' | 'slide';
    transitionDuration?: number;
}[]> {
    const config = getConfig(envMode);
    const cueCountPrompt = config.ai.limitAI
        ? "generate exactly 1 high-impact cinematic visual 'cue'."
        : "generate 3-5 visual 'cues'.";

    const prompt = `
        You are an art director for a cinematic, calming documentary channel.
        For the following script section, ${cueCountPrompt}
        Each cue represents a high-quality, atmospheric piece of imagery that should be on screen.

        SECTION TITLE: ${sectionTitle}
        CONTENT: ${sectionContent}

        GUIDELINES:
        1. Aesthetic: Cinematic, high-dynamic-range, often slow-moving or static.
        2. Transitions: Every cue should specify a "transitionType" ('fade', 'blur', 'zoom', or 'slide') and a "transitionDuration" in milliseconds (default: 1200).
        3. Variety: Ensure each cue description is **unique, distinct, and highly varied** compared to the others in the section. Avoid repetition.
        4. Format: JSON array of objects with "timestamp" (in SECONDS, e.g., 8.5 for 8.5 seconds), "type", "description", "transitionType", and "transitionDuration".
        5. Pacing: Space the cues evenly or based on content transitions.
        6. IMPORTANT: Timestamps MUST be in SECONDS. Do not use milliseconds (e.g. use 8, NOT 8000).

        Example Output:
        [
            { 
                "timestamp": 0, 
                "type": "image", 
                "description": "Cinematic wide shot...", 
                "transitionType": "fade", 
                "transitionDuration": 1500 
            }
        ]
    `;

    const response = await generateContent(prompt, envMode);
    try {
        const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (error) {
        console.error('Failed to parse visual cues JSON, returning fallback');
        return [{
            timestamp: 0,
            type: 'image',
            description: `A cinematic visualization of ${sectionTitle}: dreamy, atmospheric, and high quality.`
        }];
    }
}

export async function generateImage(prompt: string, envMode?: EnvironmentMode): Promise<Buffer | string> {
    const config = getConfig(envMode);

    console.log(`[generateImage] envMode: ${envMode}, config.ai.model: ${config.ai.model}`);

    if (config.ai.model === 'mock') {
        const placeholders = [
            'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b',
            'https://images.unsplash.com/photo-1506744038136-46273834b3fb',
            'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a',
            'https://images.unsplash.com/photo-1501785888041-af3ef285b470',
            'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1',
            'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8',
            'https://images.unsplash.com/photo-1441974231531-c6227db76b6e',
            'https://images.unsplash.com/photo-1501854140801-50d01698950b',
            'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d',
            'https://images.unsplash.com/photo-1426604966848-d7adac402bff',
            'https://images.unsplash.com/photo-1433086966358-54859d0ed716',
            'https://images.unsplash.com/photo-1511497584788-876760111969',
            'https://images.unsplash.com/photo-1502082553048-f009c37129b9',
            'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa',
        ];

        const index = Math.floor(Math.random() * placeholders.length);
        const randomSig = Math.floor(Math.random() * 1000000);
        return `${placeholders[index]}?auto=format&fit=crop&q=80&w=1000&sig=${randomSig}`;
    }

    try {
        const accessToken = await getAccessToken();
        const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

        if (!accessToken || !projectId) {
            throw new Error('Authentication or Project ID missing for REST API');
        }

        const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/imagen-3.0-generate-001:predict`;

        const enhancedPrompt = `cinematic, high dynamic range, photorealistic, highly detailed, atmospheric sleep documentray style, 8k resolution: ${prompt}`;

        const payload = {
            instances: [{ prompt: enhancedPrompt }],
            parameters: {
                sampleCount: 1,
                aspectRatio: "16:9"
            }
        };

        console.log(`[AI Service] Calling Imagen 3 REST API for: "${prompt.substring(0, 30)}..."`);
        const response = await axios.post(endpoint, payload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        // Some versions of the API return 'predictions' directly, others wrap it
        const predictions = response.data?.predictions;
        if (predictions && predictions.length > 0) {
            const result = predictions[0];
            const base64Data = result.bytesBase64Encoded || result.mimeType ? result.bytesBase64Encoded : result;

            if (typeof base64Data === 'string' && base64Data.length > 100) {
                console.log(`[AI Service] Successfully synthesized real AI image via REST API`);
                return Buffer.from(base64Data, 'base64');
            }
        }

        console.error('[AI Service] Malformed REST response structure:', JSON.stringify(response.data).substring(0, 500));
        throw new Error('Malformed or empty response from Vertex AI REST API');

    } catch (error: any) {
        // Detailed error logging to see WHY Google is rejecting us
        if (error.response?.data) {
            console.error('[AI Service] Vertex AI REST API REJECTION:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('[AI Service] Vertex AI REST API FATAL error:', error.message);
        }

        // Fallback to randomized Unsplash if real AI fails in STAGING/PRODUCTION
        const placeholders = [
            'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b',
            'https://images.unsplash.com/photo-1506744038136-46273834b3fb',
            'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a',
            'https://images.unsplash.com/photo-1501785888041-af3ef285b470',
            'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1',
        ];
        const index = Math.floor(Math.random() * placeholders.length);
        const randomSig = Math.floor(Math.random() * 1000000);
        return `${placeholders[index]}?auto=format&fit=crop&q=80&w=1000&sig=${randomSig}&err=api_fail`;
    }
}
