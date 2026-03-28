import { NextRequest, NextResponse } from 'next/server';
import { getProject, getScript, updateProject, updateScript } from '@/lib/services/firestore-admin';

/**
 * Reverts visual assets to a specific snapshot state.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;

    try {
        const { snapshotId } = await req.json();
        const project = await getProject(projectId);

        if (!project || !project.visualSnapshots) {
            return NextResponse.json({ error: 'Project or snapshots not found' }, { status: 404 });
        }

        const snapshot = project.visualSnapshots.find(s => s.id === snapshotId);
        if (!snapshot) {
            return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
        }

        const script = await getScript(project.currentScriptId!);
        if (!script) {
            return NextResponse.json({ error: 'Script not found' }, { status: 404 });
        }

        // 1. Restore URLs into script sections
        const updatedSections = script.sections.map(section => {
            const updatedCues = (section.visualCues || []).map(cue => {
                const restoredUrl = snapshot.cues[cue.id];
                if (restoredUrl !== undefined) {
                    return { ...cue, url: restoredUrl, status: 'ready' as const };
                }
                return cue;
            });
            return { ...section, visualCues: updatedCues };
        });

        // 2. Update Script and Project Style
        await updateScript(script.id, { sections: updatedSections });
        await updateProject(projectId, {
            visualStyle: snapshot.style,
            mediaMessage: `Visuals restored to: ${snapshot.label}`
        } as any);

        return NextResponse.json({ success: true, message: `Restored to ${snapshot.label}` });
    } catch (error: any) {
        console.error('[Revert API] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
