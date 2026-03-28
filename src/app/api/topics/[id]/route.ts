import { NextRequest, NextResponse } from 'next/server';
import { getTopic } from '@/lib/services/firestore-admin';

/**
 * GET /api/topics/[id]
 * Retrieves topic details using the Admin SDK.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: topicId } = await params;

    try {
        if (!topicId) {
            return NextResponse.json({ error: 'Topic ID is required' }, { status: 400 });
        }

        console.log(`[Topic API] Fetching topic: ${topicId}`);
        const topic = await getTopic(topicId);

        if (!topic) {
            return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
        }

        return NextResponse.json(topic);
    } catch (error: any) {
        console.error('[Topic API] Error fetching topic:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
