import { NextRequest, NextResponse } from 'next/server';
import { updateUser } from '@/lib/services/firestore-admin';

/**
 * API Route to disconnect the YouTube account.
 * Clears tokens and channel info from the user profile.
 */
export async function POST(req: NextRequest) {
    try {
        const { uid } = await req.json();

        if (!uid) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        // Clear YouTube related fields in Firestore
        await updateUser(uid, {
            youtubeTokens: null,
            youtubeChannelInfo: null,
            'settings.youtubeConnected': false
        } as any);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[YouTube Disconnect API] Failure:', error);
        return NextResponse.json({ error: error.message || 'Failed to disconnect YouTube' }, { status: 500 });
    }
}
