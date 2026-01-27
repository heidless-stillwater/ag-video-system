import { NextRequest, NextResponse } from 'next/server';
import { getProject, getScript, updateProject, updateScript } from '@/lib/services/firestore-admin';
import { soundDesigner } from '@/lib/services/sound-designer';
import { cookies } from 'next/headers';
import { EnvironmentMode } from '@/lib/config/environment';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;

    try {
        const project = await getProject(projectId);
        if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        if (!project.currentScriptId) return NextResponse.json({ error: 'No script found for this project' }, { status: 400 });

        const script = await getScript(project.currentScriptId);
        if (!script) return NextResponse.json({ error: 'Script not found' }, { status: 404 });

        const cookieStore = await cookies();
        const envMode = cookieStore.get('x-env-mode')?.value as EnvironmentMode;

        console.log(`[Sound Design API] Generating for project: ${projectId}`);
        const design = await soundDesigner.generateSoundDesign(script, envMode);

        // 1. Update Project Ambiance
        if (design.ambiance) {
            await updateProject(projectId, {
                ambianceUrl: design.ambiance.url,
                ambianceLabel: design.ambiance.label,
                ambianceVolume: 0.1 // Default subtle ambiance
            } as any);
        }

        // 2. Update Script Visual Cues with SFX
        const updatedSections = script.sections.map(section => {
            const updatedCues = (section.visualCues || []).map(cue => {
                const assignment = design.assignments.find(a => a.cueId === cue.id);
                if (assignment) {
                    return {
                        ...cue,
                        sfxUrl: assignment.sfx?.url,
                        sfxLabel: assignment.sfx?.label,
                        sfxVolume: 0.4 // Default SFX volume
                    };
                }
                return cue;
            });
            return { ...section, visualCues: updatedCues };
        });

        await updateScript(script.id, { sections: updatedSections });

        return NextResponse.json({
            success: true,
            ambiance: design.ambiance?.label,
            sfxCount: design.assignments.length
        });

    } catch (error: any) {
        console.error('[Sound Design API] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
