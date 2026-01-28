import { NextRequest, NextResponse } from 'next/server';
import { generateSpeech } from '@/lib/services/tts';
import { storageService } from '@/lib/services/storage';
import { getScript, updateScript } from '@/lib/services/firestore-admin';
import { cookies } from 'next/headers';
import { EnvironmentMode } from '@/lib/config/environment';

/**
 * API Route for generating audio for a specific script section.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;

    try {
        const { scriptId, sectionId, voiceProfile } = await req.json();

        if (!scriptId || !sectionId) {
            return NextResponse.json({ error: 'scriptId and sectionId are required' }, { status: 400 });
        }

        // 1. Get Script Details
        const script = await getScript(scriptId);
        if (!script) {
            return NextResponse.json({ error: 'Script not found' }, { status: 404 });
        }

        const section = script.sections.find(s => s.id === sectionId);
        if (!section) {
            return NextResponse.json({ error: 'Section not found' }, { status: 404 });
        }

        // 2. Generate Audio via Google Cloud TTS
        const cookieStore = await cookies();
        const envMode = cookieStore.get('x-env-mode')?.value as EnvironmentMode;
        console.log(`[TTS API] Environment Mode detected: ${envMode || 'DEFAULT'}`);

        console.log(`[TTS API] Generating speech for section: ${section.title} using profile: ${voiceProfile || script.voiceProfile || 'standard'}`);
        const audioBuffer = await generateSpeech(
            section.content,
            envMode,
            script.languageCode || 'en-US',
            voiceProfile || script.voiceProfile || 'standard'
        );

        // 3. Upload to Firebase Storage
        console.log(`[TTS API] Uploading audio to storage...`);
        const audioUrl = await storageService.uploadAudio(projectId, sectionId, audioBuffer);

        // 4. Update Script section in Firestore
        const updatedSections = script.sections.map(s => {
            if (s.id === sectionId) {
                return { ...s, audioUrl, audioStatus: 'ready' as const };
            }
            return s;
        });

        await updateScript(scriptId, { sections: updatedSections });

        return NextResponse.json({ success: true, audioUrl });

    } catch (error: any) {
        console.error('[TTS API] Audio generation error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
