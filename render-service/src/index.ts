import express, { Request, Response } from 'express';
import { renderEngine } from './render-engine';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json({ limit: '50mb' }));

app.get('/health', (req: Request, res: Response) => {
    res.status(200).send('OK');
});

app.post('/render', async (req: Request, res: Response) => {
    const { 
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
        customFileName
    } = req.body;

    if (!projectId || !scenes || !Array.isArray(scenes)) {
        return res.status(400).json({ error: 'Missing required projectId or scenes' });
    }

    console.log(`[RenderService] Starting job for project: ${projectId} with ${scenes.length} scenes.`);

    try {
        // Run render in background to return response early if needed,
        // or wait and return URL. Since Cloud Run has a timeout, 
        // it's better to wait if jobs are <15 mins.
        
        const finalUrl = await renderEngine.renderDocumentary(
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
            async (progress, message) => {
                console.log(`[RenderService] [${projectId}] Progress: ${progress}% - ${message}`);
            }
        );

        res.status(200).json({ 
            success: true, 
            projectId, 
            url: finalUrl 
        });

    } catch (error: any) {
        console.error(`[RenderService] Render failed:`, error);
        res.status(500).json({ 
            success: false, 
            error: error.message || 'Rendering failed' 
        });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`[RenderService] Listening on port ${PORT}`);
});

process.on('SIGTERM', () => {
    console.log('[RenderService] SIGTERM received, shutting down');
    process.exit(0);
});
