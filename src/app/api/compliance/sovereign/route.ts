import { NextResponse } from 'next/server';
import { ComplianceService } from '@/lib/services/compliance-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/compliance/sovereign
 * 
 * Public endpoint for the Sovereign Sentinel to probe the suite's compliance status.
 * Returns the GATT (Gated Access & Technical Telemetry) state.
 */
export async function GET() {
    try {
        const status = await ComplianceService.verifySovereignGate();
        return NextResponse.json(status);
    } catch (error: any) {
        return NextResponse.json({
            gated: true,
            status: 'red',
            message: 'Compliance Sentinel unreachable. Media services locked for safety.'
        }, { status: 500 });
    }
}
