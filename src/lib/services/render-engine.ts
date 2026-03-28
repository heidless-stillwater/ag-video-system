import axios from 'axios';
import { Scene } from './video-engine';

const getCloudRunUrl = () => process.env.CLOUD_RUN_RENDER_URL || process.env.NEXT_PUBLIC_CLOUD_RUN_RENDER_URL || 'http://localhost:8080';

export const renderEngine = {
    async renderDocumentary(
        projectId: string,
        scenes: Scene[],
        backgroundMusicUrl?: string,
        backgroundMusicVolume: number = 0.2,
        ambianceUrl?: string,
        ambianceVolume: number = 0.1,
        narrationVolume: number = 1.0,
        globalSfxVolume: number = 0.4,
        subtitlesEnabled: boolean = false,
        subtitleStyle: string = 'minimal',
        aspectRatio: '16:9' | '9:16' = '16:9',
        customFileName?: string,
        performanceProfile?: any,
        onProgress?: (progress: number, message: string) => Promise<void>,
        clipId?: string
    ): Promise<string> {
        const cloudRunUrl = getCloudRunUrl();
        
        console.log(`[FFmpegRenderEngine] 🚀 DELEGATING RENDER TO WORKER: ${cloudRunUrl}`);
        if (onProgress) await onProgress(5, 'Transmitting manifest to render worker...');
        
        try {
            // We use standard POST to start the job.
            // Timeout is short because the worker responds 202 immediately.
            const response = await axios.post(`${cloudRunUrl}/render`, {
                projectId,
                scenes,
                backgroundMusicUrl,
                backgroundMusicVolume,
                ambianceUrl,
                ambianceVolume,
                narrationVolume,
                globalSfxVolume,
                subtitlesEnabled,
                subtitleStyle,
                aspectRatio,
                customFileName,
                performanceProfile,
                clipId
            }, {
                timeout: 30000 // 30 seconds wait for 202 Accepted
            });

            if (response.status === 202 || response.status === 200 || response.data.success) {
                if (onProgress) await onProgress(10, 'Worker accepted job. Processing in background...');
                // The worker will update Firestore when done.
                // We return a pending symbol, as the real URL will be set by the worker later.
                return 'PENDING_WORKER_RENDER';
            } else {
                throw new Error(response.data.error || 'Worker rejected the request');
            }
        } catch (err: any) {
            console.error('[FFmpegRenderEngine] Worker delegation failed:', err.message);
            throw new Error(`Worker execution failed: ${err.message}`);
        }
    },

    async killProject(projectId: string): Promise<boolean> {
        const cloudRunUrl = getCloudRunUrl();
        console.warn(`[RenderEngine] Manual project kill called for offloaded render (${projectId})`);
        try {
            await axios.post(`${cloudRunUrl}/kill`, { projectId });
            return true;
        } catch (err) {
            console.error('[RenderEngine] Failed to send kill command:', err);
            return false;
        }
    },

    async killAllProcesses(): Promise<boolean> {
        const cloudRunUrl = getCloudRunUrl();
        console.warn('[RenderEngine] Global process kill called');
        try {
            await axios.post(`${cloudRunUrl}/kill-all`);
            return true;
        } catch (err) {
            console.error('[RenderEngine] Failed to send global kill command:', err);
            return false;
        }
    }
};
