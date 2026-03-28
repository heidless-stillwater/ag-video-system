import { NextResponse } from 'next/server';
import { runAllHealthChecks, HealthCheckResult } from '@/lib/services/health';

// Cache health check results for 60 seconds
let cachedResults: HealthCheckResult[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION_MS = 60000; // 60 seconds

/**
 * GET /api/health
 * Returns health status for all monitored services
 */
export async function GET() {
    try {
        const now = Date.now();

        // Return cached results if still valid
        if (cachedResults && (now - cacheTimestamp) < CACHE_DURATION_MS) {
            return NextResponse.json({
                cached: true,
                cacheAge: Math.floor((now - cacheTimestamp) / 1000),
                results: cachedResults
            });
        }

        // Run fresh health checks
        console.log('[Health API] Running health checks...');
        const results = await runAllHealthChecks();

        // Update cache
        cachedResults = results;
        cacheTimestamp = now;

        console.log('[Health API] Health checks complete:', results.map(r => `${r.service}: ${r.status}`).join(', '));

        return NextResponse.json({
            cached: false,
            cacheAge: 0,
            results
        });

    } catch (error: any) {
        console.error('[Health API] Error running health checks:', error);
        return NextResponse.json(
            { error: 'Failed to run health checks', details: error.message },
            { status: 500 }
        );
    }
}
