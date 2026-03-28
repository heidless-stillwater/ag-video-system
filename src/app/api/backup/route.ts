import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/roleMiddleware';
import { startBackupJob } from '@/lib/services/backupService';

/**
 * POST /api/backup
 * Start a backup job
 */
export const POST = withAuth(async (request, context) => {
    try {
        const { userId, roles } = context;
        const body = await request.json();
        const type = body.type || 'user';
        const password = body.password;

        if (type === 'system' && !roles?.includes('su') && !roles?.includes('admin')) {
            return NextResponse.json({ error: 'System backup requires admin privileges' }, { status: 403 });
        }

        console.log(`[Backup API] Starting ${type} backup (encrypted: ${!!password}) for user: ${userId}`);
        const jobId = await startBackupJob(type, userId as string, password);

        return NextResponse.json({ success: true, jobId });
    } catch (error: any) {
        console.error('[Backup API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
