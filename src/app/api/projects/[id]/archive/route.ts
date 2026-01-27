import { NextRequest, NextResponse } from 'next/server';
import { getProject } from '@/lib/services/firestore-admin';
import path from 'path';
import fs from 'fs';

/**
 * API Route to archive a rendered video file.
 * This clones the current project.mp4 to a unique archived name to prevent overwriting.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;

    try {
        const { label } = await req.json();

        const timestamp = new Date().getTime();
        const safeLabel = (label || 'snapshot').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const archiveFilename = `${projectId}_${safeLabel}_${timestamp}.mp4`;

        const sourcePath = path.join(process.cwd(), 'public', 'renders', `${projectId}.mp4`);
        const archiveDir = path.join(process.cwd(), 'public', 'renders', 'archives');
        const archivePath = path.join(archiveDir, archiveFilename);

        if (!fs.existsSync(sourcePath)) {
            return NextResponse.json({ error: 'Source video not found' }, { status: 404 });
        }

        if (!fs.existsSync(archiveDir)) {
            fs.mkdirSync(archiveDir, { recursive: true });
        }

        // Clone the file
        fs.copyFileSync(sourcePath, archivePath);

        const archiveUrl = `/renders/archives/${archiveFilename}`;

        return NextResponse.json({
            success: true,
            archiveUrl,
            archiveId: `${safeLabel}_${timestamp}`
        });

    } catch (error: any) {
        console.error('[Archive API] Fatal error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
