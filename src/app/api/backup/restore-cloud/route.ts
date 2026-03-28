import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/roleMiddleware';
import { startCloudRestoreJob } from '@/lib/services/backupService';

/**
 * POST /api/backup/restore-cloud
 * Trigger a background restore job from a backup file already in Cloud Storage
 */
export const POST = withAuth(async (request, context) => {
    try {
        const { userId, roles } = context;
        const body = await request.json();
        const { path, overwrite, selections, password } = body;

        if (!path) {
            return NextResponse.json({ success: false, error: 'Backup path required' }, { status: 400 });
        }

        // Detect type from path filename logic or explicit param
        // For security, if path doesn't belong to user, block it unless admin
        const isSystem = path.includes('-system-');

        if (isSystem && !roles?.includes('admin') && !roles?.includes('su')) {
            return NextResponse.json({ success: false, error: 'System restore requires admin' }, { status: 403 });
        }

        // TODO: Extra verification that 'path' belongs to 'userId' if not system

        console.log(`[CloudRestore API] Starting restore (encrypted: ${!!password}) from ${path} for user ${userId}`);

        const jobId = await startCloudRestoreJob(path, {
            type: isSystem ? 'system' : 'user',
            userId: userId as string,
            overwrite: !!overwrite,
            selections,
            password: password || undefined
        });

        return NextResponse.json({ success: true, jobId });

    } catch (error: any) {
        console.error('[CloudRestore API] Error starting restore:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
});
