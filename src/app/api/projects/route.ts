import { NextRequest, NextResponse } from 'next/server';
import { getUserProjects, firestoreAdmin } from '@/lib/services/firestore-admin';

/**
 * GET /api/projects?userId=...
 * Retrieves a list of projects for a specific user using the Admin SDK.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    try {
        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        console.log(`[Projects API] Fetching projects for user: ${userId}`);
        const projects = await getUserProjects(userId);

        return NextResponse.json(projects);
    } catch (error: any) {
        console.error('[Projects API] Error fetching user projects:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST /api/projects
 * Creates a new project using the Admin SDK.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, title, description, topicId, status, research, estimatedDuration, estimatedCost, visualStyle } = body;

        if (!userId || !title) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const projectId = await firestoreAdmin.createProject({
            userId,
            title,
            description,
            topicId,
            status,
            research,
            estimatedDuration,
            estimatedCost,
            visualStyle
        });

        return NextResponse.json({ success: true, projectId });
    } catch (error: any) {
        console.error('[Projects API] Error creating project:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
