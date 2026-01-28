import { NextRequest, NextResponse } from 'next/server';
import { generateSpeech } from '@/lib/services/tts';
import { cookies } from 'next/headers';
import { EnvironmentMode } from '@/lib/config/environment';

export async function POST(req: NextRequest) {
    try {
        const { voiceProfile, languageCode = 'en-US' } = await req.json();

        if (!voiceProfile) {
            return NextResponse.json({ error: 'voiceProfile is required' }, { status: 400 });
        }

        const sampleText = getSampleText(voiceProfile);

        const cookieStore = await cookies();
        const envMode = cookieStore.get('x-env-mode')?.value as EnvironmentMode;

        const audioBuffer = await generateSpeech(
            sampleText,
            envMode,
            languageCode,
            voiceProfile
        );

        return new NextResponse(new Uint8Array(audioBuffer), {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': audioBuffer.length.toString(),
            },
        });

    } catch (error: any) {
        console.error('[TTS Sample API] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

function getSampleText(profile: string): string {
    switch (profile) {
        case 'soft':
            return "This is my soft voice, gentle and soothing, perfect for light science or meditation.";
        case 'deep':
            return "This is my deep voice, resonant and authoritative, ideal for history and mysteries.";
        case 'whisper':
            return "This is my whisper voice, intimate and quiet, designed for the deepest relaxation.";
        default:
            return "This is my standard voice, balanced and clear, perfect for general educational content.";
    }
}
