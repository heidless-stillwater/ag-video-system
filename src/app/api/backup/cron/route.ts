import { NextRequest, NextResponse } from 'next/server';
import { startBackupJob } from '@/lib/services/backupService';

/**
 * GET /api/backup/cron
 * Scheduled system backup triggered by CRON (e.g. Cloud Scheduler)
 * 
 * Protection: Requires 'x-cron-secret' header matching process.env.CRON_SECRET
 */
export async function GET(request: NextRequest) {
    try {
        const cronSecret = process.env.CRON_SECRET;
        const incomingSecret = request.headers.get('x-cron-secret');

        if (!cronSecret || incomingSecret !== cronSecret) {
            console.warn('[Backup CRON] Unauthorized attempt to trigger backup');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('[Backup CRON] Triggering automated system backup...');

        const jobId = await startBackupJob('system', 'system-scheduler');

        return NextResponse.json({
            success: true,
            jobId,
            message: 'Automated system backup job initiated'
        });

    } catch (error: any) {
        console.error('[Backup CRON] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
