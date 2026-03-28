import { NextRequest, NextResponse } from 'next/server';
import { knowledgeService } from '@/lib/services/knowledge-service';

export async function GET(req: NextRequest) {
    try {
        const userId = req.nextUrl.searchParams.get('userId');
        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        const artifacts = await knowledgeService.getUserArtifacts(userId);
        return NextResponse.json({ success: true, artifacts });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const artifact = await req.json();
        if (!artifact.userId || !artifact.topic) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const res = await knowledgeService.storeArtifact({
            ...artifact,
            createdAt: new Date()
        });
        
        return NextResponse.json({ success: true, id: res.id });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
