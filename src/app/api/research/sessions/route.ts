import { NextRequest, NextResponse } from 'next/server';
import { researchService } from '@/lib/services/research-service';

export async function POST(req: NextRequest) {
    try {
        const { userId, topic, personaId } = await req.json();
        if (!userId || !topic || !personaId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const sessionId = await researchService.startSession(userId, topic, personaId);
        return NextResponse.json({ success: true, sessionId });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const userId = req.nextUrl.searchParams.get('userId');
        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        const sessions = await researchService.getUserSessions(userId);
        return NextResponse.json({ success: true, sessions });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
