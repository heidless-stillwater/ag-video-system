import { NextRequest, NextResponse } from 'next/server';
import { youtubeService } from '@/lib/services/youtube';

/**
 * API Route to generate the YouTube OAuth2 Authorization URL.
 * Accepts ?uid=[userId] to pass in the state.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get('uid');
    const returnUrl = searchParams.get('returnUrl') || '/';

    if (!uid) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    try {
        const authUrl = youtubeService.getAuthUrl(`${uid}---${returnUrl}`);
        return NextResponse.json({ url: authUrl });
    } catch (error: any) {
        console.error('[YouTube Auth API] Failed to generate URL:', error);
        return NextResponse.json({ error: 'Failed to generate Auth URL' }, { status: 500 });
    }
}
