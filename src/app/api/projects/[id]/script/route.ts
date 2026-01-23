import { NextRequest, NextResponse } from 'next/server';
import { generateDocumentaryScript } from '@/lib/services/ai';
import { firestoreAdmin } from '@/lib/services/firestore-admin';

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
        const factStatements = project.research.facts.map(f => f.statement);
        const generated = await generateDocumentaryScript(project.title, factStatements, project.estimatedDuration / 60);

        // 3. Save Script to Firestore
        const totalWordCount = generated.sections.reduce((acc, s) => acc + s.wordCount, 0);
        const scriptId = await firestoreAdmin.saveScript({
            projectId,
            version: 1, // Start with version 1
            title: project.title,
            sections: generated.sections.map((s, i) => ({
                id: Math.random().toString(36).substr(2, 9),
                title: s.title,
                content: s.content,
                order: i,
                wordCount: s.wordCount,
                estimatedDuration: Math.round(s.wordCount / 130 * 60), // In seconds
            })),
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
