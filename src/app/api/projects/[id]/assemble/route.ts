import { NextRequest, NextResponse } from 'next/server';
import { getScript, updateProject } from '@/lib/services/firestore-admin';

/**
 * API Route for "assembling" the final documentary metadata.
 * Validates that all assets are ready and updates project status.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;

    try {
        const { scriptId } = await req.json();

        if (!scriptId) {
            return NextResponse.json({ error: 'scriptId is required' }, { status: 400 });
        }

        // 1. Get Script Details
        const script = await getScript(scriptId);
        if (!script) {
            return NextResponse.json({ error: 'Script not found' }, { status: 404 });
        }

        // 2. Comprehensive Readiness Check
        const totalSections = script.sections.length;
        const sectionsWithAudio = script.sections.filter(s => !!s.audioUrl).length;

        // Check that sections have visual cues AND those cues have URLs
        const sectionsWithVisuals = script.sections.filter(s =>
            s.visualCues &&
            s.visualCues.length > 0 &&
            s.visualCues.some(cue => cue.url && cue.url.length > 0)
        ).length;

        if (sectionsWithAudio < totalSections) {
            return NextResponse.json({
                error: 'Audio generation incomplete',
                details: {
                    sections: totalSections,
                    audioReady: sectionsWithAudio,
                    message: `${totalSections - sectionsWithAudio} section(s) still need audio generation`
                }
            }, { status: 400 });
        }

        if (sectionsWithVisuals < totalSections) {
            return NextResponse.json({
                error: 'Visual assets incomplete',
                details: {
                    sections: totalSections,
                    visualsReady: sectionsWithVisuals,
                    message: `${totalSections - sectionsWithVisuals} section(s) still need visual assets (images)`
                }
            }, { status: 400 });
        }

        // 3. Update Project Status to 'assembling' or 'ready'
        // 'assembling' implies a background rendering process, but for our MVP (in-browser preview):
        await updateProject(projectId, { status: 'assembling' });

        return NextResponse.json({
            success: true,
            message: 'Project assembled and ready for preview'
        });

    } catch (error: any) {
        console.error('[Assembly API] Fatal error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
