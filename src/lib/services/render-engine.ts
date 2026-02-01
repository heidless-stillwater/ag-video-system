import path from 'path';
import fs from 'fs';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import axios from 'axios';
import { Scene } from './video-engine';
import { analyticsServerService } from './analytics-server';
import { EnvironmentMode } from '../config/environment';
import { resourceGovernor } from './resource-governor';
import { storageService } from './storage';

// Configure ffmpeg to use the static binary
const getFFmpegPath = () => {
    if (ffmpegStatic) {
        if (ffmpegStatic.startsWith('/ROOT') || !path.isAbsolute(ffmpegStatic)) {
            const relativePath = ffmpegStatic.replace(/^\/ROOT\//, '');
            return path.join(process.cwd(), relativePath);
        }
        return ffmpegStatic;
    }
    return null;
};

const getFFprobePath = () => {
    if (ffprobeStatic && ffprobeStatic.path) {
        if (ffprobeStatic.path.startsWith('/ROOT') || !path.isAbsolute(ffprobeStatic.path)) {
            const relativePath = ffprobeStatic.path.replace(/^\/ROOT\//, '');
            return path.join(process.cwd(), relativePath);
        }
        return ffprobeStatic.path;
    }
    return null;
};

const finalFFmpegPath = getFFmpegPath();
const finalFFprobePath = getFFprobePath();

if (finalFFmpegPath) {
    console.log(`[FFmpegRenderEngine] FFmpeg path configured: ${finalFFmpegPath}`);
    ffmpeg.setFfmpegPath(finalFFmpegPath);
}
if (finalFFprobePath) {
    console.log(`[FFmpegRenderEngine] FFprobe path configured: ${finalFFprobePath}`);
    ffmpeg.setFfprobePath(finalFFprobePath);
}

// Common encoding settings to ensure all segments are identical for concatenation
const getDynamicH264Opts = () => {
    const threadCount = resourceGovernor.getRecommendedThreads();
    return [
        '-vcodec libx264',
        '-pix_fmt yuv420p',
        '-profile:v main',
        '-level 5.1',
        '-crf 18',
        '-g 30',
        '-tune stillimage',
        '-preset veryfast',
        `-threads ${threadCount}`,
        '-r 30'
    ];
};

/**
 * Server-side service to render documentary videos using direct FFmpeg assembly.
 */
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
        onProgress?: (progress: number, message: string) => Promise<void>
    ): Promise<string> {
        const isVertical = aspectRatio === '9:16';
        console.log(`[FFmpegRenderEngine] Starting ${isVertical ? 'Vertical (9:16)' : '4K Horizontal (16:9)'} render for: ${projectId}`);

        const startTime = Date.now();
        const baseTemp = os.tmpdir();
        const tempDir = path.join(baseTemp, `render-${projectId}-${Date.now()}`);
        const outputDir = path.join(baseTemp, 'renders');
        const fileName = customFileName || `${projectId}.mp4`;
        const outputFile = path.join(outputDir, fileName);

        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        try {
            if (onProgress) await onProgress(0, `Downloading ${scenes.length} assets...`);
            const assetPaths = await this.downloadAssets(projectId, scenes, backgroundMusicUrl, ambianceUrl, tempDir);

            for (let i = 0; i < assetPaths.images.length; i++) {
                if (onProgress) {
                    const progress = 10 + Math.round((i / assetPaths.images.length) * 15);
                    await onProgress(progress, `Processing 4K visual ${i + 1}/${assetPaths.images.length}...`);
                }
                const originalPath = assetPaths.images[i];
                const processedPath = path.join(tempDir, `proc-img-${i}.jpg`);
                await this.preProcessImage(originalPath, processedPath, aspectRatio);
                assetPaths.images[i] = processedPath;
                if (fs.existsSync(originalPath)) fs.unlinkSync(originalPath);
            }

            await this.generateCineVideo(
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
                performanceProfile
            );

            if (onProgress) await onProgress(98, 'Moving video to permanent storage...');
            const finalUrl = await storageService.uploadVideo(projectId, outputFile, customFileName);

            const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
            await analyticsServerService.logUsage({
                service: 'render',
                operation: 'rendering',
                model: 'ffmpeg-h264',
                inputCount: Math.ceil(totalDuration),
                executionTimeMs: Date.now() - startTime,
                projectId: projectId
            }, 'PRODUCTION');

            return finalUrl;
        } catch (error: any) {
            console.error('[FFmpegRenderEngine] FATAL ERROR:', error);
            throw new Error(`FFmpeg Rendering failed: ${error.message}`);
        } finally {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    },

    async downloadAssets(projectId: string, scenes: Scene[], backgroundMusicUrl: string | undefined, ambianceUrl: string | undefined, tempDir: string) {
        const imagePaths: string[] = [];
        const audioPaths: Record<string, string> = {};
        const sfxPaths: Record<string, string> = {};
        let backgroundMusicPath: string | null = null;
        let ambiancePath: string | null = null;

        for (let i = 0; i < scenes.length; i++) {
            const imgPath = path.join(tempDir, `img-${i}.jpg`);
            await this.downloadFile(scenes[i].imageUrl, imgPath);
            imagePaths.push(imgPath);
        }

        const uniqueSections = Array.from(new Set(scenes.map(s => s.sectionId)));
        for (const sectionId of uniqueSections) {
            const sectionScenes = scenes.filter(s => s.sectionId === sectionId);
            const sceneWithAudio = sectionScenes.find(s => s.audioUrl);
            if (sceneWithAudio?.audioUrl) {
                const audPath = path.join(tempDir, `aud-${sectionId}.mp3`);
                await this.downloadFile(sceneWithAudio.audioUrl, audPath);
                audioPaths[sectionId] = audPath;
            }
        }

        for (const scene of scenes) {
            if (scene.sfxUrl) {
                const sfxPath = path.join(tempDir, `sfx-${scene.id}.mp3`);
                await this.downloadFile(scene.sfxUrl, sfxPath);
                sfxPaths[scene.id] = sfxPath;
            }
        }

        if (backgroundMusicUrl) {
            backgroundMusicPath = path.join(tempDir, 'bg-music.mp3');
            await this.downloadFile(backgroundMusicUrl, backgroundMusicPath);
        }

        if (ambianceUrl) {
            ambiancePath = path.join(tempDir, 'ambiance.mp3');
            await this.downloadFile(ambianceUrl, ambiancePath);
        }

        return { images: imagePaths, audio: audioPaths, backgroundMusic: backgroundMusicPath, ambiance: ambiancePath, sfx: sfxPaths };
    },

    async downloadFile(url: string, dest: string) {
        if (!url.startsWith('http')) {
            const localPath = path.join(process.cwd(), 'public', url);
            if (fs.existsSync(localPath)) {
                fs.copyFileSync(localPath, dest);
                return;
            } else {
                throw new Error(`Local asset not found: ${localPath}`);
            }
        }
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

    logResources(label: string) {
        const memory = process.memoryUsage();
        const load = os.loadavg();
        console.log(`[Resources] [${label}] RAM: RSS=${(memory.rss / 1024 / 1024).toFixed(2)}MB | Load: ${load[0].toFixed(2)}`);
    },

    async preProcessImage(src: string, dest: string, aspectRatio: '16:9' | '9:16' = '16:9') {
        const isVertical = aspectRatio === '9:16';
        return new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('FFmpeg pre-scale timeout (90s)')), 90000);
            ffmpeg(src)
                .on('start', (cmd) => console.log(`[FFmpeg] Scale: ${cmd}`))
                .outputOptions(['-vf', isVertical ? 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1' : 'scale=3840:2160:force_original_aspect_ratio=increase,crop=3840:2160,setsar=1'])
                .on('end', () => { clearTimeout(timeout); resolve(); })
                .on('error', (err) => { clearTimeout(timeout); reject(err); })
                .save(dest);
        });
    },

    async createSteadySegment(imgPath: string, duration: number, outPath: string) {
        return new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('FFmpeg steady timeout (180s)')), 180000);
            ffmpeg(imgPath)
                .on('start', (cmd) => console.log(`[FFmpeg] Steady: ${cmd}`))
                .loop(duration)
                .outputOptions(['-t', duration.toString(), ...getDynamicH264Opts()])
                .on('end', () => { clearTimeout(timeout); resolve(); })
                .on('error', (err) => { clearTimeout(timeout); reject(err); })
                .save(outPath);
        });
    },

    async createTransitionSegment(imgAPath: string, imgBPath: string, type: string, duration: number, outPath: string) {
        return new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('FFmpeg transition timeout (180s)')), 180000);
            const transitionMap: Record<string, string> = { 'fade': 'fade', 'blur': 'dissolve', 'zoom': 'zoomin', 'slide': 'slideleft' };
            const fType = transitionMap[type] || 'fade';
            ffmpeg()
                .input(imgAPath).inputOptions(['-loop 1', `-t ${duration}`])
                .input(imgBPath).inputOptions(['-loop 1', `-t ${duration}`])
                .on('start', (cmd) => console.log(`[FFmpeg] Transition: ${cmd}`))
                .complexFilter([`[0:v]fps=30,format=yuv420p[v0];[1:v]fps=30,format=yuv420p[v1];[v0][v1]xfade=transition=${fType}:duration=${duration}:offset=0`])
                .outputOptions(['-t', duration.toString(), ...getDynamicH264Opts()])
                .on('end', () => { clearTimeout(timeout); resolve(); })
                .on('error', (err) => { clearTimeout(timeout); reject(err); })
                .save(outPath);
        });
    },

    async concatenateSegments(segmentPaths: string[], outPath: string, tempDir: string) {
        return new Promise<void>((resolve, reject) => {
            const listPath = path.join(tempDir, 'concat.txt');
            const listContent = segmentPaths.map(p => `file '${path.resolve(p).replace(/'/g, "'\\''")}'`).join('\n');
            fs.writeFileSync(listPath, listContent);
            ffmpeg().input(listPath).inputOptions(['-f concat', '-safe 0']).outputOptions(['-c copy'])
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .save(outPath);
        });
    },

    async generateCineVideo(
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
        performanceProfile?: any
    ) {
        this.logResources('START_GEN_VIDEO');
        const segmentFiles: string[] = [];

        try {
            const isTurbo = performanceProfile?.mode === 'turbo';

            // In Turbo mode, we can parallelize segment baking but we must be careful with CPU
            // We'll process in small batches if turbo
            const batchSize = isTurbo ? 2 : 1;

            for (let i = 0; i < scenes.length; i += batchSize) {
                const batchPromises = [];

                for (let j = 0; j < batchSize && (i + j) < scenes.length; j++) {
                    const sceneIndex = i + j;
                    const scene = scenes[sceneIndex];
                    const isLast = sceneIndex === scenes.length - 1;
                    const nextScene = scenes[sceneIndex + 1];
                    const transitionDuration = (!isLast && nextScene) ?
                        Math.min((nextScene.transitionDuration || 1000) / 1000, scene.duration / 2, nextScene.duration / 2) : 0;

                    if (onProgress) {
                        const progress = 25 + Math.round((sceneIndex / scenes.length) * 65);
                        const msg = isTurbo ? `🚀 TURBO BAKING scene ${sceneIndex + 1}/${scenes.length}...` : `Baking scene ${sceneIndex + 1}/${scenes.length}...`;
                        await onProgress(progress, msg);
                    }

                    batchPromises.push((async () => {
                        const sceneSegs = [];
                        // 1. Steady
                        const steadyDuration = scene.duration - transitionDuration;
                        if (steadyDuration > 0.05) {
                            const steadyPath = path.join(tempDir, `segment-steady-${sceneIndex}.mp4`);
                            await this.createSteadySegment(assetPaths.images[sceneIndex], steadyDuration, steadyPath);
                            sceneSegs.push({ type: 'steady', path: steadyPath });
                        }
                        // 2. Transition
                        if (transitionDuration > 0) {
                            const transPath = path.join(tempDir, `segment-trans-${sceneIndex}.mp4`);
                            await this.createTransitionSegment(assetPaths.images[sceneIndex], assetPaths.images[sceneIndex + 1], nextScene.transitionType, transitionDuration, transPath);
                            sceneSegs.push({ type: 'trans', path: transPath });
                        }
                        return sceneSegs;
                    })());
                }

                const batchResults = await Promise.all(batchPromises);
                batchResults.forEach(res => res.forEach(s => segmentFiles.push(s.path)));
                this.logResources(`BATCH_COMPLETE_${i}`);
            }

            if (onProgress) await onProgress(90, 'Stitching segments together...');
            const silentVideoPath = path.join(tempDir, 'silent_video.mp4');
            await this.concatenateSegments(segmentFiles, silentVideoPath, tempDir);

            if (onProgress) await onProgress(95, 'Finalizing audio mix...');
            await this.muxFinalAudio(silentVideoPath, scenes, assetPaths, outputPath, backgroundMusicVolume, ambianceVolume, narrationVolume, globalSfxVolume, subtitlesEnabled, subtitleStyle, tempDir, renderAspectRatio);

            if (onProgress) await onProgress(100, 'Render complete!');
        } catch (error) {
            console.error('[FFmpegRenderEngine] Segmented render failed:', error);
            throw error;
        }
    },

    async muxFinalAudio(
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
        renderAspectRatio: '16:9' | '9:16' = '16:9'
    ) {
        return new Promise<void>((resolve, reject) => {
            const command = ffmpeg(videoPath);
            let inputCounter = 1;

            const uniqueSectionIds = Array.from(new Set(scenes.map(s => s.sectionId)));
            const audioInputMap: Record<string, number> = {};
            uniqueSectionIds.forEach((sid) => {
                if (assetPaths.audio[sid]) {
                    command.input(assetPaths.audio[sid]);
                    audioInputMap[sid] = inputCounter++;
                }
            });

            let bgMusicIndex = -1;
            if (assetPaths.backgroundMusic) {
                command.input(assetPaths.backgroundMusic);
                bgMusicIndex = inputCounter++;
            }

            let ambianceIndex = -1;
            if (assetPaths.ambiance) {
                command.input(assetPaths.ambiance);
                ambianceIndex = inputCounter++;
            }

            const sfxInputMap: Record<string, number> = {};
            scenes.forEach(scene => {
                if (assetPaths.sfx[scene.id]) {
                    command.input(assetPaths.sfx[scene.id]);
                    sfxInputMap[scene.id] = inputCounter++;
                }
            });

            const filters: any[] = [];
            const audioMixInputs: string[] = [];

            if (subtitlesEnabled) {
                const assPath = this.generateAssFile(scenes, tempDir, subtitleStyle, renderAspectRatio);
                const escapedAssPath = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');
                filters.push({ filter: 'ass', options: `filename='${escapedAssPath}'`, inputs: '0:v', outputs: 'v_sub' });
            }

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
            const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
            const outputOptions = ['-t', totalDuration.toFixed(3), '-y'];

            if (subtitlesEnabled) command.map('v_sub'); else command.map('0:v');
            command.map('finalaudio');
            command.outputOptions(outputOptions).on('start', (cmd) => console.log(`[FFmpeg] Mux: ${cmd}`)).on('end', () => resolve()).on('error', (err) => reject(err)).save(outputPath);
        });
    }
};
