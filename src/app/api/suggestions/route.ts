import { NextRequest, NextResponse } from 'next/server';
import { generateTopicSuggestions } from '@/lib/services/youtube';
import { cookies } from 'next/headers';
import { EnvironmentMode } from '@/lib/config/environment';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
    }

    try {
        const cookieStore = await cookies();
        const envMode = cookieStore.get('x-env-mode')?.value as EnvironmentMode;

        const suggestions = await generateTopicSuggestions(query, envMode);
        return NextResponse.json(suggestions);
    } catch (error: any) {
        console.error('Suggestion generation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
