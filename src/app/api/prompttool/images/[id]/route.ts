/**
 * GET /api/prompttool/images/[id]
 *
 * Fetch a single PromptTool image by its document ID.
 * Requires authenticated VideoSystem user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/roleMiddleware';
import { PromptToolBridgeService } from '@/lib/services/prompttool-bridge';

export const runtime = 'nodejs';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const ctx = await verifyAuth(req);
    if (!ctx) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
        return NextResponse.json({ success: false, error: 'Image ID required' }, { status: 400 });
    }

    const result = await PromptToolBridgeService.getImageById(id);
    if (!result.success) {
        return NextResponse.json(result, { status: 404 });
    }

    return NextResponse.json(result);
}
