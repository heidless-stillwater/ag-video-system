import { NextRequest, NextResponse } from 'next/server';
import { PromptToolBridgeService } from '@/lib/services/prompttool-bridge';
import { auth } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await auth.verifyIdToken(token);
        const uid = decodedToken.uid;

        const result = await PromptToolBridgeService.getUserResources(uid);
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }
}
