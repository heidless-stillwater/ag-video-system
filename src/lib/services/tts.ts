import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { getConfig, EnvironmentMode } from '../config/environment';

let ttsClient: TextToSpeechClient | null = null;

/**
 * Initializes and returns the Text-to-Speech client.
 */
function getTTSClient(): TextToSpeechClient {
    if (ttsClient) return ttsClient;

    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    // The client will automatically pick up credentials from GOOGLE_APPLICATION_CREDENTIALS
    ttsClient = new TextToSpeechClient({
        projectId,
    });

    return ttsClient;
}

/**
 * Generates an MP3 audio buffer from text using Google Cloud Text-to-Speech.
 * Optimized for sleep documentaries (slow pacing, calming pitch).
 */
export async function generateSpeech(text: string, envMode?: EnvironmentMode): Promise<Buffer> {
    const client = getTTSClient();
    const config = getConfig(envMode);

    // Use SSML to add pauses and control pacing more precisely
    // We split by paragraphs and add a 3-second break between them
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
    const ssml = `
        <speak>
            <prosody rate="${config.tts.speakingRate}" pitch="-3st">
                ${paragraphs.join('<break time="3s"/>')}
            </prosody>
        </speak>
    `;

    const request = {
        input: { ssml },
        voice: {
            languageCode: 'en-US',
            name: 'en-US-Neural2-J', // A deep, calming male voice (or en-US-Studio-O/Q for high quality)
        },
        audioConfig: {
            audioEncoding: 'MP3' as const,
            effectsProfileId: ['small-bluetooth-speaker-class-device'], // Optimized for typical sleep listening
        },
    };

    try {
        const [response] = await client.synthesizeSpeech(request);
        return response.audioContent as Buffer;
    } catch (error) {
        console.error('[TTS Service] Speech synthesis error:', error);
        throw error;
    }
}
