import { NextRequest, NextResponse } from 'next/server';
import { youtubeService } from '@/lib/services/youtube';
import { getScript, updateProject, getUser, updateUser, getProject } from '@/lib/services/firestore-admin';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import { EnvironmentMode } from '@/lib/config/environment';

/**
 * API Route to publish a video to YouTube.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;

    try {
        const { scriptId, uid, metadata, privacy = 'unlisted' } = await req.json();

        if (!scriptId || !uid || !metadata) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // Read environment mode from cookie
        const cookieStore = await cookies();
        const envMode = cookieStore.get('x-env-mode')?.value as EnvironmentMode;

        // 1. Get User Tokens and Project from Firestore
        const user = await getUser(uid);
        const project = await getProject(projectId);

        if (!user || !user.youtubeTokens) {
            return NextResponse.json({ error: 'YouTube account not connected' }, { status: 401 });
        }

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        let { accessToken, refreshToken, expiryDate } = user.youtubeTokens;

        // 2. Refresh token if expired (or close to it)
        if (Date.now() > expiryDate - 60000) {
            console.log('[YouTube Publish] Refreshing access token...');
            const newTokens = await youtubeService.refreshAccessToken(refreshToken);
            accessToken = newTokens.access_token!;
            expiryDate = newTokens.expiry_date!;

            // Update user tokens in Firestore
            await updateUser(uid, {
                youtubeTokens: {
                    accessToken,
                    refreshToken, // refresh_token doesn't usually change
                    expiryDate
                }
            });
        }

        // 3. Trigger Background Publish
        console.log(`[YouTube Publish] Starting background publish for project: ${projectId}`);

        await updateProject(projectId, {
            status: 'publishing',
            publishProgress: 0,
            publishMessage: 'Preparing video for YouTube...'
        } as any);

        const publishBackground = async () => {
            try {
                // 3a. Prepare Video Stream 
                let videoStream: Readable;
                let fileSize = 0;

                if (project.downloadUrl) {
                    const filePath = path.resolve(process.cwd(), 'public', project.downloadUrl.startsWith('/') ? project.downloadUrl.slice(1) : project.downloadUrl);
                    if (fs.existsSync(filePath)) {
                        videoStream = fs.createReadStream(filePath);
                        fileSize = fs.statSync(filePath).size;
                        console.log(`[YouTube Publish] Stream ready: ${filePath} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
                    } else {
                        throw new Error('Rendered video file missing');
                    }
                } else {
                    throw new Error('Project has not been rendered yet');
                }

                // 3b. Upload to YouTube
                await updateProject(projectId, { publishMessage: 'Authenticating with Google...' } as any);

                const youtubeResponse = await youtubeService.uploadVideo(
                    accessToken,
                    videoStream,
                    metadata,
                    privacy,
                    envMode,
                    async (bytesRead) => {
                        const progress = fileSize > 0 ? Math.round((bytesRead / fileSize) * 100) : 0;
                        await updateProject(projectId, {
                            publishProgress: progress,
                            publishMessage: `Uploading video to YouTube (${progress}%)...`
                        } as any);
                    }
                );

                // 4. Update Project Status on Success
                await updateProject(projectId, {
                    status: 'published',
                    publishProgress: 100,
                    publishMessage: 'Successfully published to YouTube!',
                    youtubeId: youtubeResponse.id || undefined,
                    youtubeUrl: youtubeResponse.id ? `https://youtube.com/watch?v=${youtubeResponse.id}` : undefined
                } as any);

                console.log(`[YouTube Publish] SUCCESS for project: ${projectId}`);

            } catch (error: any) {
                console.error('[YouTube Publish Background] Failed:', error);
                await updateProject(projectId, {
                    status: 'ready',
                    publishMessage: `Publishing failed: ${error.message}`
                } as any);
            }
        };

        // Start background task
        publishBackground();

        return NextResponse.json({
            success: true,
            message: 'Publishing started in background'
        });

    } catch (error: any) {
        console.error('[YouTube Publish API] Fatal error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
