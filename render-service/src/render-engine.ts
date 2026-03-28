import path from 'path';
import fs from 'fs';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin for Storage access
if (admin.apps.length === 0) {
    admin.initializeApp({
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
}

const storage = admin.storage();

export interface Scene {
    id: string;
    sectionId: string;
    sectionTitle?: string;
    startTime: number;
    duration: number;
    imageUrl: string;
    videoUrl?: string;
    narrationText?: string;
    audioUrl?: string;
    sfxUrl?: string;
    sfxVolume?: number;
    sfxOffset?: number;
    volume?: number;
    transitionType: 'fade' | 'blur' | 'zoom' | 'slide';
    transitionDuration: number;
    inPoint?: number;
    outPoint?: number;
    trackId?: 'video' | 'broll' | 'audio';
}

const activeCommands = new Map<string, Set<ffmpeg.FfmpegCommand>>();

const trackCommand = (projectId: string, command: ffmpeg.FfmpegCommand) => {
    if (!activeCommands.has(projectId)) {
        activeCommands.set(projectId, new Set());
    }
    activeCommands.get(projectId)!.add(command);
};

const untrackCommand = (projectId: string, command: ffmpeg.FfmpegCommand) => {
    const list = activeCommands.get(projectId);
    if (list) {
        list.delete(command);
        if (list.size === 0) {
            activeCommands.delete(projectId);
        }
    }
};

const getDynamicH264Opts = () => {
    const threadCount = os.cpus().length;
    return [
        '-vcodec libx264',
        '-pix_fmt yuv420p',
        '-profile:v main',
        '-level 4.1',
        '-crf 18',
        '-g 30',
        '-max_muxing_queue_size 1024',
        '-tune stillimage',
        '-preset veryfast',
        `-threads ${threadCount}`,
        '-r 30'
    ];
};

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
        onProgress?: (progress: number, message: string) => Promise<void>
    ): Promise<string> {
        const targetRes = process.env.RENDER_RESOLUTION || '1080p';
        const isVertical = aspectRatio === '9:16';
        
        console.log(`[RenderService] Starting render for project: ${projectId}`);

        const baseTemp = '/tmp/renders';
        const tempDir = path.join(baseTemp, `render-${projectId}-${Date.now()}`);
        const outputDir = path.join(baseTemp, 'outputs');
        const fileName = customFileName || `${projectId}.mp4`;
        const outputFile = path.join(outputDir, fileName);

        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        try {
            if (onProgress) await onProgress(5, 'Downloading assets...');
            const assetPaths = await this.downloadAssets(projectId, scenes, backgroundMusicUrl, ambianceUrl, tempDir);

            if (onProgress) await onProgress(15, 'Pre-processing visuals...');
            for (let i = 0; i < assetPaths.images.length; i++) {
                const originalPath = assetPaths.images[i];
                const processedPath = path.join(tempDir, `proc-img-${i}.jpg`);
                await this.preProcessImage(projectId, originalPath, processedPath, aspectRatio, targetRes);
                assetPaths.images[i] = processedPath;
                if (fs.existsSync(originalPath)) fs.unlinkSync(originalPath);
            }

            await this.generateCineVideo(
                projectId,
                scenes,
                assetPaths,
                outputFile,
                tempDir,
                onProgress,
                backgroundMusicVolume,
                ambianceVolume,
                narrationVolume,
                globalSfxVolume,
                subtitlesEnabled,
                subtitleStyle,
                aspectRatio,
                targetRes
            );

            if (onProgress) await onProgress(98, 'Uploading to Cloud Storage...');
            
            const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
            if (!bucketName) throw new Error('FIREBASE_STORAGE_BUCKET not set');
            
            const bucket = storage.bucket(bucketName);
            const destination = `projects/${projectId}/renders/${fileName}`;
            
            await bucket.upload(outputFile, {
                destination,
                metadata: { contentType: 'video/mp4' }
            });

            // Make public if configured
            if (process.env.MAKE_PUBLIC === 'true') {
                try {
                    await bucket.file(destination).makePublic();
                } catch (e) {
                    console.warn('[RenderService] Could not make file public');
                }
            }

            const finalUrl = `https://storage.googleapis.com/${bucketName}/${destination}`;
            if (onProgress) await onProgress(100, 'Render complete!');

            return finalUrl;
        } catch (error: any) {
            console.error('[RenderService] FATAL ERROR:', error);
            throw error;
        } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
            if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
        }
    },

    async downloadAssets(projectId: string, scenes: Scene[], backgroundMusicUrl: string | undefined, ambianceUrl: string | undefined, tempDir: string) {
        const imagePaths: string[] = [];
        const videoPaths: Record<number, string> = {};
        const audioPaths: Record<string, string> = {};
        const sfxPaths: Record<string, string> = {};
        let backgroundMusicPath: string | null = null;
        let ambiancePath: string | null = null;

        const downloadPromises = [];

        for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];
            const imgPath = path.join(tempDir, `img-${i}.jpg`);
            downloadPromises.push(this.downloadFile(scene.imageUrl, imgPath));
            imagePaths.push(imgPath);

            if (scene.videoUrl) {
                const vidPath = path.join(tempDir, `vid-src-${i}.mp4`);
                downloadPromises.push(this.downloadFile(scene.videoUrl, vidPath));
                videoPaths[i] = vidPath;
            }
        }

        const uniqueSections = Array.from(new Set(scenes.map(s => s.sectionId)));
        for (const sectionId of uniqueSections) {
            const sceneWithAudio = scenes.find(s => s.sectionId === sectionId && s.audioUrl);
            if (sceneWithAudio?.audioUrl) {
                const audPath = path.join(tempDir, `aud-${sectionId}.mp3`);
                downloadPromises.push(this.downloadFile(sceneWithAudio.audioUrl, audPath));
                audioPaths[sectionId] = audPath;
            }
        }

        for (const scene of scenes) {
            if (scene.sfxUrl) {
                const sfxPath = path.join(tempDir, `sfx-${scene.id}.mp3`);
                downloadPromises.push(this.downloadFile(scene.sfxUrl, sfxPath));
                sfxPaths[scene.id] = sfxPath;
            }
        }

        if (backgroundMusicUrl) {
            backgroundMusicPath = path.join(tempDir, 'bg-music.mp3');
            downloadPromises.push(this.downloadFile(backgroundMusicUrl, backgroundMusicPath));
        }

        if (ambianceUrl) {
            ambiancePath = path.join(tempDir, 'ambiance.mp3');
            downloadPromises.push(this.downloadFile(ambianceUrl, ambiancePath));
        }

        await Promise.all(downloadPromises);

        return { 
            images: imagePaths, 
            videos: videoPaths,
            audio: audioPaths, 
            backgroundMusic: backgroundMusicPath, 
            ambiance: ambiancePath, 
            sfx: sfxPaths 
        };
    },

    async downloadFile(url: string, dest: string) {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const writer = fs.createWriteStream(dest);
        response.data.pipe(writer);
        return new Promise<void>((resolve, reject) => {
            writer.on('finish', () => resolve());
            writer.on('error', (err) => reject(err));
        });
    },

    async preProcessImage(projectId: string, src: string, dest: string, aspectRatio: '16:9' | '9:16' = '16:9', resolution: string = '1080p') {
        const isVertical = aspectRatio === '9:16';
        const RESOLUTIONS: Record<string, { w: number, h: number }> = {
            '4k': { w: 3840, h: 2160 },
            '1080p': { w: 1920, h: 1080 },
            '720p': { w: 1280, h: 720 }
        };
        const dim = RESOLUTIONS[resolution] || RESOLUTIONS['1080p'];
        const scaleW = isVertical ? 1080 : dim.w;
        const scaleH = isVertical ? 1920 : dim.h;

        return new Promise<void>((resolve, reject) => {
            const command = ffmpeg(src);
            trackCommand(projectId, command);

            command.outputOptions([
                '-vf', `scale=${scaleW}:${scaleH}:force_original_aspect_ratio=increase,crop=${scaleW}:${scaleH},setsar=1`,
                '-frames:v', '1'
            ])
            .on('end', () => { untrackCommand(projectId, command); resolve(); })
            .on('error', (err: Error) => { untrackCommand(projectId, command); reject(err); })
            .save(dest);
        });
    },

    async createSteadySegment(projectId: string, imgPath: string, duration: number, outPath: string) {
        return new Promise<void>((resolve, reject) => {
            const command = ffmpeg(imgPath);
            trackCommand(projectId, command);
            command.loop(duration)
                .outputOptions(['-t', duration.toString(), ...getDynamicH264Opts()])
                .on('end', () => { untrackCommand(projectId, command); resolve(); })
                .on('error', (err: Error) => { untrackCommand(projectId, command); reject(err); })
                .save(outPath);
        });
    },

    async createVideoSegment(projectId: string, vidPath: string, duration: number, outPath: string, aspectRatio: '16:9' | '9:16' = '16:9', resolution: string = '1080p', inPoint: number = 0) {
        const isVertical = aspectRatio === '9:16';
        const RESOLUTIONS: Record<string, { w: number, h: number }> = {
            '4k': { w: 3840, h: 2160 },
            '1080p': { w: 1920, h: 1080 },
            '720p': { w: 1280, h: 720 }
        };
        const dim = RESOLUTIONS[resolution] || RESOLUTIONS['1080p'];
        const scaleW = isVertical ? 1080 : dim.w;
        const scaleH = isVertical ? 1920 : dim.h;

        return new Promise<void>((resolve, reject) => {
            const command = ffmpeg(vidPath);
            trackCommand(projectId, command);
            
            if (inPoint > 0) {
                command.seekInput(inPoint);
            }

            command.outputOptions([
                '-t', duration.toString(),
                '-vf', `fps=30,scale=${scaleW}:${scaleH}:force_original_aspect_ratio=increase,crop=${scaleW}:${scaleH},setsar=1`,
                ...getDynamicH264Opts(),
                '-an'
            ])
            .on('end', () => { untrackCommand(projectId, command); resolve(); })
            .on('error', (err: Error) => { untrackCommand(projectId, command); reject(err); })
            .save(outPath);
        });
    },

    async createTransitionSegment(projectId: string, imgAPath: string, imgBPath: string, type: string, duration: number, outPath: string) {
        return new Promise<void>((resolve, reject) => {
            const command = ffmpeg();
            const transitionMap: Record<string, string> = { 'fade': 'fade', 'blur': 'dissolve', 'zoom': 'zoomin', 'slide': 'slideleft' };
            const fType = transitionMap[type] || 'fade';
            
            command.input(imgAPath).inputOptions(['-loop 1', `-t ${duration}`])
                .input(imgBPath).inputOptions(['-loop 1', `-t ${duration}`])
                .complexFilter([`[0:v]fps=30,format=yuv420p[v0];[1:v]fps=30,format=yuv420p[v1];[v0][v1]xfade=transition=${fType}:duration=${duration}:offset=0`])
                .outputOptions(['-t', duration.toString(), ...getDynamicH264Opts()])
                .on('end', () => { untrackCommand(projectId, command); resolve(); })
                .on('error', (err: Error) => { untrackCommand(projectId, command); reject(err); });

            trackCommand(projectId, command);
            command.save(outPath);
        });
    },

    async concatenateSegments(projectId: string, segmentPaths: string[], outPath: string, tempDir: string) {
        return new Promise<void>((resolve, reject) => {
            const listPath = path.join(tempDir, 'concat.txt');
            const listContent = segmentPaths.map(p => `file '${path.resolve(p).replace(/'/g, "'\\''")}'`).join('\n');
            fs.writeFileSync(listPath, listContent);
            
            const command = ffmpeg();
            trackCommand(projectId, command);

            command.input(listPath).inputOptions(['-f concat', '-safe 0']).outputOptions(['-c copy'])
                .on('end', () => { untrackCommand(projectId, command); resolve(); })
                .on('error', (err: Error) => { untrackCommand(projectId, command); reject(err); })
                .save(outPath);
        });
    },

    async generateCineVideo(
        projectId: string,
        scenes: Scene[],
        assetPaths: any,
        outputPath: string,
        tempDir: string,
        onProgress?: (p: number, m: string) => Promise<void>,
        backgroundMusicVolume: number = 0.2,
        ambianceVolume: number = 0.1,
        narrationVolume: number = 1.0,
        globalSfxVolume: number = 0.4,
        subtitlesEnabled: boolean = false,
        subtitleStyle: string = 'minimal',
        renderAspectRatio: '16:9' | '9:16' = '16:9',
        resolution: string = '1080p'
    ) {
        const primaryScenes = scenes.filter(s => !s.trackId || s.trackId === 'video').sort((a,b) => a.startTime - b.startTime);
        const brollScenes = scenes.filter(s => s.trackId === 'broll').sort((a,b) => a.startTime - b.startTime);
        
        const segmentFiles: string[] = [];

        // 1. Generate Primary Track (Sequential)
        for (let i = 0; i < primaryScenes.length; i++) {
            const scene = primaryScenes[i];
            const isLast = i === primaryScenes.length - 1;
            const nextScene = primaryScenes[i + 1];
            
            const transitionDuration = (!isLast && nextScene) ?
                Math.min((nextScene.transitionDuration || 1000) / 1000, scene.duration / 2, nextScene.duration / 2) : 0;

            if (onProgress) {
                const progress = 20 + Math.round((i / primaryScenes.length) * 40);
                await onProgress(progress, `Baking primary scene ${i + 1}/${primaryScenes.length}...`);
            }

            const safeSceneDuration = Math.max(scene.duration, 0.5);
            const steadyDuration = safeSceneDuration - transitionDuration;
            
            if (steadyDuration > 0.05) {
                const steadyPath = path.join(tempDir, `primary-steady-${i}.mp4`);
                const sceneIdxInOriginal = scenes.findIndex(s => s.id === scene.id);
                if (assetPaths.videos[sceneIdxInOriginal]) {
                    await this.createVideoSegment(projectId, assetPaths.videos[sceneIdxInOriginal], steadyDuration, steadyPath, renderAspectRatio, resolution, scene.inPoint || 0);
                } else {
                    await this.createSteadySegment(projectId, assetPaths.images[sceneIdxInOriginal], steadyDuration, steadyPath);
                }
                segmentFiles.push(steadyPath);
            }

            if (transitionDuration > 0) {
                const transPath = path.join(tempDir, `primary-trans-${i}.mp4`);
                const curIdx = scenes.findIndex(s => s.id === scene.id);
                const nextIdx = scenes.findIndex(s => s.id === nextScene.id);
                await this.createTransitionSegment(projectId, assetPaths.images[curIdx], assetPaths.images[nextIdx], nextScene.transitionType, transitionDuration, transPath);
                segmentFiles.push(transPath);
            }
        }

        const silentVideoPath = path.join(tempDir, 'silent_video.mp4');
        await this.concatenateSegments(projectId, segmentFiles, silentVideoPath, tempDir);

        // 2. Generate B-Roll Overlays (Absolute)
        const overlaySegments: { path: string, startTime: number, duration: number }[] = [];
        for (let i = 0; i < brollScenes.length; i++) {
            const scene = brollScenes[i];
            const overlayPath = path.join(tempDir, `broll-segment-${i}.mp4`);
            const sceneIdxInOriginal = scenes.findIndex(s => s.id === scene.id);

            if (onProgress) {
                const progress = 60 + Math.round((i / brollScenes.length) * 20);
                await onProgress(progress, `Baking B-Roll clip ${i + 1}/${brollScenes.length}...`);
            }

            if (assetPaths.videos[sceneIdxInOriginal]) {
                await this.createVideoSegment(projectId, assetPaths.videos[sceneIdxInOriginal], scene.duration, overlayPath, renderAspectRatio, resolution, scene.inPoint || 0);
            } else {
                await this.createSteadySegment(projectId, assetPaths.images[sceneIdxInOriginal], scene.duration, overlayPath);
            }
            overlaySegments.push({ path: overlayPath, startTime: scene.startTime, duration: scene.duration });
        }

        await this.muxFinalAudio(projectId, silentVideoPath, scenes, assetPaths, outputPath, backgroundMusicVolume, ambianceVolume, narrationVolume, globalSfxVolume, subtitlesEnabled, subtitleStyle, tempDir, renderAspectRatio, overlaySegments);
    },

    generateAssFile(scenes: Scene[], tempDir: string, styleType: string = 'minimal', aspectRatio: '16:9' | '9:16' = '16:9'): string {
        const assPath = path.join(tempDir, 'subtitles.ass');
        const isVertical = aspectRatio === '9:16';
        let playResX = 3840, playResY = 2160, fontSize = 92, alignment = 2, marginV = 202, marginLR = 480, bold = 0, primaryColour = '&H33FFFFFF', spacing = 3.5;

        if (isVertical) {
            playResX = 1080; playResY = 1920; fontSize = 32; marginV = 59; marginLR = 135; spacing = 1.2;
        }
        if (styleType === 'bold') {
            fontSize = isVertical ? 48 : 123; bold = -1; primaryColour = '&H00FFFFFF'; spacing = -1.5;
        } else if (styleType === 'classic') {
            fontSize = isVertical ? 38 : 108; primaryColour = '&H00FFFFFF'; spacing = 0;
        }

        const header = [
            '[Script Info]', 'Title: VideoSystem Subtitles', 'ScriptType: v4.00+', 'WrapStyle: 0', 'ScaledBorderAndShadow: yes', 'YCbCr Matrix: TV.601',
            `PlayResX: ${playResX}`, `PlayResY: ${playResY}`, '',
            '[V4+ Styles]', 'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
            `Style: Default,Arial,${fontSize},${primaryColour},&H000000FF,&H00000000,&H80000000,${bold},0,0,0,100,100,${spacing},0,1,0.5,2,${alignment},${marginLR},${marginLR},${marginV},1`,
            '', '[Events]', 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text'
        ].join('\n');

        const formatAssTime = (seconds: number) => {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);
            const ms = Math.floor((seconds % 1) * 100);
            return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
        };

        const dialogues = scenes.filter(s => s.narrationText).map(scene => {
            const start = formatAssTime(scene.startTime);
            const end = formatAssTime(scene.startTime + scene.duration);
            const text = scene.narrationText!.replace(/[\r\n]+/g, ' ').replace(/\s\s+/g, ' ').trim();
            return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
        }).join('\n');

        fs.writeFileSync(assPath, header + '\n' + dialogues + '\n');
        return assPath;
    },

    async muxFinalAudio(
        projectId: string,
        videoPath: string,
        scenes: Scene[],
        assetPaths: any,
        outputPath: string,
        backgroundMusicVolume: number = 0.2,
        ambianceVolume: number = 0.1,
        narrationVolume: number = 1.0,
        globalSfxVolume: number = 0.4,
        subtitlesEnabled: boolean = false,
        subtitleStyle: string = 'minimal',
        tempDir: string = '',
        renderAspectRatio: '16:9' | '9:16' = '16:9',
        overlaySegments: { path: string, startTime: number, duration: number }[] = []
    ) {
        return new Promise<void>((resolve, reject) => {
            const command = ffmpeg(videoPath);
            let inputCounter = 1;

            // 1. Add inputs for B-Roll Video Overlays
            const brollInputMap: Record<number, number> = {};
            overlaySegments.forEach((seg, idx) => {
                command.input(seg.path);
                brollInputMap[idx] = inputCounter++;
            });

            // 2. Add inputs for Narration Audio
            const uniqueSectionIds = Array.from(new Set(scenes.map(s => s.sectionId)));
            const audioInputMap: Record<string, number> = {};
            uniqueSectionIds.forEach((sid) => {
                if (assetPaths.audio[sid]) {
                    command.input(assetPaths.audio[sid]);
                    audioInputMap[sid] = inputCounter++;
                }
            });

            // 3. Add background music
            let bgMusicIndex = -1;
            if (assetPaths.backgroundMusic) {
                command.input(assetPaths.backgroundMusic);
                bgMusicIndex = inputCounter++;
            }

            // 4. Add ambiance
            let ambianceIndex = -1;
            if (assetPaths.ambiance) {
                command.input(assetPaths.ambiance);
                ambianceIndex = inputCounter++;
            }

            // 5. Add Sound Effects
            const sfxInputMap: Record<string, number> = {};
            scenes.forEach(scene => {
                if (assetPaths.sfx[scene.id]) {
                    command.input(assetPaths.sfx[scene.id]);
                    sfxInputMap[scene.id] = inputCounter++;
                }
            });

            const filters: any[] = [];
            const audioMixInputs: string[] = [];

            // --- VIDEO FILTERS ---
            let lastVideoLabel = '0:v';

            // Apply Subtitles first (on primary video)
            if (subtitlesEnabled) {
                const assPath = this.generateAssFile(scenes, tempDir, subtitleStyle, renderAspectRatio);
                const escapedAssPath = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');
                filters.push({ filter: 'ass', options: `filename='${escapedAssPath}'`, inputs: lastVideoLabel, outputs: 'v_sub' });
                lastVideoLabel = 'v_sub';
            }

            // Apply B-Roll Overlays
            overlaySegments.forEach((seg, idx) => {
                const inputIdx = brollInputMap[idx];
                const outLabel = `v_over_${idx}`;
                filters.push({ 
                    filter: 'overlay', 
                    options: `enable='between(t,${seg.startTime},${seg.startTime + seg.duration})'`, 
                    inputs: [lastVideoLabel, `${inputIdx}:v`], 
                    outputs: outLabel 
                });
                lastVideoLabel = outLabel;
            });

            // --- AUDIO FILTERS ---
            uniqueSectionIds.forEach((sid, idx) => {
                if (assetPaths.audio[sid]) {
                    const scene = scenes.find(s => s.sectionId === sid);
                    const startTimeMs = Math.round((scene?.startTime || 0) * 1000);
                    const inputIdx = audioInputMap[sid];
                    filters.push({ filter: 'volume', options: narrationVolume.toString(), inputs: `${inputIdx}:a`, outputs: `anar_vol${idx}` });
                    filters.push({ filter: 'aresample', options: '44100', inputs: `anar_vol${idx}`, outputs: `anar_res${idx}` });
                    filters.push({ filter: 'aformat', options: 'sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo', inputs: `anar_res${idx}`, outputs: `anar_fmt${idx}` });
                    filters.push({ filter: 'adelay', options: `${startTimeMs}|${startTimeMs}`, inputs: `anar_fmt${idx}`, outputs: `anar${idx}` });
                    audioMixInputs.push(`[anar${idx}]`);
                }
            });

            scenes.forEach((scene, idx) => {
                if (assetPaths.sfx[scene.id]) {
                    const startTimeMs = Math.round(scene.startTime * 1000);
                    const inputIdx = sfxInputMap[scene.id];
                    filters.push({ filter: 'volume', options: (globalSfxVolume || 0.4).toString(), inputs: `${inputIdx}:a`, outputs: `asfx_vol${idx}` });
                    filters.push({ filter: 'aresample', options: '44100', inputs: `asfx_vol${idx}`, outputs: `asfx_res${idx}` });
                    filters.push({ filter: 'aformat', options: 'sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo', inputs: `asfx_res${idx}`, outputs: `asfx_fmt${idx}` });
                    filters.push({ filter: 'adelay', options: `${startTimeMs}|${startTimeMs}`, inputs: `asfx_fmt${idx}`, outputs: `asfx${idx}` });
                    audioMixInputs.push(`[asfx${idx}]`);
                }
            });

            if (ambianceIndex !== -1) {
                filters.push({ filter: 'volume', options: ambianceVolume.toString(), inputs: `${ambianceIndex}:a`, outputs: `aamb_vol` });
                filters.push({ filter: 'aresample', options: '44100', inputs: `aamb_vol`, outputs: `aamb_res` });
                filters.push({ filter: 'aformat', options: 'sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo', inputs: `aamb_res`, outputs: 'aamb' });
                audioMixInputs.push('[aamb]');
            }

            if (bgMusicIndex !== -1) {
                const narrationRanges: { start: number, end: number }[] = [];
                uniqueSectionIds.forEach(sid => {
                    if (assetPaths.audio[sid]) {
                        const sectionScenes = scenes.filter(s => s.sectionId === sid);
                        if (sectionScenes.length > 0) {
                            const start = sectionScenes[0].startTime;
                            const end = sectionScenes[sectionScenes.length - 1].startTime + sectionScenes[sectionScenes.length - 1].duration;
                            narrationRanges.push({ start, end });
                        }
                    }
                });
                let volumeExpr = backgroundMusicVolume.toString();
                if (narrationRanges.length > 0) {
                    const duckStr = narrationRanges.map(r => `between(t,${r.start.toFixed(3)},${r.end.toFixed(3)})`).join('+');
                    volumeExpr = `'${backgroundMusicVolume}*(1-(${duckStr})*(1-0.3))'`;
                }
                filters.push({ filter: 'volume', options: volumeExpr, inputs: `${bgMusicIndex}:a`, outputs: `abg_vol` });
                filters.push({ filter: 'aresample', options: '44100', inputs: `abg_vol`, outputs: `abg_res` });
                filters.push({ filter: 'aformat', options: 'sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo', inputs: `abg_res`, outputs: 'abg' });
                audioMixInputs.push('[abg]');
            }

            if (audioMixInputs.length > 1) {
                filters.push({ filter: 'amix', options: { inputs: audioMixInputs.length, duration: 'longest', normalize: 0 }, inputs: audioMixInputs.map(i => i.replace('[', '').replace(']', '')), outputs: 'finalaudio' });
            } else if (audioMixInputs.length === 1) {
                filters.push({ filter: 'acopy', inputs: audioMixInputs[0].replace('[', '').replace(']', ''), outputs: 'finalaudio' });
            }

            command.complexFilter(filters);
            
            const totalDuration = Math.max(0.1, scenes.reduce((max, s) => Math.max(max, s.startTime + s.duration), 0));
            
            command.map(lastVideoLabel);
            if (audioMixInputs.length > 0) command.map('finalaudio');

            command.outputOptions([
                '-t', totalDuration.toFixed(3), 
                '-y',
                ...getDynamicH264Opts()
            ]);

            trackCommand(projectId, command);
            command.on('end', () => { untrackCommand(projectId, command); resolve(); })
                .on('error', (err: Error) => { untrackCommand(projectId, command); reject(err); })
                .save(outputPath);
        });
    }
};
