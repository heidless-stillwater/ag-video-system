import { NextRequest, NextResponse } from 'next/server';
import { getUserProjects, firestoreAdmin, getSystemConfig } from '@/lib/services/firestore-admin';
export const dynamic = 'force-dynamic';

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
        const { userId, title, description, topicId, status, research, estimatedDuration, estimatedCredits, visualStyle } = body;

        if (!userId || !title) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Fetch global system config for defaults
        const config = await getSystemConfig();

        const projectId = await firestoreAdmin.createProject({
            userId,
            title,
            description,
            topicId,
            status: status || 'draft',
            research: research || {
                sources: [],
                facts: [],
                outline: [],
                completionPercentage: 0,
            },
            estimatedDuration: estimatedDuration || config.defaultDuration || 1,
            estimatedCredits: estimatedCredits || 5, // Base estimate: Research(1) + Script(1) + Basic Media(3)
            creditsDeducted: 0,
            visualStyle: visualStyle || 'studio-ghibli',
            backgroundMusicUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Space Drift
            backgroundMusicVolume: 0.2,
            ambianceVolume: 0.1,
            narrationVolume: 1.0,
            globalSfxVolume: 0.4,
        });

        return NextResponse.json({ success: true, projectId });
    } catch (error: any) {
        console.error('[Projects API] Error creating project:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
