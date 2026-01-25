import { NextRequest, NextResponse } from 'next/server';
import { researchService } from '@/lib/services/research';
import { extractFacts } from '@/lib/services/ai';
import { getProject, getTopic } from '@/lib/services/firestore-admin';
import { Fact, ResearchSource } from '@/types';
import { cookies } from 'next/headers';
import { EnvironmentMode } from '@/lib/config/environment';

/**
 * API Route for orchestrating the research phase.
 * Uses Firebase Admin for privileged database access.
 */
export async function POST(req: NextRequest) {
    try {
        let body;
        try {
            body = await req.json();
        } catch (e) {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const { projectId } = body;
        console.log(`[Research API] Starting research for project: ${projectId}`);

        if (!projectId) {
            return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
        }

        // 1. Get Project & Topic Details
        let project;
        try {
            project = await getProject(projectId);
        } catch (error: any) {
            console.error(`[Research API] Firestore error while fetching project:`, error);
            return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
        }

        if (!project) {
            console.error(`[Research API] Project not found: ${projectId}`);
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        console.log(`[Research API] Found project: ${project.title}. Topic ID: ${project.topicId}`);
        const topic = await getTopic(project.topicId);
        if (!topic) {
            console.error(`[Research API] Topic not found: ${project.topicId}`);
            return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
        }

        // 2. Perform Wikipedia Research
        console.log(`[Research API] Searching Wikipedia for: ${topic.title}`);
        const sources = await researchService.performAutomatedResearch(topic.title, topic.keywords || []);
        console.log(`[Research API] Found ${sources.length} sources.`);

        // 3. Extract Facts from the most relevant source
        let extractedFacts: Fact[] = [];
        if (sources.length > 0) {
            console.log(`[Research API] Extracting facts from top sources...`);
            const combinedContent = sources.slice(0, 2).map(s => s.extractedContent).join('\n\n');

            const cookieStore = await cookies();
            const envMode = cookieStore.get('x-env-mode')?.value as EnvironmentMode;
            console.log(`[Research API] Environment Mode detected: ${envMode || 'DEFAULT'}`);

            const rawFacts = await extractFacts(combinedContent, envMode);
            console.log(`[Research API] Extracted ${rawFacts.length} facts.`);

            extractedFacts = rawFacts.map(statement => ({
                id: Math.random().toString(36).substr(2, 9),
                statement,
                sourceIds: [sources[0].id],
                confidence: 90,
                verified: true,
            }));
        }

        return NextResponse.json({
            success: true,
            sourcesCount: sources.length,
            factsCount: extractedFacts.length,
            sources,
            facts: extractedFacts
        });

    } catch (error: any) {
        console.error('[Research API] Fatal orchestration error:', error);
        console.error(error.stack);

        return NextResponse.json({
            error: error.message || 'Fatal Server Error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
