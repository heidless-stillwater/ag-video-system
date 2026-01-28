import { NextRequest, NextResponse } from 'next/server';
import { getProject, firestoreAdmin } from '@/lib/services/firestore-admin';

/**
 * GET /api/projects/[id]
 * Retrieves project details using the Admin SDK (bypassing client-side rules).
 * Useful for Mock Users or server-side rendering contexts.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;

    try {
        if (!projectId) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
        }

        console.log(`[Project API] Fetching project: ${projectId}`);
        const project = await getProject(projectId);

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        return NextResponse.json(project);
    } catch (error: any) {
        console.error('[Project API] Error fetching project:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * DELETE /api/projects/[id]
 * Deletes a project using the Admin SDK.
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;

    try {
        if (!projectId) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
        }

        console.log(`[Project API] Deleting project: ${projectId}`);
        await firestoreAdmin.deleteProject(projectId);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Project API] Error deleting project:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
