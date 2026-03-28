/**
 * GET /api/prompttool/users/[uid]
 *
 * Fetch a PromptTool user's profile by their Firebase UID for attribution.
 * Requires authenticated VideoSystem user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/roleMiddleware';
import { PromptToolBridgeService } from '@/lib/services/prompttool-bridge';

export const runtime = 'nodejs';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ uid: string }> }
) {
    const ctx = await verifyAuth(req);
    if (!ctx) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { uid } = await params;
    if (!uid) {
        return NextResponse.json({ success: false, error: 'UID required' }, { status: 400 });
    }

    const result = await PromptToolBridgeService.getUserProfile(uid);
    if (!result.success) {
        return NextResponse.json(result, { status: 404 });
    }

    return NextResponse.json(result);
}
