import { NextRequest, NextResponse } from 'next/server';
import { generateDocumentaryScript } from '@/lib/services/ai';
import { firestoreAdmin } from '@/lib/services/firestore-admin';
import { cookies } from 'next/headers';
import { EnvironmentMode, getEnvironmentMode } from '@/lib/config/environment';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;

    try {
        const project = await firestoreAdmin.getProject(projectId);
        if (!project || !project.currentScriptId) {
            return NextResponse.json({ error: 'Script not found' }, { status: 404 });
        }

        const script = await firestoreAdmin.getScript(project.currentScriptId);
        if (!script) {
            return NextResponse.json({ error: 'Script document missing' }, { status: 404 });
        }

        return NextResponse.json(script);
    } catch (error: any) {
        console.error('[Script API] Error fetching script:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;

    try {
        // 1. Get Project Details
        const project = await firestoreAdmin.getProject(projectId);
        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (project.research.facts.length === 0) {
            return NextResponse.json({ error: 'No research facts found. Please run research first.' }, { status: 400 });
        }

        // 2. Generate Script via AI
        const cookieStore = await cookies();
        const envMode = (cookieStore.get('x-env-mode')?.value as EnvironmentMode) || getEnvironmentMode();
        console.log(`[Script API] Environment Mode detected: ${envMode || 'DEFAULT'}`);

        const factStatements = project.research.facts.map(f => f.statement);
        const generated = await generateDocumentaryScript(project.title, factStatements, project.estimatedDuration / 60, envMode);

        // 3. Save Script to Firestore
        const totalWordCount = generated.sections.reduce((acc, s) => acc + s.wordCount, 0);
        const scriptId = await firestoreAdmin.saveScript({
            projectId,
            version: 1, // Start with version 1
            title: project.title,
            sections: generated.sections.map((s, i) => {
                const actualWordCount = s.content.split(/\s+/).length;
                return {
                    id: Math.random().toString(36).substr(2, 9),
                    title: s.title,
                    content: s.content,
                    order: i,
                    wordCount: actualWordCount,
                    estimatedDuration: Math.round(actualWordCount / 130 * 60), // In seconds
                };
            }),
            totalWordCount,
            estimatedDuration: Math.round(totalWordCount / 130), // In minutes
            sleepFriendlinessScore: 95, // Default for generated
        });

        // 4. Update Project status and currentScriptId
        await firestoreAdmin.updateProject(projectId, {
            status: 'scripting',
            currentScriptId: scriptId
        });

        return NextResponse.json({ success: true, scriptId });

    } catch (error: any) {
        console.error('Script generation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
