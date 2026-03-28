import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/roleMiddleware';
import { listBackups } from '@/lib/services/backupService';

/**
 * GET /api/backup/list
 * List available backups in storage
 */
export const GET = withAuth(async (request, context) => {
    try {
        const { userId, roles } = context;
        const { searchParams } = new URL(request.url);
        const type = (searchParams.get('type') as 'user' | 'system') || 'user';

        // Security: system backup list requires admin/su
        if (type === 'system' && !roles?.includes('admin') && !roles?.includes('su')) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const backups = await listBackups(type, userId);

        return NextResponse.json({ success: true, backups });

    } catch (error: any) {
        console.error('[BackupList API] Error listing backups:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
});
