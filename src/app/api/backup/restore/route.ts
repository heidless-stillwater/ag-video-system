import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/roleMiddleware';
import { startRestoreJob } from '@/lib/services/backupService';

/**
 * POST /api/backup/restore
 * Trigger a background restore job from a backup ZIP file
 */
export const POST = withAuth(async (request, context) => {
    try {
        const { userId, roles } = context;

        // Parse multipart form data
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const restoreType = (formData.get('type') as string) || 'user';
        const overwrite = formData.get('overwrite') === 'true';

        if (!file) {
            return NextResponse.json({ success: false, error: 'No backup file provided' }, { status: 400 });
        }

        console.log(`[Restore API] Starting ${restoreType} restore jobId for user ${userId}`);

        // System restore requires admin role
        if (restoreType === 'system' && !roles?.includes('admin') && !roles?.includes('su')) {
            return NextResponse.json({ success: false, error: 'System restore requires admin privileges' }, { status: 403 });
        }

        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const selectionsStr = formData.get('selections') as string;
        const password = formData.get('password') as string;
        let selections = undefined;
        if (selectionsStr) {
            try { selections = JSON.parse(selectionsStr); } catch (e) { console.warn('Failed to parse restore selections', e); }
        }

        // Perform restore
        const jobId = await startRestoreJob(buffer, {
            type: restoreType as 'user' | 'system',
            userId: userId as string,
            overwrite,
            selections,
            password: password || undefined
        });

        return NextResponse.json({ success: true, jobId });

    } catch (error: any) {
        console.error('[Restore API] Error restoring backup:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});
