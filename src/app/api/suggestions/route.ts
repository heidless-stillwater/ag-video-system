import { NextRequest, NextResponse } from 'next/server';
import { generateTopicSuggestions } from '@/lib/services/youtube';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    try {
        const suggestions = await generateTopicSuggestions(query);
        return NextResponse.json(suggestions);
    } catch (error: any) {
        console.error('Suggestion generation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
