import { NextRequest, NextResponse } from 'next/server';
import { updateProject, getProject } from '@/lib/services/firestore-admin';

export async function POST(req: NextRequest) {
    try {
        const { projectId, performanceProfile } = await req.json();

        if (!projectId || !performanceProfile) {
            return NextResponse.json({ error: 'Missing projectId or performanceProfile' }, { status: 400 });
        }

        // Verify project exists
        const project = await getProject(projectId);
        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        await updateProject(projectId, {
            performanceProfile: {
                ...performanceProfile,
                concurrency: performanceProfile.mode === 'turbo' ? 3 : 1,
                imageSynthesisDelay: performanceProfile.mode === 'turbo' ? 2000 : 12000,
                parallelSynthesis: performanceProfile.mode === 'turbo'
            }
        } as any);

        return NextResponse.json({
            success: true,
            message: `Performance profile updated for project ${projectId}`
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
