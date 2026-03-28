import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as admin from 'firebase-admin';
import { renderEngine } from './render-engine';

// Initialize environment variables and Firebase Admin
dotenv.config();

if (!admin.apps.length) {
    // If GOOGLE_APPLICATION_CREDENTIALS is set, Admin SDK auto-initializes.
    // Otherwise you can provide service account credential locally.
    admin.initializeApp();
}

const app = express();
app.use(cors());
// Need high payload limit for complex scenes
app.use(express.json({ limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Emergency kill project endpoint
app.post('/kill', async (req, res) => {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });

    console.warn(`[RenderWorker] Manual KILL requested for project: ${projectId}`);
    
    // Stop local processes
    await renderEngine.killProject(projectId);
    
    // Reset status in DB
    try {
        await admin.firestore().collection('projects').doc(projectId).update({
            status: 'review',
            renderProgress: 0,
            renderMessage: 'Render terminated by user.'
        });
    } catch (err) {
        console.error('[RenderWorker] Failed to reset status on kill:', err);
    }
    
    res.status(200).json({ success: true });
});

// Global kill all processes
app.post('/kill-all', async (req, res) => {
    console.warn('[RenderWorker] Global KILL ALL requested');
    const stopped = await renderEngine.killAllProcesses();
    res.status(200).json({ success: true, stopped });
});

// Primary render trigger
app.post('/render', async (req, res) => {
    const payload = req.body;
    const { projectId, clipId } = payload;
    const isShort = !!clipId;

    if (!projectId) {
        return res.status(400).json({ error: 'projectId is required' });
    }

    console.log(`[RenderWorker] Received render payload for project: ${projectId} (Short? ${isShort})`);
    
    // In Cloud Run, if CPU is allocated only during request processing,
    // we MUST NOT close the HTTP response until the render finishes.
    // If the caller times out (like Vercel dropping the connection), that's fine,
    // Cloud Run will continue processing the request until the max timeout (60m).
    
    try {
        console.log(`[RenderWorker] Processing job for ${projectId}...`);
        
        // Define progress callback that updates Firestore
        const onProgress = async (progress: number, message: string) => {
            console.log(`[RenderWorker] [${projectId}] Progress: ${progress}% - ${message}`);
            try {
                if (isShort && clipId) {
                    const docRef = admin.firestore().collection('projects').doc(projectId);
                    const docSnap = await docRef.get();
                    if (docSnap.exists) {
                        const data = docSnap.data();
                        if (data && data.shorts) {
                            const idx = data.shorts.findIndex((s: any) => s.id === clipId);
                            if (idx !== -1) {
                                data.shorts[idx].renderProgress = progress;
                                await docRef.update({ shorts: data.shorts });
                            }
                        }
                    }
                } else {
                    // Use set with merge: true for better resilience across projects
                    await admin.firestore().collection('projects').doc(projectId).set({
                        renderProgress: progress,
                        renderMessage: message,
                        updatedAt: new Date()
                    }, { merge: true });
                }
            } catch (err: any) {
                console.warn(`[RenderWorker] Progress update failed for ${projectId}:`, err.message);
            }
        };

        // We accept the request immediately so Cloud Run doesn't just block
        res.status(202).json({ success: true, message: 'Render job accepted.' });

        // Trigger render
        const finalUrl = await renderEngine.renderDocumentary(
            projectId,
            payload.scenes,
            payload.backgroundMusicUrl,
            payload.backgroundMusicVolume,
            payload.ambianceUrl,
            payload.ambianceVolume,
            payload.narrationVolume,
            payload.globalSfxVolume,
            payload.subtitlesEnabled,
            payload.subtitleStyle,
            payload.aspectRatio,
            payload.customFileName,
            payload.performanceProfile,
            onProgress
        );

        // Update final status
        if (isShort && clipId) {
            const proxyUrl = `/api/projects/${projectId}/video?fileName=${payload.customFileName || 'short.mp4'}`;
            const docRef = admin.firestore().collection('projects').doc(projectId);
            const docSnap = await docRef.get();
            if (docSnap.exists) {
                const data = docSnap.data();
                if (data && data.shorts) {
                    const idx = data.shorts.findIndex((s: any) => s.id === clipId);
                    if (idx !== -1) {
                        data.shorts[idx].status = 'ready';
                        data.shorts[idx].renderProgress = 100;
                        data.shorts[idx].downloadUrl = proxyUrl;
                        await docRef.update({ shorts: data.shorts });
                    }
                }
            }
        } else {
            await admin.firestore().collection('projects').doc(projectId).update({
                downloadUrl: finalUrl,
                status: 'ready',
                renderProgress: 100,
                renderMessage: 'Render complete!'
            });
        }
        
        console.log(`[RenderWorker] Job for ${projectId} complete. URL: ${finalUrl}`);
    } catch (error: any) {
        console.error(`[RenderWorker] Fatal error for ${projectId}:`, error);
        
        // Update error status in Firestore if headers aren't sent
        if (!res.headersSent) {
            res.status(500).json({ error: error.message || 'Render failed' });
        }
        
        try {
            if (isShort && clipId) {
                const docRef = admin.firestore().collection('projects').doc(projectId);
                const docSnap = await docRef.get();
                if (docSnap.exists) {
                    const data = docSnap.data();
                    if (data && data.shorts) {
                        const idx = data.shorts.findIndex((s: any) => s.id === clipId);
                        if (idx !== -1) {
                            data.shorts[idx].status = 'failed';
                            data.shorts[idx].renderProgress = 0;
                            await docRef.update({ shorts: data.shorts });
                        }
                    }
                }
            } else {
                await admin.firestore().collection('projects').doc(projectId).update({
                    status: 'error',
                    renderProgress: 0,
                    renderMessage: `Render failed: ${error.message}`
                });
            }
        } catch (dbErr) {
            console.error('[RenderWorker] Failed to write error state to DB:', dbErr);
        }
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Render worker listening on port ${PORT}`);
});
