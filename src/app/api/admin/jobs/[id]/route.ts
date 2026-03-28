import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/roleMiddleware';
import { getJob } from '@/lib/services/jobService';

/**
 * GET /api/admin/jobs/[id]
 * Get job status
 */
export const GET = withAuth(async (request, context) => {
    try {
        const { params } = context;
        const resolvedParams = await params;

        if (!resolvedParams || !resolvedParams.id) {
            return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
        }

        const jobId = resolvedParams.id as string;
        const job = await getJob(jobId);

        if (!job) {
            console.error(`[JobStatus API] Job ${jobId} not found`);
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        // Check ownership or admin
        const isOwner = job.userId === context.userId;
        const isAdmin = context.roles?.includes('admin') || context.roles?.includes('su');

        if (!isOwner && !isAdmin) {
            console.warn(`[JobStatus API] Forbidden access attempt. Job owner: ${job.userId}, Request user: ${context.userId}`);
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        return NextResponse.json({ success: true, job });
    } catch (error: any) {
        console.error('[JobStatus API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
