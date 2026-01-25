import { NextRequest, NextResponse } from 'next/server';
import { youtubeService } from '@/lib/services/youtube';
import { updateProject, getUser, updateUser } from '@/lib/services/firestore-admin';

/**
 * API Route to handle the YouTube OAuth2 Callback.
 * Exchanges the 'code' for tokens and stores them in the User profile.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state') || ''; // UID---returnUrl

    const [uid, returnUrl] = state.split('---');

    if (!code || !uid) {
        const errorUrl = new URL(returnUrl || '/', req.url);
        errorUrl.searchParams.set('error', 'youtube_auth_failed');
        return NextResponse.redirect(errorUrl);
    }

    try {
        // 1. Exchange code for tokens
        const tokens = await youtubeService.getTokens(code);

        // 2. Fetch Channel Info
        const channelInfo = await youtubeService.getChannelInfo(tokens.access_token!);

        // 3. Store tokens in Firestore User Profile
        await updateUser(uid, {
            youtubeTokens: {
                accessToken: tokens.access_token!,
                refreshToken: tokens.refresh_token || '',
                expiryDate: tokens.expiry_date || 0
            },
            youtubeChannelInfo: {
                id: channelInfo.id,
                title: channelInfo.title,
                thumbnailUrl: channelInfo.thumbnailUrl
            },
            'settings.youtubeConnected': true
        } as any);

        // 4. Securely determine destination path
        let destination = '/'; // Absolute default

        // Only use returnUrl if it's a safe relative path
        if (returnUrl && returnUrl.startsWith('/') && !returnUrl.includes('//')) {
            destination = returnUrl;
        } else {
            // Fallback: Try Referer if state was lost/corrupted
            const referer = req.headers.get('referer');
            if (referer) {
                try {
                    const refererUrl = new URL(referer);
                    if (refererUrl.pathname.includes('/projects/')) {
                        destination = refererUrl.pathname;
                    }
                } catch (e) {
                    console.warn('[YouTube Callback] Invalid referer header');
                }
            }
        }

        // 5. Build final absolute URL
        // We use req.nextUrl.origin to ensure consistency with the current request context
        const finalUrl = new URL(destination, req.nextUrl.origin);
        finalUrl.searchParams.set('success', 'youtube_connected');

        console.log(`[YouTube Callback SUCCESS] Redirecting to: ${finalUrl.toString()}`);
        return NextResponse.redirect(finalUrl);

    } catch (error: any) {
        console.error('[YouTube Callback FATAL] OAuth Failure:', error);

        // Always return to root on error to avoid 404 loops
        const errorUrl = new URL('/', req.nextUrl.origin);
        errorUrl.searchParams.set('error', error.message || 'auth_failed');
        return NextResponse.redirect(errorUrl);
    }
}
