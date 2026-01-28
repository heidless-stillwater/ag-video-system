import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { getConfig, EnvironmentMode } from '../config/environment';
import { analyticsServerService } from './analytics-server';

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
 * Map of sleep-optimized voices for each supported language and profile.
 */
const SLEEP_VOICES: Record<string, Record<string, { languageCode: string; voiceName: string }>> = {
    'en-US': {
        standard: { languageCode: 'en-US', voiceName: 'en-US-Neural2-J' },
        soft: { languageCode: 'en-US', voiceName: 'en-US-Neural2-F' },
        deep: { languageCode: 'en-US', voiceName: 'en-US-Neural2-D' },
        whisper: { languageCode: 'en-US', voiceName: 'en-US-Neural2-H' },
    },
    'es-ES': {
        standard: { languageCode: 'es-ES', voiceName: 'es-ES-Neural2-A' },
        soft: { languageCode: 'es-ES', voiceName: 'es-ES-Neural2-A' }, // Fallback for now
        deep: { languageCode: 'es-ES', voiceName: 'es-ES-Neural2-B' },
        whisper: { languageCode: 'es-ES', voiceName: 'es-ES-Neural2-A' },
    },
    // ... add more as needed
};

/**
 * Generates an MP3 audio buffer from text using Google Cloud Text-to-Speech.
 * Optimized for sleep documentaries (slow pacing, calming pitch).
 * @param text The text to synthesize.
 * @param envMode The environment mode.
 * @param languageCode Optional language code (e.g., 'es-ES'). Defaults to 'en-US'.
 * @param voiceProfile Optional voice profile (e.g., 'soft'). Defaults to 'standard'.
 */
export async function generateSpeech(
    text: string,
    envMode?: EnvironmentMode,
    languageCode: string = 'en-US',
    voiceProfile: string = 'standard'
): Promise<Buffer> {
    const client = getTTSClient();
    const config = getConfig(envMode);

    const langVoices = SLEEP_VOICES[languageCode] || SLEEP_VOICES['en-US'];
    const voiceConfig = langVoices[voiceProfile] || langVoices['standard'];

    // Profile-specific SSML modifiers
    let pitch = "-3st";
    let volumeGain = "0dB";
    let speed = config.tts.speakingRate;

    if (voiceProfile === 'soft') {
        pitch = "-1st";
        speed = Math.max(0.6, speed - 0.05);
    } else if (voiceProfile === 'deep') {
        pitch = "-6st";
    } else if (voiceProfile === 'whisper') {
        pitch = "-1st";
        volumeGain = "-3dB";
        speed = Math.max(0.6, speed - 0.1);
    }

    // Helper to escape XML special characters for SSML
    const escapeXml = (unsafe: string) => {
        return unsafe.replace(/[<>&"']/g, (c) => {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '"': return '&quot;';
                case "'": return '&apos;';
                default: return c;
            }
        });
    };

    // Use SSML to add pauses and control pacing more precisely
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
    const ssml = `
        <speak>
            <prosody rate="${speed}" pitch="${pitch}" volume="${volumeGain}">
                ${paragraphs.map(p => escapeXml(p)).join('<break time="3s"/>')}
            </prosody>
        </speak>
    `;

    const request = {
        input: { ssml },
        voice: {
            languageCode: voiceConfig.languageCode,
            name: voiceConfig.voiceName,
        },
        audioConfig: {
            audioEncoding: 'MP3' as const,
            effectsProfileId: ['small-bluetooth-speaker-class-device'],
        },
    };

    try {
        const startTime = Date.now();
        const [response] = await client.synthesizeSpeech(request);

        await analyticsServerService.logUsage({
            service: 'google-tts',
            operation: 'speech-synthesis',
            model: voiceConfig.voiceName,
            inputCount: text.length,
            executionTimeMs: Date.now() - startTime,
        }, envMode);

        return response.audioContent as Buffer;
    } catch (error) {
        console.error('[TTS Service] Speech synthesis error:', error);
        throw error;
    }
}
