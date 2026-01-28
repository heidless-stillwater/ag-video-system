import { NextRequest, NextResponse } from 'next/server';
import { createTopic } from '@/lib/services/firestore-admin';

/**
 * POST /api/topics
 * Creates a new research topic using the Admin SDK.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, title, description, broadCategory, keywords, seoScore, competitionLevel, searchVolume } = body;

        if (!userId || !title) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const topicId = await createTopic({
            userId,
            title,
            description,
            broadCategory,
            keywords,
            seoScore,
            competitionLevel,
            searchVolume
        });

        return NextResponse.json({ success: true, topicId });
    } catch (error: any) {
        console.error('[Topics API] Error creating topic:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
