import { NextRequest, NextResponse } from 'next/server';
import { youtubeService } from '@/lib/services/youtube';
import { getProject, getUser } from '@/lib/services/firestore-admin';

/**
 * API Route to check the connected YouTube channel's status.
 * Returns whether custom thumbnails (phone verification) are enabled.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;

    try {
        const project = await getProject(projectId);
        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        // Fetch the user to get YouTube tokens
        const user = await getUser(project.userId);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const tokens = user.youtubeTokens;
        if (!tokens?.accessToken) {
            return NextResponse.json({
                connected: false,
                canUploadThumbnails: false,
                reason: 'No YouTube account connected.'
            });
        }

        // Optionally refresh the token
        let accessToken = tokens.accessToken;
        if (tokens.refreshToken) {
            try {
                const refreshed = await youtubeService.refreshAccessToken(tokens.refreshToken);
                accessToken = refreshed.access_token || accessToken;
            } catch (refreshError) {
                console.warn('[YouTube Status API] Token refresh failed, using existing token.');
            }
        }

        const status = await youtubeService.getChannelStatus(accessToken);

        return NextResponse.json({
            connected: true,
            ...status
        });

    } catch (error: any) {
        console.error('[YouTube Status API] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

