import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/roleMiddleware';
import { PromptToolBridgeService } from '@/lib/services/prompttool-bridge';

export const runtime = 'nodejs';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const ctx = await verifyAuth(req);
    if (!ctx) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
        return NextResponse.json({ success: false, error: 'Source ID required' }, { status: 400 });
    }

    try {
        const { targetSetId, targetSetName } = await req.json();
        if (!targetSetId || !targetSetName) {
            return NextResponse.json({ success: false, error: 'Target set info required' }, { status: 400 });
        }

        // Use the VideoSystem userId for the clone
        const result = await PromptToolBridgeService.cloneImage(ctx.userId, id, targetSetId, targetSetName);
        
        if (!result.success) {
            return NextResponse.json(result, { status: 500 });
        }

        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
