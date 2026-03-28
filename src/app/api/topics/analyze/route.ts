import { NextRequest, NextResponse } from 'next/server';
import { topicIntelligenceService } from '@/lib/services/topic-intelligence';

export async function POST(req: NextRequest) {
    try {
        const { topic, personaId } = await req.json();
        if (!topic) {
            return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
        }

        const analysis = await topicIntelligenceService.analyzeTopic(topic, personaId);
        return NextResponse.json({ success: true, analysis });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
