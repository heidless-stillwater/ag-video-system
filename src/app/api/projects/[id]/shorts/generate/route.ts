import { NextRequest, NextResponse } from 'next/server';
import { findViralClipCandidates } from '@/lib/services/ai';
import { getProject, getScript, updateProject } from '@/lib/services/firestore-admin';
import { v4 as uuidv4 } from 'uuid';
import { ViralClip } from '@/types';

/**
 * API Route to analyze a script and generate viral Shorts candidates.
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

        // 1. Get Project and Script
        const project = await getProject(projectId);
        const script = await getScript(scriptId);

        if (!project || !script) {
            return NextResponse.json({ error: 'Project or Script not found' }, { status: 404 });
        }

        // 2. Find Candidates via AI
        console.log(`[Shorts API] Analyzing script for viral candidates: ${projectId}`);
        const candidates = await findViralClipCandidates(script);

        // 3. Convert candidates to ViralClips and save to Project
        const newShorts: ViralClip[] = candidates.map(c => ({
            ...c,
            id: uuidv4(),
            projectId,
            status: 'pending',
            createdAt: new Date()
        }));

        // Merge with existing shorts or replace?
        // Let's replace for now, or append if desired. 
        // Plan says "find candidates", so replacing is probably expected for a "Analyze" action.
        await updateProject(projectId, {
            shorts: newShorts
        } as any);

        return NextResponse.json({
            success: true,
            shorts: newShorts
        });

    } catch (error: any) {
        console.error('[Shorts Generate API] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
