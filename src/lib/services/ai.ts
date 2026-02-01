import { GoogleAuth } from 'google-auth-library';
import { VertexAI, GenerativeModel } from '@google-cloud/vertexai';
import { getConfig, getEnvironmentMode, EnvironmentMode } from '../config/environment';
import { analyticsServerService } from './analytics-server';
import path from 'path';
import axios from 'axios';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Script, ScriptSection, VisualStyle, ViralCandidate } from '@/types';
import { videoEngine } from './video-engine';

let vertexAI: VertexAI | null = null;

// Helper to get Vertex AI client with specific config
function getVertexAI(): VertexAI {
    if (vertexAI) return vertexAI;

    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'heidless-firebase-2';

    // Check for service account file
    const rootSaPath = path.resolve(process.cwd(), 'service-account.json');
    const hasKeyFile = fs.existsSync(rootSaPath);

    console.log(`[AI Service] Initializing Vertex AI for project: ${projectId} (Keyfile: ${hasKeyFile})`);

    vertexAI = new VertexAI({
        project: projectId,
        location: 'us-central1',
        googleAuthOptions: hasKeyFile ? {
            keyFile: rootSaPath,
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        } : {
            // No keyfile - will fall back to ADC (works automatically on Cloud Run)
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        }
    });

    return vertexAI;
}

// Helper to get an access token for direct REST calls (required for specialized models like Imagen 3)
async function getAccessToken(): Promise<string | null | undefined> {
    const rootSaPath = path.resolve(process.cwd(), 'service-account.json');
    const hasKeyFile = fs.existsSync(rootSaPath);

    const auth = new GoogleAuth({
        keyFile: hasKeyFile ? rootSaPath : undefined,
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
            if (lowerPrompt.includes('art director') || lowerPrompt.includes('visual cue')) {
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

    const startTime = Date.now();

    try {
        const client = getVertexAI();
        console.log(`[AI Service] Calling Vertex AI with model: ${config.ai.model}...`);
        const model = client.getGenerativeModel({
            model: config.ai.model,
            generationConfig: {
                maxOutputTokens: config.ai.maxTokens,
                temperature: 0.2,
            }
        });

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Log usage
        await analyticsServerService.logUsage({
            service: 'vertex-ai',
            operation: 'script-generation',
            model: config.ai.model,
            inputCount: prompt.length,
            outputCount: text.length,
            executionTimeMs: Date.now() - startTime,
        }, mode);

        return text;
    } catch (error: any) {
        console.error('[AI Service] Vertex AI Fatal error:', error.message);
        if (error.stack) console.error(error.stack);
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

    try {
        const response = await generateContent(prompt, envMode);
        const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (error: any) {
        console.error('[AI Service] Failed to generate or parse script, returning fallback:', error.message);
        return {
            sections: [{
                title: 'Story of ' + title,
                content: `In the quiet of eons passed, ${title} emerged from the shadows of time. We journey through its vast landscapes and silent whispers...`,
                wordCount: 25
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
    envMode?: EnvironmentMode,
    visualStyle: VisualStyle = 'cinematic'
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
        The overall visual style for this documentary is: ${visualStyle.toUpperCase()}.
        
        For the following script section, ${cueCountPrompt}
        Each cue represents a high-quality, atmospheric piece of imagery that should be on screen.

        SECTION TITLE: ${sectionTitle}
        CONTENT: ${sectionContent}

        GUIDELINES:
        1. Aesthetic: ${visualStyle}, high-dynamic-range, often slow-moving or static. Ensure the description leans into the ${visualStyle} look.
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

export async function generateImage(
    prompt: string,
    envMode?: EnvironmentMode,
    visualStyle: VisualStyle = 'cinematic',
    retryCount = 0
): Promise<Buffer | string> {
    const overrideMode = envMode || getEnvironmentMode();
    const config = getConfig(overrideMode);
    const startTime = Date.now();

    console.log(`[generateImage] envMode: ${overrideMode}, config.ai.model: ${config.ai.model}`);

    if (config.ai.model === 'mock') {
        // Pseudo-random selection based on visual style to give some variety
        // Note: Real style changes require STAGING or PROD environment
        const placeholders = [
            'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b', // Mountains
            'https://images.unsplash.com/photo-1506744038136-46273834b3fb', // Valley
            'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a', // Stars
            'https://images.unsplash.com/photo-1501785888041-af3ef285b470', // Coast
            'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1', // Sunrise
            'https://images.unsplash.com/photo-1518066000714-58c45f1a2c0a', // Oil Painting feel
            'https://images.unsplash.com/photo-1563089145-599997674d42', // Neon/Cyber
            'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9', // Abstract/Watercolor
        ];

        let index = Math.floor(Math.random() * placeholders.length);

        // Simple mapping to try and match style if possible
        if (visualStyle === 'cyberpunk') index = 6;
        if (visualStyle === 'oil-painting') index = 5;
        if (visualStyle === 'watercolor') index = 7;

        const randomSig = Math.floor(Math.random() * 1000000) + Date.now();
        return `${placeholders[index]}?auto=format&fit=crop&q=80&w=1000&sig=${randomSig}`;
    }

    try {
        const accessToken = await getAccessToken();
        const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

        if (!accessToken || !projectId) {
            throw new Error('Authentication or Project ID missing for REST API');
        }

        const STYLE_METADATA: Record<VisualStyle, string> = {
            'cinematic': 'cinematic, high dynamic range, photorealistic, highly detailed, atmospheric sleep documentary style, 8k resolution',
            'anime': 'high-quality anime style, vibrant colors, expressive lighting, detailed backgrounds, Makoto Shinkai aesthetic',
            'studio-ghibli': 'hand-painted studio ghibli aesthetic, charming, soft lighting, lush landscapes, Hayao Miyazaki style',
            'cyberpunk': 'cyberpunk noir, neon lighting, rainy atmosphere, futuristic urban landscapes, high contrast, cinematic',
            'oil-painting': 'classic oil painting on canvas, visible brushstrokes, rich textures, masterpieces quality, artistic lighting',
            'national-geographic': 'national geographic photography, professional wildlife/nature photo, tack sharp, natural lighting, documentary style',
            'vaporwave': 'vaporwave aesthetic, 80s retro, pastel pink and blue gradients, surreal landscapes, lo-fi nostalgic vibe',
            'watercolor': 'expressive watercolor painting, soft edges, paper texture, artistic wash, delicate details',
            'sketch': 'detailed charcoal and pencil sketch, artistic cross-hatching, hand-drawn aesthetic, high contrast black and white'
        };

        const stylePrompt = STYLE_METADATA[visualStyle] || STYLE_METADATA['cinematic'];
        const enhancedPrompt = `${stylePrompt}: ${prompt}`;

        const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/imagen-3.0-generate-001:predict`;

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
            },
            timeout: 90000 // 90 second timeout for image generation
        });

        // Some versions of the API return 'predictions' directly, others wrap it
        const predictions = response.data?.predictions;
        if (predictions && predictions.length > 0) {
            const result = predictions[0];
            const base64Data = result.bytesBase64Encoded || result.mimeType ? result.bytesBase64Encoded : result;

            if (typeof base64Data === 'string' && base64Data.length > 100) {
                console.log(`[AI Service] Successfully synthesized real AI image via REST API`);

                // Log usage
                await analyticsServerService.logUsage({
                    service: 'vertex-ai',
                    operation: 'image-generation',
                    model: 'imagen-3.0-generate-001',
                    inputCount: prompt.length,
                    outputCount: 1,
                    executionTimeMs: Date.now() - startTime,
                }, overrideMode);

                return Buffer.from(base64Data, 'base64');
            }
        }

        throw new Error('Malformed or empty response from Vertex AI REST API');

    } catch (error: any) {
        console.error('[AI Service] Image Gen Error:', error.message);

        // Handle Rate Limiting (429) and simple retries
        if (error.response?.status === 429 && retryCount < 3) {
            const delay = Math.pow(2, retryCount) * 1000 + (Math.random() * 1000);
            console.warn(`[AI Service] Rate limited (429). Retrying in ${Math.round(delay)}ms... (Attempt ${retryCount + 1})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return generateImage(prompt, envMode, visualStyle, retryCount + 1);
        }

        // Fallback to randomized Unsplash if real AI fails in STAGING/PRODUCTION
        const placeholders = [
            'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b',
            'https://images.unsplash.com/photo-1506744038136-46273834b3fb',
        ];
        const index = Math.floor(Math.random() * placeholders.length);
        const randomSig = Math.floor(Math.random() * 1000000);
        return `${placeholders[index]}?auto=format&fit=crop&q=80&w=1000&sig=${randomSig}&err=api_fail`;
    }
}

/**
 * Analyzes a script to generate a cinematic thumbnail prompt for Imagen 3.0.
 */
export async function generateThumbnailPrompt(script: any, envMode?: EnvironmentMode): Promise<string> {
    const prompt = `
        You are an expert YouTube thumbnail designer for a cinematic documentary channel.
        Analyze the following documentary script and create a single, high-impact visual description for a thumbnail.
        
        DOCUMENTARY TITLE: ${script.title}
        SCRIPT SUMMARY: ${script.sections.map((s: any) => s.title).join(', ')}
        
        GOAL: Create a thumbnail that is:
        1. Eye-catching and high-contrast
        2. Highly atmospheric and sleep-calming (yet intriguing)
        3. Focused on a single, powerful subject or landscape
        4. Photorealistic and high-fidelity
        
        Provide only the visual description, no other text.
    `;

    try {
        return await generateContent(prompt, envMode);
    } catch (error: any) {
        console.error('Failed to generate thumbnail prompt:', error.message);
        return `A cinematic visualization of ${script.title}: atmospheric, high-fidelity, and sleep-inducing style.`;
    }
}

/**
 * Uses Gemini to generate optimized YouTube titles, description, and tags.
 */
export async function generateSEOMetadata(script: any, envMode?: EnvironmentMode): Promise<{ titles: string[], description: string, tags: string[] }> {
    const prompt = `
        You are a YouTube SEO expert specializing in highly-viral documentaries.
        Analyze the following script and generate optimized metadata for a 4K documentary launch.

        DOCUMENTARY TITLE: ${script.title}
        SCRIPT CONTENT: ${script.sections.map((s: any) => s.content.substring(0, 300)).join('\n\n')}

        REQUIRED OUTPUT (Strict JSON format):
        {
          "titles": ["Three distinct, high-click-through-rate titles that prioritize mystery and atmosphere"],
          "description": "A 200+ word deep-dive description that includes internal keywords, timestamps for sections, and a calming call-to-action.",
          "tags": ["15 relevant, high-traffic SEO tags"]
        }
    `;

    try {
        const response = await generateContent(prompt, envMode);
        const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);
    } catch (error: any) {
        console.error('Failed to generate or parse SEO metadata, returning fallback:', error.message);
        return {
            titles: [script.title, `${script.title} (Cinematic Documentary)`, `The Mystery of ${script.title}`],
            description: `A calming exploration of ${script.title}.`,
            tags: ["documentary", "sleep", "calming", script.title.toLowerCase()]
        };
    }
}

/**
 * Translates a script into the target language while preserving the calming sleep tone.
 * Uses Gemini to ensure high-quality, natural-sounding translations.
 */
export async function translateScript(
    script: { title: string; sections: ScriptSection[] },
    targetLanguage: string,
    envMode?: EnvironmentMode
): Promise<{ title: string; sections: ScriptSection[] }> {
    const languageNames: Record<string, string> = {
        'es-ES': 'Spanish (Spain)',
        'fr-FR': 'French (France)',
        'de-DE': 'German (Germany)',
        'ja-JP': 'Japanese',
        'pt-BR': 'Portuguese (Brazil)',
    };

    const langName = languageNames[targetLanguage] || targetLanguage;

    const prompt = `
        You are a world-class translator specializing in calming, documentary-style content.
        Translate the following documentary script into ${langName}.
        
        IMPORTANT GUIDELINES:
        1. Maintain the slow, calming, and sleep-inducing tone of the original.
        2. Use soft, gentle vocabulary appropriate for ${langName}.
        3. Preserve the structure (title + sections with titles and content).
        4. Keep pacing natural for spoken narration in ${langName}.
        
        ORIGINAL SCRIPT:
        Title: ${script.title}
        
        Sections:
        ${script.sections.map((s, i) => `${i + 1}. "${s.title}": ${s.content.substring(0, 1000)}`).join('\n\n')}
        
        FORMAT YOUR OUTPUT AS JSON.
        YOU MUST RETURN THE EXACT SAME NUMBER OF SECTIONS.
        YOU MUST PRESERVE ITEM IDs IF PROVIDED.
    `;

    try {
        const response = await generateContent(prompt, envMode);
        const cleaned = response.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
        const parsed = JSON.parse(cleaned);

        // Merge translated text with original visual cues
        const mappedSections = script.sections.map((originalSection, i) => {
            const translated = parsed.sections[i] || parsed.sections[0]; // Fallback
            return {
                ...originalSection,
                title: translated.title || originalSection.title,
                content: translated.content || originalSection.content,
                wordCount: translated.wordCount || originalSection.wordCount,
                audioUrl: null, // Set to null for Firestore compatibility
                audioStatus: 'pending' as const,
                id: uuidv4(), // New ID for new script version
            };
        });

        console.log(`[AI Service] Successfully translated script to ${langName}`);
        return {
            title: parsed.title,
            sections: mappedSections
        };
    } catch (error: any) {
        console.error(`[AI Service] Translation failed for ${langName}:`, error.message);
        // Return a simple fallback with "[TRANSLATION PENDING]" markers
        return {
            title: `[${targetLanguage.toUpperCase()}] ${script.title}`,
            sections: script.sections.map(s => ({
                ...s,
                id: uuidv4(),
                title: `[${targetLanguage.toUpperCase()}] ${s.title}`,
                content: `[Translation to ${langName} pending] ${s.content}`,
                audioUrl: null,
                audioStatus: 'pending' as const
            }))
        };
    }
}

/**
 * Analyzes a script to find 3 segments with high viral potential for Shorts (30-60s).
 */
export async function findViralClipCandidates(script: Script, overrideMode?: EnvironmentMode): Promise<ViralCandidate[]> {
    const mode = overrideMode || getEnvironmentMode();

    // In DEV mode, return mock candidates unless explicitly in real AI mode
    if (mode === 'DEV') {
        const sectionCount = script.sections.length;
        // Ensure we don't go out of bounds for short scripts
        const safeEnd = Math.max(0, sectionCount - 1);
        const safeStart = Math.max(0, safeEnd - 2);

        // Helper to get real scene indices for mock data
        const timeline = videoEngine.calculateTimeline(script);
        const getSceneIndexForSection = (secIdx: number, isEnd: boolean) => {
            const safeSecIdx = Math.min(Math.max(0, secIdx), sectionCount - 1);
            const secId = script.sections[safeSecIdx].id;
            if (isEnd) {
                // Find last scene of this section
                for (let i = timeline.length - 1; i >= 0; i--) {
                    if (timeline[i].sectionId === secId) return i;
                }
                return timeline.length - 1;
            } else {
                // Find first scene of this section
                return timeline.findIndex(s => s.sectionId === secId);
            }
        };

        return [
            {
                title: "The Mystery of Deep Sleep",
                description: "A fascinating look at what happens to the brain during Stage 3 sleep.",
                startSceneIndex: getSceneIndexForSection(Math.floor(sectionCount * 0.2), false),
                endSceneIndex: getSceneIndexForSection(Math.floor(sectionCount * 0.3), true),
                estimatedDuration: 45,
                viralScore: 92,
                reasoning: "High-interest scientific fact with a strong hook about brain cleanup.",
                hookType: "fact"
            },
            {
                title: "Midnight Brain Storm",
                description: "Explaining REM sleep and the sudden fire of neurons.",
                startSceneIndex: getSceneIndexForSection(Math.floor(sectionCount * 0.5), false),
                endSceneIndex: getSceneIndexForSection(Math.floor(sectionCount * 0.6), true),
                estimatedDuration: 35,
                viralScore: 88,
                reasoning: "Fast-paced visual potential and intriguing question about why we dream.",
                hookType: "question"
            },
            {
                title: "The 3 AM Revelation",
                description: "Why we wake up at 3 AM and how to get back to sleep.",
                startSceneIndex: getSceneIndexForSection(Math.floor(sectionCount * 0.7), false),
                endSceneIndex: getSceneIndexForSection(safeEnd, true),
                estimatedDuration: 55,
                viralScore: 95,
                reasoning: "Extremely relatable problem with an immediate actionable solution.",
                hookType: "mystery"
            }
        ];
    }

    const prompt = `
        As a YouTube Shorts Growth Expert, analyze the following documentary script and identify exactly 3 segments that would make excellent 30-60 second vertical "Shorts".
        
        A good short must have:
        1. A strong hook in the first 3 seconds.
        2. A cohesive "mini-story" or curiosity loop.
        3. High engagement potential (surprising facts, relatable problems, or intense imagery).
        
        Script Sections:
        ${script.sections.map((s, i) => `[Scene ${i}]: ${s.content}`).join('\n')}
        
        Return ONLY a JSON array of 3 objects with this structure:
        {
            "title": "Hooky Title",
            "description": "Short social media description",
            "startSceneIndex": number,
            "endSceneIndex": number,
            "estimatedDuration": number,
            "viralScore": 0-100,
            "reasoning": "Why this segment will go viral",
            "hookType": "fact" | "question" | "mystery" | "cinematic"
        }
    `;

    try {
        const response = await generateContent(prompt, mode);
        // Extract JSON
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error('Failed to parse viral candidates JSON');
        const rawCandidates = JSON.parse(jsonMatch[0]);

        // CALCULATE VISUAL TIMELINE TO MAP SECTIONS -> SCENES
        const fullTimeline = videoEngine.calculateTimeline(script);

        // Helper to translate Section Index -> Scene Index
        const mapSectionToScene = (sectionIndex: number, isEnd: boolean): number => {
            if (sectionIndex < 0) return 0;
            if (sectionIndex >= script.sections.length) return fullTimeline.length - 1;

            const targetSectionId = script.sections[sectionIndex].id;

            if (isEnd) {
                // Find the LAST scene belonging to this section
                for (let i = fullTimeline.length - 1; i >= 0; i--) {
                    if (fullTimeline[i].sectionId === targetSectionId) return i;
                }
                return fullTimeline.length - 1; // Fallback
            } else {
                // Find the FIRST scene belonging to this section
                const idx = fullTimeline.findIndex(s => s.sectionId === targetSectionId);
                return idx === -1 ? 0 : idx;
            }
        };

        // Remap the candidates
        return rawCandidates.map((c: any) => ({
            ...c,
            startSceneIndex: mapSectionToScene(c.startSceneIndex, false),
            endSceneIndex: mapSectionToScene(c.endSceneIndex, true)
        }));
    } catch (error) {
        console.error('[findViralClipCandidates] Error:', error);
        // Fallback to segments of the script if AI fails
        return [
            {
                title: "Fascinating Fact",
                description: "A snippet from our documentary.",
                startSceneIndex: 0,
                endSceneIndex: Math.min(2, script.sections.length - 1),
                estimatedDuration: 30,
                viralScore: 70,
                reasoning: "Automatic fallback selection.",
                hookType: "fact"
            }
        ];
    }
}
