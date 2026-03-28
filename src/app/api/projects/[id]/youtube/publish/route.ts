import { NextRequest, NextResponse } from 'next/server';
import { youtubeService } from '@/lib/services/youtube';
import { getScript, updateProject, getUser, updateUser, getProject } from '@/lib/services/firestore-admin';
import { Readable, PassThrough } from 'stream';
import fs from 'fs';
import path from 'path';
import { storageService } from '@/lib/services/storage';
import { cookies } from 'next/headers';
import { EnvironmentMode, getEnvironmentMode } from '@/lib/config/environment';

/**
 * API Route to publish a video to YouTube.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: projectId } = await params;

    try {
        const { scriptId, uid, metadata, privacy = 'private', envMode: bodyEnvMode } = await req.json();

        if (!scriptId || !uid || !metadata) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        // Read environment mode - Body > Cookie > System Default
        const cookieStore = await cookies();
        const cookieEnvMode = cookieStore.get('x-env-mode')?.value as EnvironmentMode;
        const envMode = bodyEnvMode || cookieEnvMode || getEnvironmentMode();

        console.log(`[YouTube Publish API] Using Environment Mode: ${envMode} (Source: ${bodyEnvMode ? 'Body' : (cookieEnvMode ? 'Cookie' : 'Default')})`);

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
            let videoStream: Readable | undefined;
            try {
                // 3a. Prepare Video Stream 
                let fileSize = 0;

                if (project.downloadUrl) {
                    // Check if it's a proxy URL, remote URL (Cloud Storage), or a local path
                    if (project.downloadUrl.startsWith('/api/projects/')) {
                        console.log(`[YouTube Publish] Detected proxy URL: ${project.downloadUrl}`);
                        const { stream, size } = await storageService.getVideoStream(projectId);
                        videoStream = stream as any;
                        fileSize = size;
                    } else if (project.downloadUrl.startsWith('http')) {
                        console.log(`[YouTube Publish] Detected remote storage URL: ${project.downloadUrl}`);
                        try {
                            const { stream, size } = await storageService.getVideoStream(projectId);
                            videoStream = stream as any;
                            fileSize = size;
                        } catch (storageError: any) {
                            console.warn(`[YouTube Publish] Storage Service failed, attempting direct fetch fallback: ${storageError.message}`);
                            const headResponse = await fetch(project.downloadUrl, { method: 'HEAD' });
                            if (!headResponse.ok) throw new Error(`Fallback fetch failed (HEAD): ${headResponse.statusText}`);
                            fileSize = parseInt(headResponse.headers.get('content-length') || '0', 10);
                            const getResponse = await fetch(project.downloadUrl);
                            if (!getResponse.ok || !getResponse.body) throw new Error(`Fallback fetch failed (GET): ${getResponse.statusText}`);
                            videoStream = Readable.fromWeb(getResponse.body as any);
                        }
                    } else {
                        const devFilePath = path.resolve(process.cwd(), 'public', project.downloadUrl.startsWith('/') ? project.downloadUrl.slice(1) : project.downloadUrl);
                        const tempFilePath = path.join(require('os').tmpdir(), 'renders', project.downloadUrl.split('/').pop() || '');

                        if (fs.existsSync(devFilePath)) {
                            videoStream = fs.createReadStream(devFilePath);
                            fileSize = fs.statSync(devFilePath).size;
                        } else if (fs.existsSync(tempFilePath)) {
                            videoStream = fs.createReadStream(tempFilePath);
                            fileSize = fs.statSync(tempFilePath).size;
                        } else {
                            throw new Error(`Rendered video file missing at ${devFilePath} or ${tempFilePath}`);
                        }
                    }

                    if (videoStream) {
                        videoStream.on('error', (err) => console.error(`[YouTube Publish] Video stream read error:`, err));
                        console.log(`[YouTube Publish] Stream initialized: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
                    }
                }

                if (!videoStream || fileSize === 0) {
                    throw new Error('Could not initialize video stream or file is empty');
                }

                // 3b. Upload to YouTube
                await updateProject(projectId, { publishMessage: 'Authenticating with Google...' } as any);

                let lastReportedProgress = -1;
                let lastUpdateTimestamp = 0;
                let isCancelledManual = false;
                const UPDATE_INTERVAL = 2000; // Frequency of progress updates / logs (ms)
                const CANCELLATION_CHECK_INTERVAL = 3000; // Frequency of firestore reads for cancellation (ms)

                // 3b. Cancellation Monitor (Independent Loop)
                const cancelChecker = setInterval(async () => {
                    try {
                        const currentProject = await getProject(projectId);
                        if (currentProject?._cancelUpload) {
                            console.log(`[YouTube Publish] Cancellation signal received via Firestore`);
                            isCancelledManual = true;
                            if (videoStream) videoStream.destroy(new Error('Upload cancelled by user'));
                            clearInterval(cancelChecker);
                        }
                    } catch (e) {
                         console.error('[YouTube Publish] Cancellation monitor check failed:', e);
                    }
                }, CANCELLATION_CHECK_INTERVAL);

                // 3b. Sanitize stream for YouTube API client (GCS streams can sometimes hang)
                const sanitizedStream = new PassThrough();
                videoStream.pipe(sanitizedStream);

                const youtubeResponse = await youtubeService.uploadVideo(
                    { accessToken, refreshToken },
                    sanitizedStream as any,
                    metadata,
                    privacy,
                    envMode,
                    async (bytesRead) => {
                        if (isCancelledManual) return true; // Signal cancellation back to youtubeService

                        const now = Date.now();
                        const progress = bytesRead > 0 && fileSize > 0 ? Math.round((bytesRead / fileSize) * 100) : 0;
                        const hasChanged = progress !== lastReportedProgress;

                        // 2. Report Progress (Throttled but lightweight - NO DB READS)
                        const isFinal = bytesRead === -1;
                        // Log every 500KB or every UPDATE_INTERVAL
                        const shouldUpdateProgress = (hasChanged && progress % 5 === 0) || (now - lastUpdateTimestamp > UPDATE_INTERVAL);

                        if (isFinal || shouldUpdateProgress) {
                            if (progress > lastReportedProgress && bytesRead > 0) {
                                lastReportedProgress = progress;
                                lastUpdateTimestamp = now;
                                console.log(`[YouTube Publish] Progress: ${progress}% (${(bytesRead / 1024 / 1024).toFixed(2)} MB)`);

                                // Fire-and-forget status update
                                updateProject(projectId, {
                                    publishProgress: Math.min(progress, 99),
                                    publishMessage: `Uploading video to YouTube (${progress}%)...`
                                } as any).catch(e => console.error('[YouTube Publish] UI Progress update failed:', e));
                            }
                        }
                        return false;
                    },
                    project.thumbnailUrl
                );

                clearInterval(cancelChecker);

                await updateProject(projectId, {
                    status: 'published',
                    publishProgress: 100,
                    publishMessage: 'Successfully published to YouTube!',
                    youtubeId: youtubeResponse.id || undefined,
                    youtubeUrl: youtubeResponse.id ? `https://youtube.com/watch?v=${youtubeResponse.id}` : undefined
                } as any);

                console.log(`[YouTube Publish] SUCCESS for project: ${projectId}`);

            } catch (error: any) {
                console.error('[YouTube Publish Background] Failed:', error.message);
                const isCancelled = error.message?.includes('cancelled');
                await updateProject(projectId, {
                    status: 'ready',
                    publishMessage: isCancelled ? 'Upload cancelled' : `Publishing failed: ${error.message}`,
                    publishProgress: 0,
                    _cancelUpload: null
                } as any);
            } finally {
                if (videoStream) {
                    console.log('[YouTube Publish] Cleaning up video stream...');
                    videoStream.destroy();
                }
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
