import { GoogleAuth } from 'google-auth-library';
import { VertexAI, GenerativeModel } from '@google-cloud/vertexai';
import { getConfig, getEnvironmentMode } from '../config/environment';

let vertexAI: VertexAI | null = null;

function getVertexAI(): VertexAI {
    if (vertexAI) return vertexAI;

    const config = getConfig();
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

    if (!projectId) {
        throw new Error('GOOGLE_CLOUD_PROJECT_ID is not set');
    }

    vertexAI = new VertexAI({
        project: projectId,
        location: 'us-central1', // Default location
    });

    return vertexAI;
}

export async function generateContent(prompt: string): Promise<string> {
    const mode = getEnvironmentMode();
    const config = getConfig();

    if (mode === 'DEV' || config.ai.model === 'mock') {
        if (prompt.toLowerCase().includes('format the output as a json') || prompt.toLowerCase().includes('json array')) {
            // Return structured JSON mocks based on the prompt context
            if (prompt.includes('sections')) {
                return JSON.stringify({
                    sections: [
                        { title: "Introduction", content: "The journey begins in silence and shadow. We invite you to drift into a world of celestial wonder, where time slows down and the mind finds peace. In this space, every breath is a soft sigh of the universe, and every thought is a drifting star in the vast, velvet night. Let go of the day as we embark on this quiet exploration of the cosmic unknown. The horizon is but a suggestion of a dream yet to be dreamed.", wordCount: 80 },
                        { title: "The Cosmic Drift", content: "Stars shimmer like distant memories in the velvet night. They are the eyes of the past, watching over the silent dance of gravity and light. Each constellation tells a story of eons passed, of nebulas forming in the deep dark, and of solar winds whispering across the void. We are but observers in this grand, slow-motion ballet of existence, drifting on the currents of infinity.", wordCount: 85 },
                        { title: "Gentle Awakening", content: "The first light of dawn touches the horizon. It is a soft, amber glow that speaks of renewal and the quiet promise of a new beginning. The world wakes in a hush, as the shadows retreat into the valleys and the mountaintops catch the first warmth of the sun. It is a moment of pure clarity and stillness, a gentle transition from dreams to the waking world, where everything is new again.", wordCount: 80 }
                    ]
                });
            }
            if (prompt.includes('visual "cues"')) {
                const titleMatch = prompt.match(/SECTION TITLE: (.*)/);
                const title = titleMatch ? titleMatch[1] : 'Cinematic visualization';
                const transitionTypes: ('fade' | 'blur' | 'zoom' | 'slide')[] = ['fade', 'blur', 'zoom', 'slide'];

                // Shuffle transitions for this section to ensure variety
                const shiftedTypes = [...transitionTypes].sort(() => Math.random() - 0.5);

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
        }

        // Fallback for non-JSON or other mock prompts
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

/**
 * Generates a full documentary script based on research facts.
 * Optimized for sleep (low arousal, slow pacing, calming vocabulary).
 */
export async function generateDocumentaryScript(
    title: string,
    facts: string[],
    targetDurationMinutes: number = 10
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

    const response = await generateContent(prompt);

    try {
        // Clean the response if it contains markdown code blocks
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

/**
 * Specifically for extracting facts from research content
 */
export async function extractFacts(content: string): Promise<string[]> {
    const prompt = `
        You are a research assistant for a high-quality "sleep documentary" YouTube channel.
        Extract 10-15 interesting, factual, and calming points from the following content.
        Focus on historical details, natural phenomena, or scientific wonders.
        Avoid anything sensationalist, violent, or overly exciting.
        Format as a simple bulleted list.

        CONTENT:
        ${content}
    `;

    const response = await generateContent(prompt);
    return response
        .split('\n')
        .map(line => line.replace(/^[-*•]\s+/, '').trim())
        .filter(line => line.length > 0 && !line.toLowerCase().includes('here are'));
}

/**
 * Generates visual descriptions (prompts) for each part of the script.
 * Returns a set of visual cues with timestamps.
 */
export async function generateVisualCues(
    sectionTitle: string,
    sectionContent: string
): Promise<{
    timestamp: number;
    type: 'image' | 'video';
    description: string;
    transitionType?: 'fade' | 'blur' | 'zoom' | 'slide';
    transitionDuration?: number;
}[]> {
    const prompt = `
        You are an art director for a cinematic, calming documentary channel.
        For the following script section, generate 3-5 visual "cues".
        Each cue represents a high-quality, atmospheric piece of imagery that should be on screen.

        SECTION TITLE: ${sectionTitle}
        CONTENT: ${sectionContent}

        GUIDELINES:
        1. Aesthetic: Cinematic, high-dynamic-range, often slow-moving or static.
        2. Transitions: Every cue should specify a "transitionType" ('fade', 'blur', 'zoom', or 'slide') and a "transitionDuration" in milliseconds (default: 1200).
        3. Format: JSON array of objects with "timestamp", "type", "description", "transitionType", and "transitionDuration".
        4. Pacing: Space the cues evenly or based on content transitions.

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

    const response = await generateContent(prompt);
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

/**
 * Generates an image using Vertex AI Imagen.
 * For DEV mode, returns a placeholder or a beautiful stock-like image prompt.
 */
export async function generateImage(prompt: string): Promise<Buffer | string> {
    const mode = getEnvironmentMode();
    const config = getConfig();

    if (mode === 'DEV' || config.ai.model === 'mock') {
        const placeholders = [
            'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b', // Mountains
            'https://images.unsplash.com/photo-1506744038136-46273834b3fb', // Canyon
            'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a', // Galaxy
            'https://images.unsplash.com/photo-1501785888041-af3ef285b470', // Lake
            'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1', // Sunrise
            'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8', // Forest Fog
            'https://images.unsplash.com/photo-1441974231531-c6227db76b6e', // Forest Sun
            'https://images.unsplash.com/photo-1501854140801-50d01698950b', // Valley
            'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d', // Fall Forest
            'https://images.unsplash.com/photo-1426604966848-d7adac402bff', // Mountain Lake
            'https://images.unsplash.com/photo-1433086966358-54859d0ed716', // Waterfall
            'https://images.unsplash.com/photo-1511497584788-876760111969', // Pine Fog
            'https://images.unsplash.com/photo-1502082553048-f009c37129b9', // Close Up Pine
            'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa', // Space View
        ];

        // Random selection for variety in dev mode
        const index = Math.floor(Math.random() * placeholders.length);
        const randomSig = Math.floor(Math.random() * 1000000);
        return `${placeholders[index]}?auto=format&fit=crop&q=80&w=1000&sig=${randomSig}`;
    }

    // TODO: Implement actual Vertex AI Imagen call using @google-cloud/aiplatform
    // For now, in STAGING/PRODUCTION where we have credentials but might not have fixed Imagen implementation:
    // We'll throw an error or return a high-quality Unsplash search URL as a fallback.
    return `https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=1000`;
}
