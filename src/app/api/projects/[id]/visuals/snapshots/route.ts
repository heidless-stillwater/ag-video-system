import { NextRequest, NextResponse } from 'next/server';
import { getProject, getScript, updateProject } from '@/lib/services/firestore-admin';
import { v4 as uuidv4 } from 'uuid';
import { VisualSnapshot } from '@/types';

/**
 * Creates a snapshot of current visual assets.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;

    try {
        const { label } = await req.json();
        const project = await getProject(projectId);
        if (!project || !project.currentScriptId) {
            return NextResponse.json({ error: 'Project or script not found' }, { status: 404 });
        }

        const script = await getScript(project.currentScriptId);
        if (!script) {
            return NextResponse.json({ error: 'Script not found' }, { status: 404 });
        }

        // 1. Gather all current cue URLs
        const cueMap: Record<string, string> = {};
        script.sections.forEach(section => {
            (section.visualCues || []).forEach(cue => {
                if (cue.url) {
                    cueMap[cue.id] = cue.url;
                }
            });
        });

        // 2. Create the snapshot
        const snapshot: VisualSnapshot = {
            id: uuidv4(),
            timestamp: new Date(),
            label: label || `Snapshot ${new Date().toLocaleString()}`,
            style: project.visualStyle || 'cinematic',
            cues: cueMap
        };

        // 3. Update project history
        const snapshots = project.visualSnapshots || [];
        await updateProject(projectId, {
            visualSnapshots: [...snapshots, snapshot]
        } as any);

        return NextResponse.json({ success: true, snapshot });
    } catch (error: any) {
        console.error('[Snapshots API] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * Lists all snapshots for a project.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;
    try {
        const project = await getProject(projectId);
        if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        return NextResponse.json({ snapshots: project.visualSnapshots || [] });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
