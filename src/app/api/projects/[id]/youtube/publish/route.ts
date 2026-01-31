import { NextRequest, NextResponse } from 'next/server';
import { youtubeService } from '@/lib/services/youtube';
import { getScript, updateProject, getUser, updateUser, getProject } from '@/lib/services/firestore-admin';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import { storageService } from '@/lib/services/storage';
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
        const { scriptId, uid, metadata, privacy = 'private' } = await req.json();

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
            publishMessage: 'Preparing video for YouTube...',
            _cancelUpload: null // Clear any previous cancellation flags
        } as any);

        const publishBackground = async () => {
            try {
                // 3a. Prepare Video Stream 
                let videoStream: Readable;
                let fileSize = 0;

                if (project.downloadUrl) {
                    // Check if it's a proxy URL, remote URL (Cloud Storage), or a local path
                    if (project.downloadUrl.startsWith('/api/projects/')) {
                        // New proxy URL pattern - extract projectId and use storage service
                        console.log(`[YouTube Publish] Detected proxy URL: ${project.downloadUrl}`);
                        const { stream, size } = await storageService.getVideoStream(projectId);
                        videoStream = stream as any;
                        fileSize = size;
                        console.log(`[YouTube Publish] Stream retrieved from Storage Service via proxy (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
                    } else if (project.downloadUrl.startsWith('http')) {
                        console.log(`[YouTube Publish] Detected remote storage URL: ${project.downloadUrl}`);
                        try {
                            const { stream, size } = await storageService.getVideoStream(projectId);
                            videoStream = stream as any;
                            fileSize = size;
                            console.log(`[YouTube Publish] Stream retrieved from Storage Service (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
                        } catch (storageError: any) {
                            console.warn(`[YouTube Publish] Storage Service failed, attempting direct fetch fallback: ${storageError.message}`);

                            // Direct Fetch Fallback (Critical for Localhost with missing SA credentials)
                            const headResponse = await fetch(project.downloadUrl, { method: 'HEAD' });
                            if (!headResponse.ok) throw new Error(`Fallback fetch failed (HEAD): ${headResponse.statusText}`);

                            fileSize = parseInt(headResponse.headers.get('content-length') || '0', 10);
                            const getResponse = await fetch(project.downloadUrl);
                            if (!getResponse.ok || !getResponse.body) throw new Error(`Fallback fetch failed (GET): ${getResponse.statusText}`);

                            // Convert standard web ReadableStream to NodeJS Readable
                            videoStream = Readable.fromWeb(getResponse.body as any);
                            console.log(`[YouTube Publish] Stream retrieved via Fetch Fallback (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
                        }
                    } else {
                        // Fallback for legacy local renders (dev environment)
                        const devFilePath = path.resolve(process.cwd(), 'public', project.downloadUrl.startsWith('/') ? project.downloadUrl.slice(1) : project.downloadUrl);
                        const tempFilePath = path.join(require('os').tmpdir(), 'renders', project.downloadUrl.split('/').pop() || '');

                        if (fs.existsSync(devFilePath)) {
                            videoStream = fs.createReadStream(devFilePath);
                            fileSize = fs.statSync(devFilePath).size;
                            console.log(`[YouTube Publish] Local dev stream ready: ${devFilePath} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
                        } else if (fs.existsSync(tempFilePath)) {
                            videoStream = fs.createReadStream(tempFilePath);
                            fileSize = fs.statSync(tempFilePath).size;
                            console.log(`[YouTube Publish] Local temp stream ready: ${tempFilePath} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
                        } else {
                            throw new Error(`Rendered video file missing at ${devFilePath} or ${tempFilePath}`);
                        }
                    }
                } else {
                    throw new Error('Project has not been rendered yet (no downloadUrl found)');
                }

                // 3b. Upload to YouTube
                await updateProject(projectId, { publishMessage: 'Authenticating with Google...' } as any);

                let lastReportedProgress = -1;
                const youtubeResponse = await youtubeService.uploadVideo(
                    { accessToken, refreshToken },
                    videoStream,
                    metadata,
                    privacy,
                    envMode,
                    async (bytesRead) => {
                        // thumbnail phase (-1) or percentage calculation
                        const progress = bytesRead > 0 && fileSize > 0 ? Math.round((bytesRead / fileSize) * 100) : 0;
                        const hasChanged = progress !== lastReportedProgress;

                        // Only check cancellation at -1 (thumbnail phase) or every 5% 
                        // to avoid overwhelming Firestore with reads
                        if (bytesRead === -1 || (hasChanged && progress % 5 === 0)) {
                            const currentProject = await getProject(projectId);
                            if (currentProject?._cancelUpload) {
                                console.log(`[YouTube Publish] Cancellation detected at ${progress === -1 ? 'thumbnail' : progress + '%'} phase`);
                                throw new Error('Upload cancelled by user');
                            }
                        }

                        // Only update Firestore if the percentage has strictly increased
                        // This prevents jitter if the report briefly drops by 1%
                        if (progress > lastReportedProgress && bytesRead > 0) {
                            lastReportedProgress = progress;
                            console.log(`[YouTube Publish] Progress: ${progress}% (${(bytesRead / 1024 / 1024).toFixed(2)} MB)`);

                            await updateProject(projectId, {
                                publishProgress: progress,
                                publishMessage: `Uploading video to YouTube (${progress}%)...`
                            } as any);
                        }
                        return false;
                    },
                    project.thumbnailUrl
                );

                console.log(`[YouTube Publish API] uploadVideo returned. Thumbnail URL used: ${project.thumbnailUrl || 'NONE'}`);

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

                const isCancelled = error.message?.includes('cancelled');
                await updateProject(projectId, {
                    status: 'ready',
                    publishMessage: isCancelled ? 'Upload cancelled' : `Publishing failed: ${error.message}`,
                    publishProgress: 0,
                    _cancelUpload: null // Clear the cancellation flag
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
