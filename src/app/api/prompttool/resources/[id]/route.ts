import { NextRequest, NextResponse } from 'next/server';
import { PromptToolBridgeService } from '@/lib/services/prompttool-bridge';
import { auth } from '@/lib/firebase-admin';

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    try {
        const result = await PromptToolBridgeService.getResourceById(id);
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
