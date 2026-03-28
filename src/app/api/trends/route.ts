import { NextRequest, NextResponse } from 'next/server';
import { searchYouTubeTrends } from '@/lib/services/youtube';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    try {
        const trends = await searchYouTubeTrends(query);
        return NextResponse.json(trends);
    } catch (error: any) {
        console.error('Trend search error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
