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
        return `[MOCK RESPONSE for mode ${mode}] This is a mocked AI response for the prompt: ${prompt.substring(0, 50)}...`;
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
