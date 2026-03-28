import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getProject, getScript, saveScript, updateProject, updateScript } from '@/lib/services/firestore-admin';
import { translateScript } from '@/lib/services/ai';
import { generateSpeech } from '@/lib/services/tts';
import { storageService } from '@/lib/services/storage';
import { EnvironmentMode, getEnvironmentMode } from '@/lib/config/environment';
import { resourceGovernor } from '@/lib/services/resource-governor';
import { v4 as uuidv4 } from 'uuid';

const SUPPORTED_LANGUAGES = ['es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'pt-BR'];

/**
 * API Route to dub a project into a new language.
 * POST /api/projects/[id]/dub
 * Body: { targetLanguage: 'es-ES' }
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;

    try {
        const { targetLanguage, force = false } = await req.json();

        if (!targetLanguage || !SUPPORTED_LANGUAGES.includes(targetLanguage)) {
            return NextResponse.json({
                error: `Invalid language. Supported: ${SUPPORTED_LANGUAGES.join(', ')}`
            }, { status: 400 });
        }

        // 0. Safety Check
        const health = resourceGovernor.isSystemHealthy();
        if (!health.healthy) {
            return NextResponse.json({
                error: `System Overload: ${health.reason}. Please try again in 1 minute.`
            }, { status: 503 });
        }

        const cookieStore = await cookies();
        const envMode = (cookieStore.get('x-env-mode')?.value as EnvironmentMode) || getEnvironmentMode();

        // 1. Fetch Project and Original Script
        const project = await getProject(projectId);
        if (!project || !project.currentScriptId) {
            return NextResponse.json({ error: 'Project or script not found' }, { status: 404 });
        }

        const originalScript = await getScript(project.currentScriptId);
        if (!originalScript) {
            return NextResponse.json({ error: 'Original script not found' }, { status: 404 });
        }

        // Check if translation already exists
        const existingTranslation = project.translations?.find(t => t.language === targetLanguage);
        if (existingTranslation && !force) {
            return NextResponse.json({
                error: `Translation for ${targetLanguage} already exists`,
                scriptId: existingTranslation.scriptId
            }, { status: 409 });
        }

        console.log(`[Dub API] Starting dubbing for project ${projectId} to ${targetLanguage}`);

        // 1b. Credit Check & Deduction
        try {
            const { creditService } = await import('@/lib/services/credit-service');
            const DUB_COST = 2; // Dubbing is expensive (Translation + TTS Batch)
            await creditService.deductCredits(project.userId, DUB_COST);
            console.log(`[Dub API] Deducted ${DUB_COST} credits for dubbing`);
        } catch (creditError: any) {
            console.warn(`[Dub API] Credit Check Failed: ${creditError.message}`);
            return NextResponse.json({
                error: creditError.message,
                requiresCredits: true
            }, { status: 402 });
        }

        // 2. Translate Script using Gemini
        const translatedContent = await translateScript(
            originalScript,
            targetLanguage,
            envMode
        );

        // 3. Create New Script Document
        const { id: _oldId, createdAt: _c, updatedAt: _u, ...scriptBase } = originalScript;
        const translatedScriptId = await saveScript({
            ...scriptBase,
            title: translatedContent.title,
            sections: translatedContent.sections,
            totalWordCount: translatedContent.sections.reduce((sum, s) => sum + s.wordCount, 0),
            estimatedDuration: originalScript.estimatedDuration,
            sleepFriendlinessScore: originalScript.sleepFriendlinessScore,
            languageCode: targetLanguage,
            isTranslation: true,
            sourceScriptId: originalScript.id,
        });

        // 4. Update Project with new translation
        let translations = project.translations || [];
        const existingIndex = translations.findIndex(t => t.language === targetLanguage);
        if (existingIndex >= 0) {
            translations[existingIndex] = { language: targetLanguage, scriptId: translatedScriptId };
        } else {
            translations.push({ language: targetLanguage, scriptId: translatedScriptId });
        }
        await updateProject(projectId, { translations } as any);

        console.log(`[Dub API] Translation saved: ${translatedScriptId}`);

        // 5. Generate TTS for translated script (background task)
        const dubbingSessionId = uuidv4();
        await updateProject(projectId, { activeDubbingSessionId: dubbingSessionId } as any);

        const generateAudioBackground = async () => {
            const currentScript = await getScript(translatedScriptId);
            if (!currentScript) return;

            // Use a local copy of sections to keep track of progress as we loop
            const sectionsInProgress = [...currentScript.sections];

            for (let i = 0; i < sectionsInProgress.length; i++) {
                // Check for cancellation signal at the start of each section
                const latestProject = await getProject(projectId);
                if (latestProject?.cancelledDubbingSessionId === dubbingSessionId) {
                    console.log(`[Dub API] 🛑 Dubbing session ${dubbingSessionId} CANCELLED for project ${projectId}`);
                    // Cleanup session state
                    await updateProject(projectId, {
                        activeDubbingSessionId: null,
                        cancelledDubbingSessionId: null
                    } as any);
                    return;
                }

                const section = sectionsInProgress[i];
                try {
                    console.log(`[Dub API] Generating ${targetLanguage} audio for section ${i + 1}/${sectionsInProgress.length}: ${section.title}`);
                    const audioBuffer = await generateSpeech(section.content, envMode, targetLanguage);
                    const audioUrl = await storageService.uploadAudio(
                        projectId,
                        `${section.id}_${targetLanguage}`,
                        audioBuffer
                    );

                    // Update local state for this section
                    sectionsInProgress[i] = {
                        ...section,
                        audioUrl,
                        audioStatus: 'ready' as const
                    };

                    // Save the cumulative progress back to Firestore
                    await updateScript(translatedScriptId, { sections: sectionsInProgress });

                    // Adaptive Throttling: Let WSL breathe
                    await resourceGovernor.getAdaptiveDelay();
                } catch (err: any) {
                    console.error(`[Dub API] Audio generation failed for ${section.title}:`, err.message);
                }
            }
            console.log(`[Dub API] ✅ All ${targetLanguage} audio generated for project ${projectId}`);

            // Clear session on success
            const finalProj = await getProject(projectId);
            if (finalProj?.activeDubbingSessionId === dubbingSessionId) {
                await updateProject(projectId, {
                    activeDubbingSessionId: null,
                    cancelledDubbingSessionId: null
                } as any);
            }
        };

        // Start background TTS generation
        generateAudioBackground();

        return NextResponse.json({
            success: true,
            scriptId: translatedScriptId,
            language: targetLanguage,
            message: `Dubbing to ${targetLanguage} initiated. Audio generation in progress.`
        });

    } catch (error: any) {
        console.error('[Dub API] Fatal error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * GET /api/projects/[id]/dub
 * Returns available translations for a project.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;

    try {
        const project = await getProject(projectId);
        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        return NextResponse.json({
            translations: project.translations || [],
            supportedLanguages: SUPPORTED_LANGUAGES
        });
    } catch (error: any) {
        console.error('[Dub API] GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
