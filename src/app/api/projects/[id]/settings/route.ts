import { NextRequest, NextResponse } from 'next/server';
import { getProject, updateProject } from '@/lib/services/firestore-admin';

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;

    try {
        const project = await getProject(projectId);
        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const updates = await req.json();

        // Security/Validation: Only allow specific fields to be updated via this endpoint
        const allowedFields = [
            'visualStyle',
            'subtitleStyle',
            'subtitleFont',
            'subtitlesEnabled',
            'ambianceVolume',
            'narrationVolume',
            'globalSfxVolume'
        ];

        const filteredUpdates: any = {};
        for (const key of Object.keys(updates)) {
            if (allowedFields.includes(key)) {
                filteredUpdates[key] = updates[key];
            }
        }

        if (Object.keys(filteredUpdates).length === 0) {
            return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
        }

        await updateProject(projectId, filteredUpdates);

        return NextResponse.json({ success: true, message: 'Settings updated' });
    } catch (error: any) {
        console.error('[Settings API] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
