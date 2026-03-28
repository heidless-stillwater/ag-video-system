import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/roleMiddleware';
import { startMigrationJob } from '@/lib/services/migrationService';

/**
 * POST /api/admin/migrate
 * Migrate entire system to a new Firebase project (Background Job)
 */
export const POST = withAuth(async (request, context) => {
    try {
        const { userId, roles } = context;

        // Only Super Users or Admin can migrate
        if (!roles?.includes('su') && !roles?.includes('admin')) {
            return NextResponse.json({
                success: false,
                error: 'Migration requires admin privileges'
            }, { status: 403 });
        }

        const body = await request.json();
        const { targetServiceAccount, targetFirebaseConfig, targetDatabaseId, dryRun } = body;

        if (!targetServiceAccount || !targetFirebaseConfig || !targetDatabaseId) {
            return NextResponse.json({
                success: false,
                error: 'Missing target configuration'
            }, { status: 400 });
        }

        console.log(`[Migration API] Starting migration job (dryRun: ${!!dryRun}) for user ${userId} to database: ${targetDatabaseId}`);

        // Start the background job
        const jobId = await startMigrationJob({
            serviceAccount: targetServiceAccount,
            firebaseConfig: targetFirebaseConfig,
            databaseId: targetDatabaseId,
            dryRun: !!dryRun
        }, userId as string);

        return NextResponse.json({
            success: true,
            jobId,
            message: dryRun ? 'Validation job started...' : 'Migration job started...'
        });

    } catch (error: any) {
        console.error('[Migration API] Error starting migration:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});
